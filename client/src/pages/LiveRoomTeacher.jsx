import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, Users, Play, Copy, Loader2, Clock, MinusCircle, WifiOff, Trophy, CheckCircle, XCircle, ChevronRight, ChevronLeft, Minus } from 'lucide-react';
import api from '../utils/api';
import socket from '../utils/socket';
import AuthContext from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';

export default function LiveRoomTeacher() {
    const { joinCode } = useParams();
    const { user } = useContext(AuthContext);
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
    const [isQuizEnded, setIsQuizEnded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 10;
    const hasInitializedTimer = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await api.post('/quiz/join', { code: joinCode });
                const quizRes = await api.get(`/quiz/${res.data.quizId}`);
                setQuiz(quizRes.data);
                
                // Persist Teacher Session
                const sessionData = {
                    quizId: quizRes.data._id,
                    username: user.username,
                    role: 'teacher'
                };
                localStorage.setItem(`live_quiz_session_teacher_${joinCode}`, JSON.stringify(sessionData));

                socket.emit('join_room', { quizId: quizRes.data._id, user: { username: user.username, role: 'teacher' } });
            } catch (err) {
                console.error(err);
                alert('Error loading quiz');
                navigate('/teacher-dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();

        socket.on('participants_update', (participantsList) => {
            const students = participantsList.filter(p => p.role !== 'teacher');
            setParticipants(students);
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
                const students = state.participants.filter(p => p.role !== 'teacher');
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
                const sessionStr = localStorage.getItem(`live_quiz_session_teacher_${joinCode}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role } });
                    } catch (e) {
                         socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'teacher' } });
                    }
                } else {
                    socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'teacher' } });
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
        }
    };

    const handleEndQuiz = () => {
        if (window.confirm('End this quiz session?')) {
            socket.emit('end_quiz', quiz._id);
            navigate('/teacher-dashboard');
        }
    };

    const handleNextQuestion = () => {
        if (quiz && currentQuestion < quiz.questions.length - 1) {
            const nextIdx = currentQuestion + 1;
            socket.emit('change_question', { quizId: quiz._id, questionIndex: nextIdx });
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
                const sessionStr = localStorage.getItem(`live_quiz_session_teacher_${joinCode}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role } });
                    } catch (e) {
                         socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'teacher' } });
                    }
                } else {
                    socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'teacher' } });
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
        alert('Added 30 seconds to the clock!');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(joinCode);
        alert('Join Code copied!');
    };

    // Merge participants (connected) + leaderboard (submitted) so reconnected students always show
    const allStudents = useMemo(() => {
        const map = new Map();
        // Build a leaderboard lookup for scores/rank
        const lbMap = new Map();
        leaderboard.forEach(l => lbMap.set(l.username, l));

        participants.forEach(p => map.set(p.username, { ...p, isOnline: p.isOnline !== false, lb: lbMap.get(p.username) }));
        leaderboard.forEach(l => {
            if (!map.has(l.username)) {
                map.set(l.username, {
                    username: l.username,
                    _id: l.studentId?.toString(),
                    role: 'student',
                    isOnline: false,
                    lb: l
                });
            }
        });

        // Sort by score descending (those with leaderboard data first)
        return Array.from(map.values()).sort((a, b) => {
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

    if (loading) return (
        <DashboardLayout role="teacher">
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

    // Quiz ended (auto or manually) — show fallback screen
    if (isQuizEnded || quiz?.status === 'finished') {
        return (
            <DashboardLayout role="teacher">
                <div className="max-w-2xl mx-auto py-24 text-center space-y-8">
                    <div className="w-24 h-24 bg-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto">
                        <Trophy className="text-indigo-600" size={48} />
                    </div>
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter text-gray-900">Quiz <span className="text-[#ff6b00]">Ended</span></h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">The session has concluded. View results in the Performance tab.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate(`/leaderboard/${quiz._id}`)}
                            className="bg-[#ff6b00] text-white px-10 py-5 rounded-[2rem] font-black italic uppercase tracking-tighter text-xl hover:scale-105 transition shadow-xl shadow-orange-500/20 active:scale-95 border-b-4 border-orange-700"
                        >
                            View Leaderboard
                        </button>
                        <button
                            onClick={() => navigate('/teacher-dashboard')}
                            className="bg-gray-100 text-gray-700 px-10 py-5 rounded-[2rem] font-black italic uppercase tracking-tighter text-xl hover:bg-gray-200 transition"
                        >
                            Dashboard
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const isWaitingRoom = !quiz || quiz.status === 'waiting';

    if (isWaitingRoom) {
        return (
            <DashboardLayout role="teacher">
                <div className="max-w-6xl mx-auto space-y-12 py-10">
                    <div className="bg-indigo-900 rounded-[3rem] p-16 text-center text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-8">
                            <div className="inline-block px-6 py-2 bg-white/10 rounded-full border border-white/20">
                                <span className="text-indigo-200 font-black uppercase tracking-[0.3em] text-sm italic">Lobby is Open</span>
                            </div>
                            <h1 className="text-7xl font-black italic uppercase tracking-tighter">Waiting for <span className="text-[#ff6b00]">Participants</span></h1>
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-indigo-300 font-bold uppercase tracking-widest text-lg">Join Code</p>
                                <div onClick={copyCode} className="bg-white/5 border-2 border-white/10 hover:bg-white/10 transition-all rounded-3xl p-10 cursor-pointer group active:scale-95">
                                    <p className="text-8xl font-black tracking-[0.4em] group-hover:scale-105 transition-transform italic underline decoration-[#ff6b00] decoration-8 underline-offset-[16px]">{joinCode}</p>
                                </div>
                            </div>
                            <div className="pt-10 flex flex-col items-center gap-6">
                                <button
                                    onClick={handleStartQuiz}
                                    disabled={participants.length === 0}
                                    className="group flex items-center gap-10 bg-[#ff6b00] text-white px-24 py-10 rounded-[3rem] hover:scale-105 transition-all shadow-2xl shadow-[#ff6b00]/30 font-black text-5xl italic uppercase tracking-tighter active:scale-95 border-b-[12px] border-[#cc5500] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Play size={60} fill="currentColor" className="group-hover:translate-x-2 transition-transform" />
                                    START GAME
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
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="text-blue-600" size={24} />
                                    Participants ({participants.length})
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {participants.map((p, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold uppercase">
                                            {p.username ? p.username[0] : '?'}
                                        </div>
                                        <span className="font-bold text-gray-800 truncate">{p.username || 'Unknown'}</span>
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
        <DashboardLayout role="teacher">
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
                    <div onClick={copyCode} className="bg-indigo-900 rounded-[3rem] p-8 text-white shadow-2xl flex flex-col items-center justify-center min-w-[280px] cursor-pointer group hover:bg-indigo-950 transition-all active:scale-95 border-b-[8px] border-indigo-950">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2">ACCESS CODE</p>
                        <p className="text-6xl font-black tracking-[0.1em] italic text-[#ff6b00] group-hover:scale-110 transition-transform">{joinCode}</p>
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
                        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-5 py-3">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Q{currentQuestion + 1}/{quiz?.questions?.length || 0}</p>
                            <button
                                onClick={handleNextQuestion}
                                disabled={currentQuestion >= (quiz?.questions?.length || 0) - 1}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-tight text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>

                        <button
                            onClick={handleIncreaseTime}
                            className="bg-[#ff6b00] text-white px-6 py-3 rounded-xl font-black italic uppercase tracking-tighter hover:scale-[1.02] transition shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2 text-sm border-b-2 border-orange-700"
                        >
                            <Clock size={18} /> +30 SEC
                        </button>

                        <button
                            onClick={handleEndQuiz}
                            className="bg-red-600/10 border-2 border-red-600/20 text-red-500 px-6 py-3 rounded-xl font-black italic uppercase tracking-tighter hover:bg-red-600 hover:text-white transition active:scale-95 flex items-center gap-2 text-sm"
                        >
                            <MinusCircle size={18} /> END SESSION
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

                {/* Student Progress — Full Width Table with Dots */}
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-100/80 border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#0f172a] px-8 py-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                                Live <span className="text-[#ff6b00]">Student Tracker</span>
                            </h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                                {allStudents.length} Total · {participants.length} Connected · Page {currentPage}/{totalPages}
                            </p>
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-md bg-green-500"></div>
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

                    {/* Column Headers */}
                    <div className="px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rank</div>
                        <div className="w-40 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</div>
                        <div className="w-16 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</div>
                        <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions Progress</div>
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
                                            <p className="font-bold text-slate-800 truncate text-sm">{p.username || 'Unknown'}</p>
                                            {p._id && (
                                                <p className="text-[10px] text-slate-400 font-mono truncate">{p._id}</p>
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
            </div>
        </DashboardLayout>
    );
}
