import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, Users, Play, Copy, Loader2, Clock, MinusCircle, WifiOff, Trophy, CheckCircle, XCircle, ChevronRight, ChevronLeft, Minus, Activity } from 'lucide-react';
import api from '../utils/api';
import socket from '../utils/socket';
import AuthContext from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export default function LiveSessionMonitor() {
    const { joinCode } = useParams();
    const { user } = useContext(AuthContext);
    const { showToast } = useToast();
    const [participants, setParticipants] = useState([]);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentProgress, setStudentProgress] = useState({});
    const [timeLeft, setTimeLeft] = useState(30);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [liveInsights, setLiveInsights] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState(1);
    const [allStudentsLeft, setAllStudentsLeft] = useState(false);
    const [isQuizEnded, setIsQuizEnded] = useState(false);
    const studentsPerPage = 10;
    const hasInitializedTimer = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await api.post('/quiz/join', { code: joinCode });
                const quizRes = await api.get(`/quiz/${res.data.quizId}`);
                setQuiz(quizRes.data);
                
                // Persist Faculty Session
                const sessionData = {
                    quizId: quizRes.data._id,
                    username: user.username,
                    _id: user._id,
                    role: 'faculty'
                };
                localStorage.setItem(`live_quiz_session_faculty_${joinCode}`, JSON.stringify(sessionData));

                socket.emit('join_room', { quizId: quizRes.data._id, user: { username: user.username, _id: user._id, role: 'faculty' } });
            } catch (err) {
                console.error(err);
                showToast('Error loading quiz', 'error');
                navigate('/faculty-dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();

        socket.on('participants_update', (participantsList) => {
            const students = participantsList.filter(p => p.role !== 'faculty');
            setParticipants(students);
            
            // Check if all students left
            if (students.length > 0) {
                const onlineStudents = students.filter(p => p.isOnline);
                setAllStudentsLeft(onlineStudents.length === 0);
            }
        });

        socket.on('progress_history', (history) => {
            setStudentProgress(history);
        });

        socket.on('quiz_started', () => {
            setQuiz(prev => prev ? { ...prev, status: 'started' } : null);
        });

        socket.on('student_progress_update', ({ studentId, username, questionIndex, isCorrect }) => {
            setStudentProgress(prev => {
                const newState = { ...prev };
                const qIdx = parseInt(questionIndex);
                const id = studentId || username;
                if (id) {
                    newState[id] = {
                        ...(newState[id] || {}),
                        [qIdx]: { answered: true, isCorrect }
                    };
                }
                return newState;
            });
        });

        socket.on('change_question', ({ questionIndex }) => {
            setCurrentQuestion(parseInt(questionIndex));
            if (quiz && !quiz.duration) {
                setTimeLeft(quiz.timerPerQuestion || 30);
                setIsTimerRunning(true);
            }
        });

        socket.on('student_focus_update', ({ studentId, username, questionIndex }) => {
            setStudentProgress(prev => {
                const newState = { ...prev };
                const id = studentId || username;
                if (!id) return prev;
                newState[id] = { ...(newState[id] || {}), current: parseInt(questionIndex) };
                return newState;
            });
        });

        socket.on('question_leaderboard', (data) => {
            setLeaderboard(data.leaderboard);
            setLiveInsights(data.liveInsights);
        });

        socket.on('sync_timer', ({ timeLeft }) => {
            console.log('Syncing timer from server:', timeLeft);
            setTimeLeft(timeLeft);
            if (timeLeft > 0) setIsTimerRunning(true);
        });

        socket.on('restoreState', (state) => {
            console.log('Restoring State on Reconnect:', state);
            setCurrentQuestion(state.currentQuestionIndex);
            
            // Re-sync leaderboards and participants
            if (state.leaderboard && state.leaderboard.length > 0) {
                setLeaderboard(state.leaderboard);
            }
            if (state.participants && state.participants.length > 0) {
                const students = state.participants.filter(p => p.role !== 'faculty');
                setParticipants(students);
            }
            if (state.progress) {
                setStudentProgress(state.progress);
            }

            if (state.quizStatus === 'started') {
                setQuiz(prev => prev ? { ...prev, status: 'started' } : null);
                setTimeLeft(state.remainingTime);
                if (state.remainingTime > 0) setIsTimerRunning(true);
            } else if (state.quizStatus === 'finished') {
                setIsQuizEnded(true);
                setIsTimerRunning(false);
            }
        });

        socket.on('quiz_ended', () => {
            setIsQuizEnded(true);
            setIsTimerRunning(false);
        });

        socket.on('connect', () => {
            setIsOnline(true);
            if (quiz && user) {
                const sessionStr = localStorage.getItem(`live_quiz_session_faculty_${joinCode}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, _id: sess._id, role: sess.role } });
                    } catch (e) {
                         socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, _id: user._id, role: 'faculty' } });
                    }
                } else {
                    socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, _id: user._id, role: 'faculty' } });
                }
            }
        });

        socket.on('disconnect', () => setIsOnline(false));

        return () => {
            socket.off('participants_update');
            socket.off('student_progress_update');
            socket.off('progress_history');
            socket.off('question_leaderboard');
            socket.off('sync_timer');
            socket.off('restoreState');
            socket.off('quiz_ended');
        };
    }, [joinCode, user, navigate]);

    // Teacher Heartbeat Logic
    useEffect(() => {
        if (!quiz || !user) return;
        const heartbeatId = setInterval(() => {
            socket.emit('heartbeat', { quizId: quiz._id, userId: user._id || user.username });
        }, 5000);
        return () => clearInterval(heartbeatId);
    }, [quiz, user]);
    const handleStartQuiz = () => {
        if (quiz) {
            socket.emit('start_quiz', quiz._id);
            setIsTimerRunning(true);
            toast.success('Quiz Started! Students are now synchronized.', { icon: '🚀' });
        }
    };

    const handleEndQuiz = async () => {
        const result = await Swal.fire({
            title: 'Terminate Session?',
            text: 'This will finalize all student scores and close the live room. This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, End Quiz',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            socket.emit('end_quiz', quiz._id);
            showToast('Session Ended. Results saved.', 'success');
            navigate('/faculty-dashboard');
        }
    };

    const handleNextQuestion = () => {
        if (quiz && currentQuestion < quiz.questions.length - 1) {
            const nextIdx = currentQuestion + 1;
            socket.emit('change_question', { quizId: quiz._id, questionIndex: nextIdx });
        }
    };

    const handlePrevQuestion = () => {
        if (quiz && currentQuestion > 0) {
            const prevIdx = currentQuestion - 1;
            socket.emit('change_question', { quizId: quiz._id, questionIndex: prevIdx });
        }
    };

    useEffect(() => {
        if (!quiz) return;

        if (quiz.duration > 0) {
            if (!hasInitializedTimer.current) {
                setTimeLeft(quiz.duration * 60);
                hasInitializedTimer.current = true;
            }
        } else if (!isTimerRunning && quiz.status === 'started' && timeLeft === 30) {
            setTimeLeft(quiz.timerPerQuestion || 30);
            setIsTimerRunning(true);
        }

        if (!isTimerRunning || quiz.status !== 'started') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsTimerRunning(false);
                    // AUTO-END: If time is up, trigger the end quiz sequence automatically
                    if (quiz?.status === 'started') {
                        console.log('Timer expired, auto-ending quiz session...');
                        socket.emit('end_quiz', quiz._id);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isTimerRunning, quiz]);

    // Offline / Reconnect handling
    useEffect(() => {
        const handleOffline = () => setIsOnline(false);
        const handleOnline = () => {
            setIsOnline(true);
            if (quiz) {
                const sessionStr = localStorage.getItem(`live_quiz_session_faculty_${joinCode}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role } });
                    } catch (e) {
                         socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'faculty' } });
                    }
                } else {
                    socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'faculty' } });
                }
            }
        };
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [quiz, user]);

    const handleIncreaseTime = () => {
        socket.emit('increase_time', { quizId: quiz._id, additionalSeconds: 30 });
        showToast('Added 30 seconds to the clock!', 'success');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(joinCode);
        showToast('Join Code copied!', 'success');
    };

    // Merge participants (connected) + leaderboard (submitted) so reconnected students always show
    const allStudents = useMemo(() => {
        const map = new Map();
        // Build a leaderboard lookup for scores/rank
        const lbMap = new Map();
        leaderboard.forEach(l => {
            const key = l.studentId?.toString() || l.username;
            if (key) lbMap.set(key, l);
        });

        // Add all active/connected participants
        participants.forEach(p => {
            const key = p._id?.toString() || p.username;
            if (key) {
                map.set(key, { 
                    ...p, 
                    isOnline: p.isOnline !== false, 
                    lb: lbMap.get(key) 
                });
            }
        });

        // Add leaderboard entries for students who might have disconnected
        leaderboard.forEach(l => {
            const key = l.studentId?.toString() || l.username;
            if (key && !map.has(key)) {
                map.set(key, {
                    username: l.username,
                    name: l.username,
                    _id: l.studentId?.toString(),
                    role: 'student',
                    isOnline: false,
                    lb: l
                });
            }
        });

        // Sort by score descending (those with leaderboard data first)
        return Array.from(map.values())
            .filter(p => p.role !== 'faculty')
            .sort((a, b) => {
                const scoreA = a.lb?.currentScore ?? -1;
                const scoreB = b.lb?.currentScore ?? -1;
                return scoreB - scoreA;
            });
    }, [participants, leaderboard]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(allStudents.length / studentsPerPage));
    const paginatedStudents = allStudents.slice(
        (currentPage - 1) * studentsPerPage,
        currentPage * studentsPerPage
    );

    // Quiz ended (auto or manually) — show fallback screen
    useEffect(() => {
        if (isQuizEnded || quiz?.status === 'finished') {
            const timeout = setTimeout(() => {
                navigate(`/faculty-report/${quiz._id}`);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isQuizEnded, quiz, navigate]);

    if (loading) return (
        <DashboardLayout role="faculty">
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Users className="text-indigo-600" size={24} />
                    </div>
                </div>
                <p className="mt-6 font-black text-gray-400 uppercase tracking-widest animate-pulse">Initializing Room...</p>
            </div>
        </DashboardLayout>
    );

    if (isQuizEnded || quiz?.status === 'finished') {
        return (
            <DashboardLayout role="faculty">
                <div className="flex flex-col items-center justify-center min-h-[70vh]">
                    <Trophy className="text-[#ff6b00] animate-bounce mb-6" size={64} />
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Generating <span className="text-[#ff6b00]">Insights</span></h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Redirecting to live analytics...</p>
                    <Loader2 className="animate-spin text-gray-700 mt-8" size={32} />
                </div>
            </DashboardLayout>
        );
    }

    const isWaitingRoom = !quiz || quiz.status === 'waiting';

    if (isWaitingRoom) {
        return (
            <DashboardLayout role="faculty">
                <div className="max-w-6xl mx-auto space-y-12 py-10">
                    <div className="bg-indigo-900 rounded-[3rem] p-16 text-center text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <div className="inline-block px-6 py-2 bg-white/10 rounded-full border border-white/20">
                                <span className="text-indigo-200 font-black uppercase tracking-[0.3em] text-sm italic">Session Initialized</span>
                            </div>
                            <h1 className="text-7xl font-black italic uppercase tracking-tighter">Live Session <span className="text-[#ff6b00]">Monitor</span></h1>
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs">Join Code</p>
                                <div onClick={copyCode} className="bg-white/5 border-2 border-white/10 hover:bg-white/10 transition-all rounded-3xl p-4 cursor-pointer group active:scale-95">
                                    <p className="text-5xl md:text-7xl font-black tracking-[0.2em] group-hover:scale-105 transition-transform italic underline decoration-[#ff6b00] decoration-4 md:decoration-8 underline-offset-[12px]">{joinCode}</p>
                                </div>
                            </div>
                            <div className="pt-10 flex flex-col items-center gap-6">
                                <button
                                    onClick={handleStartQuiz}
                                    disabled={participants.length === 0}
                                    className="group flex items-center gap-6 bg-[#ff6b00] text-white px-16 py-6 rounded-[2.5rem] hover:scale-105 transition-all shadow-2xl shadow-[#ff6b00]/30 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-[8px] border-[#cc5500] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Play size={40} fill="currentColor" className="group-hover:translate-x-2 transition-transform" />
                                    BEGIN QUIZ
                                </button>
                                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">{participants.length} Students Joined</p>
                            </div>
                        </div>
                        {/* Background Decorations */}
                        <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#ff6b00]/10 rounded-full blur-[100px]"></div>
                    </div>

                    {/* Participants in waiting room */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="text-blue-600" size={24} />
                                    Participants ({participants.length})
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {participants.map((p, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 animate-in fade-in zoom-in duration-300 hover:shadow-md transition-shadow">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold uppercase shadow-sm">
                                            {p.username ? p.username[0] : (p.name ? p.name[0] : '?')}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-gray-800 truncate text-sm">{p.username || p.name || 'Unknown'}</span>
                                            {(p.rollNumber || p._id) && (
                                                <span className="text-[9px] text-gray-400 font-mono truncate uppercase">{p.rollNumber || p._id}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {participants.length === 0 && (
                                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <p className="text-gray-400 font-medium italic">No students joined yet...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="faculty">
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {/* Global Status Bar */}
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Time & Title */}
                    <div className="flex-1 bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`px-5 py-2 rounded-full font-black italic flex items-center gap-2 text-2xl ${timeLeft <= 20 ? 'bg-red-500 text-white animate-pulse' : 'bg-[#0f172a] text-white'}`}>
                                    <Clock size={28} /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                </div>
                                <span className="text-slate-300 font-bold tracking-widest uppercase text-xs">REMAINING TIME</span>
                            </div>
                            <h1 className="text-4xl font-black text-[#0f172a] italic uppercase tracking-tighter truncate">
                                {quiz?.title || 'Active Session'}
                            </h1>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16"></div>
                    </div>

                    {/* Join Code Hub */}
                    <div onClick={copyCode} className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col items-center justify-center min-w-[200px] cursor-pointer group hover:bg-indigo-950 transition-all active:scale-95 border-b-4 border-indigo-950">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2">ACCESS CODE</p>
                        <p className="text-4xl font-black tracking-[0.1em] italic text-[#ff6b00] group-hover:scale-105 transition-transform">{joinCode}</p>
                        <p className="mt-4 flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest opacity-60">
                            <Copy size={12} /> CLICK TO SYNC
                        </p>
                    </div>
                </div>

                {/* Offline Banner */}
                {!isOnline && (
                    <div className="bg-orange-500 rounded-2xl px-6 py-4 flex items-center gap-3 text-white font-bold text-sm">
                        <WifiOff size={18} />
                        You are offline — reconnecting...
                    </div>
                )}

                {/* Session Controls — Compact Row */}
                <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-2xl border-b-[6px] border-slate-800">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Question Navigation */}
                        {quiz?.paceControl !== false && (
                        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-5 py-3">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Q{currentQuestion + 1}/{quiz?.questions?.length || 0}</p>
                            <div className="flex items-center gap-2">
                                {currentQuestion > 0 && (
                                    <button
                                        onClick={handlePrevQuestion}
                                        className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase italic tracking-tighter transition-all flex items-center gap-2 border border-white/10"
                                    >
                                        <ChevronLeft size={14} /> PREV
                                    </button>
                                )}
                                <button
                                    onClick={handleNextQuestion}
                                    disabled={currentQuestion >= (quiz?.questions?.length || 0) - 1}
                                    className="bg-[#ff6b00] text-white px-6 py-2 rounded-lg font-black italic uppercase tracking-tighter hover:scale-[1.02] transition shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2 text-[10px] border-b-2 border-orange-700"
                                >
                                    {currentQuestion < (quiz?.questions?.length || 0) - 1 ? 'NEXT QUESTION' : 'END SESSION'} <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                        )}

                        <button
                            onClick={handleEndQuiz}
                            className={`px-6 py-3 rounded-xl font-black italic uppercase tracking-tighter transition active:scale-95 flex items-center gap-2 text-sm border-2 ${
                                allStudentsLeft 
                                ? 'bg-red-600 text-white border-red-600 animate-pulse' 
                                : 'bg-red-600/10 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white'
                            }`}
                        >
                            <MinusCircle size={18} /> {allStudentsLeft ? 'TERMINATE SESSION' : 'END SESSION'}
                        </button>

                        {/* Top Performer */}
                        {liveInsights?.topStudent && (
                            <div className="ml-auto flex items-center gap-3 bg-emerald-500 rounded-xl px-5 py-3 text-white">
                                <Award size={20} />
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Leader</p>
                                    <p className="text-sm font-black italic uppercase">{liveInsights.topStudent}</p>
                                </div>
                            </div>
                        )}

                        {/* Participants Count */}
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                            <Users size={16} className="text-[#ff6b00]" />
                            <span className="text-xs font-black uppercase tracking-widest text-white">{participants.length} Online</span>
                        </div>
                    </div>
                </div>

                {/* Current Question Display (Faculty Monitor) */}
                {quiz?.status === 'started' && quiz?.questions && (
                    <div className="bg-white rounded-[3rem] p-12 shadow-2xl border-4 border-indigo-50 relative overflow-x-auto no-scrollbar group">
                        <div className="absolute top-0 right-0 p-8 flex gap-4">
                             <div className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl border border-indigo-100">
                                <Users size={20} />
                                {Object.values(studentProgress).filter(p => p[currentQuestion]?.answered).length} / {participants.length} Answered
                             </div>
                             <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-600/20">
                                <Activity size={20} className="animate-pulse" /> Faculty Monitor
                             </div>
                        </div>
                        
                        <div className="max-w-4xl space-y-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-lg text-xs font-black uppercase tracking-[0.2em]">Active Question {currentQuestion + 1}</span>
                                    <div className="h-1 flex-1 bg-gradient-to-r from-indigo-100 to-transparent rounded-full"></div>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter leading-[1.1]">
                                    {quiz.questions[currentQuestion]?.questionText}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {quiz.questions[currentQuestion]?.options.map((opt, i) => {
                                    const isCorrect = opt === quiz.questions[currentQuestion]?.correctAnswer;
                                    return (
                                        <div 
                                            key={i} 
                                            className={`relative p-5 rounded-[1.5rem] border-4 transition-all flex items-center gap-4 ${
                                                isCorrect 
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xl shadow-emerald-500/20 scale-[1.02] z-10 ring-4 ring-emerald-500/10' 
                                                : 'bg-white border-slate-200 text-slate-600 shadow-sm'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shadow-inner ${
                                                isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 text-slate-500'
                                            }`}>
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <div className="flex-1">
                                                <span className={`text-lg font-black uppercase italic tracking-tight ${isCorrect ? 'text-emerald-800' : ''}`}>{opt}</span>
                                                {isCorrect && (
                                                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mt-2 flex items-center gap-2">
                                                        <Trophy size={14} className="animate-bounce" /> Correct Answer
                                                    </p>
                                                )}
                                            </div>
                                            {isCorrect && (
                                                <div className="bg-emerald-500/10 p-3 rounded-full">
                                                    <Award className="text-emerald-500" size={32} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Background Gradients */}
                        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    </div>
                )}

                {/* Student Tracker Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden mt-10">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#ff6b00] p-2 rounded-xl text-white shadow-lg shadow-orange-500/20">
                                <Users size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase italic">Class Tracker</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{allStudents.length} Students Active</p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-md bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
                                <span className="text-[10px] font-bold text-slate-400">Correct</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-md bg-red-500"></div>
                                <span className="text-[10px] font-bold text-slate-400">Wrong</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-md bg-gray-200 border border-gray-300"></div>
                                <span className="text-[10px] font-bold text-slate-400">Not Attempted</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <div className="min-w-[800px]">
                            {/* Column Headers */}
                            <div className="px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                                <div className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rank</div>
                                <div className="w-40 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</div>
                                <div className="w-16 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</div>
                                <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions Progress</div>
                                <div className="w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tie-Break Weight</div>
                                <div className="w-20 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</div>
                            </div>

                            {/* Student Rows */}
                            {paginatedStudents.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {paginatedStudents.map((p, pIdx) => {
                                        const globalIdx = (currentPage - 1) * studentsPerPage + pIdx;
                                        const rank = globalIdx + 1;
                                        const progressById = p._id ? studentProgress[p._id] : null;
                                        const progressByName = p.username ? studentProgress[p.username] : null;
                                        const progress = progressById || progressByName || {};
                                        const score = p.lb?.currentScore ?? 0;

                                        return (
                                            <div
                                                key={p._id || p.username || pIdx}
                                                className="px-8 py-4 flex items-center gap-4 hover:bg-slate-50/80 transition-colors group"
                                            >
                                                {/* Rank */}
                                                <div className="w-12 text-center">
                                                    {rank === 1 ? (
                                                        <div className="w-10 h-10 mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                                            <Trophy size={18} className="text-white" />
                                                        </div>
                                                    ) : rank === 2 ? (
                                                        <div className="w-10 h-10 mx-auto bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl flex items-center justify-center shadow-lg shadow-slate-400/20">
                                                            <span className="text-white font-black text-sm">#2</span>
                                                        </div>
                                                    ) : rank === 3 ? (
                                                        <div className="w-10 h-10 mx-auto bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-700/20">
                                                            <span className="text-white font-black text-sm">#3</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-lg font-black text-slate-300 italic">#{rank}</span>
                                                    )}
                                                </div>

                                                {/* Student Name / Roll No */}
                                                <div className="w-40 min-w-0">
                                                    <p className="font-bold text-slate-800 truncate text-sm">{p.username || p.name || 'Unknown'}</p>
                                                    {(p.rollNumber || p._id) && (
                                                        <p className="text-[10px] text-slate-400 font-mono truncate uppercase">{p.rollNumber || p._id}</p>
                                                    )}
                                                </div>

                                                {/* Online/Offline Status */}
                                                <div className="w-16 flex justify-center">
                                                    <div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${p.isOnline
                                                        ? 'bg-green-50 text-green-600 border border-green-200'
                                                        : 'bg-red-50 text-red-500 border border-red-200'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`}></div>
                                                        {p.isOnline ? 'ON' : 'OFF'}
                                                    </div>
                                                </div>

                                                {/* Question Dots */}
                                                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                                    {quiz?.questions?.map((_, idx) => {
                                                        const data = progress[idx] || progress[idx.toString()];
                                                        const isAnswered = data?.answered === true;
                                                        const isCorrect = data?.isCorrect === true;

                                                        let dotClass = 'bg-gray-100 border-gray-200 text-gray-400';
                                                        let Icon = null;

                                                        if (isAnswered) {
                                                            if (isCorrect) {
                                                                dotClass = 'bg-green-500 border-green-500 text-white';
                                                                Icon = <CheckCircle size={14} />;
                                                            } else {
                                                                dotClass = 'bg-red-500 border-red-500 text-white';
                                                                Icon = <XCircle size={14} />;
                                                            }
                                                        } else if (!p.isOnline && idx < currentQuestion) {
                                                            dotClass = 'bg-gray-50 border-gray-200 text-gray-300';
                                                            Icon = <Minus size={12} />;
                                                        }

                                                        return (
                                                            <div
                                                                key={idx}
                                                                title={isAnswered ? (isCorrect ? `Q${idx + 1}: Correct` : `Q${idx + 1}: Incorrect`) : `Q${idx + 1}: Not Attempted`}
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border-2 transition-all shadow-sm ${dotClass} ${idx === currentQuestion ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110' : ''}`}
                                                            >
                                                                {Icon ? Icon : idx + 1}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Tie-Break Weight */}
                                                <div className="w-24 text-center">
                                                    <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                                                        <Activity size={10} className="text-emerald-500" />
                                                        <span className="text-[10px] font-black text-slate-600">{(p.lb?.tieBreakWeight || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div className="w-20 text-center">
                                                    <span className="text-lg font-black text-[#ff6b00] italic">{score}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold ml-0.5">pts</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <Users className="mx-auto text-slate-200 mb-4" size={48} />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest italic text-xs">No students have joined yet...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-400 font-bold">
                                Showing {(currentPage - 1) * studentsPerPage + 1}–{Math.min(currentPage * studentsPerPage, allStudents.length)} of {allStudents.length} students
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 rounded-xl font-black text-sm transition shadow-sm ${page === currentPage
                                            ? 'bg-[#ff6b00] text-white shadow-orange-500/20'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {allStudentsLeft && quiz?.status === 'started' && (
                    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500 w-[90%] max-w-lg">
                        <div className="bg-red-600 text-white p-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border-4 border-white/20 backdrop-blur-xl">
                            <div className="bg-white/20 p-3 rounded-2xl hidden sm:block">
                                <Users size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-lg italic uppercase tracking-tight leading-none">Zero Students Online</p>
                                <p className="text-[9px] font-bold uppercase opacity-80 mt-1">All participants have disconnected. End the session?</p>
                            </div>
                            <button
                                onClick={handleEndQuiz}
                                className="bg-white text-red-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition shadow-lg shrink-0"
                            >
                                END QUIZ NOW
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
