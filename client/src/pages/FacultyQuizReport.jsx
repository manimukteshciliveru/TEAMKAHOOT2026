import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, Legend
} from 'recharts';
import { 
    ChevronLeft, Download, Users, CheckCircle, Target, TrendingUp, 
    Trophy, Award, Loader2, AlertCircle, BarChart3, PieChart as PieIcon, Activity, XCircle, Minus, Home
} from 'lucide-react';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';

const COLORS = ['#ff6b00', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];
const PIE_COLORS = ['#10b981', '#ef4444'];

export default function FacultyQuizReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get(`/quiz/faculty-report/${id}`);
                setData(res.data);
            } catch (err) {
                console.error('Error fetching quiz stats:', err);
                setError(err.response?.data?.msg || 'Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [id]);

    if (loading) return (
        <DashboardLayout role="faculty">
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-[#ff6b00] mb-4" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-widest animate-pulse">Generating Intelligence Report...</p>
            </div>
        </DashboardLayout>
    );

    if (error) return (
        <DashboardLayout role="faculty">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <AlertCircle className="text-red-500 mb-6" size={64} />
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Access Denied</h2>
                <p className="text-slate-500 font-bold mb-8 max-w-md">{error}</p>
                <button onClick={() => navigate('/my-quizzes')} className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Return to Library
                </button>
            </div>
        </DashboardLayout>
    );

    const { metrics, charts, topStudents, quizInfo } = data;

    return (
        <DashboardLayout role="faculty">
            <div className="space-y-10 pb-20">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => navigate('/my-quizzes')}
                            className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all group"
                        >
                            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">{quizInfo.title}</h1>
                                <span className="bg-[#ff6b00]/10 text-[#ff6b00] px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border border-[#ff6b00]/20">CODE: {quizInfo.code}</span>
                            </div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] italic">
                                {quizInfo.questionCount} Questions • {quizInfo.totalPoints} Total Points
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={() => navigate('/faculty-dashboard')}
                            className="flex items-center justify-center gap-3 bg-white/10 text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:bg-white/20 transition-all border border-white/10"
                        >
                            <Home size={20} /> Back to Dashboard
                        </button>
                        <button className="flex items-center justify-center gap-3 bg-[#ff6b00] text-white px-8 py-4 rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#ff6b00]/20">
                            <Download size={20} /> Download Full Report
                        </button>
                    </div>
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Eligible Students', value: metrics.eligibleStudents, icon: Users, color: 'text-blue-400' },
                        { label: 'Total Attempted', value: metrics.totalAttempted, icon: CheckCircle, color: 'text-green-400' },
                        { label: 'Participation %', value: `${metrics.participationPercentage}%`, icon: PieIcon, color: 'text-purple-400' },
                        { label: 'Average Score', value: metrics.averageScore, icon: Target, color: 'text-[#ff6b00]' },
                        { label: 'Highest Score', value: metrics.highestScore, icon: Trophy, color: 'text-yellow-400' },
                        { label: 'Lowest Score', value: metrics.lowestScore, icon: Activity, color: 'text-red-400' },
                    ].map((m, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col items-center text-center group hover:bg-white/10 transition-all">
                            <div className={`p-3 rounded-xl bg-white/5 mb-4 group-hover:scale-110 transition-transform ${m.color}`}>
                                <m.icon size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</p>
                            <p className="text-2xl font-black text-white italic">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Score Distribution */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-8">
                            <BarChart3 className="text-[#ff6b00]" size={20} />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Score Distribution</h3>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}}
                                        cursor={{fill: '#ffffff05'}}
                                    />
                                    <Bar dataKey="count" fill="#ff6b00" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Section Performance */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-8">
                            <TrendingUp className="text-blue-400" size={20} />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Section Performance (Avg)</h3>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.sectionPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="section" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}}
                                        cursor={{fill: '#ffffff05'}}
                                    />
                                    <Bar dataKey="avgScore" fill="#6366f1" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Participation Rate */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group col-span-1">
                        <div className="flex items-center gap-3 mb-8">
                            <PieIcon className="text-green-400" size={20} />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Participation Rate</h3>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={charts.participationRate}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {charts.participationRate.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '1rem'}} />
                                    <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 900, textTransform: 'uppercase'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top 5 Students */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group col-span-1 lg:col-span-2">
                        <div className="flex items-center gap-3 mb-8">
                            <Award className="text-yellow-400" size={20} />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Top 5 Students</h3>
                        </div>
                        <div className="space-y-4">
                            {topStudents.map((student, i) => (
                                <div key={i} className="flex items-center gap-6 group/row">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        {i === 0 ? <Trophy size={18} className="text-yellow-400" /> : <span className="text-xs font-black text-slate-500">{i + 1}</span>}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-end">
                                            <p className="text-sm font-black text-white uppercase tracking-tight italic group-hover/row:text-[#ff6b00] transition-colors">{student.name} <span className="text-[10px] text-slate-600 ml-2 font-mono">({student.id})</span></p>
                                            <p className="text-sm font-black text-[#ff6b00] italic">{student.score} pts</p>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-transparent to-[#ff6b00] transition-all duration-1000 ease-out"
                                                style={{ width: `${student.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-black text-slate-500 uppercase">{student.percentage}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Question Performance */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-8">
                        <Activity className="text-[#ff6b00]" size={20} />
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Question-wise Performance</h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={charts.questionPerformance}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                                <YAxis yAxisId="left" domain={[0, metrics.eligibleStudents || 'auto']} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} label={{ value: 'Students', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}}
                                    cursor={{fill: '#ffffff05'}}
                                />
                                <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 900, textTransform: 'uppercase'}} />
                                <Bar yAxisId="left" dataKey="correct" name="Correct Answers" fill="#ff6b00" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#6366f1" strokeWidth={3} dot={{fill: '#6366f1', r: 4}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {/* Student Tracker Table */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden group">
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="text-[#ff6b00]" size={20} />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Detailed Performance Tracker</h3>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-16">Rank</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Answer Map</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(data.results || []).sort((a,b) => b.score - a.score).map((res, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors group/row">
                                        <td className="px-8 py-5 text-center font-black text-white italic">#{idx + 1}</td>
                                        <td className="px-8 py-5 min-w-[200px]">
                                            <p className="font-bold text-white text-sm group-hover/row:text-[#ff6b00] transition-colors">{res.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono uppercase">{res.rollNumber} • {res.section}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {res.answers?.map((ans, qIdx) => {
                                                    const isCorrect = ans?.isCorrect;
                                                    const isAnswered = !!ans;
                                                    
                                                    return (
                                                        <div 
                                                            key={qIdx}
                                                            title={isAnswered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Not Attempted'}
                                                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all ${
                                                                isAnswered 
                                                                ? (isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-red-500 border-red-500 text-white')
                                                                : 'bg-white/5 border-white/10 text-slate-600'
                                                            }`}
                                                        >
                                                            {isAnswered ? (isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />) : <Minus size={12} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="text-sm font-black text-[#ff6b00] italic">{res.score}</span>
                                            <span className="text-[10px] text-slate-500 font-bold ml-1">pts</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

