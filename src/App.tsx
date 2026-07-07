import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, BookOpen, Dumbbell, Trophy, History, Flame, 
  Sparkles, CheckCircle2, RefreshCw, Star, ArrowRight, Zap,
  Calendar as CalendarIcon, ArrowLeft
} from 'lucide-react';
import { BalanceMetrics, ActivityLog, SystemAchievement } from './types';
import BalanceMeter from './components/BalanceMeter';
import StudyFocusMode from './components/StudyFocusMode';
import FitnessWorkoutMode from './components/FitnessWorkoutMode';
import CalendarTab from './components/CalendarTab';
import LeaderboardTab from './components/LeaderboardTab';

const STORAGE_METRICS_KEY = 'campus_balance_metrics';
const STORAGE_LOGS_KEY = 'campus_balance_logs';
const STORAGE_ACHIEVEMENTS_KEY = 'campus_balance_achievements';

// Initialized to match the exact 2,840 points starting state of "You" on the leaderboard screenshot!
const INITIAL_METRICS: BalanceMetrics = {
  studyPoints: 1520,
  fitnessPoints: 1320,
  studyMinutes: 420,
  fitnessReps: 115,
  streakDays: 5,
  lastUpdated: new Date().toISOString(),
};

// Initialized with realistic mock items matching the calendar dates and logs from the screenshots!
const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    type: 'study',
    title: 'Study Typography',
    timestamp: new Date(2024, 7, 3, 10, 0, 0).toISOString(), // Aug 3, 2024
    duration: 7200, // 2 hours
    score: 120,
    details: 'Reviewed visual rhythm, sans vs display headings.',
  },
  {
    id: 'log-2',
    type: 'study',
    title: 'Morning Meditation',
    timestamp: new Date(2024, 7, 2, 8, 30, 0).toISOString(), // Aug 2, 2024
    duration: 1800, // 30 mins
    score: 30,
    details: 'Breathing cycles and focus calibration.',
  },
  {
    id: 'log-3',
    type: 'fitness',
    title: 'Deep Squats Challenge',
    timestamp: new Date(2024, 7, 4, 15, 0, 0).toISOString(), // Aug 4, 2024
    duration: 0,
    score: 75,
    details: 'Completed 15 squat reps with pose tracking.',
  }
];

const INITIAL_ACHIEVEMENTS: SystemAchievement[] = [
  {
    id: 'ach-1',
    title: 'Mind & Body Sync',
    description: 'Reach a perfect 50% balance score with both scores above zero',
    icon: 'Shield',
    requirement: 'Perfect ratio balance',
    unlockedAt: new Date(2024, 7, 2).toISOString(),
  },
  {
    id: 'ach-2',
    title: 'Sedentary Buster',
    description: 'Complete a workout set of at least 10 reps',
    icon: 'Flame',
    requirement: '10+ reps completed',
    unlockedAt: new Date(2024, 7, 3).toISOString(),
  },
  {
    id: 'ach-3',
    title: 'Posture Scholar',
    description: 'Study with posture tracking turned on',
    icon: 'BookOpen',
    requirement: 'Enable webcam posture scanner',
    unlockedAt: new Date(2024, 7, 2).toISOString(),
  },
  {
    id: 'ach-4',
    title: 'Consistency Star',
    description: 'Maintain a study and fitness balance streak of 3 or more days',
    icon: 'Trophy',
    requirement: 'Streak is 3+ days',
    unlockedAt: new Date(2024, 7, 4).toISOString(),
  },
];

