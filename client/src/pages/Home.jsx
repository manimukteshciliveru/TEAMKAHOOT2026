import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import Swal from 'sweetalert2';
import {
    BookOpen,
    CheckCircle,
    Award,
    Search,
    Trophy,
    Layout,
    Loader2,
    Activity,
    Target,
    BarChart,
    Zap,
    PlayCircle
} from 'lucide-react';

export default function Home() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleJoin = async () => {
        if (!joinCode || joinCode.length !== 6) return showToast('Please enter a valid 6-digit code', 'warning');

        setIsJoining(true);
        try {
            const res = await api.post('/quiz/join', { code: joinCode });
            if (res.data.isLive) {
                navigate(`/live-room-student/${joinCode}`);
            } else {
                navigate(`/quiz/attempt/${res.data.quizId}`);
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.msg || 'Invalid Join Code', 'error');
        } finally {
            setIsJoining(false);
        }
    };

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const [liveRes, historyRes] = await Promise.all([
                    api.get('/quiz/live'),
                    api.get('/quiz/history/student')
                ]);

                const liveQuizzes = liveRes.data;
                const historicalQuizzes = historyRes.data || [];
                
                // Merge and deduplicate by ID, prioritizing live status and attempt data
                const quizMap = new Map();
                
                // Process live quizzes first
                liveQuizzes.forEach(q => quizMap.set(q._id.toString(), q));
                
                // Merge historical data (will overwrite if same ID exists)
                historicalQuizzes.forEach(q => {
                    const id = q._id.toString();
                    if (quizMap.has(id)) {
                        quizMap.set(id, { ...quizMap.get(id), ...q });
                    } else {
                        quizMap.set(id, q);
                    }
                });

                const combined = Array.from(quizMap.values());
                
                setQuizzes(combined.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)));
            } catch (err) {
                console.error('Error fetching quizzes', err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuizzes();
    }, []);

    const last5Quizzes = quizzes.slice(0, 5);
    
    const stats = {
        total: quizzes.length,
        completed: quizzes.filter(q => q.isAttempted).length,
        attendanceRatio: quizzes.length > 0 ? (quizzes.filter(q => q.isAttempted).length / quizzes.length * 100).toFixed(0) : 0,
        avgScore: quizzes.filter(q => q.isAttempted).length > 0
            ? quizzes.filter(q => q.isAttempted).reduce((acc, curr) => acc + curr.score, 0) / quizzes.filter(q => q.isAttempted).length
            : 0,
        bestRank: quizzes.filter(q => q.isAttempted).length > 0
            ? Math.min(...quizzes.filter(q => q.isAttempted).map(q => typeof q.rank === 'number' ? q.rank : 9999))
            : null
    };

    const bestRankDisplay = (stats.bestRank === null || stats.bestRank === 9999) ? 'N/A' : `#${stats.bestRank}`;

    return (
        <DashboardLayout role="student">
            <div className="space-y-10 pb-12 relative">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight italic">
                            Student <span className="text-[#ff6b00]">Dashboard</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium italic uppercase tracking-wider text-sm">Welcome back! Here's your performance overview.</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3.5 border border-white/10 bg-white/5 text-white rounded-2xl focus:ring-2 focus:ring-[#ff6b00] shadow-sm w-full md:w-80 font-medium"
                        />
                    </div>
                </div>

                {/* Metrics Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500">
                    {[
                        { label: 'Quizzes Taken', value: stats.completed, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
                        { label: 'Avg. Accuracy', value: `${stats.avgScore.toFixed(0)}%`, icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-500/20' },
                        { label: 'Best Rank', value: bestRankDisplay, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20' },
                        { label: 'Participation', value: `${stats.attendanceRatio}%`, icon: Activity, color: 'text-[#ff6b00]', bg: 'bg-[#ff6b00]/10', border: 'border-[#ff6b00]/20' },
                    ].map((stat, idx) => (
                        <div key={idx} className={`bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border ${stat.border} shadow-xl flex flex-col items-center text-center transition-transform hover:scale-[1.02]`}>
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl mb-4 shadow-inner`}>
                                <stat.icon size={24} />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Live Sessions Section */}
                {!loading && quizzes.filter(q => (q.attemptStatus !== 'completed' && q.status !== 'Completed') && q.isLive).length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 rounded-lg">
                                    <Activity size={20} className="text-white" />
                                </div>
                                Live Sessions
                            </h2>
                            <span className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                                Live Lobby Open
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {quizzes.filter(q => (q.attemptStatus !== 'completed' && q.status !== 'Completed') && q.isLive).slice(0, 6).map((quiz) => (
                                <div 
                                    key={quiz._id}
                                    onClick={() => navigate(`/live-room-student/${quiz.joinCode}`)}
                                    className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer overflow-hidden ring-1 ring-white/5"
                                >
                                    <div className="absolute top-0 right-0 p-6 text-indigo-500/20 group-hover:text-indigo-500/40 transition-colors">
                                        <Zap size={64} fill="currentColor" />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="px-3 py-1 bg-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20">
                                                Live Lobby
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                                                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-tighter">Active Now</span>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-tight group-hover:text-indigo-400 transition-colors">{quiz.title}</h3>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="flex -space-x-2">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{quiz.totalQuestions} Questions</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Assignments Section */}
                {!loading && quizzes.filter(q => (q.attemptStatus !== 'completed' && q.status !== 'Completed') && !q.isLive).length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                                <div className="bg-emerald-500 p-2 rounded-lg">
                                    <PlayCircle size={20} className="text-white" />
                                </div>
                                Active Assignments
                            </h2>
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                                Deadline Approaching
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {quizzes.filter(q => (q.attemptStatus !== 'completed' && q.status !== 'Completed') && !q.isLive).slice(0, 6).map((quiz) => (
                                <div 
                                    key={quiz._id}
                                    onClick={() => navigate(`/quiz/attempt/${quiz._id}`)}
                                    className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer overflow-hidden ring-1 ring-white/5"
                                >
                                    <div className="absolute top-0 right-0 p-6 text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors">
                                        <Zap size={64} fill="currentColor" />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="px-3 py-1 bg-emerald-500 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20">
                                                Assignment
                                            </div>
                                            {quiz.scheduledEndTime && (
                                                <div className="flex items-center gap-1.5 text-red-400 font-black text-[9px] uppercase tracking-tighter">
                                                    <Clock size={12} /> Due {new Date(quiz.scheduledEndTime).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-tight group-hover:text-emerald-400 transition-colors">{quiz.title}</h3>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="flex -space-x-2">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{quiz.totalQuestions} Questions</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Join Quiz via Code */}
                    <div className="space-y-6 animate-in slide-in-from-left-8 duration-700 delay-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                                <div className="bg-[#ff6b00] p-2 rounded-lg">
                                    <Zap className="text-white" size={20} fill="currentColor" />
                                </div>
                                Join via Code
                            </h2>
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#ff6b00] to-indigo-600 rounded-[3rem] blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl p-10 text-center flex flex-col items-center justify-center min-h-[350px]">
                                <p className="text-slate-400 font-bold text-xs mb-8 uppercase tracking-[0.2em] italic">Enter the 6-digit deployment code</p>
                                
                                <div className="relative mb-10 w-full max-w-[320px]">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        placeholder="••••••"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                                        onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                                        className="w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] px-6 py-6 text-5xl font-black tracking-[0.5em] placeholder:text-slate-800 focus:outline-none focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/10 transition-all text-center text-white"
                                    />
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent opacity-50"></div>
                                </div>

                                <button
                                    onClick={handleJoin}
                                    disabled={joinCode.length !== 6 || isJoining}
                                    className="w-full max-w-[320px] bg-[#ff6b00] text-white py-6 rounded-[1.5rem] font-black text-xl hover:scale-[1.02] transition-all shadow-2xl shadow-orange-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 uppercase tracking-tighter italic border-b-8 border-orange-800"
                                >
                                    {isJoining ? (
                                        <Loader2 size={28} className="animate-spin" />
                                    ) : (
                                        <>INITIALIZE SESSION <PlayCircle size={24} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Last 5 Quizzes Dashboard */}
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-700 delay-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 rounded-lg">
                                    <BarChart className="text-white" size={20} />
                                </div>
                                Recent Activity
                            </h2>
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Tracking History
                            </span>
                        </div>

                        <div className="bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-3xl p-4 min-h-[350px]">
                            {loading ? (
                                <div className="py-24 text-center">
                                    <Loader2 size={40} className="animate-spin text-[#ff6b00] inline-block mb-3" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Syncing Records...</p>
                                </div>
                            ) : last5Quizzes.length > 0 ? (
                                <div className="space-y-3">
                                    {last5Quizzes.map((quiz, qidx) => (
                                        <div 
                                            key={quiz._id} 
                                            style={{ animationDelay: `${qidx * 100}ms` }}
                                            onClick={() => {
                                                if (quiz.status === 'Missed') {
                                                    Swal.fire({
                                                        title: 'Assessment Missed',
                                                        text: 'You have missed this assessment.',
                                                        icon: 'error',
                                                        confirmButtonColor: '#ff6b00',
                                                        background: '#1e293b',
                                                        color: '#fff'
                                                    });
                                                } else if (quiz.isAttempted) {
                                                    navigate(`/report/${quiz.resultId || quiz._id}`);
                                                }
                                            }}
                                            className={`group p-5 rounded-[1.5rem] transition-all flex items-center justify-between border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500 cursor-pointer ${
                                                quiz.status === 'Missed' ? 'hover:bg-red-500/10 hover:border-red-500/20' : 'hover:bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner group-hover:scale-110 transition-transform ${
                                                    quiz.status === 'Missed' 
                                                    ? 'bg-red-500/20 text-red-500 border-red-500/10' 
                                                    : 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/10'
                                                }`}>
                                                    {quiz.status === 'Missed' ? <Activity size={28} /> : <Award size={28} />}
                                                </div>
                                                <div>
                                                    <p className={`font-black uppercase tracking-tighter italic text-lg transition-colors ${
                                                        quiz.status === 'Missed' ? 'text-red-500' : 'text-white group-hover:text-[#ff6b00]'
                                                    }`}>{quiz.title}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {quiz.status === 'Missed' ? (
                                                            <div className="flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
                                                                <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">MISSED</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                                                    <Trophy size={10} className="text-amber-500" />
                                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">RANK #{quiz.rank || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 bg-[#ff6b00]/10 px-2 py-0.5 rounded-lg border border-[#ff6b00]/20">
                                                                    <Target size={10} className="text-[#ff6b00]" />
                                                                    <span className="text-[10px] text-[#ff6b00] font-black uppercase tracking-widest">{Math.round(quiz.percentage)}% ACCURACY</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {quiz.status !== 'Missed' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/report/${quiz.resultId || quiz._id}`); }}
                                                    className="bg-white/5 text-slate-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ff6b00] hover:text-white transition-all border border-white/10 active:scale-95"
                                                >
                                                    Details
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-24 text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Activity size={32} className="text-slate-700" />
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest italic text-sm">No recent activity detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
