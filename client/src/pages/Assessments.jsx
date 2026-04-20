import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import {
    BookOpen,
    Clock,
    CheckCircle,
    Award,
    Search,
    Calendar,
    ChevronRight,
    Trophy,
    Layout,
    Loader2
} from 'lucide-react';

export default function Assessments() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const [liveRes, historyRes] = await Promise.all([
                    api.get('/quiz/live'),
                    api.get('/quiz/history/student')
                ]);

                // Merge and remove duplicates by _id
                const liveQuizzes = liveRes.data;
                const historyQuizzes = historyRes.data;

                const allQuizzes = [...liveQuizzes];
                const liveIds = new Set(liveQuizzes.map(q => q._id));

                historyQuizzes.forEach(historyQuiz => {
                    if (!liveIds.has(historyQuiz._id)) {
                        allQuizzes.push(historyQuiz);
                    }
                });

                setQuizzes(allQuizzes);
            } catch (err) {
                console.error('Error fetching quizzes', err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuizzes();
    }, []);

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.topic?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: quizzes.length,
        completed: quizzes.filter(q => q.isAttempted).length,
        available: quizzes.filter(q => !q.isAttempted).length,
        avgScore: quizzes.filter(q => q.isAttempted).length > 0
            ? quizzes.filter(q => q.isAttempted).reduce((acc, curr) => acc + curr.score, 0) / quizzes.filter(q => q.isAttempted).length
            : 0
    };

    return (
        <DashboardLayout role="student">
            <div className="space-y-10 pb-12 relative">
                {/* Background flair */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#ff6b00]/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight italic">
                            My <span className="text-[#ff6b00]">Assessments</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium italic uppercase tracking-wider text-sm">Empowering Excellence through Assessment</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search your library..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3.5 border border-white/10 bg-white/5 text-white rounded-2xl focus:ring-2 focus:ring-[#ff6b00] shadow-sm w-full md:w-80 font-medium"
                        />
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Quizzes', value: stats.total, icon: Layout, color: 'text-[#ff6b00]', bg: 'bg-[#ff6b00]/10' },
                        { label: 'Available', value: stats.available, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                        { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
                        { label: 'Avg. Accuracy', value: `${stats.avgScore.toFixed(0)}%`, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-sm flex flex-col items-center text-center">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl mb-3`}>
                                <stat.icon size={20} />
                            </div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Combined Quiz List & History */}
                <div className="bg-white/5 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/2 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Assessment</th>
                                    <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Questions</th>
                                    <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Score</th>
                                    <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/2">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center">
                                            <Loader2 size={32} className="animate-spin text-[#ff6b00] inline-block mb-3" />
                                            <p className="text-slate-400 font-bold">Synchronizing assessments...</p>
                                        </td>
                                    </tr>
                                ) : filteredQuizzes.length > 0 ? (
                                    filteredQuizzes.map((quiz) => (
                                        <tr key={quiz._id} className="group hover:bg-white/2 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${quiz.isAttempted ? 'bg-[#ff6b00]/10 text-[#ff6b00]' : 'bg-blue-400/10 text-blue-400'}`}>
                                                        {quiz.isAttempted ? <CheckCircle size={20} /> : <BookOpen size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white uppercase tracking-tight italic group-hover:text-[#ff6b00] transition-colors">{quiz.title}</p>
                                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">{quiz.topic || 'General Topic'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 hidden md:table-cell">
                                                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                                                    <Award size={14} className="text-[#ff6b00]" />
                                                    {quiz.questions?.length || 0} Questions
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${quiz.isAttempted
                                                    ? 'bg-green-400/10 text-green-400'
                                                    : 'bg-blue-400/10 text-blue-400'
                                                    }`}>
                                                    {quiz.isAttempted ? 'Completed' : 'Available'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                {quiz.isAttempted ? (
                                                    <div className="flex items-center gap-1.5 font-black text-[#ff6b00] italic text-lg">
                                                        {quiz.score} <span className="text-xs text-slate-600 not-italic uppercase font-bold text-[10px]">Pts</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-700 font-black italic">--</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => navigate(`/quiz/attempt/${quiz._id}`)}
                                                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${quiz.isAttempted
                                                        ? 'bg-transparent border border-white/10 text-[#ff6b00] hover:bg-[#ff6b00] hover:text-white'
                                                        : 'bg-[#ff6b00] text-white hover:bg-[#ff8533] shadow-[#ff6b00]/10 shadow-lg'
                                                        }`}
                                                >
                                                    {quiz.isAttempted ? 'Review' : 'Start'} <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-32 text-center">
                                            <div className="bg-white/2 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
                                                <Search size={32} />
                                            </div>
                                            <p className="text-slate-500 font-black uppercase tracking-widest italic">No assessments found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
