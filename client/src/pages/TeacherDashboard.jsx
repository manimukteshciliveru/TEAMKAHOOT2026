import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Type, Book, Cpu, BarChart3, Users, PlayCircle, PlusCircle, Sparkles, X } from 'lucide-react';

export default function TeacherDashboard() {
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
        { title: 'From Text', description: 'Paste text or manual entry', icon: Type, color: 'hover:bg-blue-500', path: '/create-quiz/text' },
        { title: 'From PDF', description: 'Upload and extract document', icon: FileText, color: 'hover:bg-red-500', path: '/create-quiz/pdf' },
        { title: 'From Topic', description: 'AI generates from a prompt', icon: Book, color: 'hover:bg-green-500', path: '/create-quiz/topic' }
    ];

    return (
        <DashboardLayout role="teacher">
            <div className="space-y-12 pb-20 relative">
                {/* Immersive Background Element */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#ff6b00]/5 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse"></div>

                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10">
                    {!showOptions ? (
                        <div className="space-y-12 animate-in fade-in zoom-in duration-500">
                            <button
                                onClick={() => setShowOptions(true)}
                                className="group relative bg-[#ff6b00] text-white px-20 py-10 rounded-[3rem] font-black text-4xl italic tracking-tighter hover:scale-105 transition-all shadow-[0_32px_64px_-16px_rgba(255,107,0,0.3)] active:scale-95 flex items-center gap-8 mx-auto overflow-hidden border-4 border-white/20"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative">CREATE A QUIZ</span>
                                <PlusCircle className="relative group-hover:rotate-90 transition-transform duration-500" size={48} />
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
