// import { useState, useEffect, useContext } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import api from '../utils/api';
// import socket from '../utils/socket';
// import DashboardLayout from '../components/DashboardLayout';
// import AuthContext from '../context/AuthContext';
// import { Loader2, Zap, Clock, ShieldCheck } from 'lucide-react';

// export default function LiveRoomStudent() {
//     const { joinCode } = useParams();
//     const { user } = useContext(AuthContext);
//     const [quiz, setQuiz] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const navigate = useNavigate();

//     useEffect(() => {
//         const fetchQuiz = async () => {
//             try {
//                 const res = await api.post('/quiz/join', { code: joinCode });

//                 // Fetch full quiz details
//                 const quizRes = await api.get(`/quiz/${res.data.quizId}`);

//                 setQuiz(quizRes.data);

//                 // Check if quiz has already started
//                 if (quizRes.data.status === 'started') {
//                     console.log('Quiz already started, redirecting to quiz...');
//                     navigate(`/quiz/attempt/${quizRes.data._id}`);
//                     return;
//                 }

//                 // Join socket room - send _id so teacher can match progress by student ID
//                 const token = localStorage.getItem('token');
//                 let studentId = null;
//                 if (token) {
//                     try { studentId = JSON.parse(atob(token.split('.')[1])).user.id; } catch (_) { }
//                 }
//                 socket.emit('join_room', { quizId: quizRes.data._id, user: { username: user.username, role: 'student', _id: studentId } });

//             } catch (err) {
//                 console.error(err);
//                 alert('Error joining room');
//                 navigate('/student-dashboard');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchQuiz();

//         socket.on('quiz_started', () => {
//             if (quiz) {
//                 navigate(`/quiz/attempt/${quiz._id}`);
//             }
//         });

//         socket.on('connect', () => {
//             if (quiz && user) {
//                 socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'student', _id: user._id } });
//             }
//         });

//         return () => {
//             socket.off('quiz_started');
//         };
//     }, [joinCode, user, navigate, quiz]);

//     if (loading) return (
//         <DashboardLayout role="student">
//             <div className="flex items-center justify-center min-h-[60vh]">
//                 <Loader2 className="animate-spin text-indigo-600" size={48} />
//             </div>
//         </DashboardLayout>
//     );

//     return (
//         <DashboardLayout role="student">
//             <div className="max-w-2xl mx-auto py-12">
//                 <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden text-center">
//                     <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white relative">
//                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
//                             <Zap className="text-indigo-600" size={40} fill="currentColor" />
//                         </div>

//                         <div className="mt-8 space-y-4">
//                             <div className="inline-block bg-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/20">
//                                 Joined & Ready
//                             </div>
//                             <h1 className="text-4xl font-black tracking-tight">{quiz?.title}</h1>
//                             <p className="text-indigo-100 max-w-sm mx-auto font-medium">
//                                 You have successfully joined the live room. Please wait for your teacher to initiate the quiz.
//                             </p>
//                         </div>
//                     </div>

//                     <div className="p-12 space-y-12">
//                         <div className="flex flex-col items-center gap-6">
//                             <div className="relative">
//                                 <div className="absolute inset-0 animate-ping bg-indigo-400 opacity-20 rounded-full"></div>
//                                 <div className="relative bg-indigo-50 p-8 rounded-full">
//                                     <Clock className="text-indigo-600 animate-pulse" size={48} />
//                                 </div>
//                             </div>

//                             <div className="space-y-1">
//                                 <h3 className="text-2xl font-black text-gray-900 uppercase italic">Waiting for Host...</h3>
//                                 <p className="text-gray-400 text-sm font-medium">The adventure begins when your teacher clicks start.</p>
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3 text-left">
//                                 <ShieldCheck className="text-green-500 flex-shrink-0" size={24} />
//                                 <div>
//                                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
//                                     <p className="text-sm font-bold text-gray-800 uppercase italic">Authenticated</p>
//                                 </div>
//                             </div>
//                             <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3 text-left">
//                                 <Zap className="text-orange-500 flex-shrink-0" size={24} />
//                                 <div>
//                                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Signal</p>
//                                     <p className="text-sm font-bold text-gray-800 uppercase italic">Real-time Connected</p>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-gray-50 p-6 border-t border-gray-100">
//                         <p className="text-xs text-gray-400 font-medium">
//                             Don't close this tab or navigate away. You'll be automatically redirected when the quiz starts.
//                         </p>
//                     </div>
//                 </div>
//             </div>
//         </DashboardLayout>
//     );
// }


import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';
import DashboardLayout from '../components/DashboardLayout';
import AuthContext from '../context/AuthContext';
import { Loader2, Zap, Clock, ShieldCheck } from 'lucide-react';

export default function LiveRoomStudent() {
    const { joinCode } = useParams();
    const { user } = useContext(AuthContext);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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

                socket.emit('join_room', { quizId: quizRes.data._id, user: { username: user.username, role: 'student', _id: studentId } });

            } catch (err) {
                console.error(err);
                alert('Error joining room');
                navigate('/student-dashboard');
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
                        socket.emit('reconnectUser', { quizId: sess.quizId, user: { username: sess.username, role: sess.role, _id: sess._id } });
                    } catch (e) {
                        socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'student', _id: user._id } });
                    }
                } else {
                    socket.emit('join_room', { quizId: quiz._id, user: { username: user.username, role: 'student', _id: user._id } });
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
            <div className="max-w-2xl mx-auto py-12">
                <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden text-center">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                            <Zap className="text-indigo-600" size={40} fill="currentColor" />
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="inline-block bg-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/20">
                                Joined & Ready
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">{quiz?.title}</h1>
                            <p className="text-indigo-100 max-w-sm mx-auto font-medium">
                                You have successfully joined the live room. Please wait for your teacher to initiate the quiz.
                            </p>
                        </div>
                    </div>

                    <div className="p-12 space-y-12">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 animate-ping bg-indigo-400 opacity-20 rounded-full"></div>
                                <div className="relative bg-indigo-50 p-8 rounded-full">
                                    <Clock className="text-indigo-600 animate-pulse" size={48} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-gray-900 uppercase italic">Waiting for Host...</h3>
                                <p className="text-gray-400 text-sm font-medium">The adventure begins when your teacher clicks start.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3 text-left">
                                <ShieldCheck className="text-green-500 flex-shrink-0" size={24} />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                                    <p className="text-sm font-bold text-gray-800 uppercase italic">Authenticated</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3 text-left">
                                <Zap className="text-orange-500 flex-shrink-0" size={24} />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Signal</p>
                                    <p className="text-sm font-bold text-gray-800 uppercase italic">Real-time Connected</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400 font-medium">
                            Don't close this tab or navigate away. You'll be automatically redirected when the quiz starts.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
