import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, Send, Home, XCircle, Award, Clock, Trophy, Bell, Square, Circle, Triangle, Diamond, WifiOff } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export default function AttemptQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user: authUser } = useContext(AuthContext);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [tabStrikes, setTabStrikes] = useState(0);
    const [isWaiting, setIsWaiting] = useState(false); // New waiting state
    const [newQuestionNotification, setNewQuestionNotification] = useState(null);
    const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
    const [showIntermediateLeaderboard, setShowIntermediateLeaderboard] = useState(false);
    const [currentLeaderboard, setCurrentLeaderboard] = useState([]);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrectFeedback, setIsCorrectFeedback] = useState(false);
    const [answeredQuestions, setAnsweredQuestions] = useState(new Set()); // tracks submitted questions in live mode
    const hasInitializedTimer = useRef(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [missionComplete, setMissionComplete] = useState(false);
    const [waitingForState, setWaitingForState] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [timeTakenPerQuestion, setTimeTakenPerQuestion] = useState({});

    // Block browser back button for students during active quiz
    useEffect(() => {
        if (!quiz || isReviewMode || result) return;
        window.history.pushState(null, '', window.location.pathname);
        const handlePopState = () => {
            navigate('/');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [quiz, isReviewMode, result, navigate]);

    // Timer Logic
    useEffect(() => {
        if (loading || isReviewMode || result || !quiz) return;

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [loading, isReviewMode, result, quiz, currentQuestion]);

    // Heartbeat Emitter for Online Status Tracking
    useEffect(() => {
        if (!quiz || !authUser || isReviewMode || result) return;
        const heartbeatTimer = setInterval(() => {
            socket.emit('heartbeat', { quizId: id, userId: authUser._id });
        }, 5000);
        return () => clearInterval(heartbeatTimer);
    }, [quiz, authUser, id, isReviewMode, result]);

    // Listen for Teacher Events
    useEffect(() => {
        socket.on('timer_update', ({ additionalSeconds }) => {
            console.log('Teacher increased time by:', additionalSeconds);
            setTimeLeft(prev => prev + additionalSeconds);
        });

        socket.on('quiz_ended', async () => {
            toast.success('Quiz ended by host. Reviewing final standings...', { icon: '🏁' });
            setTimeout(() => {
                navigate(`/leaderboard/${id}`);
            }, 1500);
        });

        socket.on('sync_timer', ({ timeLeft }) => {
            console.log('Syncing timer from server:', timeLeft);
            setTimeLeft(timeLeft);
        });

        socket.on('change_question', ({ questionIndex }) => {
            console.log('Teacher changed question to:', questionIndex);
            const nextIdx = parseInt(questionIndex);
            setCurrentQuestion(nextIdx);
            setWaitingForState(false);

            if (quiz && !quiz.duration) {
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
            setQuestionStartTime(Date.now());
            localStorage.setItem(`live_quiz_session_${id}`, JSON.stringify({ currentQuestion: nextIdx, answers }));
        });

        socket.on('restoreState', (state) => {
            console.log('Restoring State on Reconnect (Student):', state);
            setCurrentQuestion(state.currentQuestionIndex);
            
            if (authUser && state.progress && state.progress[authUser._id]) {
                 const studentProgress = state.progress[authUser._id];
                 const answeredList = Object.keys(studentProgress).map(Number).filter(qIdx => studentProgress[qIdx].answered);
                 setAnsweredQuestions(new Set(answeredList));

                 const recoveredAnswers = {};
                 Object.keys(studentProgress).forEach(qIdx => {
                      if (studentProgress[qIdx].answered) {
                           recoveredAnswers[qIdx] = true;
                      }
                 });
                 setAnswers(prev => ({ ...prev, ...recoveredAnswers }));
            }
            
            setWaitingForState(false);
            
            if (state.quizStatus === 'started') {
                 setTimeLeft(state.remainingTime);
            } else if (state.quizStatus === 'finished') {
                 navigate(`/leaderboard/${id}`);
            }
        });

        socket.on('connect', () => {
            setIsOnline(true);
            if (quiz?.isLive && authUser) {
                const sessionStr = localStorage.getItem(`live_quiz_session_student_${id}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { 
                            quizId: sess.quizId, 
                            user: { 
                                username: sess.username, 
                                role: sess.role, 
                                _id: sess._id,
                                rollNumber: authUser.rollNumber,
                                name: authUser.name
                            } 
                        });
                    } catch (e) {
                        socket.emit('join_room', {
                            quizId: id,
                            user: { 
                                username: authUser.username || authUser.name, 
                                role: 'student', 
                                _id: authUser._id,
                                rollNumber: authUser.rollNumber,
                                name: authUser.name
                            }
                        });
                    }
                } else {
                    socket.emit('join_room', {
                        quizId: id,
                        user: { 
                            username: authUser.username || authUser.name, 
                            role: 'student', 
                            _id: authUser._id,
                            rollNumber: authUser.rollNumber,
                            name: authUser.name
                        }
                    });
                }
            }
        });
        socket.on('disconnect', () => setIsOnline(false));

        return () => {
            socket.off('quiz_ended');
            socket.off('timer_update');
            socket.off('sync_timer');
            socket.off('change_question');
            socket.off('restoreState');
            socket.off('connect');
            socket.off('disconnect');
        };
    }, [quiz, authUser, id, navigate]);

    // Offline / Reconnect detection
    useEffect(() => {
        const handleOffline = () => setIsOnline(false);
        const handleOnline = () => {
            setIsOnline(true);
            if (quiz?.isLive && authUser) {
                const sessionStr = localStorage.getItem(`live_quiz_session_student_${id}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role } });
                    } catch (e) {
                         socket.emit('join_room', {
                            quizId: id,
                            user: { username: authUser.username, role: 'student', _id: authUser._id }
                        });
                    }
                } else {
                    socket.emit('join_room', {
                        quizId: id,
                        user: { username: authUser.username, role: 'student', _id: authUser._id }
                    });
                }
            }
        };

        // Anti-Cheat: Tab Switch Detection
        const handleVisibilityChange = () => {
            if (document.hidden && !isReviewMode && !result && !submitting) {
                setTabStrikes(prev => {
                    const next = prev + 1;
                    if (next >= 3) {
                        showToast("Multiple tab switches detected. Auto-submitting quiz for integrity...", "error");
                        submitQuiz();
                    } else {
                        showToast(`Warning: Tab switching is not allowed! Strike ${next}/3`, "warning");
                    }
                    return next;
                });
            }
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [id, quiz, authUser, result, isReviewMode, submitting]);

    const handleAutoSubmitAnswer = async () => {
        const currentAnswer = answers[currentQuestion] || '';
        if (quiz.isLive && isOnline) {
            const token = localStorage.getItem('token');
            const userId = JSON.parse(atob(token.split('.')[1])).user.id;
            socket.emit('submit_question_answer', {
                quizId: id, studentId: userId,
                questionIndex: currentQuestion, answer: currentAnswer, timeRemaining: 0
            });
            setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));

            // If not pace controlled, move to next question automatically after auto-submit
            if (quiz?.paceControl === false || quiz?.timerMode === 'per-question') {
                if (currentQuestion < quiz.questions.length - 1) {
                    setCurrentQuestion(prev => prev + 1);
                    setQuestionStartTime(Date.now());
                    if (quiz?.timerMode === 'per-question') {
                        setTimeLeft(quiz.timerPerQuestion || 30);
                    }
                } else {
                    setMissionComplete(true);
                    if (!quiz.isLive) submitQuiz();
                }
            }
        } else if (quiz?.timerMode === 'per-question') {
            // Non-live per-question timer
            if (currentQuestion < quiz.questions.length - 1) {
                setCurrentQuestion(prev => prev + 1);
                setTimeLeft(quiz.timerPerQuestion || 30);
                setQuestionStartTime(Date.now());
            } else {
                submitQuiz();
            }
        }
    };

    const handleTimeUp = () => {
        if (quiz?.timerMode === 'per-question' || quiz?.isLive) {
            handleAutoSubmitAnswer();
        } else {
            // Total duration time up
            submitQuiz();
        }
    };

    const handleContinueToNext = () => {
        setShowIntermediateLeaderboard(false);
        setShowFeedback(false);

        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            if (quiz.timerMode === 'per-question') {
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
        } else {
            navigate(`/leaderboard/${id}`);
        }
    };

    useEffect(() => {
        if (quiz && !isReviewMode && !result) {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = JSON.parse(atob(token.split('.')[1]));
                    socket.emit('student_question_focus', {
                        quizId: id,
                        studentId: decoded.user.id,
                        username: decoded.user.username,
                        questionIndex: currentQuestion
                    });
                } catch (e) {
                    console.error("Focus emit error:", e);
                }
            }
        }
    }, [currentQuestion, quiz, isReviewMode, result, id]);

    useEffect(() => {
        if (quiz && !isReviewMode && !result) {
            if (quiz.timerMode === 'total' && quiz.duration > 0) {
                if (!hasInitializedTimer.current) {
                    setTimeLeft(quiz.duration * 60);
                    hasInitializedTimer.current = true;
                }
            } else if (quiz.timerMode === 'per-question') {
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
        }
    }, [currentQuestion, quiz, isReviewMode, result, id]);

    useEffect(() => {
        if (loading || isReviewMode || !quiz) return;
        if (result && !quiz.isLive) return;
        
        // If neither timer is set, don't start countdown
        if (quiz.timerMode === 'total' && quiz.duration === 0) {
            setTimeLeft(0);
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [loading, isReviewMode, result, quiz, currentQuestion]);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await api.get(`/quiz/${id}`);
                setQuiz(res.data);

                if (res.data.isLive && res.data.status === 'started') {
                    setWaitingForState(true);
                    setTimeout(() => setWaitingForState(false), 8000);
                } else {
                    if (res.data.previousResult) {
                        const prevResult = res.data.previousResult;
                        if (prevResult.status === 'completed') {
                            setIsReviewMode(true);
                            setResult(prevResult);
                            setAnswersFromHistory(prevResult.answers, res.data.questions);
                            return;
                        }
                        if (prevResult.status === 'in-progress') {
                            setAnswersFromHistory(prevResult.answers, res.data.questions);
                            const localSaved = localStorage.getItem(`quiz_answers_${id}`);
                            if (localSaved) {
                                const localAnswers = JSON.parse(localSaved);
                                setAnswers(prev => ({ ...prev, ...localAnswers }));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                showToast('Quiz not found', 'error');
                navigate('/home');
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();

        socket.on('new_question_added', ({ question, questionIndex, totalQuestions }) => {
            setNewQuestionNotification({ question, questionIndex, totalQuestions });
            setShowNewQuestionModal(true);
            setQuiz(prev => ({
                ...prev,
                questions: [...prev.questions, question]
            }));
        });

        socket.on('change_question', ({ questionIndex }) => {
            console.log("Teacher advanced to question:", questionIndex);
            setCurrentQuestion(questionIndex);
            setQuestionStartTime(Date.now());
            if (quiz?.timerMode === 'per-question') {
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
            setShowIntermediateLeaderboard(false);
            setShowFeedback(false);
        });

        return () => {
            socket.off('new_question_added');
            socket.off('question_leaderboard');
            socket.off('change_question');
        };
    }, [id, navigate]);

    // NEW: Auto-submit on Scheduled Deadline
    useEffect(() => {
        if (!quiz || isReviewMode || result || !quiz.scheduledEndTime) return;

        const checkDeadline = () => {
            const now = new Date();
            const end = new Date(quiz.scheduledEndTime);
            
            // Trigger auto-submit if we are at or past the deadline
            if (now >= end) {
                console.log("Scheduled deadline reached. Auto-submitting...");
                showToast("Deadline reached! Auto-submitting your answers...", "info");
                submitQuiz();
            }
        };

        // Check every 2 seconds for high precision
        const intervalId = setInterval(checkDeadline, 2000);
        return () => clearInterval(intervalId);
    }, [quiz, isReviewMode, result, id]);

    useEffect(() => {
        if (!authUser || !quiz) return;
        const sessionData = {
            quizId: id,
            username: authUser.username,
            role: 'student',
            _id: authUser._id
        };
        if (quiz.isLive) {
            localStorage.setItem(`live_quiz_session_student_${id}`, JSON.stringify(sessionData));
        }
        socket.emit('join_room', {
            quizId: id,
            user: { username: authUser.username, role: 'student', _id: authUser._id }
        });
    }, [authUser, quiz, id]);

    const setAnswersFromHistory = (historyAnswers, quizQuestions) => {
        const newAnswers = {};
        historyAnswers.forEach((ans) => {
            const qIndex = quizQuestions.findIndex(q => q.questionText === ans.questionText);
            if (qIndex >= 0) newAnswers[qIndex] = ans.selectedOption;
        });
        setAnswers(prev => ({ ...prev, ...newAnswers }));
    };

    const handleOptionSelect = (option) => {
        if (isReviewMode) return;
        const newAnswers = { ...answers, [currentQuestion]: option };
        setAnswers(newAnswers);
        localStorage.setItem(`quiz_answers_${id}`, JSON.stringify(newAnswers));
        if (quiz?.isLive) {
            localStorage.setItem(`live_quiz_session_${id}`, JSON.stringify({ currentQuestion, answers: newAnswers }));
        }
    };

    const handleSingleQuestionSubmit = () => {
        if (!answers[currentQuestion]) return showToast('Please select an option first!', 'warning');

        if (quiz?.isLive) {
            if (!isOnline) {
                return showToast('You are offline! Wait for your connection to restore before submitting.', 'error');
            }
            const token = localStorage.getItem('token');
            const userId = JSON.parse(atob(token.split('.')[1])).user.id;
            const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
            socket.emit('submit_question_answer', {
                quizId: id, studentId: userId,
                questionIndex: currentQuestion,
                answer: answers[currentQuestion],
                timeRemaining: timeLeft,
                timeTaken: timeSpent
            });
            setTimeTakenPerQuestion(prev => ({ ...prev, [currentQuestion]: timeSpent }));
            setQuestionStartTime(Date.now());
            setAnsweredQuestions(prev => {
                const newSet = new Set([...prev, currentQuestion]);
                if (newSet.size === quiz.questions.length) {
                    setMissionComplete(true);
                }
                return newSet;
            });

            // If not pace controlled or per-question timer, move to next question automatically
            if (quiz?.paceControl === false || quiz?.timerMode === 'per-question') {
                if (currentQuestion < quiz.questions.length - 1) {
                    setCurrentQuestion(prev => prev + 1);
                    setQuestionStartTime(Date.now());
                    if (quiz?.timerMode === 'per-question') {
                        setTimeLeft(quiz.timerPerQuestion || 30);
                    }
                } else {
                    // Quiz finished (all questions answered)
                    setMissionComplete(true);
                }
            }
        } else {
            const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
            setTimeTakenPerQuestion(prev => ({ ...prev, [currentQuestion]: timeSpent }));
            setQuestionStartTime(Date.now());

            // If this was a TOTAL timer or a DEADLINE timer, we must submit EVERYTHING now
            if (quiz?.timerMode === 'total' || (quiz?.scheduledEndTime && new Date() >= new Date(quiz.scheduledEndTime))) {
                console.log("Global timer expired. Force submitting...");
                submitQuiz();
            } else if (currentQuestion < quiz.questions.length - 1) {
                // Otherwise (per-question timer), move to next
                setCurrentQuestion(prev => prev + 1);
                if (quiz.timerMode === 'per-question') {
                    setTimeLeft(quiz.timerPerQuestion || 30);
                }
            } else {
                submitQuiz();
            }
        }
    };

    const submitQuiz = async () => {
        if (submitting || isReviewMode) return;
        setSubmitting(true);
        try {
            const finalTimeTaken = { ...timeTakenPerQuestion };
            if (finalTimeTaken[currentQuestion] === undefined) {
                finalTimeTaken[currentQuestion] = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
            }

            const formattedAnswers = quiz.questions.map((q, idx) => ({
                questionText: q.questionText,
                selectedOption: answers[idx] || '',
                timeTaken: finalTimeTaken[idx] || 0
            }));

            const res = await api.post('/quiz/submit', {
                quizId: id,
                answers: formattedAnswers
            });

            setResult(res.data);
            navigate(`/report/${res.data._id || res.data.id}`);
        } catch (err) {
            console.error(err);
            showToast('Submission failed. Please check your connection.', 'error');
            const error = err;
            if (error?.response?.status === 400 && error?.response?.data?.msg === 'Quiz already attempted') {
                window.location.reload();
            }
        } finally {
            setSubmitting(false);
            localStorage.removeItem(`quiz_answers_${id}`);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
    );

    if (waitingForState) return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center font-inter relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
            <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-500 max-w-md w-full">
                <Loader2 className="animate-spin text-[#ff6b00] mx-auto mb-4" size={64} />
                <h1 className="text-4xl font-black italic uppercase tracking-tighter">Synchronizing...</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed">
                    Restoring your state securely from the server.
                </p>
            </div>
        </div>
    );

    if (missionComplete && quiz?.isLive) {
        if (quiz.paceControl === false || quiz?.timerMode === 'per-question') {
            navigate(`/leaderboard/${id}`);
            return null;
        }
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center font-inter relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
                <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-500 max-w-md w-full">
                    <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Clock className="text-[#ff6b00]" size={40} />
                    </div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">Mission <span className="text-[#ff6b00]">Complete</span></h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed">
                        All answers submitted! The leaderboard will appear when the quiz session ends.
                    </p>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Time remaining</span>
                            <div className="text-5xl font-black italic text-[#ff6b00]">
                                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-white/40">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="font-black italic uppercase tracking-widest text-[10px]">Waiting for quiz to end...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (result && !isReviewMode) {
        if (quiz?.isLive) {
            return (
                <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center font-inter relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
                    <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-500 max-w-md w-full">
                        <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Clock className="text-[#ff6b00]" size={40} />
                        </div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Mission <span className="text-[#ff6b00]">Complete</span></h1>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed">
                            Your data has been transmitted. The gateway will open when the synchronization sequence concludes.
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Leaderboard appears in</span>
                                <div className="text-5xl font-black italic text-[#ff6b00]">
                                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-4 text-white/40">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="font-black italic uppercase tracking-widest text-[10px]">Synchronizing Results...</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h1>
                    <p className="text-gray-500 mb-8">Great job finishing the quiz. Here are your results:</p>

                    <div className="bg-indigo-50 rounded-2xl p-6 mb-8">
                        <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider mb-1">Your Score</p>
                        <div className="text-5xl font-black text-indigo-900">
                            {result.score} <span className="text-xl text-indigo-400 font-medium">/ {result.totalQuestions * 10}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate(`/leaderboard/${id}`)}
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <Trophy size={20} /> View Leaderboard
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/student-dashboard')}
                                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                                Home
                            </button>
                            <button
                                onClick={() => setIsReviewMode(true)}
                                className="bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                            >
                                Review
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!quiz) return null;
    const question = quiz.questions[currentQuestion];
    const isLastQuestion = currentQuestion === quiz.questions.length - 1;
    const questionResult = isReviewMode && result
        ? result.answers.find(a => a.questionText === question.questionText)
        : null;

    const isSubmittedLive = quiz?.isLive && (quiz?.paceControl !== false || quiz?.timerMode === 'per-question') && answeredQuestions.has(currentQuestion);

    if (quiz?.isLive && quiz?.status === 'waiting') {
        return (
            <DashboardLayout role="student">
                <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>

                    <div className="max-w-md w-full relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
                            <Clock className="text-[#ff6b00] animate-pulse" size={44} />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Hold <span className="text-[#ff6b00]">Tight!</span></h1>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                                The host hasn't started the session yet. You'll be moved into the arena automatically.
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                            <div className="flex items-center justify-center gap-4 text-white/40 mb-2">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="font-black italic uppercase tracking-widest text-[10px]">Synchronizing with Host...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-6 py-3 flex items-center justify-center gap-3 font-bold text-sm shadow-lg">
                    <WifiOff size={18} />
                    You are offline — progress saved locally. Submissions paused until reconnected.
                </div>
            )}
            <header className={`bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky z-50 ${!isOnline ? 'top-10' : 'top-0'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={async () => {
                            if (isReviewMode || result) {
                                navigate('/student-dashboard');
                                return;
                            }
                            const confirmLeave = await Swal.fire({
                                title: 'Leave Quiz?',
                                text: 'Your progress in this specific question might be lost. Are you sure?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Yes, Exit',
                                cancelButtonText: 'Keep Playing',
                                confirmButtonColor: '#ff6b00',
                                background: '#1e293b',
                                color: '#fff'
                            });
                            if (confirmLeave.isConfirmed) {
                                navigate('/student-dashboard');
                            }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="font-bold text-gray-900">{quiz.title}</h2>
                        <p className="text-xs text-gray-500">{currentQuestion + 1} of {quiz.questions.length} Questions {isReviewMode && '• Review Mode'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {!isReviewMode && !result && (timeLeft > 0 || (quiz.timerMode === 'total' && quiz.duration > 0) || (quiz.timerMode === 'per-question')) && (
                        <div className="flex flex-col items-center">
                            <div className="relative w-16 h-16">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                                    <circle
                                        cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray={175.9}
                                        strokeDashoffset={175.9 * (1 - timeLeft / (quiz.timerMode === 'total' ? (quiz.duration * 60) : (quiz.timerPerQuestion || 30)))}
                                        className={`transition-all duration-1000 ${timeLeft <= 5 ? 'text-red-500' : 'text-[#ff6b00]'}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{timeLeft}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                        />
                    </div>
                </div>
            </header>

            {isSubmittedLive && (
                <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-500">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
                    
                    <div className="relative z-10 max-w-lg w-full space-y-10">
                        <div className="relative inline-block">
                            <div className="absolute -inset-4 bg-[#ff6b00] opacity-20 blur-2xl rounded-full animate-pulse"></div>
                            <div className="relative bg-white/5 p-12 rounded-[3.5rem] border border-white/10 shadow-2xl backdrop-blur-3xl">
                                <Clock className="text-[#ff6b00] animate-spin-slow" size={80} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 bg-[#ff6b00]/10 border border-[#ff6b00]/20 px-4 py-2 rounded-full">
                                <div className="w-2 h-2 bg-[#ff6b00] rounded-full animate-ping"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff6b00]">Response Transmitted</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-tight">
                                Waiting for <span className="text-[#ff6b00]">Sequence</span>
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm leading-relaxed">
                                Great job! Your answer is safely stored. The session will resume shortly.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                    <div 
                        className="h-full bg-[#ff6b00] transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / (quiz.timerMode === 'total' ? (quiz.duration * 60) : (quiz.timerPerQuestion || 30))) * 100}%` }}
                    ></div>
                </div>

                <div className="max-w-4xl w-full h-[85vh] flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-2">
                        {isReviewMode && (
                            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${questionResult?.isCorrect ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                {questionResult?.isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                <div className="flex-1">
                                    <p className="text-sm font-bold">{questionResult?.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}</p>
                                    <p className="text-xs opacity-80">Marks Awarded: {questionResult?.isCorrect ? question.points : 0} / {question.points}</p>
                                </div>
                                <Award size={24} className="opacity-20" />
                            </div>
                        )}

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12 mb-8 relative overflow-hidden">
                            <span className="inline-block bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 border border-indigo-100">
                                Question {currentQuestion + 1} of {quiz.questions.length}
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-8 leading-[1.1] italic uppercase tracking-tighter">
                                {question.questionText}
                            </h1>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {question.options.map((option, idx) => {
                                    const isSelected = answers[currentQuestion] === option;
                                    const isCorrect = questionResult?.correctOption === option;
                                    const kahootStyles = [
                                        { color: 'bg-[#eb1727]', hover: 'hover:bg-[#c91422]', icon: Triangle },
                                        { color: 'bg-[#1368ce]', hover: 'hover:bg-[#1056ab]', icon: Diamond },
                                        { color: 'bg-[#d5a021]', hover: 'hover:bg-[#b0851b]', icon: Circle },
                                        { color: 'bg-[#26890c]', hover: 'hover:bg-[#1e6d09]', icon: Square }
                                    ];
                                    const style = kahootStyles[idx % 4];
                                    const ShapeIcon = style.icon;

                                    let containerClass = `${style.color} ${style.hover} text-white shadow-lg`;
                                    if (isReviewMode) {
                                        if (isCorrect) containerClass = 'bg-green-500 text-white ring-4 ring-green-200';
                                        else if (isSelected && !isCorrect) containerClass = 'bg-red-500 text-white ring-4 ring-red-200';
                                        else containerClass = 'bg-gray-200 text-gray-400 opacity-40 grayscale';
                                    } else if (isSelected) {
                                        containerClass = `${style.color} ring-8 ring-white/30 scale-[0.98]`;
                                    }

                                    const isAnswerLocked = quiz?.isLive && (quiz?.paceControl !== false || quiz?.timerMode === 'per-question') && answeredQuestions.has(currentQuestion);
                                    
                                    if (answers[currentQuestion] && !isSelected && !isReviewMode) {
                                        containerClass += isAnswerLocked ? ' opacity-30 grayscale' : ' opacity-50 grayscale-[0.5]';
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={isReviewMode || isWaiting || submitting || isAnswerLocked}
                                            onClick={() => handleOptionSelect(option)}
                                            className={`relative min-h-[100px] md:min-h-[120px] text-left px-8 py-6 rounded-[2rem] transition-all duration-300 flex items-center gap-6 group ${containerClass} disabled:cursor-not-allowed overflow-hidden hover:scale-[1.02] active:scale-95`}
                                        >
                                            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md group-hover:rotate-12 transition-transform">
                                                <ShapeIcon size={32} fill="white" strokeWidth={0} />
                                            </div>
                                            <span className="text-xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight flex-1">
                                                {option}
                                            </span>
                                            {isSelected && !isReviewMode && (
                                                <div className="absolute top-4 right-4 bg-white text-gray-900 rounded-full p-1.5 shadow-xl animate-bounce">
                                                    <CheckCircle size={20} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 flex items-center justify-between shadow-2xl">
                        <div className="flex-1">
                            {(isReviewMode || (!quiz?.isLive) || (quiz?.isLive && quiz?.paceControl === false && quiz?.timerMode === 'total')) && (
                                <button
                                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestion === 0 || (quiz?.isLive && quiz?.paceControl === false && answers[currentQuestion-1] !== undefined && answers[currentQuestion-1] !== '')}
                                    className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black italic uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all hover:bg-slate-50"
                                >
                                    <ChevronLeft size={24} /> Back
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex justify-center">
                            {isReviewMode ? (
                                isLastQuestion ? (
                                    <button
                                        onClick={() => setIsReviewMode(false)}
                                        className="group flex items-center gap-4 bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 shadow-xl shadow-indigo-600/20 transition-all border-b-4 border-indigo-800 active:scale-95"
                                    >
                                        <Home size={24} /> Finish Review
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setCurrentQuestion(prev => prev + 1)}
                                        className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black italic uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all hover:bg-indigo-50"
                                    >
                                        Next <ChevronRight size={24} />
                                    </button>
                                )
                            ) : (
                                quiz?.isLive && (quiz?.paceControl !== false || quiz?.timerMode === 'per-question') ? (
                                    answeredQuestions.has(currentQuestion) ? (
                                        <div className="flex items-center gap-4 px-10 py-5 bg-slate-100 rounded-2xl text-slate-400 font-black italic uppercase tracking-widest text-sm animate-pulse">
                                            <Loader2 className="animate-spin" size={20} /> Locked. Waiting...
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleSingleQuestionSubmit}
                                            disabled={isWaiting || !answers[currentQuestion] || (!isOnline && quiz?.isLive)}
                                            className="group flex items-center gap-6 bg-[#ff6b00] text-white px-12 py-6 rounded-[2rem] font-black italic uppercase tracking-tighter hover:scale-105 transition-all shadow-2xl shadow-orange-600/30 active:scale-95 disabled:opacity-50 border-b-8 border-orange-700 text-2xl"
                                        >
                                            {!isOnline && quiz?.isLive ? <><WifiOff size={28} /> Offline...</> : <>LOCK ANSWER <Send size={28} /></>}
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={quiz?.isLive ? handleSingleQuestionSubmit : (isLastQuestion ? submitQuiz : handleSingleQuestionSubmit)}
                                        disabled={isWaiting || !answers[currentQuestion] || (!isOnline && quiz?.isLive)}
                                        className="group flex items-center gap-6 bg-[#ff6b00] text-white px-12 py-6 rounded-[2rem] font-black italic uppercase tracking-tighter hover:scale-105 transition-all shadow-2xl shadow-orange-600/30 active:scale-95 disabled:opacity-50 border-b-8 border-orange-700 text-2xl"
                                    >
                                        {!isOnline && quiz?.isLive ? <><WifiOff size={28} /> Offline...</> : <>{isLastQuestion && !quiz?.isLive ? 'FINISH EXAM' : 'CONFIRM'} <Send size={28} /></>}
                                    </button>
                                )
                            )}
                        </div>

                        <div className="flex-1 flex justify-end">
                            {!isReviewMode && !isLastQuestion && (quiz?.paceControl === false || quiz?.timerMode === 'per-question' || !quiz?.isLive) && (
                                <button
                                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                                    className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black italic uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50"
                                >
                                    Skip <ChevronRight size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {showNewQuestionModal && newQuestionNotification && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Bell className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">New Question Added!</h2>
                                <p className="text-sm text-gray-500">Your teacher added a bonus question</p>
                            </div>
                        </div>
                        <div className="bg-indigo-50 rounded-2xl p-6 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">{newQuestionNotification.question.questionText}</h3>
                            <div className="space-y-3">
                                {newQuestionNotification.question.options.map((option, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            const token = localStorage.getItem('token');
                                            const userId = JSON.parse(atob(token.split('.')[1])).user.id;
                                            socket.emit('submit_new_question', {
                                                quizId: id, studentId: userId,
                                                questionIndex: newQuestionNotification.questionIndex,
                                                answer: option
                                            });
                                            setShowNewQuestionModal(false);
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all font-medium text-gray-700"
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setShowNewQuestionModal(false)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">Skip</button>
                    </div>
                </div>
            )}

            {showIntermediateLeaderboard && currentLeaderboard.length > 0 && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center"><Trophy className="text-indigo-600" size={24} /></div>
                            <div><h2 className="text-2xl font-black text-gray-900">Leaderboard</h2></div>
                        </div>
                        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                            {currentLeaderboard.map((student, sIdx) => (
                                <div key={student.studentId ? `${student.studentId}-${sIdx}` : sIdx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">{student.rank}</div>
                                        <span className="font-bold text-gray-900">{student.username}</span>
                                    </div>
                                    <div className="text-xl font-black text-indigo-600">{student.currentScore} pts</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleContinueToNext} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Continue</button>
                    </div>
                </div>
            )}
        </div>
    );
}
