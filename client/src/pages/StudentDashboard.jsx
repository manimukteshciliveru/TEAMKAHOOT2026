import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { PlayCircle, Zap, ShieldCheck } from 'lucide-react';

export default function StudentDashboard() {
    const [joinCode, setJoinCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleJoin = async () => {
        if (!joinCode || joinCode.length !== 6) return alert('Please enter a valid 6-digit code');

        setIsSubmitting(true);
        try {
            const res = await api.post('/quiz/join', { code: Number(joinCode) });
            if (res.data.isLive) {
                navigate(`/live-room-student/${joinCode}`);
            } else {
                navigate(`/quiz/attempt/${res.data.quizId}`);
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || 'Invalid Join Code');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout role="student">
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                <div className="w-full max-w-xl space-y-12 text-center">
                    {/* Immersive Background Element */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff6b00]/5 rounded-full blur-[120px] opacity-30 -z-10 pointer-events-none animate-pulse"></div>

                    <div className="space-y-4">
                        <div className="bg-[#ff6b00] w-24 h-24 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-[#ff6b00]/20 animate-bounce-slow">
                            <Zap size={48} fill="currentColor" />
                        </div>
                        <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase">
                            Ready for <span className="text-[#ff6b00]">Action?</span>
                        </h2>
                        <p className="text-slate-400 font-bold text-lg">Enter your PIN to enter the arena.</p>
                    </div>

                    <div className="bg-white/5 rounded-[3.5rem] p-12 shadow-[0_32px_64px_-16px_rgba(255,107,0,0.1)] border-4 border-white/5 relative group overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                                className="w-full bg-white/5 border-4 border-white/10 rounded-3xl px-6 py-8 text-6xl font-black tracking-[0.6em] placeholder:text-slate-700 focus:outline-none focus:bg-white/10 focus:border-[#ff6b00] transition-all text-center text-white shadow-inner"
                            />

                            <button
                                onClick={handleJoin}
                                disabled={joinCode.length !== 6 || isSubmitting}
                                className="w-full bg-[#ff6b00] text-white py-8 rounded-[2rem] font-black text-2xl hover:bg-[#ff8533] transition-all active:scale-95 shadow-xl shadow-[#ff6b00]/20 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.02] duration-300 flex items-center justify-center gap-4"
                            >
                                {isSubmitting ? (
                                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        JOIN GAME <PlayCircle size={32} />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Visual flair */}
                        <div className="absolute -left-20 -bottom-20 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000 text-[#ff6b00]">
                            <ShieldCheck size={300} />
                        </div>
                    </div>

                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">
                        Don't have a code? Check your <span className="text-[#ff6b00]">Assessments</span> tab.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