export default function App() {
  // Navigation active state - Tab overhaul (tools, calendar, leaderboard)
  const [activeTab, setActiveTab] = useState<'tools' | 'calendar' | 'leaderboard'>('tools');

  // Sub-state under Tools to handle launching Study Sanctuary or Active Kinetic Arena
  const [activeTool, setActiveTool] = useState<'study' | 'fitness' | null>(null);

  // Core metrics and persistent states
  const [metrics, setMetrics] = useState<BalanceMetrics>(INITIAL_METRICS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [achievements, setAchievements] = useState<SystemAchievement[]>(INITIAL_ACHIEVEMENTS);

  const STORAGE_GOALS_KEY = 'campus_balance_goals';
  const DEFAULT_GOALS = {
    dailyStudyMinutes: 60,
    dailySquatsReps: 30,
    dailyPushupsReps: 20,
    weeklyFitnessMinutes: 60,
  };

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [tempGoals, setTempGoals] = useState(DEFAULT_GOALS);

  // Load from local storage
  useEffect(() => {
    const savedMetrics = localStorage.getItem(STORAGE_METRICS_KEY);
    const savedLogs = localStorage.getItem(STORAGE_LOGS_KEY);
    const savedAchievements = localStorage.getItem(STORAGE_ACHIEVEMENTS_KEY);
    const savedGoals = localStorage.getItem(STORAGE_GOALS_KEY);

    if (savedMetrics) {
      try {
        setMetrics(JSON.parse(savedMetrics));
      } catch (e) {
        console.error("Failed to parse metrics", e);
      }
    }
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error("Failed to parse logs", e);
      }
    }
    if (savedAchievements) {
      try {
        setAchievements(JSON.parse(savedAchievements));
      } catch (e) {
        console.error("Failed to parse achievements", e);
      }
    }
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals);
        setGoals(parsed);
        setTempGoals(parsed);
      } catch (e) {
        console.error("Failed to parse goals", e);
      }
    }
  }, []);

  // Save changes to local storage helper
  const saveMetrics = (newMetrics: BalanceMetrics) => {
    setMetrics(newMetrics);
    localStorage.setItem(STORAGE_METRICS_KEY, JSON.stringify(newMetrics));
  };

  const saveGoals = (newGoals: typeof DEFAULT_GOALS) => {
    setGoals(newGoals);
    localStorage.setItem(STORAGE_GOALS_KEY, JSON.stringify(newGoals));
  };

  const saveLogs = (newLogs: ActivityLog[]) => {
    setLogs(newLogs);
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(newLogs));
  };

  const saveAchievements = (newAchievements: SystemAchievement[]) => {
    setAchievements(newAchievements);
    localStorage.setItem(STORAGE_ACHIEVEMENTS_KEY, JSON.stringify(newAchievements));
  };

  // Add a new activity log
  const handleAddLog = (newLog: ActivityLog) => {
    const updated = [newLog, ...logs];
    saveLogs(updated);
  };

  // Quick point incremental handler
  const handleEarnPoints = (points: number, minutesOrReps: number, detail: string) => {
    let nextStudyPts = metrics.studyPoints;
    let nextFitnessPts = metrics.fitnessPoints;
    let nextStudyMins = metrics.studyMinutes;
    let nextFitnessReps = metrics.fitnessReps;

    if (detail.toLowerCase().includes('squat') || detail.toLowerCase().includes('pushup') || detail.toLowerCase().includes('fitness') || detail.toLowerCase().includes('workout')) {
      nextFitnessPts += points;
      nextFitnessReps += minutesOrReps; // 'minutesOrReps' variable holds reps in fitness callback
    } else {
      nextStudyPts += points;
      nextStudyMins += minutesOrReps;
    }

    const updatedMetrics: BalanceMetrics = {
      ...metrics,
      studyPoints: nextStudyPts,
      fitnessPoints: nextFitnessPts,
      studyMinutes: nextStudyMins,
      fitnessReps: nextFitnessReps,
      lastUpdated: new Date().toISOString()
    };

    saveMetrics(updatedMetrics);
    checkAchievements(updatedMetrics);
  };

  // Gamification logic: dynamically check and unlock achievements
  const checkAchievements = (currentMetrics: BalanceMetrics) => {
    const { studyPoints, fitnessPoints, studyMinutes, fitnessReps, streakDays } = currentMetrics;
    const total = studyPoints + fitnessPoints;
    const ratio = total === 0 ? 50 : (studyPoints / total) * 100;

    let updatedAchievements = achievements.map(ach => {
      // Don't modify already unlocked ones
      if (ach.unlockedAt) return ach;

      let isUnlocked = false;

      if (ach.id === 'ach-1') {
        // perfect balance
        if (total > 0 && ratio >= 45 && ratio <= 55 && studyPoints > 15 && fitnessPoints > 15) {
          isUnlocked = true;
        }
      } else if (ach.id === 'ach-2') {
        // complete 10 reps
        if (fitnessReps >= 10) {
          isUnlocked = true;
        }
      } else if (ach.id === 'ach-3') {
        // study posture active
        if (studyMinutes > 5) {
          isUnlocked = true;
        }
      } else if (ach.id === 'ach-4') {
        // Maintain 3 day streak
        if (streakDays >= 3) {
          isUnlocked = true;
        }
      }

      if (isUnlocked) {
        return {
          ...ach,
          unlockedAt: new Date().toISOString()
        };
      }
      return ach;
    });

    // Check if any newly unlocked
    const newlyUnlockedCount = updatedAchievements.filter((a, i) => a.unlockedAt && !achievements[i].unlockedAt).length;
    if (newlyUnlockedCount > 0) {
      saveAchievements(updatedAchievements);
    }
  };

  // Quick reset to starting state
  const handleQuickReset = () => {
    const resetM: BalanceMetrics = {
      studyPoints: 0,
      fitnessPoints: 0,
      studyMinutes: 0,
      fitnessReps: 0,
      streakDays: 0,
      lastUpdated: new Date().toISOString()
    };
    saveMetrics(resetM);
    saveLogs([]);
    const resetA = INITIAL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlockedAt: undefined
    }));
    saveAchievements(resetA);
    saveGoals(DEFAULT_GOALS);
    setTempGoals(DEFAULT_GOALS);
    setIsEditingGoals(false);
  };

  // Dynamic Goal Progress calculations
  const goalsProgress = React.useMemo(() => {
    const todayStr = new Date().toDateString();
    
    // Logs from today
    const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === todayStr);

    // 1. Daily Study Minutes
    const studyMins = todayLogs
      .filter(log => log.type === 'study')
      .reduce((sum, log) => sum + Math.round(log.duration / 60), 0);

    // 2. Daily Squats Reps
    const squatsReps = todayLogs
      .filter(log => log.type === 'fitness' && (log.title.toLowerCase().includes('squat') || log.details.toLowerCase().includes('squat')))
      .reduce((sum, log) => sum + Math.round(log.score / 5), 0);

    // 3. Daily Pushups Reps
    const pushupsReps = todayLogs
      .filter(log => log.type === 'fitness' && (log.title.toLowerCase().includes('pushup') || log.details.toLowerCase().includes('pushup')))
      .reduce((sum, log) => sum + Math.round(log.score / 5), 0);

    // 4. Weekly Fitness Minutes (last 7 days)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyFitnessLogs = logs.filter(log => 
      log.type === 'fitness' && new Date(log.timestamp).getTime() >= oneWeekAgo
    );
    
    const weeklyFitnessMins = weeklyFitnessLogs.reduce((sum, log) => {
      const durationSec = log.duration > 0 ? log.duration : Math.round(log.score / 5) * 4; // 4s fallback per rep
      return sum + (durationSec / 60);
    }, 0);

    return {
      studyMins,
      squatsReps,
      pushupsReps,
      weeklyFitnessMins: Math.round(weeklyFitnessMins),
    };
  }, [logs]);

  // Helper render for achievement icons
  const renderAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-studygrey-400" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      default:
        return <Star className="w-5 h-5 text-amber-400" />;
    }
  };

  // Custom Podium Icon matching Image 2
  const PodiumIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16" />
      <path d="M6 20v-6h4v6" />
      <path d="M10 20V10h4v10" />
      <path d="M14 20v-4h4v4" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#0c262d] text-slate-100 flex flex-col font-sans selection:bg-[#7bc3cf]/20 pb-28">
      
      {/* Top Header Navigation (Matched to Image 1 and 3 perfectly) */}
      <nav className="border-b border-white/5 bg-[#0a2025]/85 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            {/* The 3 interlocking circles matching the "bubble_chart" visual perfectly in light cyan */}
            <svg className="w-8 h-8 text-[#7bc3cf]" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="9" r="4.2" />
              <circle cx="16.5" cy="13" r="3.2" />
              <circle cx="11.5" cy="17" r="2.7" />
            </svg>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white font-display">
                Hussle
              </span>
              <span className="text-[10px] font-bold text-[#7bc3cf]/80 lowercase -mt-1 tracking-wide">
                hussle without hassle
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Matched to Image Reference Layout) */}
          <div className="hidden md:flex items-center gap-1 bg-[#12363e]/40 p-1.5 rounded-full border border-[#1b4e5a]/30">
            <button
              onClick={() => { setActiveTab('tools'); setActiveTool(null); }}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'tools'
                  ? 'bg-white text-[#0c262d] shadow-sm'
                  : 'text-[#7bc3cf] hover:text-white'
              }`}
              id="desktop-tab-tools"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Tools
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-white text-[#0c262d] shadow-sm'
                  : 'text-[#7bc3cf] hover:text-white'
              }`}
              id="desktop-tab-calendar"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-[#0c262d] shadow-sm'
                  : 'text-[#7bc3cf] hover:text-white'
              }`}
              id="desktop-tab-leaderboard"
            >
              <PodiumIcon className="w-3.5 h-3.5" />
              Leaderboard
            </button>
          </div>

          {/* Right Side: Circular Profile Indicator */}
          <div className="w-10 h-10 rounded-full border-2 border-[#1b4e5a]/30 bg-[#12363e]/40 flex items-center justify-center text-slate-300">
            <svg className="w-5 h-5 text-[#7bc3cf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          
        </div>
      </nav>

      {/* Main Content Arena */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Tools view */}
          {activeTab === 'tools' && (
            <motion.div
              key="tools-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              id="tools-tab-content"
            >
              {/* If no tool is active: render the beautiful Hub Dashboard */}
              {activeTool === null ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  
                  {/* Title & Description of Tools View matching screenshot perfectly */}
                  <div className="space-y-1">
                    <h3 className="text-3xl font-extrabold text-white tracking-tight font-display">
                      Your Tools
                    </h3>
                    <p className="text-sm text-slate-400">Select a mode to begin your session.</p>
                  </div>

                  {/* Sleek, minimalistic Points & Balance Tracker with Dynamic Weekly Bonuses */}
                  <BalanceMeter metrics={metrics} logs={logs} onQuickReset={handleQuickReset} />

                  {/* Launchers Grid: side-by-side layout for optimized screen usage */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Launcher 1: Focus Mode Card */}
                    <div 
                      className="bg-[#ecf2f4] rounded-[2.5rem] p-7 sm:p-8 flex flex-col justify-between group transition-all duration-300 shadow-xl border border-[#dae6e8] relative overflow-hidden"
                      id="dashboard-goto-study"
                    >
                      <div className="flex justify-between items-start">
                        {/* Smile emoji circle badge */}
                        <div className="w-12 h-12 bg-[#dae6e8] rounded-2xl flex items-center justify-center text-[#0e2c35] shrink-0">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                          </svg>
                        </div>

                        {/* Category Badge */}
                        <span className="bg-[#d7ebd2] text-[#325a2b] rounded-full px-4 py-1.5 text-xs font-semibold">
                          Mental Clarity
                        </span>
                      </div>

                      <div className="mt-6 space-y-2">
                        <h4 className="text-3xl font-extrabold text-[#0e2c35] font-display tracking-tight">Focus Mode</h4>
                        <p className="text-sm text-[#0e2c35]/85 leading-relaxed">
                          Enhance concentration with facial tracking and ambient soundscapes.
                        </p>
                      </div>

                      <div className="mt-6 pt-2 flex items-center justify-between">
                        <button
                          onClick={() => setActiveTool('study')}
                          className="bg-[#0c1c24] hover:bg-[#122a36] text-white rounded-full font-bold px-7 py-3.5 text-sm flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <span>Start Session</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="text-[10px] font-mono font-bold text-[#0e2c35]/65 bg-[#dae6e8] px-3 py-1.5 rounded-full">
                          {metrics.studyMinutes}m logged • {metrics.studyPoints} pts
                        </div>
                      </div>
                    </div>

                    {/* Launcher 2: Fitness Mode Card */}
                    <div 
                      className="bg-[#ecf2f4] rounded-[2.5rem] p-7 sm:p-8 flex flex-col justify-between group transition-all duration-300 shadow-xl border border-[#dae6e8] relative overflow-hidden"
                      id="dashboard-goto-fitness"
                    >
                      <div className="flex justify-between items-start">
                        {/* Dumbbell / Athlete circle badge */}
                        <div className="w-12 h-12 bg-[#dae6e8] rounded-2xl flex items-center justify-center text-[#0e2c35] shrink-0">
                          <Dumbbell className="w-5 h-5" />
                        </div>

                        {/* Category Badge */}
                        <span className="bg-[#cdeafc] text-[#1a4d74] rounded-full px-4 py-1.5 text-xs font-semibold">
                          Physical Activity
                        </span>
                      </div>

                      <div className="mt-6 space-y-2">
                        <h4 className="text-3xl font-extrabold text-[#0e2c35] font-display tracking-tight">Fitness Mode</h4>
                        <p className="text-sm text-[#0e2c35]/85 leading-relaxed">
                          Track full-body movement and improve your physical performance.
                        </p>
                      </div>

                      <div className="mt-6 pt-2 flex items-center justify-between">
                        <button
                          onClick={() => setActiveTool('fitness')}
                          className="bg-[#0c1c24] hover:bg-[#122a36] text-white rounded-full font-bold px-7 py-3.5 text-sm flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <span>Start Session</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="text-[10px] font-mono font-bold text-[#0e2c35]/65 bg-[#dae6e8] px-3 py-1.5 rounded-full">
                          {metrics.fitnessReps} reps logged • {metrics.fitnessPoints} pts
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Side-by-Side: Customizable Goals and Recent Sessions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Goals & Customizable Targets Card */}
                    <div className="bg-[#12363e]/40 border border-[#1b4e5a]/30 rounded-[2.5rem] p-6 space-y-4 shadow-xl flex flex-col justify-between" id="customizable-goals-card">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-[#1b4e5a]/20 pb-3">
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-400" />
                            <h4 className="text-base font-bold text-white tracking-tight">Your Goals</h4>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#7bc3cf]/80 uppercase">
                            TODAY'S TARGETS
                          </span>
                        </div>

                        {isEditingGoals ? (
                          <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-slate-400 font-bold block">DAILY STUDY (MINS)</label>
                                <input
                                  type="number"
                                  min="5"
                                  max="300"
                                  value={tempGoals.dailyStudyMinutes}
                                  onChange={(e) => setTempGoals({ ...tempGoals, dailyStudyMinutes: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-[#0a2025]/80 border border-[#1b4e5a]/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7bc3cf]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-slate-400 font-bold block">WEEKLY ACTIVE (MINS)</label>
                                <input
                                  type="number"
                                  min="10"
                                  max="600"
                                  value={tempGoals.weeklyFitnessMinutes}
                                  onChange={(e) => setTempGoals({ ...tempGoals, weeklyFitnessMinutes: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-[#0a2025]/80 border border-[#1b4e5a]/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7bc3cf]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-slate-400 font-bold block">DAILY SQUATS (REPS)</label>
                                <input
                                  type="number"
                                  min="5"
                                  max="200"
                                  value={tempGoals.dailySquatsReps}
                                  onChange={(e) => setTempGoals({ ...tempGoals, dailySquatsReps: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-[#0a2025]/80 border border-[#1b4e5a]/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7bc3cf]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-slate-400 font-bold block">DAILY PUSHUPS (REPS)</label>
                                <input
                                  type="number"
                                  min="5"
                                  max="200"
                                  value={tempGoals.dailyPushupsReps}
                                  onChange={(e) => setTempGoals({ ...tempGoals, dailyPushupsReps: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-[#0a2025]/80 border border-[#1b4e5a]/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7bc3cf]"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => setIsEditingGoals(false)}
                                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono font-bold transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  saveGoals(tempGoals);
                                  setIsEditingGoals(false);
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-[#7bc3cf] hover:bg-[#68b5c1] text-slate-950 text-[11px] font-mono font-bold transition-all"
                              >
                                Save Goals
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* 1. Study Minutes Goal */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-slate-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Study focus time
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {goalsProgress.studyMins} / {goals.dailyStudyMinutes} min
                                </span>
                              </div>
                              <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-white/5">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.round((goalsProgress.studyMins / goals.dailyStudyMinutes) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* 2. Squats Reps Goal */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-slate-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                  Squats reps
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {goalsProgress.squatsReps} / {goals.dailySquatsReps} reps
                                </span>
                              </div>
                              <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-white/5">
                                <div 
                                  className="bg-orange-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.round((goalsProgress.squatsReps / goals.dailySquatsReps) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* 3. Pushups Reps Goal */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-slate-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#7bc3cf]" />
                                  Pushups reps
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {goalsProgress.pushupsReps} / {goals.dailyPushupsReps} reps
                                </span>
                              </div>
                              <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-white/5">
                                <div 
                                  className="bg-[#7bc3cf] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.round((goalsProgress.pushupsReps / goals.dailyPushupsReps) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* 4. Weekly Fitness Goal */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-slate-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  Weekly fitness time
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {goalsProgress.weeklyFitnessMins} / {goals.weeklyFitnessMinutes} min
                                </span>
                              </div>
                              <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-white/5">
                                <div 
                                  className="bg-blue-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.round((goalsProgress.weeklyFitnessMins / goals.weeklyFitnessMinutes) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isEditingGoals && (
                        <button
                          onClick={() => {
                            setTempGoals(goals);
                            setIsEditingGoals(true);
                          }}
                          className="w-full py-2.5 rounded-2xl bg-[#1b4e5a]/20 hover:bg-[#1b4e5a]/40 border border-[#1b4e5a]/40 text-[#7bc3cf] hover:text-white transition-all text-xs font-mono font-bold text-center mt-4"
                          id="edit-goals-btn"
                        >
                          Modify Customizable Targets
                        </button>
                      )}
                    </div>

                    {/* Recent Sessions list matching screenshot layout */}
                    <div className="bg-[#12363e]/40 border border-[#1b4e5a]/30 rounded-[2.5rem] p-6 space-y-4 shadow-xl" id="recent-sessions-container">
                      <div className="flex justify-between items-center border-b border-[#1b4e5a]/20 pb-3">
                        <h4 className="text-base font-bold text-white tracking-tight">Recent Sessions</h4>
                        <button className="text-[#7bc3cf] text-xs font-mono font-bold hover:underline">View All</button>
                      </div>

                      <div className="space-y-4">
                        {logs.slice(0, 3).map(log => (
                          <div key={log.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-[#12363e] text-[#7bc3cf] border border-[#1b4e5a]/30 flex items-center justify-center shrink-0">
                                {log.type === 'study' ? (
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                                    <path d="M12 7v5l3 3" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-white">{log.title}</h5>
                                <p className="text-xs text-slate-400 font-mono">
                                  {log.type === 'study' ? 'Focus Mode' : 'Fitness Mode'} • {log.type === 'study' ? `${Math.round(log.duration / 60)} min` : `${log.score / 5} reps`}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {new Date(log.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) === new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) ? 'Today' : 'Yesterday'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Achievements Row */}
                  <div className="bg-[#12363e]/15 border border-[#1b4e5a]/20 rounded-[2.5rem] p-6 space-y-4" id="dashboard-achievements">
                    <div className="flex items-center gap-2 border-b border-[#1b4e5a]/20 pb-3">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                        BALANCE ACHIEVEMENTS
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {achievements.slice(0, 4).map(ach => (
                        <div 
                          key={ach.id}
                          className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                            ach.unlockedAt 
                              ? 'bg-[#0a2025]/60 border-[#1b4e5a]/40' 
                              : 'bg-[#0a2025]/10 border-white/5 opacity-40'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            ach.unlockedAt ? 'bg-[#12363e]/50 border border-[#1b4e5a]/30' : 'bg-[#0a2025]'
                          }`}>
                            {renderAchievementIcon(ach.icon)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate">{ach.title}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1 leading-normal">{ach.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                /* Active tool viewer with quick back button */
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="flex justify-between items-center bg-[#0a2025]/60 p-2.5 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setActiveTool(null)}
                      className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors group px-3 py-1.5 rounded-xl hover:bg-white/5"
                      id="back-to-tools-btn"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      <span>Back to Tools Hub</span>
                    </button>

                    {/* Compact toggle to jump between modes */}
                    <div className="flex bg-[#0a2025] p-1 rounded-xl border border-white/5 text-[11px] font-mono">
                      <button
                        onClick={() => setActiveTool('study')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                          activeTool === 'study' ? 'bg-[#7bc3cf]/20 text-[#7bc3cf]' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Focus Mode
                      </button>
                      <button
                        onClick={() => setActiveTool('fitness')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                          activeTool === 'fitness' ? 'bg-[#a7c18a]/20 text-[#a7c18a]' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Fitness Mode
                      </button>
                    </div>
                  </div>

                  {activeTool === 'study' ? (
                    <StudyFocusMode onEarnPoints={handleEarnPoints} onAddLog={handleAddLog} />
                  ) : (
                    <FitnessWorkoutMode onEarnPoints={handleEarnPoints} onAddLog={handleAddLog} />
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 2: Calendar tracking view */}
          {activeTab === 'calendar' && (
            <motion.div
              key="calendar-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              id="calendar-tab-content-wrapper"
            >
              <CalendarTab 
                logs={logs} 
                metrics={metrics} 
                onAddLog={handleAddLog} 
                onEarnPoints={handleEarnPoints} 
              />
            </motion.div>
          )}

          {/* Tab 3: Leaderboard view */}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              id="leaderboard-tab-content-wrapper"
            >
              <LeaderboardTab metrics={metrics} logs={logs} />
            </motion.div>
          )}

        </AnimatePresence>
        
      </main>

      {/* Floating Bottom Tab Navigation Bar (100% Screenshot-grade design matching Image 2 & 3) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-sm w-[calc(100%-2rem)] bg-[#041013]/95 backdrop-blur-xl border border-white/10 rounded-[2.5rem] px-3.5 py-2.5 flex justify-around items-center z-50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] md:hidden">
        
        {/* Tools Button */}
        <button
          onClick={() => { setActiveTab('tools'); setActiveTool(null); }}
          className="relative transition-all"
          id="mobile-tab-tools"
        >
          {activeTab === 'tools' ? (
            <motion.div 
              layoutId="bottom-nav-capsule"
              className="bg-white text-[#0c262d] rounded-full py-2.5 px-6 font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              <Dumbbell className="w-4 h-4 text-[#0c262d]" />
              <span>Tools</span>
            </motion.div>
          ) : (
            <div className="text-[#52747d] hover:text-white rounded-full px-4 py-2.5 text-xs flex items-center gap-2 font-bold transition-all">
              <Dumbbell className="w-4 h-4" />
              <span>Tools</span>
            </div>
          )}
        </button>

        {/* Calendar Button */}
        <button
          onClick={() => setActiveTab('calendar')}
          className="relative transition-all"
          id="mobile-tab-calendar"
        >
          {activeTab === 'calendar' ? (
            <motion.div 
              layoutId="bottom-nav-capsule"
              className="bg-white text-[#0c262d] rounded-full py-2.5 px-6 font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              <CalendarIcon className="w-4 h-4 text-[#0c262d]" />
              <span>Calendar</span>
            </motion.div>
          ) : (
            <div className="text-[#52747d] hover:text-white rounded-full px-4 py-2.5 text-xs flex items-center gap-2 font-bold transition-all">
              <CalendarIcon className="w-4 h-4" />
              <span>Calendar</span>
            </div>
          )}
        </button>

        {/* Leaderboard Button */}
        <button
          onClick={() => setActiveTab('leaderboard')}
          className="relative transition-all"
          id="mobile-tab-leaderboard"
        >
          {activeTab === 'leaderboard' ? (
            <motion.div 
              layoutId="bottom-nav-capsule"
              className="bg-white text-[#0c262d] rounded-full py-2.5 px-6 font-bold text-xs flex items-center gap-2 shadow-lg"
            >
              <PodiumIcon className="w-4 h-4 text-[#0c262d]" />
              <span>Rank</span>
            </motion.div>
          ) : (
            <div className="text-[#52747d] hover:text-white rounded-full px-4 py-2.5 text-xs flex items-center gap-2 font-bold transition-all">
              <PodiumIcon className="w-4 h-4" />
              <span>Rank</span>
            </div>
          )}
        </button>

      </div>

      {/* Humble aesthetic footer */}
      <footer className="border-t border-white/5 py-6 text-center text-[10px] text-slate-500 font-mono mt-12 pb-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>HUSSLE WORKSPACE // COGNITIVE INTEGRAL BALANCE ENGINE</div>
          <div>© {new Date().getFullYear()} STABLE HEALTH-ACADEMIC ECOSYSTEM</div>
        </div>
      </footer>
    </div>
  );
}

