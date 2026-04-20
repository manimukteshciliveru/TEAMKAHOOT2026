import React from 'react';
import { Trophy, Target, Star, TrendingUp, AlertCircle, Award } from 'lucide-react';

const StudentPerformanceSummary = ({ stats, totalQuestions }) => {
    if (!stats) return null;

    const { userRank, totalParticipants, averageScore, highestScore, userScore } = stats;
    const maxScore = totalQuestions * 10;
    const percentile = totalParticipants > 1 ? (1 - (userRank - 1) / (totalParticipants - 1)) * 100 : 100;

    const getPerformanceZone = () => {
        if (percentile >= 90) return {
            label: 'Top 10%',
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/10',
            border: 'border-yellow-400/20',
            icon: Trophy,
            message: 'Exceptional performance! You mastered this arena.'
        };
        if (percentile >= 75) return {
            label: 'Top 25%',
            color: 'text-indigo-400',
            bg: 'bg-indigo-400/10',
            border: 'border-indigo-400/20',
            icon: Star,
            message: "Great job! You're among the elite performers."
        };
        if (userScore > averageScore) return {
            label: 'Above Average',
            color: 'text-green-400',
            bg: 'bg-green-400/10',
            border: 'border-green-400/20',
            icon: TrendingUp,
            message: 'Solid work! You performed better than most.'
        };
        if (userScore >= averageScore * 0.8) return {
            label: 'Average',
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20',
            icon: Target,
            message: "Good effort! You're keeping pace with the class."
        };
        return {
            label: 'Needs Improvement',
            color: 'text-orange-400',
            bg: 'bg-orange-400/10',
            border: 'border-orange-400/20',
            icon: AlertCircle,
            message: 'Keep practicing! Every attempt makes you stronger.'
        };
    };

    const zone = getPerformanceZone();
    const ZoneIcon = zone.icon;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Main Score Card */}
            <div className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border ${zone.border} rounded-[3rem] p-10 md:p-12 shadow-2xl`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-32 -mt-32 blur-3xl opacity-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-shrink-0">
                        <div className={`w-40 h-40 ${zone.bg} rounded-[2.5rem] flex items-center justify-center border-4 ${zone.border} shadow-2xl relative group transition-transform duration-500 hover:scale-105`}>
                            <ZoneIcon size={72} className={`${zone.color} drop-shadow-2xl`} />
                            {percentile >= 75 && (
                                <div className="absolute -top-4 -right-4 bg-[#ff6b00] text-white p-2 rounded-full shadow-lg animate-bounce">
                                    <Award size={24} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-1">
                            <span className={`text-xs font-black uppercase tracking-[0.3em] ${zone.color}`}>{zone.label}</span>
                            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                                {zone.message}
                            </h2>
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm italic">
                            You've conquered {userRank === 1 ? 'the peak' : `rank #${userRank}`} in this mission.
                        </p>
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-center group hover:bg-white/10 transition-colors">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Your Score</p>
                        <p className="text-4xl font-black italic text-[#ff6b00]">{userScore}</p>
                        <p className="text-[10px] font-bold text-gray-600 mt-1">out of {maxScore}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-center group hover:bg-white/10 transition-colors">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Class Rank</p>
                        <p className="text-4xl font-black italic text-white">#{userRank}</p>
                        <p className="text-[10px] font-bold text-gray-600 mt-1">out of {totalParticipants}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-center group hover:bg-white/10 transition-colors">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Class Average</p>
                        <p className="text-4xl font-black italic text-indigo-400">{Math.round(averageScore)}</p>
                        <p className="text-[10px] font-bold text-gray-600 mt-1">Top Score: {highestScore}</p>
                    </div>
                </div>
            </div>

            {/* Motivational Quote or Tip */}
            <div className="bg-[#ff6b00]/10 border border-[#ff6b00]/20 p-6 rounded-3xl flex items-center gap-4">
                <div className="bg-[#ff6b00] p-2 rounded-xl text-white shadow-lg shadow-[#ff6b00]/20">
                    <TrendingUp size={20} />
                </div>
                <p className="text-xs font-bold text-gray-300 italic">
                    "Success is not final, failure is not fatal: it is the courage to continue that counts."
                </p>
            </div>
        </div>
    );
};

export default StudentPerformanceSummary;
