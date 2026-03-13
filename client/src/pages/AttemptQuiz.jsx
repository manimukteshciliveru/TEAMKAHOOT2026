// import { useState, useEffect, useRef, useContext } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import api from '../utils/api';
// import socket from '../utils/socket';
// import { Loader2, CheckCircle, ChevronRight, ChevronLeft, Send, Home, XCircle, Award, Clock, Trophy, Bell, Square, Circle, Triangle, Diamond, WifiOff } from 'lucide-react';
// import AuthContext from '../context/AuthContext';

// export default function AttemptQuiz() {
//     const { id } = useParams();
//     const navigate = useNavigate();
//     const { user: authUser } = useContext(AuthContext);
//     const [quiz, setQuiz] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [currentQuestion, setCurrentQuestion] = useState(0);
//     const [answers, setAnswers] = useState({});
//     const [submitting, setSubmitting] = useState(false);
//     const [result, setResult] = useState(null);
//     const [isReviewMode, setIsReviewMode] = useState(false);
//     const [timeLeft, setTimeLeft] = useState(30);
//     const [isWaiting, setIsWaiting] = useState(false); // New waiting state
//     const [newQuestionNotification, setNewQuestionNotification] = useState(null);
//     const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
//     const [showIntermediateLeaderboard, setShowIntermediateLeaderboard] = useState(false);
//     const [currentLeaderboard, setCurrentLeaderboard] = useState([]);
//     const [showFeedback, setShowFeedback] = useState(false);
//     const [isCorrectFeedback, setIsCorrectFeedback] = useState(false);
//     const [answeredQuestions, setAnsweredQuestions] = useState(new Set()); // tracks submitted questions in live mode
//     const hasInitializedTimer = useRef(false);
//     const [isOnline, setIsOnline] = useState(navigator.onLine);
//     const [missionComplete, setMissionComplete] = useState(false);

//     // Timer Logic
//     useEffect(() => {
//         if (loading || isReviewMode || result || !quiz) return;

//         const timerId = setInterval(() => {
//             setTimeLeft(prev => {
//                 if (prev <= 1) {
//                     clearInterval(timerId);
//                     handleTimeUp();
//                     return 0;
//                 }
//                 return prev - 1;
//             });
//         }, 1000);

//         return () => clearInterval(timerId);
//     }, [loading, isReviewMode, result, quiz, currentQuestion]);

//     // Listen for Teacher Events (timer sync, quiz end only — students navigate themselves)
//     useEffect(() => {
//         socket.on('timer_update', ({ additionalSeconds }) => {
//             console.log('Teacher increased time by:', additionalSeconds);
//             setTimeLeft(prev => prev + additionalSeconds);
//         });

//         socket.on('quiz_ended', async () => {
//             // Results are already saved via socket events during the quiz.
//             // Navigate to leaderboard after a small delay to allow server finalization.
//             setTimeout(() => {
//                 navigate(`/leaderboard/${id}`);
//             }, 1500);
//         });

//         socket.on('sync_timer', ({ timeLeft }) => {
//             console.log('Syncing timer from server:', timeLeft);
//             setTimeLeft(timeLeft);
//         });

//         socket.on('change_question', ({ questionIndex }) => {
//             console.log('Teacher changed question to:', questionIndex);
//             const nextIdx = parseInt(questionIndex);
//             setCurrentQuestion(nextIdx);

//             // Reset state for new question
//             if (quiz && !quiz.duration) {
//                 setTimeLeft(quiz.timerPerQuestion || 30);
//             }
//             // Persist new position offline
//             localStorage.setItem(`live_quiz_session_${id}`, JSON.stringify({ currentQuestion: nextIdx, answers }));
//         });

//         socket.on('connect', () => {
//             setIsOnline(true);
//             if (quiz?.isLive && authUser) {
//                 socket.emit('join_room', {
//                     quizId: id,
//                     user: {
//                         username: authUser.username,
//                         role: 'student',
//                         _id: authUser._id
//                     }
//                 });
//             }
//         });
//         socket.on('disconnect', () => setIsOnline(false));

//         return () => {
//             socket.off('quiz_ended');
//             socket.off('timer_update');
//             socket.off('sync_timer');
//             socket.off('change_question');
//             socket.off('connect');
//             socket.off('disconnect');
//         };
//     }, [quiz]);

//     // Offline / Reconnect detection — restore session and re-join room on reconnect
//     useEffect(() => {
//         const handleOffline = () => setIsOnline(false);
//         const handleOnline = () => {
//             setIsOnline(true);
//             if (quiz?.isLive && authUser) {
//                 // Restore saved session position
//                 const saved = localStorage.getItem(`live_quiz_session_${id}`);
//                 if (saved) {
//                     try {
//                         const { currentQuestion: savedQ, answers: savedAnswers } = JSON.parse(saved);
//                         if (savedQ !== undefined) setCurrentQuestion(savedQ);
//                         if (savedAnswers) setAnswers(prev => ({ ...prev, ...savedAnswers }));
//                     } catch (e) { console.error('Session restore error:', e); }
//                 }
//                 // Re-join room so teacher participant count updates
//                 socket.emit('join_room', {
//                     quizId: id,
//                     user: {
//                         username: authUser.username,
//                         role: 'student',
//                         _id: authUser._id
//                     }
//                 });
//             }
//         };
//         window.addEventListener('offline', handleOffline);
//         window.addEventListener('online', handleOnline);
//         return () => {
//             window.removeEventListener('offline', handleOffline);
//             window.removeEventListener('online', handleOnline);
//         };
//     }, [id, quiz]);

//     const handleAutoSubmitAnswer = async () => {
//         const currentAnswer = answers[currentQuestion] || '';
//         if (quiz.isLive && isOnline) {
//             const token = localStorage.getItem('token');
//             const userId = JSON.parse(atob(token.split('.')[1])).user.id;
//             socket.emit('submit_question_answer', {
//                 quizId: id, studentId: userId,
//                 questionIndex: currentQuestion, answer: currentAnswer, timeRemaining: 0
//             });
//             setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
//         }
//     };

//     const handleTimeUp = () => {
//         if (quiz?.isLive) {
//             handleAutoSubmitAnswer();
//         } else {
//             if (currentQuestion < quiz.questions.length - 1) {
//                 setCurrentQuestion(prev => prev + 1);
//                 setTimeLeft(quiz.timerPerQuestion || 30);
//             } else {
//                 submitQuiz();
//             }
//         }
//     };

//     const handleContinueToNext = () => {
//         setShowIntermediateLeaderboard(false);
//         setShowFeedback(false);

//         if (currentQuestion < quiz.questions.length - 1) {
//             setCurrentQuestion(prev => prev + 1);
//             // Reset timer for next question if per-question timer exists
//             if (!quiz.duration) {
//                 setTimeLeft(quiz.timerPerQuestion || 30);
//             }
//         } else {
//             // Last question - navigate to final leaderboard
//             navigate(`/leaderboard/${id}`);
//         }
//     };

//     useEffect(() => {
//         if (quiz && !isReviewMode && !result) {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 try {
//                     const decoded = JSON.parse(atob(token.split('.')[1]));
//                     socket.emit('student_question_focus', {
//                         quizId: id,
//                         studentId: decoded.user.id,
//                         username: decoded.user.username,
//                         questionIndex: currentQuestion
//                     });
//                 } catch (e) {
//                     console.error("Focus emit error:", e);
//                 }
//             }
//         }
//     }, [currentQuestion, quiz, isReviewMode, result, id]);

