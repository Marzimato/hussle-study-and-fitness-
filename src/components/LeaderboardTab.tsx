import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Trophy, Check, ArrowUp, Award, Zap, Star } from 'lucide-react';
import { BalanceMetrics, ActivityLog } from '../types';

interface LeaderboardTabProps {
  metrics: BalanceMetrics;
  logs: ActivityLog[];
}

interface Participant {
  id: string;
  name: string;
  points: number;
  avatarUrl?: string;
  isUser?: boolean;
  initials?: string;
}

export default function LeaderboardTab({ metrics, logs }: LeaderboardTabProps) {
  // Static participants on the leaderboard matching screenshots
  const staticParticipants: Participant[] = [
    {
      id: 'p1',
      name: 'Alex Mercer',
      points: 4150,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      id: 'p2',
      name: 'Sarah Chen',
      points: 3820,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      id: 'p3',
      name: 'David Kim',
      points: 3260,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    },
    {
      id: 'p5',
      name: 'Elena Rodriguez',
      points: 2710,
      initials: 'ER',
    },
    {
      id: 'p6',
      name: 'Maria Garcia',
      points: 2450,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
    }
  ];

  // Dynamic daily balance bonus calculation from logs
  const totalBonusPoints = useMemo(() => {
    const days: { [key: string]: { study: number; fitness: number } } = {};

    logs.forEach(log => {
      const dateKey = new Date(log.timestamp).toDateString();

      if (!days[dateKey]) {
        days[dateKey] = { study: 0, fitness: 0 };
      }

      if (log.type === 'study') {
        days[dateKey].study += log.score;
      } else if (log.type === 'fitness') {
        days[dateKey].fitness += log.score;
      }
    });

    let totalBonus = 0;
    Object.values(days).forEach(({ study, fitness }) => {
      if (study >= 25 && fitness >= 25) {
        totalBonus += 30;
      }
      if (study >= 50 && fitness >= 50) {
        totalBonus += 50;
      }
    });

    return totalBonus;
  }, [logs]);

  // Dynamic user points calculation including balance bonuses
  const userTotalPoints = useMemo(() => {
    return metrics.studyPoints + metrics.fitnessPoints + totalBonusPoints;
  }, [metrics, totalBonusPoints]);

  // Combine static list with current user state and sort
  const sortedParticipants = useMemo(() => {
    const list = [
      ...staticParticipants,
      {
        id: 'user',
        name: 'You',
        points: userTotalPoints,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
        isUser: true,
      }
    ];
    return list.sort((a, b) => b.points - a.points);
  }, [userTotalPoints]);

  // Find user's dynamic rank (1-indexed)
  const userRank = useMemo(() => {
    return sortedParticipants.findIndex(p => p.isUser) + 1;
  }, [sortedParticipants]);

  // Calculate dynamic "points to next rank"
  const ptsToNextRankInfo = useMemo(() => {
    const userIndex = sortedParticipants.findIndex(p => p.isUser);
    if (userIndex === 0) {
      return { text: "Defending #1 Spot! 🏆", val: 0 };
    }
    const participantAhead = sortedParticipants[userIndex - 1];
    const diff = participantAhead.points - userTotalPoints;
    return {
      text: `${diff.toLocaleString()} pts to Next Rank`,
      val: diff
    };
  }, [sortedParticipants, userTotalPoints]);

  return (
    <div className="space-y-6 animate-fadeIn max-w-xl mx-auto" id="leaderboard-tab-content">
      
      {/* Header Intro */}
      <div className="space-y-1">
        <h3 className="text-3xl font-extrabold text-white tracking-tight font-display">
          Leaderboard
        </h3>
        <p className="text-sm text-slate-400">Top performers today.</p>
      </div>

      {/* Main Leaderboard Layout */}
      <div className="space-y-5 pb-16">
        
        {/* Banner: Primary "You" Rank Highlight Card */}
        <motion.div
          layoutId="leaderboard-user-banner"
          className="bg-white rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-between border border-white/90 text-[#0c262d] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7bc3cf]/10 rounded-full blur-2xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
          
          <div className="flex items-center gap-4 relative z-10">
            {/* Rank Number with indicator */}
            <div className="flex flex-col items-center justify-center pl-1 w-10">
              <span className="text-3xl font-black font-display text-[#0e2c35]">
                {userRank}
              </span>
              <span className="text-[10px] text-[#658845] font-bold uppercase tracking-wider flex items-center gap-0.5">
                <ArrowUp className="w-2.5 h-2.5" />
                Active
              </span>
            </div>

            {/* Avatar container with verification badge */}
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200"
                alt="Your Avatar"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#658845] rounded-full border-2 border-white flex items-center justify-center">
                <Check className="w-3 h-3 text-white stroke-[3px]" />
              </div>
            </div>

            {/* User credentials */}
            <div className="space-y-0.5">
              <h4 className="text-base font-extrabold tracking-tight text-[#0e2c35] font-display">
                You
              </h4>
              <p className="text-xs text-slate-500 font-bold font-mono">
                {ptsToNextRankInfo.text}
              </p>
              {totalBonusPoints > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] bg-[#658845]/10 text-[#425c38] px-1.5 py-0.2 rounded-full font-bold">
                  <Award className="w-2.5 h-2.5" />
                  +{totalBonusPoints} Daily Bonus
                </span>
              )}
            </div>
          </div>

          {/* Points display */}
          <div className="text-right pr-1 relative z-10">
            <span className="text-3xl font-black font-display tracking-tight text-[#0e2c35] block bg-gradient-to-br from-[#0b4351] to-[#2a5b69] bg-clip-text text-transparent">
              {userTotalPoints.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase tracking-wider mt-0.5">
              POINTS
            </span>
          </div>
        </motion.div>

        {/* List of Ranked Participants */}
        <div className="space-y-3 pt-2">
          
          {sortedParticipants.map((participant, index) => {
            const rank = index + 1;
            const isUserItem = participant.isUser;
            
            // Render different visual styles for Top 3 vs Lower Ranks
            const isTop3 = rank <= 3;
            const medalIcon = 
              rank === 1 ? '🥇' : 
              rank === 2 ? '🥈' : 
              rank === 3 ? '🥉' : null;

            if (isUserItem && rank === userRank) {
              // We already have the top highlight, so render as a clean entry if it appears in list
              return (
                <motion.div
                  key="user-list-entry"
                  layout
                  className="rounded-2xl p-4 flex items-center justify-between border-2 border-[#a7c18a]/50 bg-[#d7ebd2]/10 text-white"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 text-center font-mono font-bold text-[#a7c18a] text-sm">
                      {rank}
                    </span>
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#a7c18a]/30 shadow-sm"
                    />
                    <div>
                      <span className="text-sm font-extrabold text-[#7bc3cf]">
                        You
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-extrabold text-white">
                    {participant.points.toLocaleString()} pts
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={participant.id}
                layout
                className={`rounded-2xl p-4 flex items-center justify-between transition-all ${
                  isTop3 
                    ? 'bg-white border border-white/60 text-[#0c262d] shadow-lg hover:scale-[1.01]' 
                    : 'bg-[#12363e]/40 border border-[#1b4e5a]/30 text-white hover:bg-[#12363e]/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-8 text-center font-mono font-bold text-sm flex items-center justify-center gap-1 ${
                    isTop3 ? 'text-[#0e2c35]' : 'text-slate-400'
                  }`}>
                    <span>{rank}</span>
                    {medalIcon && <span className="text-sm shrink-0">{medalIcon}</span>}
                  </div>

                  {/* Avatar */}
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      referrerPolicy="no-referrer"
                      className={`w-11 h-11 rounded-full object-cover border shadow-sm ${
                        isTop3 ? 'border-[#0e2c35]/10' : 'border-white/5'
                      }`}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#12363e] border border-[#1b4e5a]/50 flex items-center justify-center text-xs font-mono font-bold text-[#7bc3cf] shrink-0 shadow-sm">
                      {participant.initials}
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <span className={`text-sm font-bold block ${isTop3 ? 'text-[#0e2c35]' : 'text-slate-100'}`}>
                      {participant.name}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-sm font-mono font-bold ${isTop3 ? 'text-[#0e2c35]' : 'text-slate-300'}`}>
                    {participant.points.toLocaleString()}
                  </span>
                  <span className={`text-[9px] block font-mono ${isTop3 ? 'text-slate-400' : 'text-slate-500'}`}>
                    pts
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Elegant Divider */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="h-[1px] w-20 bg-white/10" />
            <div className="flex gap-1 items-center">
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="w-1 h-1 rounded-full bg-white/20" />
            </div>
            <div className="h-[1px] w-20 bg-white/10" />
          </div>

        </div>

      </div>

    </div>
  );
}
