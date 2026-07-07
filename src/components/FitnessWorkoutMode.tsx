import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Dumbbell, Zap, Flame, Camera, 
  HelpCircle, Sparkles, Check, Info, Sliders, ArrowRight, AlertCircle
} from 'lucide-react';
import { WorkoutType, PoseStatus, WorkoutSession, ActivityLog } from '../types';

interface FitnessWorkoutModeProps {
  onEarnPoints: (points: number, reps: number, detail: string) => void;
  onAddLog: (log: ActivityLog) => void;
}

export default function FitnessWorkoutMode({ onEarnPoints, onAddLog }: FitnessWorkoutModeProps) {
  // Workout State
  const [workoutType, setWorkoutType] = useState<WorkoutType>('squats');
  const [sessionReps, setSessionReps] = useState(0);
  const [sessionCalories, setSessionCalories] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState<string>("Click 'Start Workout' to begin posture scanning.");
  const [currentJointAngle, setCurrentJointAngle] = useState(180);

  // Joint Tracking States
  const [poseStatus, setPoseStatus] = useState<PoseStatus>('standing');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  // Simulation controls (for preview/iframe environment convenience)
  const [simulatedAngle, setSimulatedAngle] = useState(180);

  const [workoutSummary, setWorkoutSummary] = useState<{
    show: boolean;
    reps: number;
    calories: number;
    points: number;
    workoutType: string;
  } | null>(null);

  // Refs for camera + canvas drawing
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaPipeRef = useRef<{ camera: any; pose: any } | null>(null);
  const repStateRef = useRef<PoseStatus>('standing');
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  // Check if MediaPipe is available in the window scope
  useEffect(() => {
    const checkLoaded = setInterval(() => {
      if ((window as any).Pose && (window as any).Camera) {
        setIsMediaPipeLoaded(true);
        clearInterval(checkLoaded);
      }
    }, 500);
    return () => clearInterval(checkLoaded);
  }, []);

  // Web Audio chime for rep increments
  const playRepChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08); // C#5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16); // E5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio context might be blocked or unsupported in sandbox environment
    }
  };

  // Start real computer vision webcam tracking with MediaPipe Pose
  const startTracking = async () => {
    setCameraError(null);
    setIsSimulated(false);
    
    // Ensure scripts are loaded or fall back to high fidelity sandbox simulation
    if (!(window as any).Pose) {
      setCameraError("Webcam libraries could not be loaded in this sandboxed environment. Enabled interactive joint simulator.");
      setIsSimulated(true);
      setIsCameraOn(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
      initializePosePipe();
    } catch (err: any) {
      console.error("Pose Camera access error:", err);
      setCameraError("Webcam not granted or blocked by iframe container. Switched to Interactive joint simulator.");
      setIsSimulated(true);
      setIsCameraOn(true);
    }
  };

  const stopTracking = () => {
    setIsCameraOn(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (mediaPipeRef.current) {
      try {
        mediaPipeRef.current.camera.stop();
      } catch (e) {}
      mediaPipeRef.current = null;
    }
    setPoseStatus('none');
  };

  // Angle Calculator Formula
  const calculateAngle = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  // Initialize MediaPipe Pose
  const initializePosePipe = () => {
    if (mediaPipeRef.current) return;

    const PoseClass = (window as any).Pose;
    const CameraClass = (window as any).Camera;

    const pose = new PoseClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        const landmarks = results.poseLandmarks;

        // Draw skeletons on Canvas
        drawPoseHUD(ctx, landmarks, canvas.width, canvas.height);

        // Analyze specific joint angles depending on current selected workout type
        let calculatedAngle = 180;

        if (workoutType === 'squats') {
          // Left Hip (23), Left Knee (25), Left Ankle (27)
          const hip = landmarks[23];
          const knee = landmarks[25];
          const ankle = landmarks[27];

          if (hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.5) {
            calculatedAngle = calculateAngle(hip, knee, ankle);
            setCurrentJointAngle(calculatedAngle);

            // Rep counter state machine for squats
            // Standing angle: ~165-180. Squatted angle: < 130 or hip level with knee (horizontal thigh position)
            const isSquatted = calculatedAngle < 130 || (hip.y >= knee.y - 0.05);
            const isStanding = calculatedAngle > 155 || (hip.y < knee.y - 0.12);

            if (isSquatted) {
              if (repStateRef.current === 'standing' && isActive) {
                repStateRef.current = 'down';
                setPoseStatus('down');
                setFeedback("Great depth! Now push up back to standing posture.");
              }
            } else if (isStanding) {
              if (repStateRef.current === 'down' && isActive) {
                repStateRef.current = 'standing';
                setPoseStatus('standing');
                
                // Rep successfully completed!
                setSessionReps((prev) => {
                  const nextReps = prev + 1;
                  onEarnPoints(5, 1, `Completed squat rep ${nextReps}`);
                  playRepChime();
                  return nextReps;
                });
                setSessionCalories((prev) => prev + 0.4);
                setFeedback("Perfect Squat! Squeeze your glutes and repeat.");
              }
            }
          } else {
            setFeedback("Partial body view. Step back to show hips, knees, and ankles.");
          }

        } else if (workoutType === 'pushups') {
          // Left Shoulder (11), Left Elbow (13), Left Wrist (15)
          const shoulder = landmarks[11];
          const elbow = landmarks[13];
          const wrist = landmarks[15];

          if (shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5) {
            calculatedAngle = calculateAngle(shoulder, elbow, wrist);
            setCurrentJointAngle(calculatedAngle);

            // Rep counter state machine for pushups
            // Plank posture angle: ~160-180. Downward bent arms angle: < 100
            if (calculatedAngle < 105) {
              if (repStateRef.current === 'standing' && isActive) {
                repStateRef.current = 'down';
                setPoseStatus('down');
                setFeedback("Core engaged! Keep chest low and push back up.");
              }
            } else if (calculatedAngle > 150) {
              if (repStateRef.current === 'down' && isActive) {
                repStateRef.current = 'standing';
                setPoseStatus('standing');
                
                // Rep successfully completed!
                setSessionReps((prev) => {
                  const nextReps = prev + 1;
                  onEarnPoints(5, 1, `Completed pushup rep ${nextReps}`);
                  playRepChime();
                  return nextReps;
                });
                setSessionCalories((prev) => prev + 0.55);
                setFeedback("Solid Pushup! Maintain flat spine and continue.");
              }
            }
          } else {
            setFeedback("Align your upper body profile. Keep shoulder, elbow, and wrist visible.");
          }
        }

      } else {
        setPoseStatus('none');
        ctx.fillStyle = 'rgba(19, 27, 14, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#82a560';
        ctx.font = '14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText("POSITION DETECTOR STANDBY: STEP INTO WEB CAM VIEW", canvas.width / 2, canvas.height / 2);
      }
    });

    try {
      let lastFrameTime = 0;
      let active = true;

      const processFrame = async () => {
        if (!active || !videoRef.current) return;

        const now = performance.now();
        if (now - lastFrameTime >= 100) { // 10 FPS limit (100ms interval)
          if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
            try {
              await pose.send({ image: videoRef.current });
              lastFrameTime = now;
            } catch (err) {
              console.warn("MediaPipe processing frame warning:", err);
            }
          }
        }

        if (active) {
          requestAnimationFrame(processFrame);
        }
      };

      requestAnimationFrame(processFrame);

      mediaPipeRef.current = { 
        camera: { 
          stop: () => { 
            active = false; 
          } 
        }, 
        pose 
      };
    } catch (e) {
      console.error("Camera instance start failed:", e);
      setIsSimulated(true);
    }
  };

  // Draw aesthetic glowing skeletal markers
  const drawPoseHUD = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // List of index values we care to connect
    const drawLine = (idxA: number, idxB: number, color: string, thickness: number) => {
      const pA = landmarks[idxA];
      const pB = landmarks[idxB];
      if (pA && pB && pA.visibility > 0.4 && pB.visibility > 0.4) {
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(pA.x * width, pA.y * height);
        ctx.lineTo(pB.x * width, pB.y * height);
        ctx.stroke();
      }
    };

    const drawNode = (idx: number, color: string, r: number) => {
      const p = landmarks[idx];
      if (p && p.visibility > 0.4) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    const glowColor = 'rgba(130, 165, 96, 0.8)';
    const boneColor = 'rgba(101, 136, 69, 0.4)';

    // Connections
    // Shoulders
    drawLine(11, 12, boneColor, 4);
    // Arms
    drawLine(11, 13, boneColor, 4);
    drawLine(13, 15, boneColor, 4);
    drawLine(12, 14, boneColor, 4);
    drawLine(14, 16, boneColor, 4);
    // Torso
    drawLine(11, 23, boneColor, 4);
    drawLine(12, 24, boneColor, 4);
    drawLine(23, 24, boneColor, 4);
    // Legs
    drawLine(23, 25, boneColor, 4);
    drawLine(25, 27, boneColor, 4);
    drawLine(24, 26, boneColor, 4);
    drawLine(26, 28, boneColor, 4);

    // Glowing joints
    const trackJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    trackJoints.forEach(j => {
      drawNode(j, '#f8fafc', 4);
      drawNode(j, glowColor, 1.5);
    });

    // Draw telemetry overlay on HUD
    ctx.strokeStyle = 'rgba(130, 165, 96, 0.2)';
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`KINETIC_TRACK: ACTIVE`, width - 30, 40);
    ctx.fillText(`TARGET_ANGLE: ${Math.round(currentJointAngle)}°`, width - 30, 55);
  };

  // Simulated rep triggers (when webcam is blocked or unavailable in testing environment)
  useEffect(() => {
    if (!isSimulated || !isCameraOn) return;

    // Evaluate simulated rep triggers based on the slider state
    setCurrentJointAngle(simulatedAngle);

    if (workoutType === 'squats') {
      if (simulatedAngle < 130) {
        if (repStateRef.current === 'standing' && isActive) {
          repStateRef.current = 'down';
          setPoseStatus('down');
          setFeedback("Great simulated squat depth! Raise slider back up to stand.");
        }
      } else if (simulatedAngle > 155) {
        if (repStateRef.current === 'down' && isActive) {
          repStateRef.current = 'standing';
          setPoseStatus('standing');
          
          setSessionReps(prev => {
            const next = prev + 1;
            onEarnPoints(5, 1, `Completed simulated squat rep ${next}`);
            playRepChime();
            return next;
          });
          setSessionCalories(prev => prev + 0.4);
          setFeedback("Simulated squat complete! Feel free to cycle again.");
        }
      }
    } else {
      if (simulatedAngle < 105) {
        if (repStateRef.current === 'standing' && isActive) {
          repStateRef.current = 'down';
          setPoseStatus('down');
          setFeedback("Great simulated pushup depth! Raise slider back up to plank.");
        }
      } else if (simulatedAngle > 150) {
        if (repStateRef.current === 'down' && isActive) {
          repStateRef.current = 'standing';
          setPoseStatus('standing');
          
          setSessionReps(prev => {
            const next = prev + 1;
            onEarnPoints(5, 1, `Completed simulated pushup rep ${next}`);
            playRepChime();
            return next;
          });
          setSessionCalories(prev => prev + 0.55);
          setFeedback("Simulated pushup complete! Squeeze core and repeat.");
        }
      }
    }
  }, [simulatedAngle, isSimulated, workoutType, isActive]);

  // Redraw virtual kinetic skeleton grid when in simulation mode
  useEffect(() => {
    if (!isSimulated || !isCameraOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background tech grid
    ctx.strokeStyle = 'rgba(101, 136, 69, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const angleColor = simulatedAngle < (workoutType === 'squats' ? 130 : 105) ? '#82a560' : '#4e6b34';
    const skeletonColor = '#e5ebda';

    if (workoutType === 'squats') {
      // Draw Squats Simulator Figure (Side Profile / Front hybrid)
      const squatRatio = (180 - simulatedAngle) / 90; // 0 to 1
      
      // Interpolate joint heights
      const hipY = (centerY - 10) + squatRatio * 45;
      const kneeX = (centerX - 40) - squatRatio * 35;
      const kneeY = (centerY + 60) + squatRatio * 15;
      const ankleX = centerX - 40;
      const ankleY = centerY + 120; // Feet on floor
      
      const shoulderX = centerX - 35;
      const shoulderY = hipY - 95;
      const headX = centerX - 35;
      const headY = shoulderY - 35;

      // Draw floor line
      ctx.strokeStyle = 'rgba(130, 165, 96, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 120, ankleY);
      ctx.lineTo(centerX + 120, ankleY);
      ctx.stroke();

      // Draw skeleton lines
      ctx.strokeStyle = skeletonColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Spine & Torso
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(centerX - 30, hipY);
      // Leg 1 (Thigh)
      ctx.lineTo(kneeX, kneeY);
      // Leg 2 (Calf)
      ctx.lineTo(ankleX, ankleY);
      ctx.stroke();

      // Back arm extended forward for balance
      ctx.strokeStyle = '#cbdab7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(centerX + 30, shoulderY - 10);
      ctx.stroke();

      // Draw Head
      ctx.fillStyle = '#e5ebda';
      ctx.beginPath();
      ctx.arc(headX, headY, 18, 0, 2 * Math.PI);
      ctx.fill();

      // Highlight Joint Nodes
      const drawNode = (x: number, y: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#131b0e';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      drawNode(shoulderX, shoulderY, '#82a560');
      drawNode(centerX - 30, hipY, '#82a560');
      drawNode(kneeX, kneeY, angleColor);
      drawNode(ankleX, ankleY, '#4e6b34');

      // Draw Angle Arc
      ctx.strokeStyle = angleColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(kneeX, kneeY, 25, 0, 2 * Math.PI);
      ctx.stroke();

      // Text Overlay on joint
      ctx.fillStyle = '#f4f6f0';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText(`${Math.round(simulatedAngle)}°`, kneeX + 30, kneeY + 5);

    } else {
      // Draw Pushups Simulator Figure (Side Profile)
      const pushupRatio = (180 - simulatedAngle) / 90; // 0 to 1

      const handX = centerX + 80;
      const handY = centerY + 90;
      const feetX = centerX - 140;
      const feetY = centerY + 90;

      const shoulderX = centerX + 45;
      const shoulderY = centerY + (pushupRatio * 50);

      const elbowX = centerX + 15;
      const elbowY = ((centerY + shoulderY) / 2) - (20 * pushupRatio);

      const hipX = centerX - 45;
      const hipY = (centerY + 30) + (pushupRatio * 40);

      const headX = shoulderX + 30;
      const headY = shoulderY - 15;

      // Floor line
      ctx.strokeStyle = 'rgba(130, 165, 96, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 180, handY);
      ctx.lineTo(centerX + 180, handY);
      ctx.stroke();

      // Skeleton
      ctx.strokeStyle = skeletonColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Body line (Feet to Hip to Shoulder)
      ctx.beginPath();
      ctx.moveTo(feetX, feetY);
      ctx.lineTo(hipX, hipY);
      ctx.lineTo(shoulderX, shoulderY);
      ctx.stroke();

      // Arm line (Shoulder to Elbow to Hand)
      ctx.strokeStyle = '#cbdab7';
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#e5ebda';
      ctx.beginPath();
      ctx.arc(headX, headY, 16, 0, 2 * Math.PI);
      ctx.fill();

      // Highlights
      const drawNode = (x: number, y: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#131b0e';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      drawNode(feetX, feetY, '#4e6b34');
      drawNode(hipX, hipY, '#82a560');
      drawNode(shoulderX, shoulderY, '#82a560');
      drawNode(elbowX, elbowY, angleColor);
      drawNode(handX, handY, '#4e6b34');

      // Draw Angle Arc
      ctx.strokeStyle = angleColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(elbowX, elbowY, 20, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#f4f6f0';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText(`${Math.round(simulatedAngle)}°`, elbowX + 25, elbowY + 5);
    }

    // Outer cybernetic Hud overlays
    ctx.strokeStyle = 'rgba(130, 165, 96, 0.15)';
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  }, [isSimulated, isCameraOn, simulatedAngle, workoutType, sessionReps, sessionCalories]);

  // Complete workout logging
  const completeWorkout = () => {
    if (sessionReps === 0) {
      setIsActive(false);
      setFeedback("Workout stopped with no reps recorded.");
      return;
    }

    const elapsedSeconds = sessionStartTimeRef.current 
      ? Math.round((Date.now() - sessionStartTimeRef.current) / 1000) 
      : 0;

    onAddLog({
      id: Math.random().toString(36).substr(2, 9),
      type: 'fitness',
      title: `${workoutType.charAt(0).toUpperCase() + workoutType.slice(1)} Session`,
      timestamp: new Date().toISOString(),
      duration: elapsedSeconds,
      score: sessionReps * 5,
      details: `Completed ${sessionReps} ${workoutType} reps, burning ~${Math.round(sessionCalories)} kcal.`
    });

    setWorkoutSummary({
      show: true,
      reps: sessionReps,
      calories: sessionCalories,
      points: sessionReps * 5,
      workoutType
    });

    setIsActive(false);
    setSessionReps(0);
    setSessionCalories(0);
    setFeedback("Session complete. Great effort, student athlete!");
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6" id="fitness-workout-workspace">
        
        {/* Kinetic Arena Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 rounded-2xl border border-olive-950/50 gap-3">
          <div>
            <div className="text-xs font-mono text-olive-400 font-bold tracking-widest uppercase">
              Section 02 // Health
            </div>
            <h3 className="text-xl font-display font-bold text-white mt-1">
              Active Kinetic Arena
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-olive-950/60 border border-olive-800/40 rounded-full text-xs text-olive-400 font-mono self-start sm:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-olive-500 inline-block animate-pulse" />
            OLIVE THEME
          </div>
        </div>

        {/* Pose HUD & Webcam Monitor */}
        <div className="bg-slate-900/60 border border-olive-900/40 rounded-3xl overflow-hidden relative glow-olive transition-all duration-500">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <span className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-olive-300 border border-olive-800/40 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-olive-400" />
              Skeletal Pose Scanner
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10">
            {poseStatus === 'standing' && (
              <span className="bg-emerald-950/80 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-800 flex items-center gap-1">
                ● DETECTOR READY
              </span>
            )}
            {poseStatus === 'down' && (
              <span className="bg-olive-950/90 backdrop-blur-md text-olive-300 px-3 py-1 rounded-full text-xs font-bold border border-olive-800 animate-pulse flex items-center gap-1">
                ▼ DEEP DEPTH DETECTED
              </span>
            )}
            {poseStatus === 'none' && (
              <span className="bg-slate-950/80 backdrop-blur-md text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-800 flex items-center gap-1">
                ○ DETECTOR STANDBY
              </span>
            )}
          </div>

          {cameraError && (
            <div className="mx-4 mt-16 mb-2 bg-amber-950/40 border border-amber-900/40 text-amber-300 p-3.5 rounded-2xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Sandbox Mode Active</span>
                <span className="text-slate-300 font-sans leading-relaxed">{cameraError}</span>
              </div>
            </div>
          )}

          {/* Camera Viewport Canvas Container */}
          <div className="w-full aspect-video bg-slate-950 flex items-center justify-center relative overflow-hidden" id="pose-webcam-viewport">
            {/* Hidden video element used by MediaPipe */}
            <video 
              ref={videoRef} 
              className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none" 
              playsInline 
              muted 
              width="640" 
              height="480"
            />
            
            {/* Visible drawing canvas */}
            <canvas 
              ref={canvasRef} 
              width="640" 
              height="480" 
              className={`w-full h-full object-cover scale-x-[-1] ${isCameraOn ? 'block' : 'hidden'}`} 
            />

            {isCameraOn && (
              <div className="absolute inset-0 border border-olive-500/10 pointer-events-none" />
            )}

            {!isCameraOn && (
              <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3 sm:space-y-4 w-full h-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-olive-950/40 border border-olive-800/40 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 sm:w-8 sm:h-8 text-olive-400" />
                </div>
                <div className="max-w-sm space-y-1.5 sm:space-y-2">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Interactive Skeletal Rep Tracker</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed px-2">
                    Uses high-performance computer vision joints calculation to automatically record workouts. Track, calorie-burn, and balance-score your squats and pushups!
                  </p>
                </div>
                <button
                  onClick={startTracking}
                  className="px-4 py-2 rounded-xl bg-olive-500 hover:bg-olive-400 text-slate-950 font-semibold text-[11px] sm:text-xs transition-all shadow-lg flex items-center gap-1.5"
                  id="activate-fitness-camera-btn"
                >
                  Enable Pose Tracking
                </button>
              </div>
            )}
          </div>

          {/* Quick instructions bar */}
          {isCameraOn && (
            <div className="bg-slate-950/90 border-t border-slate-800 p-4 flex flex-col sm:flex-row gap-3 justify-between items-center text-center sm:text-left">
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs text-slate-200 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                  Step 2: Position Your Frame
                </span>
                <span className="text-[10px] text-slate-400">
                  Step back 5-8 feet so your full torso and knees are in plain visual profile.
                </span>
              </div>
              <button
                onClick={stopTracking}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors text-center"
                id="stop-fitness-camera-btn"
              >
                Turn Camera Off
              </button>
            </div>
          )}
        </div>

        {/* Polished, non-overlapping Telemetry Dashboard Bar */}
        {isCameraOn && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 border border-olive-900/40 p-4 rounded-2xl text-center font-mono text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Workout</div>
              <span className="font-bold text-olive-300 uppercase text-[11px]">{workoutType}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Joint Angle</div>
              <span className="font-bold text-white text-[11px]">{Math.round(currentJointAngle)}°</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">State</div>
              <span className="font-bold text-emerald-400 uppercase text-[11px]">{poseStatus}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Session Reps</div>
              <span className="font-bold text-orange-400 text-[11px]">{sessionReps}</span>
            </div>
          </div>
        )}

        {/* Simulated Joint angle sliders for ease of review inside sandboxed browser if camera lacks permission */}
        {isCameraOn && isSimulated && (
          <div className="bg-olive-950/40 border border-olive-900/40 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-olive-400" />
                <span className="text-xs font-semibold text-olive-300">Kinetic Angle Simulator</span>
              </div>
              <span className="text-[10px] bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded">
                Active Sandbox Fallback
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400">
              Manually shift joint angles to trigger reps and test balance increments in the browser:
            </p>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1 text-slate-400">
                <span>Joint {workoutType === 'squats' ? 'Knee' : 'Elbow'} Angle:</span>
                <span className="text-olive-400 font-bold">{simulatedAngle}°</span>
              </div>
              <input 
                type="range" 
                min="70" 
                max="180" 
                value={simulatedAngle}
                onChange={(e) => setSimulatedAngle(Number(e.target.value))}
                className="w-full accent-olive-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Fully Bent / Down ({workoutType === 'squats' ? '<115°' : '<105°'})</span>
                <span>Normal Standing ({workoutType === 'squats' ? '>155°' : '>150°'})</span>
              </div>
            </div>
          </div>
        )}

      {/* Side-by-side Balanced Sub-grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Active Exercise Selector */}
        <div className="bg-slate-900/60 border border-olive-900/40 rounded-3xl p-6 space-y-5 shadow-[0_0_40px_rgba(101,136,69,0.04)]">
          <h4 className="text-sm font-mono font-bold text-slate-300 tracking-wider">
            WORKOUT CONTROLLER
          </h4>

          {/* Toggle buttons between exercises */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setWorkoutType('squats');
                setSessionReps(0);
                repStateRef.current = 'standing';
                setPoseStatus('standing');
                setFeedback("Squat tracking active. Sit hip down below knees.");
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                workoutType === 'squats'
                  ? 'bg-olive-950/60 border-olive-500 text-white shadow-inner'
                  : 'bg-slate-950 hover:bg-slate-950/80 border-slate-800/80 text-slate-400'
              }`}
              id="squat-select-btn"
            >
              <Dumbbell className="w-5 h-5 mb-2 text-olive-400" />
              <div className="text-xs font-bold">Deep Squats</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">+5 PTS / REP</div>
            </button>

            <button
              onClick={() => {
                setWorkoutType('pushups');
                setSessionReps(0);
                repStateRef.current = 'standing';
                setPoseStatus('standing');
                setFeedback("Pushup tracking active. Keep back straight and lower chest.");
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                workoutType === 'pushups'
                  ? 'bg-olive-950/60 border-olive-500 text-white shadow-inner'
                  : 'bg-slate-950 hover:bg-slate-950/80 border-slate-800/80 text-slate-400'
              }`}
              id="pushup-select-btn"
            >
              <Zap className="w-5 h-5 mb-2 text-olive-400" />
              <div className="text-xs font-bold">Plank Pushups</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">+5 PTS / REP</div>
            </button>
          </div>

          {/* Coaching & Guidance prompt */}
          <div className="bg-slate-950/80 border border-olive-900/30 p-3 rounded-xl flex gap-3 items-start">
            <Info className="w-4 h-4 text-olive-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed font-sans">
              <span className="font-semibold block text-white mb-0.5">Real-Time Form Coach</span>
              "{feedback}"
            </div>
          </div>

          {/* Workout Stats block */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-olive-900/30 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Reps Counted</div>
              <div className="text-2xl font-bold text-olive-300" id="workout-rep-count">
                {sessionReps}
              </div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-olive-900/30 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Est. Calories</div>
              <div className="text-2xl font-bold text-orange-400">
                {sessionCalories.toFixed(1)} <span className="text-xs text-slate-500">kcal</span>
              </div>
            </div>
          </div>

          {/* Main workout toggles */}
          <div className="space-y-2">
            {isActive ? (
              <button
                onClick={completeWorkout}
                className="w-full py-3 rounded-xl bg-olive-500 hover:bg-olive-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg"
                id="stop-workout-btn"
              >
                <Check className="w-4 h-4" />
                Finish Workout Session
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsActive(true);
                  sessionStartTimeRef.current = Date.now();
                  if (!isCameraOn) {
                    startTracking();
                  }
                  setFeedback("Pose sensor tracking activated! Align your posture to begin counting reps.");
                }}
                className="w-full py-3 rounded-xl bg-olive-600 hover:bg-olive-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg"
                id="start-workout-btn"
              >
                <Play className="w-4 h-4" />
                Start Rep Scanner
              </button>
            )}
          </div>
        </div>

        {/* Muscle Anatomy/Tip Block */}
        <div className="bg-slate-900/60 border border-olive-900/40 rounded-3xl p-5 space-y-3">
          <h5 className="text-xs font-mono font-bold text-slate-400 tracking-wider">
            STUDENT ERGONOMICS & MOVEMENT TIP
          </h5>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            "Prolonged studying shrinks chest muscles, pulls shoulders forward, and strains lower backs. A short workout consisting of <strong>10 squats</strong> or <strong>10 pushups</strong> instantly stretches tight hip flexors and opens chest walls, sending a surge of fresh oxygenated blood to your brain's prefrontal cortex."
          </p>
        </div>

      </div>

      {/* Session Workout Summary Modal */}
      <AnimatePresence>
        {workoutSummary && workoutSummary.show && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-slate-900 border border-olive-900/50 rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(101,136,69,0.15)] relative overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin text-center"
              id="workout-summary-modal"
            >
              {/* Visual Decorative Light Beam */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-olive-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-olive-950/40 border border-olive-500/30 rounded-2xl flex items-center justify-center">
                  <Flame className="w-8 h-8 text-olive-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-olive-400 uppercase tracking-widest font-semibold">
                    WORKOUT COMPLETE
                  </span>
                  <h3 className="text-2xl font-bold font-sans text-white tracking-tight">
                    Skeletal Rep Report
                  </h3>
                </div>

                {/* Circular Rep Counter */}
                <div className="py-4 relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center relative">
                    <div className="text-4xl font-extrabold font-mono text-white">
                      {workoutSummary.reps}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1">
                      Total Reps
                    </span>
                  </div>
                </div>

                {/* Rank Badge */}
                <div className="inline-block px-3 py-1 bg-slate-950/80 border border-olive-900/30 rounded-full text-xs font-mono text-olive-300">
                  Fitness Status: <span className="font-bold text-white">
                    {workoutSummary.reps >= 15 ? '🏆 Campus Athlete' :
                     workoutSummary.reps >= 8 ? '🔥 Kinetic Power' :
                     workoutSummary.reps >= 1 ? '🌱 Active Spark' :
                     '🧠 Getting Ready'}
                  </span>
                </div>

                {/* Metrics Breakdown Bento */}
                <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/60 text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Exercise Type:</span>
                    <span className="text-slate-200 font-semibold capitalize">
                      {workoutSummary.workoutType}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Estimated Calories Burned:</span>
                    <span className="text-orange-400 font-semibold">{Math.round(workoutSummary.calories)} kcal</span>
                  </div>

                  <div className="pt-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">
                      POINTS BREAKDOWN:
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reps Reward ({workoutSummary.reps} x 5):</span>
                        <span className="text-emerald-400">+{workoutSummary.points} PTS</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-2 text-sm font-bold mt-1">
                        <span className="text-white">Total Points Balance Gain:</span>
                        <span className="text-emerald-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          +{workoutSummary.points} PTS
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setWorkoutSummary(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-olive-500 hover:bg-olive-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg mt-4"
                  id="dismiss-workout-summary-btn"
                >
                  Claim Workout Points & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