//     // Timer Initialization (Split from focus logic)
//     useEffect(() => {
//         if (quiz && !isReviewMode && !result) {
//             // Initialize global timer ONLY ONCE
//             if (quiz.duration > 0) {
//                 if (!hasInitializedTimer.current) {
//                     setTimeLeft(quiz.duration * 60);
//                     hasInitializedTimer.current = true;
//                 }
//             } else {
//                 // Per question timer: reset on every question change
//                 setTimeLeft(quiz.timerPerQuestion || 30);
//             }
//         }
//     }, [currentQuestion, quiz, isReviewMode, result, id]); // Keeping currentQuestion for per-question mode

//     useEffect(() => {
//         if (loading || isReviewMode || !quiz) return;

//         // Only stop timer on result if it's NOT a live quiz
//         if (result && !quiz.isLive) return;

//         // Disable timer if both options are 0 (Assessment Mode)
//         if (quiz.timerPerQuestion === 0 && quiz.duration === 0) {
//             setTimeLeft(0);
//             return;
//         }

//         const timerId = setInterval(() => {
//             setTimeLeft(prev => {
//                 if (prev <= 1) {
//                     if (quiz.duration > 0) {
//                         // Global timer expired -> Submit Quiz
//                         clearInterval(timerId);
//                         submitQuiz();
//                         return 0;
//                     } else {
//                         // Per question timer expired -> Next Question
//                         clearInterval(timerId);
//                         handleTimeUp();
//                         return 0;
//                     }
//                 }
//                 return prev - 1;
//             });
//         }, 1000);

//         return () => clearInterval(timerId);
//     }, [loading, isReviewMode, result, quiz, currentQuestion]);

//     useEffect(() => {
//         const fetchQuiz = async () => {
//             try {
//                 const res = await api.get(`/quiz/${id}`);
//                 setQuiz(res.data);

//                 // LIVE QUIZ PAGE REFRESH: restore session from localStorage and auto-rejoin
//                 if (res.data.isLive && res.data.status === 'started') {
//                     const saved = localStorage.getItem(`live_quiz_session_${id}`);
//                     if (saved) {
//                         try {
//                             const { currentQuestion: savedQ, answers: savedAnswers } = JSON.parse(saved);
//                             if (savedQ !== undefined) setCurrentQuestion(savedQ);
//                             if (savedAnswers) {
//                                 setAnswers(savedAnswers);
//                                 // Mark previously submitted questions as answered
//                                 const answeredSet = new Set(
//                                     Object.keys(savedAnswers).map(Number)
//                                 );
//                                 setAnsweredQuestions(answeredSet);
//                             }
//                         } catch (e) { console.error('Session restore on refresh:', e); }
//                     }
//                     if (authUser) {
//                         socket.emit('join_room', {
//                             quizId: id,
//                             user: {
//                                 username: authUser.username,
//                                 role: 'student',
//                                 _id: authUser._id
//                             }
//                         });
//                     }
//                     // Skip previousResult handling — live quiz session is restored
//                 } else {
//                     // If there's a previous result (Completed or In-Progress)
//                     if (res.data.previousResult) {
//                         const prevResult = res.data.previousResult;

//                         // BLOCK RE-ENTRY: If completed, forced review mode
//                         if (prevResult.status === 'completed') {
//                             setIsReviewMode(true);
//                             setResult(prevResult);
//                             setAnswersFromHistory(prevResult.answers);
//                             return; // Stop further loading
//                         }

//                         // RESUME: If in-progress, load state
//                         if (prevResult.status === 'in-progress') {
//                             console.log('Resuming quiz attempt...');
//                             setAnswersFromHistory(prevResult.answers);
//                             const localSaved = localStorage.getItem(`quiz_answers_${id}`);
//                             if (localSaved) {
//                                 const localAnswers = JSON.parse(localSaved);
//                                 setAnswers(prev => ({ ...prev, ...localAnswers }));
//                             }
//                         }
//                     }
//                 } // end else (non-live or not started)
//             } catch (err) {
//                 console.error('Error fetching quiz', err);
//                 alert('Quiz not found');
//                 navigate('/student-dashboard');
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchQuiz();

//         if (authUser) {
//             socket.emit('join_room', {
//                 quizId: id,
//                 user: {
//                     username: authUser.username,
//                     role: 'student',
//                     _id: authUser._id
//                 }
//             });
//         }

//         socket.on('new_question_added', ({ question, questionIndex, totalQuestions }) => {
//             console.log('New question received:', question);
//             setNewQuestionNotification({ question, questionIndex, totalQuestions });
//             setShowNewQuestionModal(true);

//             // Update quiz with new question
//             setQuiz(prev => ({
//                 ...prev,
//                 questions: [...prev.questions, question]
//             }));
//         });

//         // Listen for intermediate leaderboard after each question
//         socket.on('question_leaderboard', ({ questionIndex, leaderboard }) => {
//             console.log('Leaderboard received for question', questionIndex, leaderboard);
//             setCurrentLeaderboard(leaderboard);
//         });

//         return () => {
//             socket.off('new_question_added');
//             socket.off('question_leaderboard');
//         };
//     }, [id, navigate]);

//     const setAnswersFromHistory = (historyAnswers) => {
//         const newAnswers = {};
//         historyAnswers.forEach((ans, _) => {
//             // Find index by question text in case of shuffling (advanced), but here strictly by index for now or assume order
//             // Better to map by questionText if possible, but index is safe for now if static
//             // Actually, `answers` state is by index.
//             // We need to match existing questions.
//             const qIndex = quiz.questions.findIndex(q => q.questionText === ans.questionText);
//             if (qIndex >= 0) newAnswers[qIndex] = ans.selectedOption;
//         });
//         setAnswers(prev => ({ ...prev, ...newAnswers }));
//     };

//     const handleOptionSelect = (option) => {
//         if (isReviewMode) return;
//         const newAnswers = { ...answers, [currentQuestion]: option };
//         setAnswers(newAnswers);
//         localStorage.setItem(`quiz_answers_${id}`, JSON.stringify(newAnswers));
//         // Persist full live session state for offline recovery
//         if (quiz?.isLive) {
//             localStorage.setItem(`live_quiz_session_${id}`, JSON.stringify({ currentQuestion, answers: newAnswers }));
//         }
//     };

//     const handleSingleQuestionSubmit = () => {
//         if (!answers[currentQuestion]) return alert('Please select an option first!');

//         if (quiz?.isLive) {
//             if (!isOnline) {
//                 return alert('You are offline! Wait for your connection to restore before submitting.');
//             }
//             const token = localStorage.getItem('token');
//             const userId = JSON.parse(atob(token.split('.')[1])).user.id;
//             socket.emit('submit_question_answer', {
//                 quizId: id, studentId: userId,
//                 questionIndex: currentQuestion,
//                 answer: answers[currentQuestion],
//                 timeRemaining: timeLeft
//             });
//             setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
//             // Show mission complete screen after last question submitted
//             if (currentQuestion === quiz.questions.length - 1) {
//                 setMissionComplete(true);
//             }
//         } else {
//             if (currentQuestion < quiz.questions.length - 1) {
//                 setCurrentQuestion(prev => prev + 1);
//                 setTimeLeft(quiz.timerPerQuestion || 30);
//             } else {
//                 submitQuiz();
//             }
//         }
//     };

