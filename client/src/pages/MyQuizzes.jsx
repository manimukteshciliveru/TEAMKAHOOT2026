import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import Swal from 'sweetalert2';
import socket from '../utils/socket';
import AuthContext from '../context/AuthContext';
import { useContext } from 'react';
import { Loader2, } from 'lucide-react';
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
    Play,
    BarChart3,
    Copy
} from 'lucide-react';

export default function MyQuizzes() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const { user } = useContext(AuthContext);

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

    // Listen for background job updates to refresh the list automatically
    useEffect(() => {
        if (!user) return;
        
        const channel = `job_status_${user._id}`;
        socket.on(channel, (data) => {
            console.log('Library Job Update:', data);
            if (data.status === 'completed') {
                showToast(data.message, 'success');
                fetchQuizzes();
            }
        });

        return () => socket.off(channel);
    }, [user, showToast]);

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
            showToast('Quiz mode updated successfully', 'success');
        } catch (err) {
            console.error('Error updating quiz mode', err);
            showToast(err.response?.data?.msg || 'Failed to update quiz mode', 'error');
        }
    };

    const handleDelete = async (quizId) => {
        const result = await Swal.fire({
            title: 'Delete Quiz?',
            text: "This will permanently remove this quiz and all its results. You can't reverse this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete it',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/quiz/${quizId}`);
                setQuizzes(quizzes.filter(q => q._id !== quizId));
                showToast('Quiz deleted successfully', 'success');
            } catch (err) {
                console.error('Error deleting quiz', err);
                showToast('Failed to delete quiz', 'error');
            }
        }
    };

    const copyToClipboard = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        showToast('Join Code copied to clipboard!', 'success');
    };

    const filteredQuizzes = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.topic?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout role="faculty">
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
                            <div key={quiz._id} className="bg-white/5 rounded-[3rem] border border-white/10 p-8 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-10 hover:bg-white/10 transition-all group relative overflow-x-auto ring-1 ring-white/5 no-scrollbar">
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
                                            <div className="group/code flex items-center gap-3 px-5 py-2 bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-xl cursor-pointer hover:bg-[#ff6b00] transition-all" onClick={() => copyToClipboard(quiz.joinCode)}>
                                                <span className="text-sm font-black text-[#ff6b00] group-hover:text-white italic tracking-widest">{quiz.joinCode}</span>
                                                <Copy size={14} className="text-[#ff6b00] group-hover:text-white" />
                                            </div>
                                             {quiz.scheduledStartTime && (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 italic bg-white/5 px-4 py-2 rounded-xl border border-orange-500/10">
                                                        <Clock size={14} /> From: {new Date(quiz.scheduledStartTime).toLocaleString()}
                                                    </div>
                                                    {quiz.scheduledEndTime && (
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 italic bg-white/5 px-4 py-2 rounded-xl border border-red-500/10">
                                                            <Clock size={14} /> Until: {new Date(quiz.scheduledEndTime).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                             )}
                                             <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] italic ${quiz.status === 'processing' ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' : quiz.isActive ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-slate-600 border-white/5 bg-white/5'}`}>
                                                  <div className={`w-2 h-2 rounded-full ${quiz.status === 'processing' ? 'bg-orange-500 animate-spin' : quiz.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                                  {quiz.status === 'processing' ? 'GENERATING QUESTIONS...' : quiz.isActive ? (quiz.isLive ? 'LIVE' : 'ASSESSMENT') : 'OFFLINE'}
                                              </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 z-10 w-full lg:w-auto">
                                    {quiz.status === 'processing' ? (
                                         <div className="flex items-center gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                                             <Loader2 className="animate-spin text-[#ff6b00]" size={24} />
                                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic animate-pulse">AI is working...</p>
                                         </div>
                                     ) : (
                                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 pr-10 rounded-[2.5rem] border border-white/5 w-full lg:w-auto">
                                        {/* Performance Stats */}
                                        <div className="flex items-center gap-6 px-6 py-2 border-r border-white/10 hidden sm:flex">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Avg Score</p>
                                                <p className="text-lg font-black text-white italic">{(quiz.averageScore || 0).toFixed(0)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Students</p>
                                                <p className="text-lg font-black text-[#ff6b00] italic">{quiz.completionCount || 0}</p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            {quiz.isActive ? (
                                                <>
                                                    {quiz.isLive && quiz.status !== 'finished' ? (
                                                        <Link
                                                            to={`/live-room-faculty/${quiz.joinCode}`}
                                                            className="flex-1 sm:flex-none bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-sm"
                                                        >
                                                            <Play size={18} /> Enter Lobby
                                                        </Link>
                                                    ) : (
                                                        <Link
                                                            to={`/faculty-report/${quiz._id}`}
                                                            className="flex-1 sm:flex-none bg-[#ff6b00] text-white px-8 py-3 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#ff6b00]/20 text-sm"
                                                        >
                                                            <BarChart3 size={18} /> View Stats
                                                        </Link>
                                                    )}
                                                    {quiz.isAssessment && (
                                                        <button
                                                            onClick={() => updateQuizMode(quiz._id, 'close')}
                                                            className="flex-1 sm:flex-none bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:bg-red-500 hover:text-white active:scale-95 flex items-center justify-center gap-2 text-sm"
                                                        >
                                                            <XCircle size={18} /> Close
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Link
                                                        to={`/faculty-report/${quiz._id}`}
                                                        className="flex-1 sm:flex-none bg-blue-500/10 text-blue-500 border border-blue-500/20 px-6 py-3 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:bg-blue-500 hover:text-white active:scale-95 flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        <BarChart3 size={18} /> View Stats
                                                    </Link>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleDelete(quiz._id)}
                                                className="p-3 bg-white/5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-xl border border-white/5 transition-all group/del shrink-0 ml-2 shadow-inner"
                                                title="Delete Quiz"
                                            >
                                                <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                                            </button>
                                        </div>
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
