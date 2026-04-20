import { useState, useEffect } from 'react';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart3, Users, Trophy, Search, FileText } from 'lucide-react';

export default function Performance() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/quiz/stats');
                setStats(res.data);
            } catch (err) {
                console.error('Error fetching stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const filteredStats = stats.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCompletions = stats.reduce((acc, curr) => acc + curr.completionCount, 0);
    const avgOverallScore = stats.length > 0
        ? stats.reduce((acc, curr) => acc + curr.averageScore, 0) / stats.length
        : 0;

    return (
        <DashboardLayout role="teacher">
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Student <span className="text-indigo-600">Performance</span></h1>
                        <p className="text-gray-500 font-medium mt-1">Detailed insights into class-wide quiz outcomes.</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm w-full md:w-64"
                        />
                    </div>
                </div>

                {/* Top Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100/20 border border-gray-50 flex items-center gap-5">
                        <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                            <Users size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Total Attempts</p>
                            <p className="text-4xl font-black text-gray-900 italic">{totalCompletions}</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100/20 border border-gray-50 flex items-center gap-5">
                        <div className="bg-green-50 p-4 rounded-2xl text-green-600">
                            <Trophy size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-1">Avg. Score</p>
                            <p className="text-4xl font-black text-gray-900 italic">{avgOverallScore.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100/20 border border-gray-50 flex items-center gap-5">
                        <div className="bg-purple-50 p-4 rounded-2xl text-purple-600">
                            <BarChart3 size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-1">Active Quizzes</p>
                            <p className="text-4xl font-black text-gray-900 italic">{stats.length}</p>
                        </div>
                    </div>
                </div>

                {/* Quizzes Performance List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">Quiz Breakdowns</h2>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin text-indigo-600 mb-4 inline-block">
                                <BarChart3 size={40} />
                            </div>
                            <p className="text-gray-500">Calculating statistics...</p>
                        </div>
                    ) : filteredStats.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredStats.map((quiz, idx) => (
                                <div key={quiz.quizId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 border-l-indigo-600">
                                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText size={16} className="text-gray-400" />
                                                <h3 className="text-lg font-bold text-gray-900">{quiz.title}</h3>
                                                {idx === 0 && (
                                                    <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest animate-pulse">Latest</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>{quiz.completionCount} Students completed</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span className="font-semibold text-indigo-600">Avg: {quiz.averageScore.toFixed(1)}%</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 max-w-xs w-full bg-gray-50 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                                style={{ width: `${quiz.averageScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    {quiz.results.length > 0 && (
                                        <div className="bg-gray-50 border-t border-gray-100">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-gray-500 font-medium border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3">Student</th>
                                                        <th className="px-6 py-3">Score</th>
                                                        <th className="px-6 py-3">Completed On</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {quiz.results.map((res, i) => (
                                                        <tr key={i} className="hover:bg-white transition-colors">
                                                            <td className="px-6 py-4 font-medium text-gray-900">{res.studentName}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${res.score >= 80 ? 'bg-green-100 text-green-700' :
                                                                    res.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {res.score} / {res.totalQuestions * 10}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-500">
                                                                {new Date(res.completedAt).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
                            <p className="text-gray-400">No data available for this search.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