//     // Student advances to next question themselves (live mode)
//     const handleNextQuestion = () => {
//         // Disabled in strict mode - teacher controls navigation
//         console.log("Manual navigation disabled in live mode.");
//     };

//     const submitQuiz = async () => {
//         if (submitting || isReviewMode) return;
//         setSubmitting(true);
//         try {
//             const formattedAnswers = quiz.questions.map((q, idx) => ({
//                 questionText: q.questionText,
//                 selectedOption: answers[idx] || ''
//             }));

//             const res = await api.post('/quiz/submit', {
//                 quizId: id,
//                 answers: formattedAnswers
//             });

//             setResult(res.data);
//         } catch (err) {
//             console.error('Error submitting quiz', err);
//             // Handle "already attempted" gracefully
//             const error = /** @type {any} */ (err);
//             if (error?.response?.status === 400 && error?.response?.data?.msg === 'Quiz already attempted') {
//                 window.location.reload(); // Refresh to catch the result in useEffect
//             } else {
//                 alert('Submission failed. Please check your connection.');
//             }
//         } finally {
//             setSubmitting(false);
//             // Clear local storage on finish
//             localStorage.removeItem(`quiz_answers_${id}`);
//         }
//     };

//     if (loading) return (
//         <div className="min-h-screen flex items-center justify-center bg-gray-50">
//             <Loader2 className="animate-spin text-indigo-600" size={48} />
//         </div>
//     );

//     // Mission Complete: student finished all live quiz questions — wait for quiz_ended
//     if (missionComplete && quiz?.isLive) {
//         return (
//             <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center font-inter relative overflow-hidden">
//                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
//                 <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
//                 <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-500 max-w-md w-full">
//                     <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-pulse">
//                         <Clock className="text-[#ff6b00]" size={40} />
//                     </div>
//                     <h1 className="text-4xl font-black italic uppercase tracking-tighter">Mission <span className="text-[#ff6b00]">Complete</span></h1>
//                     <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed">
//                         All answers submitted! The leaderboard will appear when the quiz session ends.
//                     </p>
//                     <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
//                         <div className="flex flex-col items-center gap-2">
//                             <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Time remaining</span>
//                             <div className="text-5xl font-black italic text-[#ff6b00]">
//                                 {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
//                             </div>
//                         </div>
//                         <div className="flex items-center justify-center gap-4 text-white/40">
//                             <Loader2 className="animate-spin" size={16} />
//                             <span className="font-black italic uppercase tracking-widest text-[10px]">Waiting for quiz to end...</span>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     // Only show result summary immediately after submission, NOT in review mode
//     // For live quizzes, show a "Waiting" screen instead of the score summary
//     if (result && !isReviewMode) {
//         if (quiz?.isLive) {
//             return (
//                 <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center font-inter relative overflow-hidden">
//                     {/* Background Decorations */}
//                     <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
//                     <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>

//                     <div className="relative z-10 space-y-8 animate-in fade-in zoom-in duration-500 max-w-md w-full">
//                         <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 animate-pulse">
//                             <Clock className="text-[#ff6b00]" size={40} />
//                         </div>
//                         <h1 className="text-4xl font-black italic uppercase tracking-tighter">Mission <span className="text-[#ff6b00]">Complete</span></h1>
//                         <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed">
//                             Your data has been transmitted. The gateway will open when the synchronization sequence concludes.
//                         </p>
//                         <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md space-y-4">
//                             <div className="flex flex-col items-center gap-2">
//                                 <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Leaderboard appears in</span>
//                                 <div className="text-5xl font-black italic text-[#ff6b00]">
//                                     {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
//                                 </div>
//                             </div>
//                             <div className="flex items-center justify-center gap-4 text-white/40">
//                                 <Loader2 className="animate-spin" size={16} />
//                                 <span className="font-black italic uppercase tracking-widest text-[10px]">Synchronizing Results...</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             );
//         }

//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
//                 <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
//                     <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
//                         <CheckCircle size={48} />
//                     </div>
//                     <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h1>
//                     <p className="text-gray-500 mb-8">Great job finishing the quiz. Here are your results:</p>

//                     <div className="bg-indigo-50 rounded-2xl p-6 mb-8">
//                         <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider mb-1">Your Score</p>
//                         <div className="text-5xl font-black text-indigo-900">
//                             {result.score} <span className="text-xl text-indigo-400 font-medium">/ {result.totalQuestions * 10}</span>
//                         </div>
//                     </div>

//                     <div className="space-y-3">
//                         <button
//                             onClick={() => navigate(`/leaderboard/${id}`)}
//                             className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
//                         >
//                             <Trophy size={20} /> View Leaderboard
//                         </button>
//                         <div className="grid grid-cols-2 gap-3">
//                             <button
//                                 onClick={() => {
//                                     if (window.history.length > 2) {
//                                         navigate(-1);
//                                     } else {
//                                         navigate('/student-dashboard');
//                                     }
//                                 }}
//                                 className="bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
//                             >
//                                 Home
//                             </button>
//                             <button
//                                 onClick={() => setIsReviewMode(true)}
//                                 className="bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
//                             >
//                                 Review
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }
//     const question = quiz.questions[currentQuestion];
//     const isLastQuestion = currentQuestion === quiz.questions.length - 1;

//     // Get result data for current question if in review mode
//     const questionResult = isReviewMode && result
//         ? result.answers.find(a => a.questionText === question.questionText)
//         : null;

