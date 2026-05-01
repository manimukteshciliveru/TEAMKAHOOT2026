import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Type, Book, Cpu, BarChart3, Users, PlayCircle, PlusCircle, Sparkles, X, HelpCircle, Target, Activity } from 'lucide-react';

export default function FacultyDashboard() {
    const [stats, setStats] = useState({ totalQuizzes: 0, totalAttempts: 0, averageScore: 0 });
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/quiz/stats');
                const quizArray = res.data || [];
                const totalQuizzes = quizArray.length;
                const totalAttempts = quizArray.reduce((sum, quiz) => sum + (quiz.completionCount || 0), 0);
                const averageScore = quizArray.length > 0
                    ? quizArray.reduce((sum, quiz) => sum + (quiz.averageScore || 0), 0) / quizArray.length
                    : 0;

                setStats({ totalQuizzes, totalAttempts, averageScore });
            } catch (err) {
                console.error('Error fetching dashboard stats', err);
            }
        };
        fetchStats();
    }, []);

    const creationOptions = [
        { title: 'Manual Creation', description: 'Build your quiz question by question', icon: PlusCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', path: '/create-quiz/manual' },
        { title: 'From Text', description: 'Import Aiken, JSON, or Theory', icon: Type, color: 'text-blue-400', bg: 'bg-blue-400/10', path: '/create-quiz/text' },
        { title: 'From File', description: 'Upload PDF, DOCX, TXT or Images', icon: FileText, color: 'text-rose-400', bg: 'bg-rose-400/10', path: '/create-quiz/file' },
        { title: 'From Topic', description: 'AI generates from a prompt', icon: Book, color: 'text-emerald-400', bg: 'bg-emerald-400/10', path: '/create-quiz/topic' }
    ];

    return (
        <DashboardLayout role="faculty">
            <div className="space-y-12 pb-20 relative overflow-hidden">
                {/* Immersive Background Element */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#ff6b00]/5 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse"></div>

                {/* Header & Stats Container */}
                <div className="space-y-10 animate-in slide-in-from-top-10 duration-700">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-2">
                            <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase">
                                Faculty <span className="text-[#ff6b00]">Command Center</span>
                            </h1>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs italic">Operational Intelligence & Knowledge Management</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Quizzes', value: stats.totalQuizzes, icon: HelpCircle, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-500/20' },
                            { label: 'Student Attempts', value: stats.totalAttempts, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20' },
                            { label: 'Avg Performance', value: `${stats.averageScore.toFixed(0)}%`, icon: Target, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20' },
                            { label: 'Real-time Signal', value: 'Active', icon: Activity, color: 'text-[#ff6b00]', bg: 'bg-[#ff6b00]/10', border: 'border-[#ff6b00]/20' },
                        ].map((stat, idx) => (
                            <div key={idx} className={`bg-white/5 backdrop-blur-3xl p-8 rounded-[2.5rem] border ${stat.border} shadow-2xl flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:bg-white/10`}>
                                <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl mb-4 shadow-inner ring-1 ring-white/10`}>
                                    {stat.icon && <stat.icon size={28} />}
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{stat.label}</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-12 bg-white/5 rounded-[4rem] border border-white/5 backdrop-blur-sm p-12 shadow-inner ring-1 ring-white/5">
                    {!showOptions ? (
                        <div className="space-y-12 animate-in fade-in zoom-in duration-500">
                            <button
                                onClick={() => setShowOptions(true)}
                                type="button"
                                className="group relative bg-[#ff6b00] text-white px-20 py-10 rounded-[3rem] font-black text-4xl italic tracking-tighter hover:scale-105 transition-all shadow-[0_32px_64px_-16px_rgba(255,107,0,0.3)] active:scale-95 flex items-center gap-8 mx-auto overflow-hidden border-4 border-white/20 cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative pointer-events-none">CREATE A QUIZ</span>
                                <PlusCircle className="relative group-hover:rotate-90 transition-transform duration-500 pointer-events-none" size={48} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-full space-y-12 animate-in slide-in-from-bottom-10 fade-in duration-500">
                            <div className="flex items-center justify-between max-w-4xl mx-auto w-full px-4">
                                <h2 className="text-4xl font-black text-[#ff6b00] italic tracking-tighter uppercase">Select Your Method</h2>
                                <button
                                    onClick={() => setShowOptions(false)}
                                    className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all ring-1 ring-white/10"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                                {creationOptions.map((option, idx) => {
                                    const Icon = option.icon;
                                    return (
                                        <Link
                                            key={idx}
                                            to={option.path}
                                            className="group bg-white/5 border border-white/10 rounded-[3rem] p-12 hover:border-[#ff6b00]/50 hover:shadow-2xl hover:shadow-[#ff6b00]/10 transition-all duration-300 text-left relative overflow-hidden ring-1 ring-white/5"
                                        >
                                            <div className="bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center text-[#ff6b00] mb-8 group-hover:bg-[#ff6b00] group-hover:text-white transition-all duration-300 shadow-xl ring-1 ring-white/10">
                                                <Icon size={40} />
                                            </div>
                                            <h3 className="text-3xl font-black text-white italic tracking-tighter mb-4 group-hover:text-[#ff6b00] transition-colors uppercase leading-none">{option.title}</h3>
                                            <p className="text-slate-400 font-bold text-base leading-relaxed">{option.description}</p>
                                            <div className="mt-10 flex items-center gap-2 text-[#ff6b00] font-black text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all">
                                                Launch <Sparkles size={18} />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
