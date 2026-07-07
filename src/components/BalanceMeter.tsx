import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Flame, Dumbbell, BookOpen, Lock, Unlock, CheckCircle2, ArrowRight } from 'lucide-react';
import { BalanceMetrics, ActivityLog } from '../types';

interface BalanceMeterProps {
  metrics: BalanceMetrics;
  logs: ActivityLog[];
  onQuickReset?: () => void;
}

export default function BalanceMeter({ metrics, logs, onQuickReset }: BalanceMeterProps) {
  const { streakDays } = metrics;

  // Calculate weekly points dynamically from logs using the latest log as the reference week
  const weeklyStats = useMemo(() => {
    if (logs.length === 0) {
      return {
        study: 0,
        fitness: 0,
        startStr: 'Today',
        endStr: 'Today',
        referenceDate: new Date()
      };
    }

    // Sort logs descending to find the latest log
    const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestDate = new Date(sorted[0].timestamp);

    // Calculate Monday of the week containing the latest date
    const ref = new Date(latestDate);
    const day = ref.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(ref.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let study = 0;
    let fitness = 0;

    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      if (logDate >= startOfWeek && logDate <= endOfWeek) {
        if (log.type === 'study') {
          study += log.score;
        } else if (log.type === 'fitness') {
          fitness += log.score;
        }
      }
    });

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = startOfWeek.toLocaleDateString('en-US', options);
    const endStr = endOfWeek.toLocaleDateString('en-US', options);

    return {
      study,
      fitness,
      startStr,
      endStr,
      referenceDate: latestDate
    };
  }, [logs]);

  const { study: weeklyStudy, fitness: weeklyFitness, startStr, endStr } = weeklyStats;

  // Check milestone completions
  const starterUnlocked = weeklyStudy >= 40 && weeklyFitness >= 40;
  const megaUnlocked = weeklyStudy >= 80 && weeklyFitness >= 80;

  // Next milestone calculation
  const nextMilestoneInfo = useMemo(() => {
    if (!starterUnlocked) {
      const neededStudy = Math.max(0, 40 - weeklyStudy);
      const neededFitness = Math.max(0, 40 - weeklyFitness);
      return {
        title: 'Starter Balance Bonus (+50 PTS)',
        neededStudy,
        neededFitness,
        targetStudy: 40,
        targetFitness: 40,
        bonusPts: 50,
        isCompleted: false,
      };
    } else if (!megaUnlocked) {
      const neededStudy = Math.max(0, 80 - weeklyStudy);
      const neededFitness = Math.max(0, 80 - weeklyFitness);
      return {
        title: 'Mega Balance Bonus (+100 PTS)',
        neededStudy,
        neededFitness,
        targetStudy: 80,
        targetFitness: 80,
        bonusPts: 100,
        isCompleted: false,
      };
    } else {
      return {
        title: 'All Weekly Balance Bonuses Unlocked!',
        neededStudy: 0,
        neededFitness: 0,
        targetStudy: 80,
        targetFitness: 80,
        bonusPts: 150,
        isCompleted: true,
      };
    }
  }, [weeklyStudy, weeklyFitness, starterUnlocked, megaUnlocked]);

  // Total balance bonus points earned this week
  const weeklyBonusEarned = (starterUnlocked ? 50 : 0) + (megaUnlocked ? 100 : 0);

  return (
    <div className="bg-[#12363e]/40 border border-[#1b4e5a]/30 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden" id="balance-bonus-container">
      {/* Dynamic ambient background glow */}
      <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-[#7bc3cf]/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-[#a7c18a]/15 blur-3xl pointer-events-none animate-pulse" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[#7bc3cf] font-bold uppercase">
              WEEKLY BALANCE BONUS
            </span>
            <span className="text-[10px] font-mono bg-[#1b4e5a]/40 text-slate-300 px-2 py-0.5 rounded-full border border-white/5 whitespace-nowrap">
              {startStr} – {endStr}
            </span>
          </div>
          <h4 className="text-xl font-extrabold text-white font-display tracking-tight mt-0.5">
            Balanced Habits, Bigger Rewards
          </h4>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/20 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-orange-400 shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-orange-400" />
            <span>{streakDays} DAY STREAK</span>
          </div>
          
          {onQuickReset && (
            <button
              onClick={onQuickReset}
              className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-dotted underline-offset-4 font-semibold"
              title="Reset scores for demonstration"
              id="reset-scores-btn"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Weekly Summary Box (lg:col-span-5) */}
        <div className="bg-[#0a2025]/60 border border-[#1b4e5a]/20 rounded-3xl p-5 flex flex-col justify-between space-y-4 lg:col-span-5 relative overflow-hidden">
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">
              BONUS REWARDS EARNED
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-5xl font-black text-[#7bc3cf] font-display tracking-tight">
                +{weeklyBonusEarned}
              </h3>
              <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                BONUS PTS
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Earn high-yield bonuses by doing both study and physical tasks. Ratios are replaced with real, direct reward milestones!
            </p>
          </div>

          <div className="pt-2 border-t border-[#1b4e5a]/20 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-white">
              {megaUnlocked 
                ? 'All milestones reached!' 
                : starterUnlocked 
                  ? 'Starter claimed! Targeting Mega...' 
                  : 'Get at least 40 pts each to unlock Starter!'}
            </span>
          </div>
        </div>

        {/* Right Side: Active Targets & Progress Bars (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          
          {/* Active Progress Tracks */}
          <div className="space-y-3 bg-[#12363e]/20 border border-white/5 rounded-3xl p-5">
            <h5 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
              Current Weekly Focus Activity
            </h5>
            
            {/* Study Row */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[#7bc3cf]">
                  <BookOpen className="w-4 h-4" />
                  Weekly Focus Study
                </span>
                <span className="font-mono font-bold text-slate-300">
                  {weeklyStudy} pts / {nextMilestoneInfo.targetStudy} target
                </span>
              </div>
              <div className="h-2.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (weeklyStudy / nextMilestoneInfo.targetStudy) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 60 }}
                  className="h-full bg-[#7bc3cf] rounded-full"
                />
              </div>
            </div>

            {/* Fitness Row */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[#a7c18a]">
                  <Dumbbell className="w-4 h-4" />
                  Weekly Kinetic Fitness
                </span>
                <span className="font-mono font-bold text-slate-300">
                  {weeklyFitness} pts / {nextMilestoneInfo.targetFitness} target
                </span>
              </div>
              <div className="h-2.5 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (weeklyFitness / nextMilestoneInfo.targetFitness) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 60 }}
                  className="h-full bg-[#a7c18a] rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Milestone Status / Feedback */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Milestone 1 Card */}
            <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
              starterUnlocked 
                ? 'bg-[#d7ebd2]/10 border-[#c5e2be]/20 text-white' 
                : 'bg-slate-950/20 border-white/5 opacity-75'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold block text-slate-200">
                  Starter Balance
                </span>
                {starterUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#a7c18a]" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <div className="mt-2.5">
                <span className="text-[10px] font-mono font-bold block text-[#7bc3cf] uppercase tracking-wide">
                  Goal: 40 + 40 pts
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {starterUnlocked ? 'Unlocked! +50 PTS Bonus' : 'Requires 40 pts in both.'}
                </span>
              </div>
            </div>

            {/* Milestone 2 Card */}
            <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
              megaUnlocked 
                ? 'bg-[#d7ebd2]/10 border-[#c5e2be]/20 text-white' 
                : 'bg-slate-950/20 border-white/5 opacity-75'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold block text-slate-200">
                  Mega Balance
                </span>
                {megaUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#a7c18a]" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
              <div className="mt-2.5">
                <span className="text-[10px] font-mono font-bold block text-[#7bc3cf] uppercase tracking-wide">
                  Goal: 80 + 80 pts
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {megaUnlocked ? 'Unlocked! +100 PTS Bonus' : 'Requires 80 pts in both.'}
                </span>
              </div>
            </div>

          </div>

          {/* Calculations panel on what's needed next */}
          <div className="bg-[#0a2025]/40 border border-[#1b4e5a]/10 p-3 px-4 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono font-bold">NEXT TARGET:</span>
            <div className="flex items-center gap-1.5 font-bold text-[#7bc3cf]">
              {nextMilestoneInfo.isCompleted ? (
                <span>All Balance Bonuses Earned! 🏆</span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>Need:</span>
                  {nextMilestoneInfo.neededStudy > 0 && (
                    <span className="text-[#7bc3cf] font-mono">{nextMilestoneInfo.neededStudy} Study PTS</span>
                  )}
                  {nextMilestoneInfo.neededStudy > 0 && nextMilestoneInfo.neededFitness > 0 && (
                    <span className="text-slate-400">&amp;</span>
                  )}
                  {nextMilestoneInfo.neededFitness > 0 && (
                    <span className="text-[#a7c18a] font-mono">{nextMilestoneInfo.neededFitness} Fitness PTS</span>
                  )}
                  <span className="text-slate-300 font-normal">for {nextMilestoneInfo.bonusPts === 50 ? 'Starter' : 'Mega'} Bonus</span>
                </span>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