//     return (
//         <div className="min-h-screen bg-gray-50 flex flex-col">
//             {/* Offline Banner */}
//             {!isOnline && (
//                 <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-6 py-3 flex items-center justify-center gap-3 font-bold text-sm shadow-lg">
//                     <WifiOff size={18} />
//                     You are offline — progress saved locally. Submissions paused until reconnected.
//                 </div>
//             )}
//             <header className={`bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky z-50 ${!isOnline ? 'top-10' : 'top-0'}`}>
//                 <div className="flex items-center gap-4">
//                     <button
//                         onClick={() => navigate('/student-dashboard')}
//                         className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
//                     >
//                         <ChevronLeft size={24} />
//                     </button>
//                     <div>
//                         <h2 className="font-bold text-gray-900">{quiz.title}</h2>
//                         <p className="text-xs text-gray-500">{currentQuestion + 1} of {quiz.questions.length} Questions {isReviewMode && '• Review Mode'}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     {!isReviewMode && !result && (quiz.timerPerQuestion > 0 || quiz.duration > 0) && (
//                         <div className="flex flex-col items-center">
//                             <div className="relative w-16 h-16">
//                                 <svg className="w-full h-full transform -rotate-90">
//                                     <circle
//                                         cx="32"
//                                         cy="32"
//                                         r="28"
//                                         stroke="currentColor"
//                                         strokeWidth="4"
//                                         fill="transparent"
//                                         className="text-gray-100"
//                                     />
//                                     <circle
//                                         cx="32"
//                                         cy="32"
//                                         r="28"
//                                         stroke="currentColor"
//                                         strokeWidth="4"
//                                         fill="transparent"
//                                         strokeDasharray={175.9}
//                                         strokeDashoffset={175.9 * (1 - timeLeft / (quiz.duration > 0 ? (quiz.duration * 60) : (quiz.timerPerQuestion || 30)))}
//                                         className={`transition-all duration-1000 ${timeLeft <= 5 ? 'text-red-500' : 'text-[#ff6b00]'}`}
//                                     />
//                                 </svg>
//                                 <div className="absolute inset-0 flex items-center justify-center">
//                                     <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{timeLeft}</span>
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                     {isReviewMode && (
//                         <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
//                             Score: {result.score} / {result.totalQuestions * 10}
//                         </div>
//                     )}
//                     <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
//                         <div
//                             className={`h-full transition-all duration-300 ${isReviewMode ? 'bg-indigo-600' : 'bg-indigo-600'}`}
//                             style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
//                         />
//                     </div>
//                     {/* Visual Progress Dots (Green/Gray) */}
//                     <div className="hidden md:flex items-center gap-1">
//                         {quiz.questions.map((_, idx) => (
//                             <div
//                                 key={idx}
//                                 className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentQuestion ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''} ${answers[idx] ? 'bg-green-500' : 'bg-gray-200'}`}
//                             />
//                         ))}
//                     </div>
//                 </div>
//             </header>

//             {/* Strict Mode Waiting Overlay */}
//             {quiz?.isLive && answeredQuestions.has(currentQuestion) && (
//                 <div className="fixed inset-0 z-[60] bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
//                     <div className="relative mb-12">
//                         <div className="absolute inset-0 animate-ping bg-[#ff6b00] opacity-20 rounded-full"></div>
//                         <div className="relative bg-white/5 p-12 rounded-[3rem] border border-white/10">
//                             <Clock className="text-[#ff6b00] animate-pulse" size={64} />
//                         </div>
//                     </div>
//                     <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4 text-[#ff6b00]">Strict Mode</h2>
//                     <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Synchronizing Answers...</h3>
//                     <p className="text-gray-400 font-bold uppercase tracking-widest text-lg max-w-md animate-pulse">
//                         Waiting for teacher to move to the next question…
//                     </p>
//                     <div className="mt-12 flex items-center gap-4 text-white/40">
//                         <Loader2 className="animate-spin" size={24} />
//                         <span className="font-black italic uppercase tracking-widest text-[10px]">REAL-TIME SYNC ACTIVE</span>
//                     </div>
//                 </div>
//             )}

//             <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
//                 <div className="max-w-2xl w-full">
//                     {isReviewMode && (
//                         <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${questionResult?.isCorrect
//                             ? 'bg-green-50 border-green-100 text-green-700'
//                             : 'bg-red-50 border-red-100 text-red-700'
//                             }`}>
//                             {questionResult?.isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
//                             <div className="flex-1">
//                                 <p className="text-sm font-bold">
//                                     {questionResult?.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
//                                 </p>
//                                 <p className="text-xs opacity-80">
//                                     Marks Awarded: {questionResult?.isCorrect ? question.points : 0} / {question.points}
//                                 </p>
//                             </div>
//                             <Award size={24} className="opacity-20" />
//                         </div>
//                     )}

//                     {/* WAITING STATE OVERLAY */}
//                     {isWaiting && !isReviewMode && (
//                         <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
//                             <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
//                             <h2 className="text-2xl font-bold text-gray-900">Quiz Completed!</h2>
//                             <p className="text-gray-500 font-medium mt-2">Waiting for teacher to end the session...</p>
//                         </div>
//                     )}

//                     {/* CORRECT/INCORRECT FEEDBACK OVERLAY — only for non-live quizzes */}
//                     {showFeedback && !quiz?.isLive && (
//                         <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl animate-in zoom-in duration-300 ${isCorrectFeedback ? 'bg-green-500/90' : 'bg-red-500/90'} backdrop-blur-sm text-white`}>
//                             {isCorrectFeedback ? <CheckCircle size={80} className="mb-4" /> : <XCircle size={80} className="mb-4" />}
//                             <h2 className="text-4xl font-black uppercase italic tracking-tighter">
//                                 {isCorrectFeedback ? 'Correct!' : 'Incorrect'}
//                             </h2>
//                             {!isCorrectFeedback && (
//                                 <p className="mt-4 font-bold text-center px-8">
//                                     The correct answer was:<br />
//                                     <span className="text-2xl underline decoration-white/50">{quiz.questions[currentQuestion].correctAnswer}</span>
//                                 </p>
//                             )}
//                             <div className="mt-8 flex items-center gap-2 text-white/60 font-black uppercase tracking-widest text-xs">
//                                 <Loader2 className="animate-spin" size={12} /> Next Question...
//                             </div>
//                         </div>
//                     )}

//                     <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12 mb-8">
//                         <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
//                             Question {currentQuestion + 1}
//                         </span>
//                         <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 leading-tight">
//                             {question.questionText}
//                         </h1>

//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {question.options.map((option, idx) => {
//                                 const isSelected = answers[currentQuestion] === option;
//                                 const isCorrect = questionResult?.correctOption === option;

//                                 // Kahoot Colors & Shapes
//                                 const kahootStyles = [
//                                     { color: 'bg-[#eb1727]', hover: 'hover:bg-[#c91422]', icon: Triangle },
//                                     { color: 'bg-[#1368ce]', hover: 'hover:bg-[#1056ab]', icon: Diamond },
//                                     { color: 'bg-[#d5a021]', hover: 'hover:bg-[#b0851b]', icon: Circle },
//                                     { color: 'bg-[#26890c]', hover: 'hover:bg-[#1e6d09]', icon: Square }
//                                 ];
//                                 const style = kahootStyles[idx % 4];
//                                 const ShapeIcon = style.icon;

//                                 let containerClass = `${style.color} ${style.hover} text-white shadow-lg`;
//                                 if (isReviewMode) {
//                                     if (isCorrect) containerClass = 'bg-green-500 text-white ring-4 ring-green-200';
//                                     else if (isSelected && !isCorrect) containerClass = 'bg-red-500 text-white ring-4 ring-red-200';
//                                     else containerClass = 'bg-gray-200 text-gray-400 opacity-40 grayscale';
//                                 } else if (isSelected) {
//                                     containerClass = `${style.color} ring-8 ring-white/30 scale-[0.98]`;
//                                 }

//                                 // In live mode: lock only after submit, allow free re-selection before
//                                 const isSubmittedLive = quiz?.isLive && answeredQuestions.has(currentQuestion);

//                                 // Dim non-selected options once ANY option selected (visual feedback)
//                                 if (answers[currentQuestion] && !isSelected && !isReviewMode) {
//                                     containerClass += isSubmittedLive ? ' opacity-30 grayscale' : ' opacity-50 grayscale-[0.5]';
//                                 }

//                                 return (
//                                     <button
//                                         key={idx}
//                                         disabled={isReviewMode || isWaiting || submitting || isSubmittedLive}
//                                         onClick={() => handleOptionSelect(option)}
//                                         className={`relative h-24 md:h-32 text-left px-8 rounded-xl transition-all flex items-center gap-6 group ${containerClass} disabled:cursor-not-allowed overflow-hidden`}
//                                     >
//                                         <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
//                                             <ShapeIcon size={28} fill="white" strokeWidth={0} />
//                                         </div>
//                                         <span className="text-xl md:text-2xl font-black italic uppercase tracking-tight">{option}</span>

//                                         {isSelected && !isReviewMode && (
//                                             <div className="absolute top-2 right-2 bg-white text-gray-900 rounded-full p-1">
//                                                 <CheckCircle size={16} />
//                                             </div>
//                                         )}
//                                     </button>
//                                 );
//                             })}
//                         </div>

//                         {isReviewMode && !questionResult?.isCorrect && (
//                             <div className="mt-6 p-4 bg-green-50 rounded-xl flex items-center gap-3 text-green-800 border border-green-100">
//                                 <CheckCircle size={18} />
//                                 <p className="text-xs font-bold">The correct answer was: <span className="underline">{questionResult?.correctOption}</span></p>
//                             </div>
//                         )}
//                     </div>

//                     <div className="flex items-center justify-between w-full">
//                         {/* In live mode, student cannot navigate manually */}
//                         <div className="w-10" />

//                         {/* Live mode: after submitting show Next Question button */}
//                         {quiz?.isLive && answeredQuestions.has(currentQuestion) && !isLastQuestion ? (
//                             <div className="px-8 py-4 bg-gray-100/50 rounded-2xl text-gray-400 font-black italic uppercase tracking-widest text-xs">
//                                 Waiting for Teacher...
//                             </div>
//                         ) : isLastQuestion ? (
//                             isReviewMode ? (
//                                 <button
//                                     onClick={() => setIsReviewMode(false)}
//                                     className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
//                                 >
//                                     <Home size={20} /> Finish Review
//                                 </button>
//                             ) : (
//                                 <button
//                                     onClick={quiz?.isLive ? handleSingleQuestionSubmit : submitQuiz}
//                                     disabled={submitting || !answers[currentQuestion] || (!isOnline && quiz?.isLive)}
//                                     className="flex items-center gap-2 bg-[#ff6b00] text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 transition shadow-lg shadow-[#ff6b00]/20 active:scale-95 disabled:opacity-50"
//                                 >
//                                     {submitting ? <Loader2 className="animate-spin" size={20} /> : (!isOnline && quiz?.isLive) ? <WifiOff size={20} /> : <Send size={20} />}
//                                     {submitting ? 'Submitting...' : (!isOnline && quiz?.isLive) ? 'Offline...' : (quiz?.isLive ? 'Submit Answer' : 'Finish Quiz')}
//                                 </button>
//                             )
//                         ) : (
//                             isReviewMode ? (
//                                 // Review mode: allow manual prev/next
//                                 <div className="flex gap-3">
//                                     <button
//                                         onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
//                                         disabled={currentQuestion === 0}
//                                         className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-all"
//                                     >
//                                         <ChevronLeft size={20} /> Prev
//                                     </button>
//                                     <button
//                                         onClick={() => setCurrentQuestion(prev => prev + 1)}
//                                         className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 transition-all"
//                                     >
//                                         Next <ChevronRight size={20} />
//                                     </button>
//                                 </div>
//                             ) : (
//                                 <button
//                                     onClick={handleSingleQuestionSubmit}
//                                     disabled={isWaiting || !answers[currentQuestion] || (!isOnline && quiz?.isLive)}
//                                     className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 transition shadow-lg active:scale-95 disabled:opacity-50 bg-[#ff6b00] text-white shadow-[#ff6b00]/20"
//                                 >
//                                     {!isOnline && quiz?.isLive ? <><WifiOff size={20} /> Offline...</> : <>Submit Answer <Send size={20} /></>}
//                                 </button>
//                             )
//                         )}

//                         <div className="w-10" />
//                     </div>
//                 </div>
//             </main>

//             {/* New Question Modal */}
//             {
//                 showNewQuestionModal && newQuestionNotification && (
//                     <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
//                         <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
//                             <div className="flex items-center gap-3 mb-6">
//                                 <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
//                                     <Bell className="text-indigo-600" size={24} />
//                                 </div>
//                                 <div>
//                                     <h2 className="text-2xl font-black text-gray-900">New Question Added!</h2>
//                                     <p className="text-sm text-gray-500">Your teacher added a bonus question</p>
//                                 </div>
//                             </div>

//                             <div className="bg-indigo-50 rounded-2xl p-6 mb-6">
//                                 <h3 className="text-lg font-bold text-gray-900 mb-4">{newQuestionNotification.question.questionText}</h3>
//                                 <div className="space-y-3">
//                                     {newQuestionNotification.question.options.map((option, idx) => (
//                                         <button
//                                             key={idx}
//                                             onClick={() => {
//                                                 const token = localStorage.getItem('token');
//                                                 const userId = JSON.parse(atob(token.split('.')[1])).user.id;

//                                                 socket.emit('submit_new_question', {
//                                                     quizId: id,
//                                                     studentId: userId,
//                                                     questionIndex: newQuestionNotification.questionIndex,
//                                                     answer: option
//                                                 });

//                                                 setShowNewQuestionModal(false);
//                                                 alert(`Answer submitted: ${option}`);
//                                             }}
//                                             className="w-full text-left p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all font-medium text-gray-700"
//                                         >
//                                             {option}
//                                         </button>
//                                     ))}
//                                 </div>
//                             </div>

//                             <button
//                                 onClick={() => setShowNewQuestionModal(false)}
//                                 className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
//                             >
//                                 Skip This Question
//                             </button>
//                         </div>
//                     </div>
//                 )
//             }

//             {/* Intermediate Leaderboard Modal */}
//             {
//                 showIntermediateLeaderboard && currentLeaderboard.length > 0 && (
//                     <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
//                         <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
//                             <div className="flex items-center gap-3 mb-6">
//                                 <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
//                                     <Trophy className="text-indigo-600" size={24} />
//                                 </div>
//                                 <div>
//                                     <h2 className="text-2xl font-black text-gray-900">Question {currentQuestion + 1} Leaderboard</h2>
//                                     <p className="text-sm text-gray-500">Current standings after this question</p>
//                                 </div>
//                             </div>

//                             <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
//                                 {currentLeaderboard.map((student) => (
//                                     <div key={student.studentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
//                                         <div className="flex items-center gap-3">
//                                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${student.rank === 1 ? 'bg-yellow-500' :
//                                                 student.rank === 2 ? 'bg-gray-400' :
//                                                     student.rank === 3 ? 'bg-orange-600' :
//                                                         'bg-indigo-600'
//                                                 }`}>
//                                                 {student.rank}
//                                             </div>
//                                             <span className="font-bold text-gray-900">{student.username}</span>
//                                         </div>
//                                         <div className="flex items-center gap-4">
//                                             <span className="text-sm text-gray-500">{student.answeredQuestions} answered</span>
//                                             <div className="text-xl font-black text-indigo-600">
//                                                 {student.currentScore} pts
//                                             </div>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>

//                             <button
//                                 onClick={handleContinueToNext}
//                                 className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
//                             >
//                                 {currentQuestion < quiz.questions.length - 1 ? (
//                                     <>Continue to Next Question <ChevronRight size={20} /></>
//                                 ) : (
//                                     <>View Final Results <Trophy size={20} /></>
//                                 )}
//                             </button>
//                         </div>
//                     </div>
//                 )
//             }
//         </div >
//     );
// }


import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, Send, Home, XCircle, Award, Clock, Trophy, Bell, Square, Circle, Triangle, Diamond, WifiOff } from 'lucide-react';
import AuthContext from '../context/AuthContext';

export default function AttemptQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: authUser } = useContext(AuthContext);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
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

    // Listen for Teacher Events (timer sync, quiz end only — students navigate themselves)
    useEffect(() => {
        socket.on('timer_update', ({ additionalSeconds }) => {
            console.log('Teacher increased time by:', additionalSeconds);
            setTimeLeft(prev => prev + additionalSeconds);
        });

        socket.on('quiz_ended', async () => {
            // Results are already saved via socket events during the quiz.
            // Navigate to leaderboard after a small delay to allow server finalization.
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

            // Reset state for new question
            if (quiz && !quiz.duration) {
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
            // Persist new position offline
            localStorage.setItem(`live_quiz_session_${id}`, JSON.stringify({ currentQuestion: nextIdx, answers }));
        });

        socket.on('restoreState', (state) => {
            console.log('Restoring State on Reconnect (Student):', state);
            setCurrentQuestion(state.currentQuestionIndex);
            
            // Check if student has already answered this question
            if (authUser && state.progress && state.progress[authUser._id]) {
                 const studentProgress = state.progress[authUser._id];
                 const answeredList = Object.keys(studentProgress).map(Number).filter(qIdx => studentProgress[qIdx].answered);
                 setAnsweredQuestions(new Set(answeredList));
            }
            
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
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role } });
                    } catch (e) {
                        socket.emit('join_room', {
                            quizId: id,
                            user: {
                                username: authUser.username,
                                role: 'student',
                                _id: authUser._id
                            }
                        });
                    }
                } else {
                    socket.emit('join_room', {
                        quizId: id,
                        user: {
                            username: authUser.username,
                            role: 'student',
                            _id: authUser._id
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
    }, [quiz]);

    // Offline / Reconnect detection — restore session and re-join room on reconnect
    useEffect(() => {
        const handleOffline = () => setIsOnline(false);
        const handleOnline = () => {
            setIsOnline(true);
            if (quiz?.isLive && authUser) {
                // Restore saved session position
                const saved = localStorage.getItem(`live_quiz_session_${id}`);
                if (saved) {
                    try {
                        const { currentQuestion: savedQ, answers: savedAnswers } = JSON.parse(saved);
                        if (savedQ !== undefined) setCurrentQuestion(savedQ);
                        if (savedAnswers) setAnswers(prev => ({ ...prev, ...savedAnswers }));
                    } catch (e) { console.error('Session restore error:', e); }
                }
                // Re-join room so teacher participant count updates
                const sessionStr = localStorage.getItem(`live_quiz_session_student_${id}`);
                if (sessionStr) {
                    try {
                        const sess = JSON.parse(sessionStr);
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role } });
                    } catch (e) {
                         socket.emit('join_room', {
                            quizId: id,
                            user: {
                                username: authUser.username,
                                role: 'student',
                                _id: authUser._id
                            }
                        });
                    }
                } else {
                    socket.emit('join_room', {
                        quizId: id,
                        user: {
                            username: authUser.username,
                            role: 'student',
                            _id: authUser._id
                        }
                    });
                }
            }
        };
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [id, quiz]);

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
        }
    };

    const handleTimeUp = () => {
        if (quiz?.isLive) {
            handleAutoSubmitAnswer();
        } else {
            if (currentQuestion < quiz.questions.length - 1) {
                setCurrentQuestion(prev => prev + 1);
                setTimeLeft(quiz.timerPerQuestion || 30);
            } else {
                submitQuiz();
            }
        }
    };

    const handleContinueToNext = () => {
        setShowIntermediateLeaderboard(false);
        setShowFeedback(false);

        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            // Reset timer for next question if per-question timer exists
            if (!quiz.duration) {
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
        } else {
            // Last question - navigate to final leaderboard
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

    // Timer Initialization (Split from focus logic)
    useEffect(() => {
        if (quiz && !isReviewMode && !result) {
            // Initialize global timer ONLY ONCE
            if (quiz.duration > 0) {
                if (!hasInitializedTimer.current) {
                    setTimeLeft(quiz.duration * 60);
                    hasInitializedTimer.current = true;
                }
            } else {
                // Per question timer: reset on every question change
                setTimeLeft(quiz.timerPerQuestion || 30);
            }
        }
    }, [currentQuestion, quiz, isReviewMode, result, id]); // Keeping currentQuestion for per-question mode

    useEffect(() => {
        if (loading || isReviewMode || !quiz) return;

        // Only stop timer on result if it's NOT a live quiz
        if (result && !quiz.isLive) return;

        // Disable timer if both options are 0 (Assessment Mode)
        if (quiz.timerPerQuestion === 0 && quiz.duration === 0) {
            setTimeLeft(0);
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (quiz.duration > 0) {
                        // Global timer expired -> Submit Quiz
                        clearInterval(timerId);
                        submitQuiz();
                        return 0;
                    } else {
                        // Per question timer expired -> Next Question
                        clearInterval(timerId);
                        handleTimeUp();
                        return 0;
                    }
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

                // LIVE QUIZ PAGE REFRESH: restore session from localStorage and auto-rejoin
                if (res.data.isLive && res.data.status === 'started') {
                    const saved = localStorage.getItem(`live_quiz_session_${id}`);
                    if (saved) {
                        try {
                            const { currentQuestion: savedQ, answers: savedAnswers } = JSON.parse(saved);
                            if (savedQ !== undefined) setCurrentQuestion(savedQ);
                            if (savedAnswers) {
                                setAnswers(savedAnswers);
                                // Mark previously submitted questions as answered
                                const answeredSet = new Set(
                                    Object.keys(savedAnswers).map(Number)
                                );
                                setAnsweredQuestions(answeredSet);
                            }
                        } catch (e) { console.error('Session restore on refresh:', e); }
                    }
                    if (authUser) {
                        const sessionData = {
                            quizId: id,
                            username: authUser.username,
                            role: 'student'
                        };
                        localStorage.setItem(`live_quiz_session_student_${id}`, JSON.stringify(sessionData));
                        socket.emit('join_room', {
                            quizId: id,
                            user: {
                                username: authUser.username,
                                role: 'student',
                                _id: authUser._id
                            }
                        });
                    }
                    // Skip previousResult handling — live quiz session is restored
                } else {
                    // If there's a previous result (Completed or In-Progress)
                    if (res.data.previousResult) {
                        const prevResult = res.data.previousResult;

                        // BLOCK RE-ENTRY: If completed, forced review mode
                        if (prevResult.status === 'completed') {
                            setIsReviewMode(true);
                            setResult(prevResult);
                            setAnswersFromHistory(prevResult.answers);
                            return; // Stop further loading
                        }

                        // RESUME: If in-progress, load state
                        if (prevResult.status === 'in-progress') {
                            console.log('Resuming quiz attempt...');
                            setAnswersFromHistory(prevResult.answers);
                            const localSaved = localStorage.getItem(`quiz_answers_${id}`);
                            if (localSaved) {
                                const localAnswers = JSON.parse(localSaved);
                                setAnswers(prev => ({ ...prev, ...localAnswers }));
                            }
                        }
                    }
                } // end else (non-live or not started)
            } catch (err) {
                console.error('Error fetching quiz', err);
                alert('Quiz not found');
                navigate('/student-dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();

        if (authUser) {
            socket.emit('join_room', {
                quizId: id,
                user: {
                    username: authUser.username,
                    role: 'student',
                    _id: authUser._id
                }
            });
        }

        socket.on('new_question_added', ({ question, questionIndex, totalQuestions }) => {
            console.log('New question received:', question);
            setNewQuestionNotification({ question, questionIndex, totalQuestions });
            setShowNewQuestionModal(true);

            // Update quiz with new question
            setQuiz(prev => ({
                ...prev,
                questions: [...prev.questions, question]
            }));
        });

        // Listen for intermediate leaderboard after each question
        socket.on('question_leaderboard', ({ questionIndex, leaderboard }) => {
            console.log('Leaderboard received for question', questionIndex, leaderboard);
            setCurrentLeaderboard(leaderboard);
        });

        return () => {
            socket.off('new_question_added');
            socket.off('question_leaderboard');
        };
    }, [id, navigate]);

    const setAnswersFromHistory = (historyAnswers) => {
        const newAnswers = {};
        historyAnswers.forEach((ans, _) => {
            // Find index by question text in case of shuffling (advanced), but here strictly by index for now or assume order
            // Better to map by questionText if possible, but index is safe for now if static
            // Actually, `answers` state is by index.
            // We need to match existing questions.
            const qIndex = quiz.questions.findIndex(q => q.questionText === ans.questionText);
            if (qIndex >= 0) newAnswers[qIndex] = ans.selectedOption;
        });
        setAnswers(prev => ({ ...prev, ...newAnswers }));
    };

    const handleOptionSelect = (option) => {
        if (isReviewMode) return;
        const newAnswers = { ...answers, [currentQuestion]: option };
        setAnswers(newAnswers);
        localStorage.setItem(`quiz_answers_${id}`, JSON.stringify(newAnswers));
        // Persist full live session state for offline recovery
        if (quiz?.isLive) {
            localStorage.setItem(`live_quiz_session_${id}`, JSON.stringify({ currentQuestion, answers: newAnswers }));
        }
    };

    const handleSingleQuestionSubmit = () => {
        if (!answers[currentQuestion]) return alert('Please select an option first!');

        if (quiz?.isLive) {
            if (!isOnline) {
                return alert('You are offline! Wait for your connection to restore before submitting.');
            }
            const token = localStorage.getItem('token');
            const userId = JSON.parse(atob(token.split('.')[1])).user.id;
            socket.emit('submit_question_answer', {
                quizId: id, studentId: userId,
                questionIndex: currentQuestion,
                answer: answers[currentQuestion],
                timeRemaining: timeLeft
            });
            setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
            // Show mission complete screen after last question submitted
            if (currentQuestion === quiz.questions.length - 1) {
                setMissionComplete(true);
            }
        } else {
            if (currentQuestion < quiz.questions.length - 1) {
                setCurrentQuestion(prev => prev + 1);
                setTimeLeft(quiz.timerPerQuestion || 30);
            } else {
                submitQuiz();
            }
        }
    };

    // Student advances to next question themselves (live mode)
    const handleNextQuestion = () => {
        // Disabled in strict mode - teacher controls navigation
        console.log("Manual navigation disabled in live mode.");
    };

    const submitQuiz = async () => {
        if (submitting || isReviewMode) return;
        setSubmitting(true);
        try {
            const formattedAnswers = quiz.questions.map((q, idx) => ({
                questionText: q.questionText,
                selectedOption: answers[idx] || ''
            }));

            const res = await api.post('/quiz/submit', {
                quizId: id,
                answers: formattedAnswers
            });

            setResult(res.data);
        } catch (err) {
            console.error('Error submitting quiz', err);
            // Handle "already attempted" gracefully
            const error = /** @type {any} */ (err);
            if (error?.response?.status === 400 && error?.response?.data?.msg === 'Quiz already attempted') {
                window.location.reload(); // Refresh to catch the result in useEffect
            } else {
                alert('Submission failed. Please check your connection.');
            }
        } finally {
            setSubmitting(false);
            // Clear local storage on finish
            localStorage.removeItem(`quiz_answers_${id}`);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
    );

    // Mission Complete: student finished all live quiz questions — wait for quiz_ended
    if (missionComplete && quiz?.isLive) {
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

    // Only show result summary immediately after submission, NOT in review mode
    // For live quizzes, show a "Waiting" screen instead of the score summary
    if (result && !isReviewMode) {
        if (quiz?.isLive) {
            return (
                <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center font-inter relative overflow-hidden">
                    {/* Background Decorations */}
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
                                onClick={() => {
                                    if (window.history.length > 2) {
                                        navigate(-1);
                                    } else {
                                        navigate('/student-dashboard');
                                    }
                                }}
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
    const question = quiz.questions[currentQuestion];
    const isLastQuestion = currentQuestion === quiz.questions.length - 1;

    // Get result data for current question if in review mode
    const questionResult = isReviewMode && result
        ? result.answers.find(a => a.questionText === question.questionText)
        : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Offline Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-6 py-3 flex items-center justify-center gap-3 font-bold text-sm shadow-lg">
                    <WifiOff size={18} />
                    You are offline — progress saved locally. Submissions paused until reconnected.
                </div>
            )}
            <header className={`bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky z-50 ${!isOnline ? 'top-10' : 'top-0'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/student-dashboard')}
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
                    {!isReviewMode && !result && (quiz.timerPerQuestion > 0 || quiz.duration > 0) && (
                        <div className="flex flex-col items-center">
                            <div className="relative w-16 h-16">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        className="text-gray-100"
                                    />
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        strokeDasharray={175.9}
                                        strokeDashoffset={175.9 * (1 - timeLeft / (quiz.duration > 0 ? (quiz.duration * 60) : (quiz.timerPerQuestion || 30)))}
                                        className={`transition-all duration-1000 ${timeLeft <= 5 ? 'text-red-500' : 'text-[#ff6b00]'}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{timeLeft}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {isReviewMode && (
                        <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                            Score: {result.score} / {result.totalQuestions * 10}
                        </div>
                    )}
                    <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${isReviewMode ? 'bg-indigo-600' : 'bg-indigo-600'}`}
                            style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                        />
                    </div>
                    {/* Visual Progress Dots (Green/Gray) */}
                    <div className="hidden md:flex items-center gap-1">
                        {quiz.questions.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentQuestion ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''} ${answers[idx] ? 'bg-green-500' : 'bg-gray-200'}`}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* Strict Mode Waiting Overlay */}
            {quiz?.isLive && answeredQuestions.has(currentQuestion) && (
                <div className="fixed inset-0 z-[60] bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="relative mb-12">
                        <div className="absolute inset-0 animate-ping bg-[#ff6b00] opacity-20 rounded-full"></div>
                        <div className="relative bg-white/5 p-12 rounded-[3rem] border border-white/10">
                            <Clock className="text-[#ff6b00] animate-pulse" size={64} />
                        </div>
                    </div>
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4 text-[#ff6b00]">Strict Mode</h2>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Synchronizing Answers...</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-lg max-w-md animate-pulse">
                        Waiting for teacher to move to the next question…
                    </p>
                    <div className="mt-12 flex items-center gap-4 text-white/40">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="font-black italic uppercase tracking-widest text-[10px]">REAL-TIME SYNC ACTIVE</span>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <div className="max-w-2xl w-full">
                    {isReviewMode && (
                        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${questionResult?.isCorrect
                            ? 'bg-green-50 border-green-100 text-green-700'
                            : 'bg-red-50 border-red-100 text-red-700'
                            }`}>
                            {questionResult?.isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                            <div className="flex-1">
                                <p className="text-sm font-bold">
                                    {questionResult?.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                                </p>
                                <p className="text-xs opacity-80">
                                    Marks Awarded: {questionResult?.isCorrect ? question.points : 0} / {question.points}
                                </p>
                            </div>
                            <Award size={24} className="opacity-20" />
                        </div>
                    )}

                    {/* WAITING STATE OVERLAY */}
                    {isWaiting && !isReviewMode && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                            <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                            <h2 className="text-2xl font-bold text-gray-900">Quiz Completed!</h2>
                            <p className="text-gray-500 font-medium mt-2">Waiting for teacher to end the session...</p>
                        </div>
                    )}

                    {/* CORRECT/INCORRECT FEEDBACK OVERLAY — only for non-live quizzes */}
                    {showFeedback && !quiz?.isLive && (
                        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl animate-in zoom-in duration-300 ${isCorrectFeedback ? 'bg-green-500/90' : 'bg-red-500/90'} backdrop-blur-sm text-white`}>
                            {isCorrectFeedback ? <CheckCircle size={80} className="mb-4" /> : <XCircle size={80} className="mb-4" />}
                            <h2 className="text-4xl font-black uppercase italic tracking-tighter">
                                {isCorrectFeedback ? 'Correct!' : 'Incorrect'}
                            </h2>
                            {!isCorrectFeedback && (
                                <p className="mt-4 font-bold text-center px-8">
                                    The correct answer was:<br />
                                    <span className="text-2xl underline decoration-white/50">{quiz.questions[currentQuestion].correctAnswer}</span>
                                </p>
                            )}
                            <div className="mt-8 flex items-center gap-2 text-white/60 font-black uppercase tracking-widest text-xs">
                                <Loader2 className="animate-spin" size={12} /> Next Question...
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12 mb-8">
                        <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
                            Question {currentQuestion + 1}
                        </span>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 leading-tight">
                            {question.questionText}
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {question.options.map((option, idx) => {
                                const isSelected = answers[currentQuestion] === option;
                                const isCorrect = questionResult?.correctOption === option;

                                // Kahoot Colors & Shapes
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

                                // In live mode: lock only after submit, allow free re-selection before
                                const isSubmittedLive = quiz?.isLive && answeredQuestions.has(currentQuestion);

                                // Dim non-selected options once ANY option selected (visual feedback)
                                if (answers[currentQuestion] && !isSelected && !isReviewMode) {
                                    containerClass += isSubmittedLive ? ' opacity-30 grayscale' : ' opacity-50 grayscale-[0.5]';
                                }

                                return (
                                    <button
                                        key={idx}
                                        disabled={isReviewMode || isWaiting || submitting || isSubmittedLive}
                                        onClick={() => handleOptionSelect(option)}
                                        className={`relative h-24 md:h-32 text-left px-8 rounded-xl transition-all flex items-center gap-6 group ${containerClass} disabled:cursor-not-allowed overflow-hidden`}
                                    >
                                        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                            <ShapeIcon size={28} fill="white" strokeWidth={0} />
                                        </div>
                                        <span className="text-xl md:text-2xl font-black italic uppercase tracking-tight">{option}</span>

                                        {isSelected && !isReviewMode && (
                                            <div className="absolute top-2 right-2 bg-white text-gray-900 rounded-full p-1">
                                                <CheckCircle size={16} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {isReviewMode && !questionResult?.isCorrect && (
                            <div className="mt-6 p-4 bg-green-50 rounded-xl flex items-center gap-3 text-green-800 border border-green-100">
                                <CheckCircle size={18} />
                                <p className="text-xs font-bold">The correct answer was: <span className="underline">{questionResult?.correctOption}</span></p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between w-full">
                        {/* In live mode, student cannot navigate manually */}
                        <div className="w-10" />

                        {/* Live mode: after submitting show Next Question button */}
                        {quiz?.isLive && answeredQuestions.has(currentQuestion) && !isLastQuestion ? (
                            <div className="px-8 py-4 bg-gray-100/50 rounded-2xl text-gray-400 font-black italic uppercase tracking-widest text-xs">
                                Waiting for Teacher...
                            </div>
                        ) : isLastQuestion ? (
                            isReviewMode ? (
                                <button
                                    onClick={() => setIsReviewMode(false)}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
                                >
                                    <Home size={20} /> Finish Review
                                </button>
                            ) : (
                                <button
                                    onClick={quiz?.isLive ? handleSingleQuestionSubmit : submitQuiz}
                                    disabled={submitting || !answers[currentQuestion] || (!isOnline && quiz?.isLive)}
                                    className="flex items-center gap-2 bg-[#ff6b00] text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 transition shadow-lg shadow-[#ff6b00]/20 active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : (!isOnline && quiz?.isLive) ? <WifiOff size={20} /> : <Send size={20} />}
                                    {submitting ? 'Submitting...' : (!isOnline && quiz?.isLive) ? 'Offline...' : (quiz?.isLive ? 'Submit Answer' : 'Finish Quiz')}
                                </button>
                            )
                        ) : (
                            isReviewMode ? (
                                // Review mode: allow manual prev/next
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestion === 0}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronLeft size={20} /> Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentQuestion(prev => prev + 1)}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 transition-all"
                                    >
                                        Next <ChevronRight size={20} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSingleQuestionSubmit}
                                    disabled={isWaiting || !answers[currentQuestion] || (!isOnline && quiz?.isLive)}
                                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 transition shadow-lg active:scale-95 disabled:opacity-50 bg-[#ff6b00] text-white shadow-[#ff6b00]/20"
                                >
                                    {!isOnline && quiz?.isLive ? <><WifiOff size={20} /> Offline...</> : <>Submit Answer <Send size={20} /></>}
                                </button>
                            )
                        )}

                        <div className="w-10" />
                    </div>
                </div>
            </main>

            {/* New Question Modal */}
            {
                showNewQuestionModal && newQuestionNotification && (
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
                                                    quizId: id,
                                                    studentId: userId,
                                                    questionIndex: newQuestionNotification.questionIndex,
                                                    answer: option
                                                });

                                                setShowNewQuestionModal(false);
                                                alert(`Answer submitted: ${option}`);
                                            }}
                                            className="w-full text-left p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all font-medium text-gray-700"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setShowNewQuestionModal(false)}
                                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                            >
                                Skip This Question
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Intermediate Leaderboard Modal */}
            {
                showIntermediateLeaderboard && currentLeaderboard.length > 0 && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <Trophy className="text-indigo-600" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Question {currentQuestion + 1} Leaderboard</h2>
                                    <p className="text-sm text-gray-500">Current standings after this question</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                                {currentLeaderboard.map((student) => (
                                    <div key={student.studentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${student.rank === 1 ? 'bg-yellow-500' :
                                                student.rank === 2 ? 'bg-gray-400' :
                                                    student.rank === 3 ? 'bg-orange-600' :
                                                        'bg-indigo-600'
                                                }`}>
                                                {student.rank}
                                            </div>
                                            <span className="font-bold text-gray-900">{student.username}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-gray-500">{student.answeredQuestions} answered</span>
                                            <div className="text-xl font-black text-indigo-600">
                                                {student.currentScore} pts
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleContinueToNext}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                {currentQuestion < quiz.questions.length - 1 ? (
                                    <>Continue to Next Question <ChevronRight size={20} /></>
                                ) : (
                                    <>View Final Results <Trophy size={20} /></>
                                )}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
