import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
    Loader2, ChevronLeft, Target, Clock, Trophy, 
    CheckCircle, XCircle, BarChart3, AlertCircle, 
    User, Calendar, Info, ArrowRight, Share2, Download,
    Timer, Zap, Award, Activity
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function QuizReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await api.get(`/quiz/report/${id}`);
                setReport(res.data);
            } catch (err) {
                console.error('Error fetching report:', err);
                showToast('Report not found or access denied', 'error');
                navigate('/history');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id, navigate]);

    if (loading) {
        return (
            <DashboardLayout role="student">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="animate-spin text-[#ff6b00]" size={48} />
                </div>
            </DashboardLayout>
        );
    }

    if (!report) return null;

    // Prepare data for Time per Question Graph
    const timeData = report.answers.map((ans, idx) => ({
        name: `Q${idx + 1}`,
        time: ans.timeTaken || 0,
        avg: report.quiz.timerPerQuestion || 30
    }));

    // Prepare data for Accuracy Pie Chart
    const correctCount = report.answers.filter(a => a.isCorrect).length;
    const incorrectCount = report.totalQuestions - correctCount;
    const accuracyData = [
        { name: 'Correct', value: correctCount, color: '#10b981' },
        { name: 'Incorrect', value: incorrectCount, color: '#ef4444' }
    ];

    const COLORS = ['#10b981', '#ef4444'];

    return (
        <DashboardLayout role="student">
            <div className="space-y-8 pb-12 animate-in fade-in duration-700">
                {/* Top Nav/Header */}
                <div className="flex items-center justify-between gap-4">
                    <button 
                        onClick={() => navigate('/history')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group font-bold uppercase tracking-widest text-[10px]"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                            <ChevronLeft size={16} />
                        </div>
                        Back to History
                    </button>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                showToast('Link copied to clipboard!', 'success');
                            }}
                            className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <Share2 size={20} />
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-6 py-3 bg-[#ff6b00] text-white rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#ff6b00]/20"
                        >
                            <Download size={20} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Hero Stats Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] p-10 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                Performance Analysis
                            </div>
                            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-4">
                                {report.quiz.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6 text-indigo-100 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar size={18} />
                                    {new Date(report.completedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Target size={18} />
                                    {report.quiz.topic}
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={18} />
                                    Teacher: {report.quiz.teacherName}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Global Rank</p>
                                <div className="flex items-center justify-center gap-2">
                                    <Trophy className="text-yellow-400" size={24} />
                                    <span className="text-4xl font-black italic">#{report.stats.globalRank}</span>
                                </div>
                                <p className="text-[10px] text-indigo-300 mt-2">Out of {report.stats.totalParticipants} players</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Final Score</p>
                                <div className="flex items-center justify-center gap-2">
                                    <Award className="text-orange-400" size={24} />
                                    <span className="text-4xl font-black italic">{report.score}</span>
                                </div>
                                <p className="text-[10px] text-indigo-300 mt-2">Accuracy: {Math.round((correctCount/report.totalQuestions)*100)}%</p>
                            </div>
                            {report.tieBreakWeight > 0 && (
                                <div className="col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-4 text-center mt-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-1">Difficulty Bonus (Tie-Break Factor)</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <Activity className="text-emerald-400" size={14} />
                                        <span className="text-lg font-black italic text-white">{(report.tieBreakWeight).toFixed(2)}</span>
                                    </div>
                                    <p className="text-[8px] text-indigo-400 mt-1 uppercase font-bold">Higher score means you solved harder questions than your peers</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Analytical Graphs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Time Per Question Graph */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                                    <Timer size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Time Per Question</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Seconds spent on each question</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-72 w-full overflow-x-auto no-scrollbar">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeData}>
                                    <defs>
                                        <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="time" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" />
                                    <Line type="monotone" dataKey="avg" stroke="#ff6b00" strokeDasharray="5 5" dot={false} strokeWidth={1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Accuracy Analysis */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Accuracy Metrics</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Correct vs Incorrect Breakdown</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={accuracyData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {accuracyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Correct</span>
                                        <span className="text-xl font-black text-white italic">{correctCount}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${(correctCount/report.totalQuestions)*100}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Incorrect</span>
                                        <span className="text-xl font-black text-white italic">{incorrectCount}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500" style={{ width: `${(incorrectCount/report.totalQuestions)*100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Insights Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400">
                            <Zap size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Response Time</p>
                            <p className="text-xl font-black text-white italic">{Math.round(report.answers.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0) / report.totalQuestions)}s</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Percentile Score</p>
                            <p className="text-xl font-black text-white italic">{Math.round(report.stats.percentile)}th</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Success Rate</p>
                            <p className="text-xl font-black text-white italic">{Math.round((correctCount / report.totalQuestions) * 100)}%</p>
                        </div>
                    </div>
                </div>

                {/* Question Wise Analysis Dashboard */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#ff6b00]">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Question Analysis</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Detailed review of every response</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {report.answers.map((ans, idx) => (
                            <div 
                                key={idx}
                                className={`group relative overflow-hidden bg-white/5 border rounded-[2.5rem] p-8 transition-all duration-300 ${
                                    ans.isCorrect ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-rose-500/20 hover:border-rose-500/40'
                                }`}
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    {ans.isCorrect ? (
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle size={24} />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/20">
                                            <XCircle size={24} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col md:flex-row gap-12">
                                    <div className="flex-1">
                                        <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 ${
                                            ans.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                        }`}>
                                            Question {idx + 1}
                                        </span>
                                        <h3 className="text-2xl font-black text-white italic leading-tight mb-8">
                                            {ans.questionText}
                                        </h3>
                                        
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className={`p-6 rounded-2xl border ${
                                                        ans.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                                                    }`}>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Your Answer</p>
                                                        <p className="text-lg font-black text-white italic">{ans.selectedOption || 'Skipped'}</p>
                                                    </div>
                                                    {!ans.isCorrect && (
                                                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Correct Answer</p>
                                                            <p className="text-lg font-black text-emerald-400 italic">{ans.correctOption}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* AI Insight Box */}
                                                <div className="mt-6 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden group/insight">
                                                    <div className="absolute top-0 right-0 p-4 opacity-20">
                                                        <Zap size={48} className="text-indigo-400" />
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                                                            <Info size={14} />
                                                        </div>
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Educator Review</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-300 leading-relaxed italic relative z-10">
                                                        "{ans.aiInsight || 'Our AI is analyzing this response to provide personalized feedback...'}"
                                                    </p>
                                                </div>
                                            </div>

                                    <div className="md:w-64 space-y-4">
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center">
                                            <Timer className="mx-auto text-slate-500 mb-2" size={24} />
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Spent</p>
                                            <p className="text-2xl font-black text-white italic">{ans.timeTaken || 0}s</p>
                                            <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500" 
                                                    style={{ width: `${Math.min(100, ((ans.timeTaken || 0) / (report.quiz.timerPerQuestion || 30)) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center">
                                            <Award className="mx-auto text-slate-500 mb-2" size={24} />
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Points Earned</p>
                                            <p className="text-2xl font-black text-white italic">{ans.isCorrect ? '10' : '0'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
