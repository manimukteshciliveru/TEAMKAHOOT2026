import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';
import DashboardLayout from '../components/DashboardLayout';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loader2, Zap, Clock, ShieldCheck } from 'lucide-react';

export default function LiveRoomStudent() {
    const { joinCode } = useParams();
    const { user } = useContext(AuthContext);
    const { showToast } = useToast();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!quiz?.scheduledStartTime) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const start = new Date(quiz.scheduledStartTime).getTime();
            const diff = start - now;

            if (diff <= 0) {
                setCountdown('');
                clearInterval(interval);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [quiz]);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await api.post('/quiz/join', { code: joinCode });

                // Fetch full quiz details
                const quizRes = await api.get(`/quiz/${res.data.quizId}`);

                setQuiz(quizRes.data);

                // Check if quiz has already started
                if (quizRes.data.status === 'started') {
                    console.log('Quiz already started, redirecting to quiz...');
                    navigate(`/quiz/attempt/${quizRes.data._id}`);
                    return;
                }

                // Join socket room - send _id so teacher can match progress by student ID
                const token = localStorage.getItem('token');
                let studentId = null;
                if (token) {
                    try { studentId = JSON.parse(atob(token.split('.')[1])).user.id; } catch (_) { }
                }
                
                const sessionData = {
                    quizId: quizRes.data._id,
                    username: user.username,
                    role: 'student',
                    _id: studentId || user._id
                };
                localStorage.setItem(`live_quiz_session_student_${quizRes.data._id}`, JSON.stringify(sessionData));

                socket.emit('join_room', { 
                    quizId: quizRes.data._id, 
                    user: { 
                        username: user.username || user.name, 
                        role: 'student', 
                        _id: studentId || user._id,
                        rollNumber: user.rollNumber,
                        name: user.name
                    } 
                });

            } catch (err) {
                console.error(err);
                showToast('Error joining room', 'error');
                navigate('/home');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();

        socket.on('quiz_started', () => {
            if (quiz) {
                navigate(`/quiz/attempt/${quiz._id}`);
            }
        });

        socket.on('connect', () => {
            if (quiz && user) {
                const sessionStr = localStorage.getItem(`live_quiz_session_student_${quiz._id}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { 
                            quizId: sess.quizId, 
                            user: { 
                                username: sess.username, 
                                role: sess.role, 
                                _id: sess._id,
                                rollNumber: user.rollNumber,
                                name: user.name
                            } 
                        });
                    } catch (e) {
                        socket.emit('join_room', { 
                            quizId: quiz._id, 
                            user: { 
                                username: user.username || user.name, 
                                role: 'student', 
                                _id: user._id,
                                rollNumber: user.rollNumber,
                                name: user.name
                            } 
                        });
                    }
                } else {
                    socket.emit('join_room', { 
                        quizId: quiz._id, 
                        user: { 
                            username: user.username || user.name, 
                            role: 'student', 
                            _id: user._id,
                            rollNumber: user.rollNumber,
                            name: user.name
                        } 
                    });
                }
            }
        });

        return () => {
            socket.off('quiz_started');
        };
    }, [joinCode, user, navigate, quiz]);

    // Heartbeat logic
    useEffect(() => {
        if (!quiz || !user) return;
        const heartbeatId = setInterval(() => {
            socket.emit('heartbeat', { quizId: quiz._id, userId: user._id });
        }, 5000);
        return () => clearInterval(heartbeatId);
    }, [quiz, user]);
    if (loading) return (
        <DashboardLayout role="student">
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout role="student">
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Immersive Background Decorations */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64 animate-pulse duration-5000"></div>

                <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-700">
                    <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
                        <div className="bg-gradient-to-br from-[#ff6b00] to-[#cc5500] p-8 text-white relative text-center">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#1e293b] rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white/10">
                                <Zap className="text-[#ff6b00]" size={32} fill="currentColor" />
                            </div>
                            <div className="mt-6 space-y-3">
                                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                    Synchronized
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">{quiz?.title}</h1>
                                {countdown ? (
                                    <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 inline-block animate-bounce mt-2 shadow-2xl">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/60 mb-1">Quiz Starts In</p>
                                        <p className="text-3xl font-black italic tracking-tighter text-white font-mono">{countdown}</p>
                                    </div>
                                ) : (
                                    <p className="text-orange-100/70 font-bold uppercase tracking-widest text-[9px] italic">
                                        Waiting for Host...
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 animate-ping bg-[#ff6b00]/20 rounded-full"></div>
                                    <div className="relative bg-white/5 p-8 rounded-3xl border border-white/10 flex items-center justify-center shadow-inner">
                                        <Clock className="text-[#ff6b00] animate-pulse" size={40} />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Lobby Active</h3>
                                    <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-xs mx-auto">
                                        Connection stable. The quiz will auto-redirect when the host starts.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3 transition-all hover:bg-white/10">
                                    <div className="bg-green-500/20 p-2 rounded-xl text-green-400">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Status</p>
                                        <p className="text-[10px] font-black text-white italic uppercase">Verified</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3 transition-all hover:bg-white/10">
                                    <div className="bg-[#ff6b00]/20 p-2 rounded-xl text-[#ff6b00]">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Stream</p>
                                        <p className="text-[10px] font-black text-white italic uppercase">Live</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/20 p-4 border-t border-white/5 text-center">
                            <div className="flex items-center justify-center gap-3 text-slate-500">
                                <Loader2 className="animate-spin" size={12} />
                                <p className="text-[8px] font-black uppercase tracking-[0.3em] italic">
                                    Do not refresh this page
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
