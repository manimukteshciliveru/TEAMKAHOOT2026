import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../utils/socket';
import AuthContext from '../context/AuthContext';
import { Trophy, Award, Medal, Users, Home, Loader2, Plus, X, Play, TrendingUp, CheckCircle, XCircle, ChevronLeft, ChevronRight, Minus, Star, Target, AlertCircle } from 'lucide-react';

export default function Leaderboard() {
    const { quizId } = useParams();
    const { user } = useContext(AuthContext);
    const [results, setResults] = useState([]);
    const [insights, setInsights] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 10
    });
    const [currentPage, setCurrentPage] = useState(1);
    const studentsPerPage = 10;
    const navigate = useNavigate();
    const isStudent = user?.role === 'student';

    const fetchData = async (retryCount = 0) => {
        try {
            const res = await api.get(`/quiz/leaderboard/${quizId}`);
            console.log('Leaderboard API response:', res.data);
            if (res.data.results) {
                // If no results yet and quiz just ended, retry up to 3 times
                if (res.data.results.length === 0 && retryCount < 3) {
                    console.log(`No results yet, retrying in 2s (attempt ${retryCount + 1}/3)...`);
                    setTimeout(() => fetchData(retryCount + 1), 2000);
                    return;
                }
                setResults(res.data.results);
            }
            if (res.data.insights) setInsights(res.data.insights);
            if (res.data.stats) setStats(res.data.stats);

            const quizRes = await api.get(`/quiz/${quizId}`);
            setQuiz(quizRes.data);
        } catch (err) {
            console.error('Leaderboard fetch error:', err?.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        socket.emit('join_room', { quizId, user: { username: user.username, role: user.role } });

        socket.on('score_updated', () => {
            fetchData();
        });

        return () => {
            socket.off('score_updated');
        };
    }, [quizId, user]);

    const handleAddQuestion = () => {
        if (!newQuestion.questionText || newQuestion.options.some(opt => !opt) || !newQuestion.correctAnswer) {
            alert('Please fill in all fields');
            return;
        }
        socket.emit('add_question', { quizId, question: { ...newQuestion, points: Number(newQuestion.points), type: 'multiple-choice' } });
        setNewQuestion({ questionText: '', options: ['', '', '', ''], correctAnswer: '', points: 10 });
        setShowAddQuestion(false);
        alert('Question added successfully!');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a]">
            <Loader2 className="animate-spin text-[#ff6b00]" size={64} />
            <p className="mt-6 font-black text-gray-500 uppercase tracking-widest animate-pulse">Calculating Rankings...</p>
        </div>
    );

    // Pagination for teacher view
    const totalPages = Math.max(1, Math.ceil(results.length / studentsPerPage));
    const paginatedResults = results.slice(
        (currentPage - 1) * studentsPerPage,
        currentPage * studentsPerPage
    );

    // Student view — find their rank and show only their position
    if (isStudent) {
        const userRank = stats?.userRank || 0;
        const totalParticipants = stats?.totalParticipants || 0;
        const userScore = stats?.userScore || 0;
        const maxScore = (quiz?.questions?.length || 0) * 10;
        const percentile = totalParticipants > 1 ? (1 - (userRank - 1) / (totalParticipants - 1)) * 100 : 100;

        const getPerformanceZone = () => {
            if (percentile >= 90) return {
                label: 'Top 10%', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: Trophy,
                message: 'Exceptional performance! You mastered this arena.'
            };
            if (percentile >= 75) return {
                label: 'Top 25%', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20', icon: Star,
                message: "Great job! You're among the elite performers."
            };
            if (userScore > (stats?.averageScore || 0)) return {
                label: 'Above Average', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: TrendingUp,
                message: 'Solid work! You performed better than most.'
            };
            if (userScore >= (stats?.averageScore || 0) * 0.8) return {
                label: 'Average', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Target,
                message: "Good effort! You're keeping pace with the class."
            };
            return {
                label: 'Needs Improvement', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', icon: AlertCircle,
                message: 'Keep practicing! Every attempt makes you stronger.'
            };
        };

        const zone = getPerformanceZone();
        const ZoneIcon = zone.icon;

        return (
            <div className="min-h-screen bg-[#0f172a] text-white py-12 px-4 relative overflow-hidden font-inter">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

                <div className="max-w-2xl mx-auto space-y-10 relative z-10">
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center gap-4 px-6 py-2 bg-white/5 rounded-full border border-white/10 mb-4">
                            <TrendingUp className="text-[#ff6b00]" size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Your Result</span>
                        </div>
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter">
                            {quiz?.title || 'Quiz'} <span className="text-[#ff6b00]">Result</span>
                        </h1>
                    </div>

                    {/* Rank Card — The Main Focus */}
                    <div className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border ${zone.border} rounded-[3rem] p-10 md:p-14 shadow-2xl`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-32 -mt-32 blur-3xl opacity-20"></div>

                        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                            {/* Performance Zone Icon */}
                            <div className={`w-32 h-32 ${zone.bg} rounded-[2.5rem] flex items-center justify-center border-4 ${zone.border} shadow-2xl relative group transition-transform duration-500 hover:scale-105`}>
                                <ZoneIcon size={60} className={`${zone.color} drop-shadow-2xl`} />
                                {percentile >= 75 && (
                                    <div className="absolute -top-4 -right-4 bg-[#ff6b00] text-white p-2 rounded-full shadow-lg animate-bounce">
                                        <Award size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Rank Number — BIG */}
                            <div className="space-y-2">
                                <span className={`text-xs font-black uppercase tracking-[0.3em] ${zone.color}`}>{zone.label}</span>
                                <h2 className="text-8xl font-black italic text-[#ff6b00]">
                                    #{userRank}
                                </h2>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                                    out of {totalParticipants} participants
                                </p>
                            </div>

                            {/* Message */}
                            <p className="text-2xl font-black italic uppercase tracking-tighter text-white max-w-md">
                                {zone.message}
                            </p>

                            {/* Score */}
                            <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Your Score</p>
                                    <p className="text-3xl font-black italic text-[#ff6b00]">{userScore}</p>
                                    <p className="text-[10px] font-bold text-gray-600">/ {maxScore}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Your Rank</p>
                                    <p className="text-3xl font-black italic text-white">#{userRank}</p>
                                    <p className="text-[10px] font-bold text-gray-600">of {totalParticipants}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Motivational Quote */}
                    <div className="bg-[#ff6b00]/10 border border-[#ff6b00]/20 p-6 rounded-3xl flex items-center gap-4">
                        <div className="bg-[#ff6b00] p-2 rounded-xl text-white shadow-lg shadow-[#ff6b00]/20">
                            <TrendingUp size={20} />
                        </div>
                        <p className="text-xs font-bold text-gray-300 italic">
                            "Success is not final, failure is not fatal: it is the courage to continue that counts."
                        </p>
                    </div>

                    {/* Back Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={() => navigate('/student-dashboard')}
                            className="group flex items-center gap-6 bg-[#ff6b00] text-white px-12 py-6 rounded-3xl font-black italic uppercase tracking-tighter hover:scale-105 transition-all shadow-2xl shadow-orange-600/20 active:scale-95 text-2xl border-b-8 border-orange-700"
                        >
                            <Home size={30} className="group-hover:-translate-y-1 transition-transform" />
                            BACK TO ACADEMY
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // TEACHER VIEW — Student Tracker with Dots
    // ==========================================
    return (
        <div className="min-h-screen bg-[#0f172a] text-white py-12 px-4 relative overflow-hidden font-inter">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff6b00]/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

            <div className="max-w-6xl mx-auto space-y-10 relative z-10">
                {/* Header Section */}
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center gap-4 px-6 py-2 bg-white/5 rounded-full border border-white/10 mb-4">
                        <TrendingUp className="text-[#ff6b00]" size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Final Standings</span>
                    </div>
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter">
                        {quiz?.title || 'Quiz'} <span className="text-[#ff6b00]">Results</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                        {results.length} Participants · {quiz?.questions?.length || 0} Questions
                    </p>
                </div>

                {/* Student Tracker Table */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                    {/* Table Header */}
                    <div className="px-8 py-4 bg-white/5 border-b border-white/10 flex items-center gap-4">
                        <div className="w-14 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Rank</div>
                        <div className="w-44 text-[10px] font-black text-gray-500 uppercase tracking-widest">Student</div>
                        <div className="flex-1 text-[10px] font-black text-gray-500 uppercase tracking-widest">Answer Map</div>
                        <div className="w-20 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Score</div>
                        <div className="w-24 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</div>
                    </div>

                    {/* Rows */}
                    {paginatedResults.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {paginatedResults.map((res, pIdx) => {
                                const globalIdx = (currentPage - 1) * studentsPerPage + pIdx;
                                const rank = globalIdx + 1;
                                const totalQuestions = quiz?.questions?.length || 0;
                                const maxScore = totalQuestions * 10;
                                const answeredCount = res.answers?.length || 0;
                                const correctCount = res.answers?.filter(a => a.isCorrect)?.length || 0;
                                const wrongCount = answeredCount - correctCount;
                                const notAttempted = totalQuestions - answeredCount;

                                return (
                                    <div
                                        key={res.studentId || pIdx}
                                        className={`px-8 py-5 flex items-center gap-4 transition-colors ${rank <= 3 ? 'bg-white/[0.03]' : ''} hover:bg-white/[0.05]`}
                                    >
                                        {/* Rank */}
                                        <div className="w-14 text-center">
                                            {rank === 1 ? (
                                                <div className="w-10 h-10 mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                                                    <Trophy size={18} className="text-white" />
                                                </div>
                                            ) : rank === 2 ? (
                                                <div className="w-10 h-10 mx-auto bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl flex items-center justify-center shadow-lg">
                                                    <span className="text-white font-black text-sm">#2</span>
                                                </div>
                                            ) : rank === 3 ? (
                                                <div className="w-10 h-10 mx-auto bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                                                    <span className="text-white font-black text-sm">#3</span>
                                                </div>
                                            ) : (
                                                <span className="text-xl font-black text-gray-500 italic">#{rank}</span>
                                            )}
                                        </div>

                                        {/* Student Name / Roll */}
                                        <div className="w-44 min-w-0">
                                            <p className="font-bold text-white truncate text-sm">{res.username || 'Unknown'}</p>
                                            {res.studentId && (
                                                <p className="text-[10px] text-gray-500 font-mono truncate">{res.studentId}</p>
                                            )}
                                        </div>

                                        {/* Answer Dots */}
                                        <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                            {quiz?.questions?.map((q, idx) => {
                                                const answer = res.answers?.find(a => a.questionText === q.questionText);
                                                const isAnswered = !!answer;
                                                const isCorrect = answer?.isCorrect === true;

                                                let dotClass = 'bg-gray-700/50 border-gray-600 text-gray-500';
                                                let Icon = null;

                                                if (isAnswered) {
                                                    if (isCorrect) {
                                                        dotClass = 'bg-green-500 border-green-500 text-white';
                                                        Icon = <CheckCircle size={13} />;
                                                    } else {
                                                        dotClass = 'bg-red-500 border-red-500 text-white';
                                                        Icon = <XCircle size={13} />;
                                                    }
                                                } else {
                                                    Icon = <Minus size={11} />;
                                                }

                                                return (
                                                    <div
                                                        key={idx}
                                                        title={isAnswered ? (isCorrect ? `Q${idx + 1}: Correct` : `Q${idx + 1}: Incorrect`) : `Q${idx + 1}: Not Attempted`}
                                                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black border transition-all ${dotClass}`}
                                                    >
                                                        {Icon}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Score */}
                                        <div className="w-20 text-center">
                                            <span className="text-xl font-black text-[#ff6b00] italic">{res.currentScore}</span>
                                            <p className="text-[9px] text-gray-500 font-bold">/ {maxScore}</p>
                                        </div>

                                        {/* Status Summary */}
                                        <div className="w-24 flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-green-400">{correctCount}✓</span>
                                            <span className="text-[10px] font-bold text-red-400">{wrongCount}✗</span>
                                            <span className="text-[10px] font-bold text-gray-500">{notAttempted}–</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <Users className="mx-auto text-white/10 mb-4" size={48} />
                            <p className="text-gray-500 font-bold uppercase tracking-widest italic text-xs">No results available</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-8 py-5 bg-white/5 border-t border-white/10 flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-bold">
                                Showing {(currentPage - 1) * studentsPerPage + 1}–{Math.min(currentPage * studentsPerPage, results.length)} of {results.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 rounded-xl font-black text-sm transition ${page === currentPage
                                            ? 'bg-[#ff6b00] text-white shadow-lg shadow-orange-500/20'
                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="px-8 py-4 border-t border-white/5 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-green-500"></div>
                            <span className="text-[10px] font-bold text-gray-500">Correct</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-red-500"></div>
                            <span className="text-[10px] font-bold text-gray-500">Wrong</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-gray-700/50 border border-gray-600"></div>
                            <span className="text-[10px] font-bold text-gray-500">Not Attempted</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => setShowAddQuestion(true)}
                        className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white px-8 py-5 rounded-[2rem] font-black italic uppercase tracking-tighter text-lg hover:bg-white/10 transition active:scale-95"
                    >
                        <Plus size={22} /> Add Question
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await api.get(`/quiz/${quizId}`);
                                if (res.data?.joinCode) navigate(`/live-room-teacher/${res.data.joinCode}`);
                            } catch (e) { navigate('/teacher-dashboard'); }
                        }}
                        className="flex items-center justify-center gap-3 bg-[#ff6b00] text-white px-8 py-5 rounded-[2rem] font-black italic uppercase tracking-tighter text-lg hover:scale-105 transition shadow-xl shadow-orange-500/20 active:scale-95 border-b-4 border-orange-700"
                    >
                        <Play fill="currentColor" size={20} /> Resume Control
                    </button>
                    <button
                        onClick={() => navigate('/teacher-dashboard')}
                        className="flex items-center justify-center gap-3 bg-white/10 text-white px-8 py-5 rounded-[2rem] font-black italic uppercase tracking-tighter text-lg hover:bg-white/20 transition active:scale-95"
                    >
                        <Home size={20} /> Dashboard
                    </button>
                </div>
            </div>

            {/* Add Question Modal */}
            {showAddQuestion && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-[#1e293b] border border-white/10 rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black italic uppercase italic tracking-tighter">Add <span className="text-[#ff6b00]">Question</span></h2>
                            <button onClick={() => setShowAddQuestion(false)} className="p-3 hover:bg-white/5 rounded-full text-gray-400">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Question Description</label>
                                <textarea
                                    value={newQuestion.questionText}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/50"
                                    placeholder="What is the capital of..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Options</label>
                                {newQuestion.options.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...newQuestion.options];
                                            newOpts[idx] = e.target.value;
                                            setNewQuestion({ ...newQuestion, options: newOpts });
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder={`Option ${idx + 1}`}
                                    />
                                ))}
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Correct Choice</label>
                                <select
                                    value={newQuestion.correctAnswer}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none appearance-none"
                                >
                                    <option value="" className="bg-[#1e293b]">Select Answer</option>
                                    {newQuestion.options.filter(opt => opt).map((opt, idx) => (
                                        <option key={idx} value={opt} className="bg-[#1e293b]">{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAddQuestion}
                                className="w-full bg-[#ff6b00] text-white py-6 rounded-[2rem] font-black italic uppercase tracking-tighter text-xl hover:scale-[1.02] transition-all shadow-xl shadow-orange-600/20 active:scale-95"
                            >
                                Publish Question
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
