import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { 
    Clock, 
    ChevronRight, 
    Search, 
    Filter, 
    Award, 
    CheckCircle, 
    XCircle, 
    ArrowUpRight,
    Loader2,
    Calendar,
    Target,
    User
} from 'lucide-react';

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, completed, missed
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/quiz/history/student');
                setHistory(res.data);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredHistory = history.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.topic.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || item.status.toLowerCase() === filter.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <DashboardLayout role="student">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="animate-spin text-[#ff6b00]" size={48} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="student">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            Quiz <span className="text-[#ff6b00]">History</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">
                            Track your performance across all sessions
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by title or topic..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#ff6b00] transition-all w-64"
                            />
                        </div>
                        <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
                            {['all', 'completed', 'missed'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        filter === f 
                                        ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' 
                                        : 'text-slate-500 hover:text-white'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* History List */}
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-24 bg-white/5 rounded-[2.5rem] border border-white/10 border-dashed">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="text-slate-600" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">No history found</h3>
                        <p className="text-slate-500 text-sm mt-2 font-medium">Try adjusting your filters or take some quizzes!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredHistory.map((item) => (
                            <div
                                key={item._id}
                                onClick={() => item.status.toLowerCase() !== 'missed' && item.resultId && navigate(`/report/${item.resultId}`)}
                                className={`group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2rem] p-6 transition-all duration-300 overflow-hidden ${item.status.toLowerCase() !== 'missed' ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'}`}
                            >
                                {/* Decorative Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6b00]/5 rounded-full blur-3xl group-hover:bg-[#ff6b00]/10 transition-all"></div>
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-start gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black italic text-xl shadow-lg ${
                                            item.score >= (item.totalQuestions * 10 * 0.7) 
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                                        }`}>
                                            {Math.round(item.percentage)}%
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white italic group-hover:text-[#ff6b00] transition-colors">
                                                {item.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Calendar size={14} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                                        {new Date(item.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[#ff6b00]">
                                                    <Target size={14} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.topic}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <User size={14} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Teacher: {item.teacherName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score Obtained</p>
                                            <div className="text-2xl font-black text-white italic">
                                                {item.score} <span className="text-xs text-slate-600">/ {item.totalQuestions * 10}</span>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                            item.status === 'completed' 
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            {item.status}
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-[#ff6b00] group-hover:text-white transition-all">
                                            <ArrowUpRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
