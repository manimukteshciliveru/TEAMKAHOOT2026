import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { Book, Loader2, CheckCircle, Hash, Gauge, Clock, Radio, Sparkles } from 'lucide-react';

export default function CreateQuizTopic() {
    const [topic, setTopic] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                topic,
                type: 'topic',
                questionCount,
                difficulty
            };

            const res = await api.post('/quiz/generate', payload);

            // Redirect to the editor with generated questions
            navigate('/create-quiz/text', {
                state: {
                    questions: res.data.questions,
                    title: res.data.title,
                    duration: res.data.duration || 10
                }
            });
        } catch (err) {
            console.error(err);
            alert('Failed to generate quiz');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="teacher">
            <div className="max-w-4xl mx-auto pb-20 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff6b00]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>

                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
                            AI <span className="text-[#ff6b00]">Topic Creator</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-bold uppercase tracking-wider text-sm italic">Generate 5 questions from any subject</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="bg-white/5 rounded-[3rem] border border-white/10 p-12 ring-1 ring-white/5 relative overflow-hidden group">
                        <div className="relative z-10 space-y-10">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Enter Topic</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full p-8 bg-white/5 border-2 border-transparent rounded-[2rem] focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-3xl text-white placeholder:text-slate-700 outline-none"
                                    placeholder="e.g. Artificial Intelligence, History of India"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 flex items-center gap-6">
                                    <div className="bg-[#ff6b00] w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                        <Hash size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Question Count</p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                            className="bg-transparent border-none text-2xl font-black text-white italic outline-none w-full"
                                        />
                                    </div>
                                </div>
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 flex items-center gap-6">
                                    <div className="bg-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                        <Gauge size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Difficulty</p>
                                        <select
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="bg-transparent border-none text-2xl font-black text-white italic outline-none w-full appearance-none cursor-pointer"
                                        >
                                            <option value="Easy" className="text-black">Easy</option>
                                            <option value="Medium" className="text-black">Medium</option>
                                            <option value="Thinkable" className="text-black">Thinkable</option>
                                            <option value="Hard" className="text-black">Hard</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Book className="absolute -right-20 -bottom-20 opacity-[0.03] text-white group-hover:rotate-12 transition-transform duration-700" size={400} />
                    </div>

                    <div className="flex justify-center pt-8">
                        <button
                            type="submit"
                            disabled={loading || !topic}
                            className="group flex items-center gap-6 bg-[#ff6b00] text-white px-20 py-8 rounded-[2.5rem] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-[#ff6b00]/20 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-8 border-[#cc5500]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={32} /> : <Sparkles size={32} />}
                            {loading ? 'ANALYZING...' : 'GENERATE QUIZ'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
