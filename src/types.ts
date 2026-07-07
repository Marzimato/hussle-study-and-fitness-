export type PostureStatus = 'calibrating' | 'good' | 'too-close' | 'too-far' | 'restless' | 'no-face';

export interface PostureState {
  status: PostureStatus;
  eyeDistance: number;
  baselineDistance: number;
  noseMovement: number;
  restlessnessIndex: number;
  isCalibrated: boolean;
}

export type WorkoutType = 'squats' | 'pushups';
export type PoseStatus = 'standing' | 'down' | 'none';

export interface WorkoutSession {
  type: WorkoutType;
  reps: number;
  calories: number;
  points: number;
  isActive: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  points: number;
}

export interface BalanceMetrics {
  studyPoints: number;
  fitnessPoints: number;
  studyMinutes: number;
  fitnessReps: number;
  streakDays: number;
  lastUpdated: string; // ISO date
}

export interface ActivityLog {
  id: string;
  type: 'study' | 'fitness';
  title: string;
  timestamp: string;
  duration: number; // in seconds
  score: number; // points earned
  details: string; // e.g., "12 reps, 95% form accuracy" or "25m focus, 88% ideal posture"
}

export interface SystemAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  requirement: string;
}

export interface UserGoals {
  dailyStudyMinutes: number;
  dailySquatsReps: number;
  dailyPushupsReps: number;
  weeklyFitnessMinutes: number;
}

