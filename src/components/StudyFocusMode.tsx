import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Camera, AlertCircle, CheckCircle2, 
  HelpCircle, Sparkles, Plus, Trash2, Sliders, ChevronRight, Check
} from 'lucide-react';
import { PostureState, Task, ActivityLog } from '../types';

interface StudyFocusModeProps {
  onEarnPoints: (points: number, minutes: number, detail: string) => void;
  onAddLog: (log: ActivityLog) => void;
}

export default function StudyFocusMode({ onEarnPoints, onAddLog }: StudyFocusModeProps) {
  // Focus States
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [chosenDuration, setChosenDuration] = useState(1500);
  const [earnedPointsThisSession, setEarnedPointsThisSession] = useState(0);

  // Task list states
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Outline computer systems report', completed: false, points: 15 },
    { id: '2', text: 'Revise linear algebra chapter 4', completed: true, points: 15 },
    { id: '3', text: 'Complete discrete math proofs', completed: false, points: 15 },
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [sessionSummary, setSessionSummary] = useState<{
    show: boolean;
    focusScore: number;
    duration: number;
    basePoints: number;
    focusBonus: number;
    completionBonus: number;
    totalPoints: number;
    postureAdherence: number;
    isEarly: boolean;
  } | null>(null);

  // Posture States
  const [posture, setPosture] = useState<PostureState>({
    status: 'no-face',
    eyeDistance: 0,
    baselineDistance: 100, // initialized to a standard baseline
    noseMovement: 0,
    restlessnessIndex: 0,
    isCalibrated: false,
  });

  // Camera and MediaPipe integration states
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  // Simulation controls (when webcam is disabled or fails)
  const [simulatedDistance, setSimulatedDistance] = useState(100);
  const [simulatedMovement, setSimulatedMovement] = useState(2);

  // Refs for tracking
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaPipeRef = useRef<{ camera: any; faceMesh: any } | null>(null);
  const previousNoseRef = useRef<{ x: number; y: number } | null>(null);
  const postureAccumulatorRef = useRef<{ goodFrames: number; totalFrames: number }>({ goodFrames: 0, totalFrames: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check if MediaPipe is available in the window scope
  useEffect(() => {
    const checkLoaded = setInterval(() => {
      if ((window as any).FaceMesh && (window as any).Camera) {
        setIsMediaPipeLoaded(true);
        clearInterval(checkLoaded);
      }
    }, 500);
    return () => clearInterval(checkLoaded);
  }, []);

  // Web Audio synth helper for posture alert sound (no static assets needed)
  const playAlertSound = (type: 'beep' | 'success') => {
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

      if (type === 'beep') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Success chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio context might be blocked or unsupported in sandbox environment
    }
  };

  // Handler for session completion (both early finish and natural timer elapsed)
  const handleSessionComplete = (isEarlyFinish = false) => {
    setIsTimerRunning(false);
    playAlertSound('success');

    const totalFrames = postureAccumulatorRef.current.totalFrames;
    const goodFrames = postureAccumulatorRef.current.goodFrames;

    const goodRatio = totalFrames === 0 
      ? 100 
      : Math.round((goodFrames / totalFrames) * 100);

    // Calculate elapsed seconds and minutes
    const elapsedSeconds = chosenDuration - timerSeconds;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    // Calculate Focus Quality Bonus points (proportional to focus score)
    // E.g. up to 30 points bonus for perfect focus, prorated if finished early
    const maxBonus = 30;
    const earlyMultiplier = isEarlyFinish ? (elapsedSeconds / chosenDuration) : 1;
    const focusBonus = Math.round((goodRatio / 100) * maxBonus * earlyMultiplier);
    
    const basePoints = earnedPointsThisSession;
    const completionBonus = isEarlyFinish ? 2 : 10;
    const totalPointsAwarded = basePoints + focusBonus + completionBonus;

    // Award bonus points to global store
    if (focusBonus > 0) {
      onEarnPoints(focusBonus, 0, `Focus Quality Bonus: ${goodRatio}% focus score`);
    }
    if (completionBonus > 0) {
      onEarnPoints(completionBonus, 0, isEarlyFinish ? "Partial session completion bonus" : "Focus interval completion bonus!");
    }

    // Add activity log
    onAddLog({
      id: Math.random().toString(36).substr(2, 9),
      type: 'study',
      title: isEarlyFinish ? 'Study Session (Partial)' : 'Focus Study Interval',
      timestamp: new Date().toISOString(),
      duration: isEarlyFinish ? elapsedSeconds : chosenDuration,
      score: totalPointsAwarded,
      details: `${isEarlyFinish ? `${elapsedMinutes}m partial` : `${Math.round(chosenDuration / 60)}m`} session completed. Focus Score: ${goodRatio}%. Earned ${totalPointsAwarded} pts.`
    });

    // Open custom stylized summary modal
    setSessionSummary({
      show: true,
      focusScore: goodRatio,
      duration: isEarlyFinish ? elapsedSeconds : chosenDuration,
      basePoints,
      focusBonus,
      completionBonus,
      totalPoints: totalPointsAwarded,
      postureAdherence: goodRatio,
      isEarly: isEarlyFinish
    });

    // Reset session trackers
    postureAccumulatorRef.current = { goodFrames: 0, totalFrames: 0 };
    setEarnedPointsThisSession(0);
  };

  // Timer Countdown logic
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        // Track posture state every second for highly accurate final focus score
        const isPostureOk = posture.status === 'good';
        postureAccumulatorRef.current.totalFrames += 1;
        if (isPostureOk) {
          postureAccumulatorRef.current.goodFrames += 1;
        }

        // Check if we hit a minute boundary (using the current seconds before we decrement)
        if (timerSeconds % 60 === 0 && timerSeconds !== chosenDuration) {
          const earned = isPostureOk ? 5 : 1; // 5 pts for focused posture, 1 pt if slouched/restless
          setEarnedPointsThisSession((p) => p + earned);
          onEarnPoints(
            earned, 
            1, 
            isPostureOk 
              ? "Highly focused study interval with ergonomic posture" 
              : "Study interval completed with minor posture warnings"
          );
        }

        setTimerSeconds(timerSeconds - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      handleSessionComplete(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, posture.status, chosenDuration]);

  // Handle tasks addition
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTaskText.trim(),
      completed: false,
      points: 10
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextState = !t.completed;
        if (nextState) {
          // Earn points for completing task
          onEarnPoints(t.points, 0, `Task completed: "${t.text}"`);
          playAlertSound('success');
        }
        return { ...t, completed: nextState };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Start real computer vision webcam tracking with MediaPipe
  const startTracking = async () => {
    setCameraError(null);
    setIsSimulated(false);
    
    // Ensure scripts are loaded or fall back to high fidelity sandbox simulation
    if (!(window as any).FaceMesh) {
      setCameraError("Webcam libraries could not be loaded in this sandboxed environment. Enabled cybernetic face mesh simulator.");
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
      initializeMediaPipe();
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access was denied or is unavailable in this browser preview. Switched to smart calibration simulation.");
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
    setPosture(p => ({ ...p, status: 'no-face' }));
  };

  // Initialize MediaPipe Face Mesh
  const initializeMediaPipe = () => {
    if (mediaPipeRef.current) return;

    const FaceMeshClass = (window as any).FaceMesh;
    const CameraClass = (window as any).Camera;

    const faceMesh = new FaceMeshClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    faceMesh.onResults((results: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Left Eye outer corner (Landmark 33) & Right Eye outer corner (Landmark 263)
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        // Nose Tip (Landmark 1)
        const nose = landmarks[1];

        // 1. Calculate Eye Distance (Euclidean)
        const dx = (leftEye.x - rightEye.x) * canvas.width;
        const dy = (leftEye.y - rightEye.y) * canvas.height;
        const rawEyeDistance = Math.sqrt(dx * dx + dy * dy);

        // 2. Calculate Nose Movement (Restlessness)
        let rawNoseMovement = 0;
        if (previousNoseRef.current) {
          const ndx = (nose.x - previousNoseRef.current.x) * canvas.width;
          const ndy = (nose.y - previousNoseRef.current.y) * canvas.height;
          rawNoseMovement = Math.sqrt(ndx * ndx + ndy * ndy);
        }
        previousNoseRef.current = { x: nose.x, y: nose.y };

        // Draw HUD UI over face on Canvas
        drawFaceHUD(ctx, landmarks, canvas.width, canvas.height, leftEye, rightEye, nose);

        // Update posture states with running filters
        setPosture((prev) => {
          // Low-pass filter for restlessness
          const nextRestless = prev.restlessnessIndex * 0.8 + rawNoseMovement * 0.2;
          
          let nextStatus: typeof prev.status = 'good';
          
          if (!prev.isCalibrated) {
            nextStatus = 'calibrating';
          } else {
            // Compare to baseline
            const ratio = rawEyeDistance / prev.baselineDistance;
            if (ratio > 1.22) {
              nextStatus = 'too-close';
            } else if (ratio < 0.78) {
              nextStatus = 'too-far';
            } else if (nextRestless > 6.5) {
              nextStatus = 'restless';
            }
          }

          // Trigger audio beep on bad posture occasionally (throttled)
          if (isTimerRunning && (nextStatus === 'too-close' || nextStatus === 'too-far') && Math.random() < 0.04) {
            playAlertSound('beep');
          }

          return {
            ...prev,
            eyeDistance: rawEyeDistance,
            noseMovement: rawNoseMovement,
            restlessnessIndex: nextRestless,
            status: nextStatus
          };
        });

      } else {
        // No face detected
        setPosture((prev) => ({ ...prev, status: 'no-face' }));
        // Draw no face HUD
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6e8fae';
        ctx.font = '14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText("FACIAL SCAN LOST: PLACE FACE IN FOCUS FRAME", canvas.width / 2, canvas.height / 2);
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
              await faceMesh.send({ image: videoRef.current });
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
        faceMesh 
      };
    } catch (e) {
      console.error("Camera instance start failed:", e);
      setIsSimulated(true);
    }
  };

  // Draw cybernetic bluish HUD elements over face
  const drawFaceHUD = (
    ctx: CanvasRenderingContext2D, 
    landmarks: any[], 
    width: number, 
    height: number,
    leftEye: any,
    rightEye: any,
    nose: any
  ) => {
    // 1. Draw eyes target crosshairs
    const drawTarget = (x: number, y: number, color: string, radius: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - radius - 4, y);
      ctx.lineTo(x + radius + 4, y);
      ctx.moveTo(x, y - radius - 4);
      ctx.lineTo(x, y + radius + 4);
      ctx.stroke();
    };

    const eyeL_x = leftEye.x * width;
    const eyeL_y = leftEye.y * height;
    const eyeR_x = rightEye.x * width;
    const eyeR_y = rightEye.y * height;
    const nose_x = nose.x * width;
    const nose_y = nose.y * height;

    const themeColor = posture.status === 'good' ? '#6e8fae' : '#f59e0b';
    
    // Draw targets on outer eye corners
    drawTarget(eyeL_x, eyeL_y, themeColor, 8);
    drawTarget(eyeR_x, eyeR_y, themeColor, 8);

    // Draw lines connecting eyes
    ctx.strokeStyle = 'rgba(110, 143, 174, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(eyeL_x, eyeL_y);
    ctx.lineTo(eyeR_x, eyeR_y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw nose focus marker
    ctx.fillStyle = posture.status === 'restless' ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(nose_x, nose_y, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Draw outer boundary bounding box
    ctx.strokeStyle = 'rgba(110, 143, 174, 0.2)';
    ctx.strokeRect(20, 20, width - 40, height - 40);
  };

  // Safe Posture Simulation (when camera fails or is omitted)
  useEffect(() => {
    if (!isSimulated || !isCameraOn) return;

    const timer = setInterval(() => {
      // Calculate derived simulated posture
      setPosture((prev) => {
        let nextStatus: typeof prev.status = 'good';
        
        if (!prev.isCalibrated) {
          nextStatus = 'calibrating';
        } else {
          const ratio = simulatedDistance / prev.baselineDistance;
          if (ratio > 1.22) {
            nextStatus = 'too-close';
          } else if (ratio < 0.78) {
            nextStatus = 'too-far';
          } else if (simulatedMovement > 6.5) {
            nextStatus = 'restless';
          }
        }

        // Trigger alarm beep during session
        if (isTimerRunning && (nextStatus === 'too-close' || nextStatus === 'too-far') && Math.random() < 0.05) {
          playAlertSound('beep');
        }

        return {
          ...prev,
          eyeDistance: simulatedDistance,
          noseMovement: simulatedMovement,
          restlessnessIndex: prev.restlessnessIndex * 0.85 + simulatedMovement * 0.15,
          status: nextStatus
        };
      });

      // Slowly float the simulated distance back toward baseline for usability
      setSimulatedDistance(prev => {
        const diff = 100 - prev;
        return prev + diff * 0.05;
      });
      // Slowly float movement down
      setSimulatedMovement(prev => Math.max(1, prev - 0.2));

    }, 300);

    return () => clearInterval(timer);
  }, [isSimulated, isCameraOn, simulatedDistance, simulatedMovement, isTimerRunning]);

  // Redraw virtual face grid when in simulation mode
  useEffect(() => {
    if (!isSimulated || !isCameraOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid (cybernetic look)
    ctx.strokeStyle = 'rgba(110, 143, 174, 0.05)';
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

    // Centered simulated face coordinates
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Scale face size based on simulatedDistance (which ranges from 40 to 160)
    const scale = simulatedDistance / 100;
    const faceW = 150 * scale;
    const faceH = 205 * scale;

    // Add slight random jiggle based on simulatedMovement
    const jiggleX = (Math.random() - 0.5) * simulatedMovement * 1.5;
    const jiggleY = (Math.random() - 0.5) * simulatedMovement * 1.5;

    const fX = centerX + jiggleX;
    const fY = centerY + jiggleY;

    // Draw cybernetic face wireframe oval
    ctx.strokeStyle = posture.status === 'good' ? 'rgba(110, 143, 174, 0.3)' : 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(fX, fY, faceW, faceH, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw outer HUD boundaries
    ctx.strokeStyle = 'rgba(110, 143, 174, 0.15)';
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Eyes positions (relative to fX, fY)
    const eyeOffsetX = 45 * scale;
    const eyeOffsetY = -25 * scale;

    const leftEyeX = fX - eyeOffsetX;
    const rightEyeX = fX + eyeOffsetX;
    const eyesY = fY + eyeOffsetY;

    // Draw eyes targets
    const drawTarget = (x: number, y: number, color: string, radius: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - radius - 4, y);
      ctx.lineTo(x + radius + 4, y);
      ctx.moveTo(x, y - radius - 4);
      ctx.lineTo(x, y + radius + 4);
      ctx.stroke();
    };

    const themeColor = posture.status === 'good' ? '#6e8fae' : '#f59e0b';
    drawTarget(leftEyeX, eyesY, themeColor, 10 * scale);
    drawTarget(rightEyeX, eyesY, themeColor, 10 * scale);

    // Draw line connecting eyes
    ctx.strokeStyle = 'rgba(110, 143, 174, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(leftEyeX, eyesY);
    ctx.lineTo(rightEyeX, eyesY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw nose focus marker
    const noseY = fY + 15 * scale;
    ctx.fillStyle = posture.status === 'restless' ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(fX, noseY, 5 * scale, 0, 2 * Math.PI);
    ctx.fill();

    // Draw eyebrows/forehead lines for high-fidelity vector look
    ctx.strokeStyle = 'rgba(110, 143, 174, 0.2)';
    ctx.beginPath();
    ctx.moveTo(fX - 60 * scale, fY - 50 * scale);
    ctx.lineTo(fX - 20 * scale, fY - 45 * scale);
    ctx.moveTo(fX + 20 * scale, fY - 45 * scale);
    ctx.lineTo(fX + 60 * scale, fY - 50 * scale);
    ctx.stroke();

    // Draw mouth line
    ctx.beginPath();
    ctx.arc(fX, fY + 65 * scale, 25 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Pure visual vector face rendering complete
  }, [isSimulated, isCameraOn, simulatedDistance, simulatedMovement, posture.status, posture.baselineDistance, posture.restlessnessIndex]);

  // Calibrate current head distance as baseline healthy distance
  const calibratePosture = () => {
    if (posture.eyeDistance === 0 && !isSimulated) {
      setCameraError("Calibration failed: No face detected. Make sure you sit directly facing the camera and try again.");
      return;
    }
    
    const calibratedDistance = isSimulated ? simulatedDistance : posture.eyeDistance;
    setPosture((prev) => ({
      ...prev,
      baselineDistance: calibratedDistance || 100,
      isCalibrated: true,
      status: 'good'
    }));
    setCameraError(null);
    playAlertSound('success');
  };

  // Preset countdown controls
  const setDurationPreset = (mins: number) => {
    setIsTimerRunning(false);
    setTimerSeconds(mins * 60);
    setChosenDuration(mins * 60);
    setEarnedPointsThisSession(0);
  };

  // Helper formatting mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6" id="study-focus-workspace">
        
        {/* The Digital Sanctuary Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 rounded-2xl border border-studygrey-950/50 gap-3">
          <div>
            <div className="text-xs font-mono text-studygrey-400 font-bold tracking-widest uppercase">
              Section 01 // Academics
            </div>
            <h3 className="text-xl font-display font-bold text-white mt-1">
              Aesthetic Study Sanctuary
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-studygrey-950 border border-studygrey-800/40 rounded-full text-xs text-studygrey-300 font-mono self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-studygrey-400 inline-block animate-pulse" />
            STEEL BLUE THEME
          </div>
        </div>

        {/* Posture HUD & Webcam Monitor */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative glow-study transition-all duration-500">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <span className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-studygrey-300 border border-studygrey-800/40 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-studygrey-400" />
              Webcam Posture Scanner
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10">
            {posture.status === 'good' && (
              <span className="bg-emerald-950/80 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-800 animate-pulse flex items-center gap-1">
                ✓ POSTURE PERFECT
              </span>
            )}
            {posture.status === 'too-close' && (
              <span className="bg-amber-950/90 backdrop-blur-md text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-700 animate-bounce flex items-center gap-1">
                ⚠️ TOO CLOSE TO SCREEN
              </span>
            )}
            {posture.status === 'too-far' && (
              <span className="bg-amber-950/90 backdrop-blur-md text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-700 animate-bounce flex items-center gap-1">
                ⚠️ TOO FAR / SLOUCHING
              </span>
            )}
            {posture.status === 'restless' && (
              <span className="bg-orange-950/95 backdrop-blur-md text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-800 animate-pulse flex items-center gap-1">
                🫨 RESTLESS MOVEMENT
              </span>
            )}
            {posture.status === 'calibrating' && (
              <span className="bg-studygrey-900/90 backdrop-blur-md text-studygrey-300 px-3 py-1 rounded-full text-xs font-bold border border-studygrey-700 animate-pulse flex items-center gap-1">
                ⊙ UNCALIBRATED POSTURE
              </span>
            )}
            {posture.status === 'no-face' && (
              <span className="bg-slate-950/80 backdrop-blur-md text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-800 flex items-center gap-1">
                ● CAMERA STANDBY
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
          <div className="w-full aspect-video bg-slate-950 flex items-center justify-center relative overflow-hidden" id="webcam-viewport">
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
              <div className="absolute inset-0 border border-studygrey-500/10 pointer-events-none" />
            )}

            {!isCameraOn && (
              <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3 sm:space-y-4 w-full h-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-studygrey-950 border border-studygrey-800/40 flex items-center justify-center">
                  <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-studygrey-400" />
                </div>
                <div className="max-w-sm space-y-1.5 sm:space-y-2">
                  <h4 className="text-sm sm:text-base font-semibold text-white">Posture Ergonomics Guard</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed px-2">
                    Uses local computer vision to calculate distances from your screen. Alerts you instantly when you slouch, tilt, or get too close.
                  </p>
                </div>
                <button
                  onClick={startTracking}
                  className="px-4 py-2 rounded-xl bg-studygrey-500 hover:bg-studygrey-400 text-slate-950 font-semibold text-[11px] sm:text-xs transition-all shadow-lg flex items-center gap-1.5"
                  id="activate-camera-btn"
                >
                  Enable Posture Tracking
                </button>
              </div>
            )}
          </div>

          {/* Calibrate & Controls bar */}
          {isCameraOn && (
            <div className="bg-slate-950/90 border-t border-slate-800 p-4 flex flex-col sm:flex-row gap-3 justify-between items-center text-center sm:text-left">
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs text-slate-200 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                  Step 1: Calibrate Distance
                </span>
                <span className="text-[10px] text-slate-400">
                  Sit up straight at your normal study distance and click Calibrate.
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={calibratePosture}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-studygrey-600 hover:bg-studygrey-500 text-white font-medium text-xs transition-colors shadow-inner text-center"
                  id="calibrate-btn"
                >
                  {posture.isCalibrated ? "Recalibrate Posture" : "Calibrate Posture"}
                </button>
                <button
                  onClick={stopTracking}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors text-center"
                  id="stop-camera-btn"
                >
                  Turn Camera Off
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Polished, non-overlapping Telemetry Dashboard Bar */}
        {isCameraOn && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center font-mono text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">State</div>
              <span className={`font-bold uppercase text-[11px] ${posture.status === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {posture.status}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Eye Distance</div>
              <span className="font-bold text-white text-[11px]">{Math.round(posture.eyeDistance)}px</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Baseline</div>
              <span className="font-bold text-slate-400 text-[11px]">{Math.round(posture.baselineDistance)}px</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Restlessness</div>
              <span className="font-bold text-[#7bc3cf] text-[11px]">{posture.restlessnessIndex.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Simulated Posture sliders for ease of review inside sandboxed browser if camera lacks permission */}
        {isCameraOn && isSimulated && (
          <div className="bg-studygrey-950/60 border border-studygrey-900/60 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-studygrey-400" />
                <span className="text-xs font-semibold text-studygrey-300">Webcam Simulator Panel</span>
              </div>
              <span className="text-[10px] bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded">
                Active Sandbox Fallback
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400">
              Adjust sliders below to simulate movement or posture changes and test alerts:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1 text-slate-400">
                  <span>Simulated Eye Distance:</span>
                  <span className="text-studygrey-400 font-bold">{Math.round(simulatedDistance)}px</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="160" 
                  value={simulatedDistance}
                  onChange={(e) => setSimulatedDistance(Number(e.target.value))}
                  className="w-full accent-studygrey-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Slouched (Far)</span>
                  <span>Healthy ({Math.round(posture.baselineDistance)}px)</span>
                  <span>Too Close</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1 text-slate-400">
                  <span>Instant Restlessness:</span>
                  <span className="text-studygrey-400 font-bold">{simulatedMovement.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  step="0.5"
                  value={simulatedMovement}
                  onChange={(e) => setSimulatedMovement(Number(e.target.value))}
                  className="w-full accent-studygrey-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Calm/Still</span>
                  <span>Moderate Shift</span>
                  <span>High Restless (Beep)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-side Balanced Sub-grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* The Pomodoro Timer Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden h-fit">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-studygrey-400 font-bold tracking-widest uppercase">
                CYBERNETIC POMODORO
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                +5 PTS / FOCUS MIN
              </span>
            </div>

            {/* Huge Clock face */}
            <div className="text-center py-6">
              <div className="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-white mb-2" id="pomodoro-clock">
                {formatTime(timerSeconds)}
              </div>
              <p className="text-xs text-slate-400 font-sans">
                {isTimerRunning ? 'Posture scanner is actively logging points...' : 'Ready to start focus study session'}
              </p>
            </div>

            {/* Quick Session Presets */}
            <div className="grid grid-cols-4 gap-2 w-full">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDurationPreset(mins)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono transition-all text-center ${
                    chosenDuration === mins * 60
                      ? 'bg-studygrey-900/60 border border-studygrey-500 text-studygrey-300 font-bold'
                      : 'bg-slate-950/60 hover:bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                  id={`preset-${mins}-btn`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-3 justify-center">
                {isTimerRunning ? (
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow"
                    id="pause-timer-btn"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Study
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsTimerRunning(true);
                      if (!isCameraOn) {
                        startTracking(); // automatically try starting tracking when starting timer
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-studygrey-500 hover:bg-studygrey-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg"
                    id="start-timer-btn"
                  >
                    <Play className="w-4 h-4" />
                    Start Study
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(chosenDuration);
                    setEarnedPointsThisSession(0);
                    postureAccumulatorRef.current = { goodFrames: 0, totalFrames: 0 };
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-medium text-xs transition-all flex items-center justify-center"
                  id="reset-timer-btn"
                  title="Reset timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {timerSeconds < chosenDuration && (
                <button
                  onClick={() => handleSessionComplete(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md border border-emerald-500/30"
                  id="finish-early-score-btn"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  End Session & Score Focus
                </button>
              )}
            </div>
          </div>

          {/* Focus Score accumulation progress */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">SESSION GAIN:</span>
            <span className="text-studygrey-300 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              +{earnedPointsThisSession} PTS
            </span>
          </div>
        </div>

        {/* Task Tracker Panel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-mono font-bold text-slate-300 tracking-wider">
              STUDY GOALS CHECKLIST
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              +15 PTS / GOAL
            </span>
          </div>

          {/* Quick task adder */}
          <form onSubmit={handleAddTask} className="flex gap-2" id="task-add-form">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="What are you studying next?"
              className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-studygrey-700 focus:outline-none rounded-xl text-xs text-white"
            />
            <button
              type="submit"
              className="p-2 bg-studygrey-600 hover:bg-studygrey-500 text-white rounded-xl transition-all"
              id="add-task-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Task list body */}
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1" id="task-list">
            <AnimatePresence initial={false}>
              {tasks.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4 font-sans italic">
                  All goals complete. Enter a new objective!
                </p>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                        : 'bg-slate-950 border-slate-800/80 hover:border-studygrey-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          task.completed
                            ? 'bg-studygrey-500 border-studygrey-500 text-slate-950'
                            : 'border-slate-700 hover:border-studygrey-500'
                        }`}
                        id={`toggle-task-${task.id}`}
                      >
                        {task.completed && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                      </button>
                      <span className={`text-xs text-slate-200 font-sans ${task.completed ? 'line-through text-slate-500' : ''}`}>
                        {task.text}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-600 hover:text-red-400 p-1 rounded-lg transition-colors"
                      id={`delete-task-${task.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Session Focus Score Summary Modal */}
      <AnimatePresence>
        {sessionSummary && sessionSummary.show && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-slate-900 border border-olive-900/50 rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(101,136,69,0.15)] relative overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin"
              id="session-summary-modal"
            >
              {/* Visual Decorative Light Beam */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-olive-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                    SESSION COMPLETE
                  </span>
                  <h3 className="text-2xl font-bold font-sans text-white tracking-tight">
                    Focus Score Report
                  </h3>
                </div>

                {/* Score Circular Display */}
                <div className="py-4 relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center relative">
                    {/* SVG Radial Progress */}
                    <svg className="absolute -rotate-90 w-full h-full p-1.5 overflow-visible">
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        className="stroke-emerald-500 fill-none stroke-[6px]"
                        strokeDasharray={2 * Math.PI * 58}
                        strokeDashoffset={2 * Math.PI * 58 * (1 - sessionSummary.focusScore / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-4xl font-extrabold font-mono text-white">
                      {sessionSummary.focusScore}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1">
                      Focus score
                    </span>
                  </div>
                </div>

                {/* Rank Badges */}
                <div className="inline-block px-3 py-1 bg-slate-950/80 border border-olive-900/30 rounded-full text-xs font-mono text-olive-300">
                  Focus Rank: <span className="font-bold text-white">
                    {sessionSummary.focusScore >= 90 ? '🏆 Zen Master' :
                     sessionSummary.focusScore >= 75 ? '🔥 Deep Focus' :
                     sessionSummary.focusScore >= 50 ? '🌱 Steady Progress' :
                     '🧠 Wandering Mind'}
                  </span>
                </div>

                {/* Metrics Breakdown Bento */}
                <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/60 text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Duration Studied:</span>
                    <span className="text-slate-200 font-semibold">
                      {Math.floor(sessionSummary.duration / 60)}m {sessionSummary.duration % 60}s
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-500">Adherence to Good Posture:</span>
                    <span className="text-slate-200 font-semibold">{sessionSummary.postureAdherence}%</span>
                  </div>

                  <div className="pt-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">
                      POINTS BREAKDOWN:
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Interval Base Points:</span>
                        <span className="text-slate-200">+{sessionSummary.basePoints} PTS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Focus Quality Bonus:</span>
                        <span className="text-emerald-400">+{sessionSummary.focusBonus} PTS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Completion Bonus:</span>
                        <span className="text-amber-400">+{sessionSummary.completionBonus} PTS</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-2 text-sm font-bold mt-1">
                        <span className="text-white">Total Points Balance Gain:</span>
                        <span className="text-emerald-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          +{sessionSummary.totalPoints} PTS
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSessionSummary(null);
                    setTimerSeconds(chosenDuration);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-studygrey-500 hover:bg-studygrey-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg mt-4"
                  id="dismiss-summary-btn"
                >
                  Return to Dashboard & Claim Points
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
