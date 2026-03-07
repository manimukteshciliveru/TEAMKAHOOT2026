import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import {
    FileText,
    CheckCircle,
    Clock,
    Trash2,
    AlertCircle,
    XCircle,
    Activity,
    ExternalLink,
    Trophy,
    Search,
    Calendar,
    HelpCircle,
    Play
} from 'lucide-react';

export default function MyQuizzes() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchQuizzes = async () => {
        try {
            const res = await api.get('/quiz/my-quizzes');
            setQuizzes(res.data);
        } catch (err) {
            console.error('Error fetching quizzes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const updateQuizMode = async (quizId, mode) => {
        try {
            let payload = {};
            if (mode === 'assessment') {
                payload = { isActive: true, isLive: false };
            } else if (mode === 'live') {
                payload = { isActive: true, isLive: true };
            } else if (mode === 'close') {
                payload = { isActive: false };
            }

            const res = await api.put(`/quiz/${quizId}`, payload);
            setQuizzes(quizzes.map(q => q._id === quizId ? res.data : q));
        } catch (err) {
            console.error('Error updating quiz mode', err);
            alert(err.response?.data?.msg || 'Failed to update quiz mode');
        }
    };

    const handleDelete = async (quizId) => {
        if (!window.confirm('Are you sure you want to delete this quiz? All results will be permanently removed.')) {
            return;
        }

        try {
            await api.delete(`/quiz/${quizId}`);
            setQuizzes(quizzes.filter(q => q._id !== quizId));
        } catch (err) {
            console.error('Error deleting quiz', err);
            alert('Failed to delete quiz');
        }
    };

    const filteredQuizzes = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.topic?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout role="teacher">
            <div className="space-y-12 pb-20 relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tight italic uppercase">Quiz <span className="text-[#ff6b00]">Library</span></h1>
                        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-sm italic">Manage your knowledge assets</p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#ff6b00] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH LIBRARY..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-black italic placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/20 focus:border-[#ff6b00]/50 transition-all uppercase tracking-tighter"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white/5 rounded-[3rem] border border-white/10 p-24 text-center ring-1 ring-white/5">
                        <Activity className="animate-spin text-[#ff6b00] mx-auto mb-8" size={64} />
                        <p className="font-black text-slate-500 uppercase tracking-[0.3em] italic text-sm">Syncing with KMIT database...</p>
                    </div>
                ) : filteredQuizzes.length > 0 ? (
                    <div className="grid grid-cols-1 gap-8">
                        {filteredQuizzes.map((quiz) => (
                            <div key={quiz._id} className="bg-white/5 rounded-[3rem] border border-white/10 p-8 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-10 hover:bg-white/10 transition-all group relative overflow-hidden ring-1 ring-white/5">
                                <div className="flex flex-col sm:flex-row items-start gap-8 z-10">
                                    <div className={`p-8 rounded-[2.5rem] transition-all group-hover:scale-110 shrink-0 shadow-2xl ${quiz.isActive ? 'bg-[#ff6b00] text-white' : 'bg-white/5 text-slate-700 border border-white/10'}`}>
                                        <FileText size={40} />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none group-hover:text-[#ff6b00] transition-colors">{quiz.title}</h3>
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">{quiz.topic || 'General Knowledge'}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                                <Calendar size={14} className="text-[#ff6b00]" /> {new Date(quiz.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                                <HelpCircle size={14} className="text-[#ff6b00]" /> {quiz.questions?.length || 0} Questions
                                            </div>
                                            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] italic ${quiz.isActive ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-slate-600 border-white/5 bg-white/5'}`}>
                                                <div className={`w-2 h-2 rounded-full ${quiz.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                                {quiz.isActive ? (quiz.isLive ? 'LIVE' : 'ASSESSMENT') : 'OFFLINE'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 z-10">
                                    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-3xl border border-white/5">
                                        {quiz.isAssessment ? (
                                            <>
                                                {quiz.isActive ? (
                                                    <button
                                                        onClick={() => updateQuizMode(quiz._id, 'close')}
                                                        className="bg-red-500/10 text-red-500 border border-red-500/20 px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:bg-red-500 hover:text-white active:scale-95 flex items-center gap-3"
                                                    >
                                                        <XCircle size={20} /> Close
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateQuizMode(quiz._id, 'assessment')}
                                                        className="bg-[#ff6b00]/10 text-[#ff6b00] border border-[#ff6b00]/20 px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:bg-[#ff6b00] hover:text-white active:scale-95 flex items-center gap-3"
                                                    >
                                                        <Play size={20} /> Reopen
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {quiz.status !== 'finished' ? (
                                                    <Link
                                                        to={`/live-room-teacher/${quiz.joinCode}`}
                                                        className="bg-[#ff6b00] text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-lg shadow-[#ff6b00]/20"
                                                    >
                                                        <ExternalLink size={20} /> Enter Room
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        to={`/leaderboard/${quiz._id}`}
                                                        className="bg-green-500/10 text-green-500 border border-green-500/20 px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:bg-green-500 hover:text-white active:scale-95 flex items-center gap-3"
                                                    >
                                                        <Trophy size={20} /> View Results
                                                    </Link>
                                                )}
                                            </>
                                        )}

                                        <button
                                            onClick={() => handleDelete(quiz._id)}
                                            className="p-4 text-slate-700 hover:text-red-500 transition-all group/del"
                                            title="Delete Permanently"
                                        >
                                            <Trash2 size={24} className="group-hover/del:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                <div className="absolute -right-20 -bottom-20 opacity-[0.02] text-white group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                                    <Activity size={300} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 rounded-[3rem] border border-white/10 p-32 text-center ring-1 ring-white/5 relative overflow-hidden">
                        <div className="bg-white/5 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-10 text-slate-800 border border-white/10 shadow-inner">
                            <AlertCircle size={64} />
                        </div>
                        <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">Library Empty</h3>
                        <p className="max-w-md mx-auto text-slate-500 font-bold text-lg mt-6 leading-relaxed">
                            {searchTerm ? `No results found for "${searchTerm}"` : "Your knowledge base is waiting for its first entry. Let's create something extraordinary."}
                        </p>
                        {!searchTerm && (
                            <Link to="/" className="inline-block mt-12 bg-[#ff6b00] text-white px-12 py-6 rounded-3xl font-black italic uppercase tracking-tighter hover:scale-105 transition-all shadow-2xl shadow-[#ff6b00]/20">
                                Build First Quiz
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}
