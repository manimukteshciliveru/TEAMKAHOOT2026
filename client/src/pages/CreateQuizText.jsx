import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import { Type, Loader2, Plus, Minus, CheckCircle, Clock, Upload, FileText, AlertCircle, Sparkles, ChevronDown, ChevronUp, Users, CheckSquare, Square, Search, Trash2, Activity, Play, X } from 'lucide-react';
import PremiumNumberInput from '../components/PremiumNumberInput';
import Swal from 'sweetalert2';
import socket from '../utils/socket';
import AuthContext from '../context/AuthContext';
import { useContext } from 'react';

// ─── AIKEN PARSER ────────────────────────────────────────────────────────────
function parseAiken(text) {
    const errors = [];
    const questions = [];
    const isOption = line => /^[A-Z]\.\s+.+$/.test(line);
    const isAnswer = line => /^ANSWER\s*:\s*[A-Z]$/i.test(line);
    const rawLines = text.split('\n').map(l => l.trim());
    const chunks = [];
    let current = [];
    let sawAnswer = false;

    for (const line of rawLines) {
        if (line === '') continue;
        if (sawAnswer && !isOption(line) && !isAnswer(line)) {
            if (current.length > 0) {
                chunks.push(current);
                current = [];
            }
            sawAnswer = false;
        }
        current.push(line);
        if (isAnswer(line)) sawAnswer = true;
    }
    if (current.length > 0) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
        const lines = chunks[i];
        const qNum = i + 1;
        if (lines.length < 3) {
            errors.push(`Question ${qNum}: Too few lines.`);
            continue;
        }
        const questionText = lines[0];
        const options = [];
        let correctAnswer = '';
        for (let j = 1; j < lines.length; j++) {
            const optMatch = lines[j].match(/^([A-Z])\.\s+(.+)$/);
            const ansMatch = lines[j].match(/^ANSWER\s*:\s*([A-Z])$/i);
            if (optMatch) options.push({ letter: optMatch[1], text: optMatch[2] });
            else if (ansMatch) correctAnswer = ansMatch[1].toUpperCase();
        }
        if (options.length < 2) {
            errors.push(`Question ${qNum}: Needs 2 options.`);
            continue;
        }
        if (!correctAnswer) {
            errors.push(`Question ${qNum}: Missing ANSWER.`);
            continue;
        }
        const correctOpt = options.find(o => o.letter === correctAnswer);
        if (!correctOpt) {
            errors.push(`Question ${qNum}: Invalid ANSWER letter.`);
            continue;
        }
        questions.push({
            questionText,
            options: options.map(o => o.text),
            correctAnswer: correctOpt.text,
            points: 10
        });
    }
    return { questions, errors };
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CreateQuizText() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Config State
    const [title, setTitle] = useState(location.state?.title || '');
    const [quizType, setQuizType] = useState(location.state?.quizType || 'live'); 
    const [paceControl, setPaceControl] = useState(location.state?.paceControl !== undefined ? location.state.paceControl : true);
    const [duration, setDuration] = useState(location.state?.duration || 30);
    const [startMode, setStartMode] = useState(location.state?.startMode || 'now');
    
    // Scheduling
    const getDefaultDateTime = (addHours = 0) => {
        const d = new Date();
        d.setHours(d.getHours() + addHours);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };
    const [scheduledStartTime, setScheduledStartTime] = useState(location.state?.scheduledStartTime || getDefaultDateTime());
    const [scheduledEndTime, setScheduledEndTime] = useState(location.state?.scheduledEndTime || getDefaultDateTime(24));

    // Audience State
    const [allStudents, setAllStudents] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [sectionToAsk, setSectionToAsk] = useState(null);

    // Questions State
    const isManualPath = window.location.pathname.includes('/manual');
    const [creationMode, setCreationMode] = useState(isManualPath ? 'manual' : 'text');
    
    // Timer Config
    const [timerMode, setTimerMode] = useState(location.state?.timerMode || 'total'); 
    const [timerPerQuestion, setTimerPerQuestion] = useState(location.state?.timerPerQuestion || 30); 
    const [description, setDescription] = useState(location.state?.description || '');
    const [aiLoading, setAiLoading] = useState(false);
    
    const [rawText, setRawText] = useState('');
    const [manualQuestions, setQuestions] = useState(location.state?.questions || [{
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 10
    }]);

    const [loading, setLoading] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const { user } = useContext(AuthContext);

    // Listen for background job updates (AI Generate specifically)
    useEffect(() => {
        if (!user) return;
        
        const channel = `job_status_${user._id}`;
        socket.on(channel, (data) => {
            console.log('Background AI Job Update:', data);
            setProcessingMessage(data.message);
            
            if (data.status === 'completed') {
                showToast('AI Generation Complete!', 'success');
                setAiLoading(false);
                setCreationMode('manual');
                // Navigate to a temporary refresh or just update state
                // Since this page manages questions in state, we fetch the questions if needed
                // But for simplicity in this flow, we'll let the user know it's ready.
                // Re-fetching the newly created quiz is better.
                window.location.reload(); 
            } else if (data.status === 'failed') {
                showToast(data.message, 'error');
                setAiLoading(false);
            }
        });

        return () => socket.off(channel);
    }, [user, showToast]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/auth/students');
                setAllStudents(res.data);
                const uniqueBranches = [...new Set([
                    ...res.data.map(s => s.branch),
                    ...res.data.map(s => s.department)
                ].filter(Boolean))].sort();
                setBranches(uniqueBranches);
            } catch (err) { console.error('Data fetch error', err); }
        };
        fetchData();
        
        if (location.state?.questions) {
            setQuestions(location.state.questions);
            setCreationMode('manual');
        }
    }, [location.state]);

    // Helpers
    const getBranchSections = (branch) => {
        if (branch === 'CSE') return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
        if (branch === 'CSM') return ['A', 'B', 'C', 'D', 'E'];
        return [...new Set(allStudents.filter(s => s.branch === branch || s.department === branch).map(s => s.section))].sort();
    };

    const toggleBranch = (branch) => {
        if (selectedBranches.includes(branch)) {
            setSelectedBranches(selectedBranches.filter(b => b !== branch));
            setSelectedSections(selectedSections.filter(s => !s.startsWith(`${branch}-`)));
        } else {
            setSelectedBranches([...selectedBranches, branch]);
        }
    };

    const handleSectionClick = (branch, section) => {
        const key = `${branch}-${section}`;
        if (selectedSections.includes(key)) {
            setSelectedSections(selectedSections.filter(s => s !== key));
        } else {
            setSelectedSections([...selectedSections, key]);
        }
    };

    const addQuestion = () => setQuestions([...manualQuestions, { questionText: '', options: ['', '', '', ''], correctAnswer: '', points: 10 }]);
    const removeQuestion = (idx) => setQuestions(manualQuestions.filter((_, i) => i !== idx));
    const updateQuestion = (idx, field, val) => {
        const qns = [...manualQuestions];
        qns[idx][field] = val;
        setQuestions(qns);
    };

    const handleAIGenerate = async () => {
        if (!rawText.trim()) return showToast('Please enter some text, JSON, or Aiken data first.', 'warning');
        
        // Try local JSON parse first for speed
        try {
            const possibleJson = JSON.parse(rawText);
            if (Array.isArray(possibleJson)) {
                setQuestions(possibleJson);
                setCreationMode('manual');
                showToast('JSON Questions imported!', 'success');
                return;
            } else if (possibleJson.questions && Array.isArray(possibleJson.questions)) {
                setQuestions(possibleJson.questions);
                setCreationMode('manual');
                showToast('JSON Questions imported!', 'success');
                return;
            }
        } catch (e) { /* Not JSON, continue to AI */ }

        setAiLoading(true);
        setProcessingMessage('Sending content to AI engine...');
        try {
            const payload = {
                content: rawText,
                type: 'text',
                questionCount: 5,
                difficulty: 'Medium',
                description,
                title: title || 'AI Generated Quiz'
            };
            const res = await api.post('/quiz/create', payload);
            
            if (res.status === 202) {
                setProcessingMessage('AI is analyzing your text and generating questions in the background...');
            } else {
                setQuestions(res.data.questions);
                setCreationMode('manual');
                showToast('AI Questions generated!', 'success');
                setAiLoading(false);
            }
        } catch (err) {
            showToast('AI Generation failed.', 'error');
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let finalQuestions = [];
        
        if (creationMode === 'text') {
            const { questions, errors } = parseAiken(rawText);
            if (errors.length > 0) return showToast(errors[0], 'error');
            if (questions.length === 0) return showToast('No questions detected in text.', 'warning');
            finalQuestions = questions;
        } else {
            if (manualQuestions.some(q => !q.questionText || q.options.some(o => !o) || !q.correctAnswer)) {
                return showToast('Please complete all manual questions.', 'warning');
            }
            finalQuestions = manualQuestions;
        }

        if (!title) return showToast('Quiz Title is required.', 'warning');

        setLoading(true);
        try {
            const payload = {
                title,
                isAssessment: quizType === 'assignment',
                timerMode,
                timerPerQuestion: timerMode === 'per-question' ? timerPerQuestion : 0,
                duration: timerMode === 'total' ? duration : 0,
                paceControl: quizType === 'live' ? paceControl : false,
                isLive: quizType === 'live',
                questions: finalQuestions,
                allowedSections: selectedSections.map(s => s.split('-')[1]),
                allowedStudents: selectedStudents,
                scheduledStartTime: startMode === 'scheduled' ? scheduledStartTime : null,
                scheduledEndTime: startMode === 'scheduled' ? scheduledEndTime : null,
            };
            const res = await api.post('/quiz/create', payload);
            
            await Swal.fire({
                title: 'Quiz Published!',
                html: `<p class="text-slate-500">Join Code: <span class="text-3xl font-black text-[#ff6b00] tracking-widest">${res.data.joinCode}</span></p>`,
                icon: 'success',
                confirmButtonText: quizType === 'live' ? 'ENTER LOBBY' : 'DASHBOARD',
                confirmButtonColor: '#6366f1'
            });
            
            if (quizType === 'live') {
                navigate(`/live-room-faculty/${res.data.joinCode}`);
            } else {
                navigate('/my-quizzes');
            }
        } catch (err) {
            showToast(err.response?.data?.msg || 'Publish failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="faculty">
            <div className="max-w-5xl mx-auto pb-20 space-y-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            {creationMode === 'manual' ? 'Manual' : 'Bulk'} <span className="text-[#ff6b00]">Creation</span>
                        </h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Configure & Launch Educational Logic</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Settings */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Title & Type */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 ring-1 ring-white/5 shadow-2xl">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quiz Title</label>
                                <input 
                                    type="text" value={title} onChange={(e) => setTitle(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black text-xl outline-none focus:border-[#ff6b00] transition-all"
                                    placeholder="Quiz Title..." required 
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quiz Type</label>
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                    <button type="button" onClick={() => setQuizType('live')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${quizType === 'live' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Live Quiz</button>
                                    <button type="button" onClick={() => setQuizType('assignment')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${quizType === 'assignment' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Assignment</button>
                                </div>
                                <p className="text-[9px] text-slate-500 px-2 font-bold italic">
                                    {quizType === 'live' ? 'Synchronous session where students join simultaneously.' : 'Self-paced session students can complete within a timeframe.'}
                                </p>
                            </div>

                            {quizType === 'live' && (
                                <div className="space-y-4 pt-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Control Flow</label>
                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button type="button" onClick={() => setPaceControl(true)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${paceControl ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>Teacher Paced</button>
                                        <button type="button" onClick={() => setPaceControl(false)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!paceControl ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>Self Paced</button>
                                    </div>
                                    <p className="text-[9px] text-slate-500 px-2 font-bold italic">
                                        {paceControl ? 'You control when to move to the next question.' : 'Students move at their own speed. Backtracking allowed for skipped questions only.'}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-6 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Timer Configuration</label>
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-72">
                                    <button type="button" onClick={() => setTimerMode('per-question')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${timerMode === 'per-question' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500'}`}>PER QUESTION</button>
                                    <button type="button" onClick={() => setTimerMode('total')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${timerMode === 'total' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500'}`}>TOTAL TIME</button>
                                </div>
                                
                                {timerMode === 'per-question' ? (
                                    <PremiumNumberInput label="Seconds per Question" value={timerPerQuestion} onChange={setTimerPerQuestion} icon={Clock} min={5} max={300} suffix="SEC" />
                                ) : (
                                    <PremiumNumberInput label="Total Duration" value={duration} onChange={setDuration} icon={Clock} min={1} max={300} suffix="MIN" />
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Additional Instructions (Optional)</label>
                                <textarea 
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-[#ff6b00] transition-all resize-none"
                                    placeholder="e.g. Focus on Chapter 5, use formal tone, avoid trick questions..."
                                />
                                <p className="text-[9px] text-slate-500 px-2 font-bold italic">This context helps the AI generate more relevant questions from your text or topic.</p>
                            </div>
                        </div>

                        {/* Audience */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 ring-1 ring-white/5">
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-[#ff6b00]" />
                                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Target Audience</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {branches.map(b => (
                                        <button key={b} type="button" onClick={() => toggleBranch(b)} className={`px-4 py-2 rounded-xl font-black text-[10px] border transition-all ${selectedBranches.includes(b) ? 'bg-[#ff6b00] border-[#ff6b00] text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>{b}</button>
                                    ))}
                                </div>

                                {selectedBranches.map(b => (
                                    <div key={b} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">{b} Sections</p>
                                        <div className="flex flex-wrap gap-2">
                                            {getBranchSections(b).map(s => (
                                                <button key={s} type="button" onClick={() => handleSectionClick(b, s)} className={`px-3 py-1.5 rounded-lg font-black text-[9px] border transition-all ${selectedSections.includes(`${b}-${s}`) ? 'bg-[#ff6b00] border-[#ff6b00] text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Sec {s}</button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 ring-1 ring-white/5 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <Clock size={18} className="text-[#ff6b00]" />
                                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Scheduling</h3>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Mode</label>
                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                    <button type="button" onClick={() => setStartMode('now')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${startMode === 'now' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Start Now</button>
                                    <button type="button" onClick={() => setStartMode('scheduled')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${startMode === 'scheduled' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Schedule</button>
                                </div>
                            </div>

                            {startMode === 'scheduled' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Time</label>
                                        <input 
                                            type="datetime-local" 
                                            value={scheduledStartTime} 
                                            onChange={(e) => setScheduledStartTime(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-[#ff6b00] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Time (Optional)</label>
                                        <input 
                                            type="datetime-local" 
                                            value={scheduledEndTime} 
                                            onChange={(e) => setScheduledEndTime(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-[#ff6b00] transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Questions */}
                    <div className="lg:col-span-2 space-y-8">
                        {creationMode === 'text' ? (
                            <div className="animate-in fade-in slide-in-from-right-10 duration-500 space-y-6">
                                <div className="bg-[#ff6b00]/5 border border-[#ff6b00]/20 rounded-[2.5rem] p-10 space-y-8">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Import Question Logic</h3>
                                        <p className="text-slate-400 text-xs font-bold leading-relaxed">Paste Aiken format text below. No complex editors needed—just raw knowledge.</p>
                                    </div>
                                    <textarea 
                                        value={rawText} onChange={(e) => setRawText(e.target.value)}
                                        className="w-full h-[50vh] bg-white/5 border-2 border-white/5 rounded-3xl p-8 text-white font-mono text-sm placeholder:text-slate-800 outline-none focus:border-[#ff6b00] transition-all resize-none shadow-inner"
                                        placeholder={"Paste your Aiken text, JSON data, or theoretical content here...\n\nExample Aiken:\nWhat is 2+2?\nA. 3\nB. 4\nANSWER: B"}
                                    />
                                    
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quiz Type</label>
                                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                                    <button type="button" onClick={() => setQuizType('live')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${quizType === 'live' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Live Quiz</button>
                                                    <button type="button" onClick={() => setQuizType('assignment')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${quizType === 'assignment' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Assignment</button>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Mode</label>
                                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                                    <button type="button" onClick={() => setStartMode('now')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${startMode === 'now' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Start Now</button>
                                                    <button type="button" onClick={() => setStartMode('scheduled')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${startMode === 'scheduled' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Schedule</button>
                                                </div>
                                            </div>
                                        </div>

                                        {startMode === 'scheduled' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Time</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        value={scheduledStartTime} 
                                                        onChange={(e) => setScheduledStartTime(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-[#ff6b00] transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Time (Optional)</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        value={scheduledEndTime} 
                                                        onChange={(e) => setScheduledEndTime(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-[#ff6b00] transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                            <Sparkles size={14} className="text-[#ff6b00]" /> Intelligence Engine Active
                                        </div>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <button 
                                                type="button" 
                                                onClick={handleAIGenerate} 
                                                disabled={aiLoading}
                                                className="flex-1 sm:flex-none bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase italic hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                                {aiLoading ? 'ANALYZING...' : 'AI GENERATE'}
                                            </button>
                                            <button type="submit" disabled={loading} className="flex-1 sm:flex-none bg-[#ff6b00] text-white px-8 py-5 rounded-2xl font-black text-sm uppercase italic shadow-xl shadow-[#ff6b00]/20 hover:scale-105 active:scale-95 transition-all">
                                                {loading ? 'Processing...' : 'PUBLISH DIRECTLY'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-left-10 duration-500 space-y-6">
                                {manualQuestions.map((q, qIdx) => (
                                    <div key={qIdx} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 relative group">
                                        <button type="button" onClick={() => removeQuestion(qIdx)} className="absolute top-6 right-6 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={20} /></button>
                                        <div className="flex items-start gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-[#ff6b00] italic border border-white/10 shrink-0">{qIdx+1}</div>
                                            <div className="flex-1 space-y-6">
                                                <input 
                                                    type="text" value={q.questionText} onChange={(e) => updateQuestion(qIdx, 'questionText', e.target.value)}
                                                    className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#ff6b00] py-2 text-white font-black text-lg outline-none transition-all"
                                                    placeholder="Enter your question..."
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${q.correctAnswer === opt && opt !== '' ? 'border-[#ff6b00] bg-[#ff6b00]/10' : 'border-white/5 bg-white/2'}`}>
                                                            <input 
                                                                type="text" value={opt} onChange={(e) => {
                                                                    const qns = [...manualQuestions];
                                                                    qns[qIdx].options[oIdx] = e.target.value;
                                                                    setQuestions(qns);
                                                                }}
                                                                className="flex-1 bg-transparent border-none text-white font-bold text-sm outline-none"
                                                                placeholder={`Option ${String.fromCharCode(65+oIdx)}`}
                                                            />
                                                            <input 
                                                                type="radio" checked={q.correctAnswer === opt && opt !== ''} 
                                                                onChange={() => updateQuestion(qIdx, 'correctAnswer', opt)}
                                                                className="w-5 h-5 accent-[#ff6b00] cursor-pointer"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex flex-col gap-6">
                                    <button type="button" onClick={addQuestion} className="w-full py-6 rounded-[2.5rem] border-2 border-dashed border-white/10 text-slate-500 font-black uppercase text-xs tracking-widest hover:border-[#ff6b00] hover:text-[#ff6b00] transition-all">Add New Question Block</button>
                                    <button type="submit" disabled={loading} className="w-full bg-[#ff6b00] text-white py-6 rounded-[2.5rem] font-black text-2xl italic uppercase shadow-2xl shadow-[#ff6b00]/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        {loading ? 'SAVING DATA...' : 'PUBLISH MANUAL QUIZ'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
