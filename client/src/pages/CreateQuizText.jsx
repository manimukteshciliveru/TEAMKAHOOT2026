// import { useState, useEffect, useRef } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import api from '../utils/api';
// import DashboardLayout from '../components/DashboardLayout';
// import { Type, Loader2, Plus, Minus, CheckCircle, Clock, Upload, FileText, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// // ─── AIKEN PARSER ────────────────────────────────────────────────────────────
// // Robust state-machine parser: works whether questions are separated by
// // blank lines OR just a single newline (both are common in real AIKEN files).
// // Strategy: ANSWER line is the hard end-of-question marker. After seeing it,
// // the very next non-blank, non-option, non-answer line begins a new question.
// function parseAiken(text) {
//     const errors = [];
//     const questions = [];

//     const isOption = line => /^[A-Z]\.\s+.+$/.test(line);
//     const isAnswer = line => /^ANSWER\s*:\s*[A-Z]$/i.test(line);

//     const rawLines = text.split('\n').map(l => l.trim());

//     // Build chunks: each chunk is the lines for one question.
//     // We flush a new chunk whenever we see an ANSWER line and then hit the
//     // start of what looks like the next question (non-blank, non-option, non-answer).
//     const chunks = [];
//     let current = [];
//     let sawAnswer = false;

//     for (const line of rawLines) {
//         if (line === '') continue; // skip blank lines entirely

//         if (sawAnswer && !isOption(line) && !isAnswer(line)) {
//             // Previous question ended; this line starts the next one
//             if (current.length > 0) {
//                 chunks.push(current);
//                 current = [];
//             }
//             sawAnswer = false;
//         }

//         current.push(line);

//         if (isAnswer(line)) {
//             sawAnswer = true;
//         }
//     }
//     if (current.length > 0) chunks.push(current);

//     for (let i = 0; i < chunks.length; i++) {
//         const lines = chunks[i];
//         const qNum = i + 1;

//         if (lines.length < 3) {
//             errors.push(`Question ${qNum}: Too few lines to be valid.`);
//             continue;
//         }

//         const questionText = lines[0];
//         const options = [];
//         let correctAnswer = '';

//         for (let j = 1; j < lines.length; j++) {
//             const optMatch = lines[j].match(/^([A-Z])\.\s+(.+)$/);
//             const ansMatch = lines[j].match(/^ANSWER\s*:\s*([A-Z])$/i);

//             if (optMatch) {
//                 options.push({ letter: optMatch[1], text: optMatch[2] });
//             } else if (ansMatch) {
//                 correctAnswer = ansMatch[1].toUpperCase();
//             } else {
//                 errors.push(`Question ${qNum}: Unrecognized line → "${lines[j]}"`);
//             }
//         }

//         if (options.length < 2) {
//             errors.push(`Question ${qNum}: Needs at least 2 options.`);
//             continue;
//         }
//         if (!correctAnswer) {
//             errors.push(`Question ${qNum}: Missing ANSWER line.`);
//             continue;
//         }
//         const correctOpt = options.find(o => o.letter === correctAnswer);
//         if (!correctOpt) {
//             errors.push(`Question ${qNum}: ANSWER "${correctAnswer}" does not match any option letter.`);
//             continue;
//         }

//         questions.push({
//             questionText,
//             options: options.map(o => o.text),
//             correctAnswer: correctOpt.text,
//             points: 10
//         });
//     }

//     return { questions, errors };
// }

// // ─── AIKEN UPLOAD PANEL ──────────────────────────────────────────────────────
// function AikenUploadPanel({ onQuestionsLoaded }) {
//     const [dragOver, setDragOver] = useState(false);
//     const [fileName, setFileName] = useState('');
//     const [rawText, setRawText] = useState('');
//     const [parsed, setParsed] = useState(null);
//     const [previewOpen, setPreviewOpen] = useState(false);
//     const [fileError, setFileError] = useState('');
//     const fileInputRef = useRef();

//     const kahootColors = [
//         'border-red-500/40 bg-red-500/10',
//         'border-blue-500/40 bg-blue-500/10',
//         'border-yellow-500/40 bg-yellow-500/10',
//         'border-green-500/40 bg-green-500/10',
//         'border-purple-500/40 bg-purple-500/10',
//         'border-pink-500/40 bg-pink-500/10',
//     ];

//     const handleFile = (file) => {
//         if (!file) return;
//         if (!file.name.match(/\.(txt|aiken)$/i)) {
//             setFileError('Please upload a .txt or .aiken file.');
//             return;
//         }
//         setFileName(file.name);
//         setFileError('');
//         const reader = new FileReader();
//         reader.onload = (e) => {
//             const text = e.target.result;
//             setRawText(text);
//             const result = parseAiken(text);
//             setParsed(result);
//             setPreviewOpen(true);
//         };
//         reader.readAsText(file);
//     };

//     const handleDrop = (e) => {
//         e.preventDefault();
//         setDragOver(false);
//         handleFile(e.dataTransfer.files[0]);
//     };

//     const handleTextChange = (e) => {
//         setRawText(e.target.value);
//         setParsed(null);
//     };

//     const handleParseText = () => {
//         if (!rawText.trim()) return;
//         const result = parseAiken(rawText);
//         setParsed(result);
//         setPreviewOpen(true);
//     };

//     const handleClear = () => {
//         setRawText('');
//         setParsed(null);
//         setFileName('');
//         setPreviewOpen(false);
//         setFileError('');
//         if (fileInputRef.current) fileInputRef.current.value = '';
//     };

//     const handleLoadQuestions = () => {
//         if (!parsed || parsed.questions.length === 0) return;
//         onQuestionsLoaded(parsed.questions);
//     };

//     return (
//         <div className="space-y-8">
//             {/* Format Guide */}
//             <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-8">
//                 <div className="flex items-center gap-3 mb-4">
//                     <FileText size={20} className="text-indigo-400" />
//                     <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AIKEN Format Guide</span>
//                 </div>
//                 <pre className="text-slate-300 text-sm font-mono leading-loose whitespace-pre-wrap">{`What is the capital of France?\nA. Berlin\nB. Paris\nC. Madrid\nD. Rome\nANSWER: B\n\nWhich planet is closest to the Sun?\nA. Venus\nB. Earth\nC. Mercury\nD. Mars\nANSWER: C`}</pre>
//                 <p className="text-slate-500 text-xs font-bold mt-4 uppercase tracking-wider">
//                     • One question per block • Separate blocks with a blank line • ANSWER: uses the option letter
//                 </p>
//             </div>

//             {/* Drop Zone */}
//             <div
//                 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
//                 onDragLeave={() => setDragOver(false)}
//                 onDrop={handleDrop}
//                 onClick={() => fileInputRef.current?.click()}
//                 className={`relative border-4 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all duration-300
//                     ${dragOver ? 'border-[#ff6b00] bg-[#ff6b00]/10 scale-[1.01]' : 'border-white/10 bg-white/2 hover:border-[#ff6b00]/40 hover:bg-white/5'}`}
//             >
//                 <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept=".txt,.aiken"
//                     className="hidden"
//                     onChange={(e) => handleFile(e.target.files[0])}
//                 />
//                 <Upload size={48} className={`mx-auto mb-4 transition-colors ${dragOver ? 'text-[#ff6b00]' : 'text-slate-600'}`} />
//                 {fileName ? (
//                     <div>
//                         <p className="font-black text-xl text-[#ff6b00] italic uppercase">{fileName}</p>
//                         <p className="text-slate-500 text-sm font-bold mt-1">Click to change file</p>
//                     </div>
//                 ) : (
//                     <div>
//                         <p className="font-black text-2xl text-white italic uppercase tracking-tight">Drop your AIKEN file here</p>
//                         <p className="text-slate-500 font-bold mt-2">or click to browse — .txt or .aiken files</p>
//                     </div>
//                 )}
//             </div>

//             {fileError && (
//                 <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
//                     <AlertCircle size={18} className="text-red-400 shrink-0" />
//                     <p className="text-red-400 font-bold text-sm">{fileError}</p>
//                 </div>
//             )}

//             {/* OR Divider */}
//             <div className="flex items-center gap-4">
//                 <div className="flex-1 h-px bg-white/10"></div>
//                 <span className="text-slate-600 font-black text-xs uppercase tracking-widest">Or paste directly</span>
//                 <div className="flex-1 h-px bg-white/10"></div>
//             </div>

//             {/* Paste Area */}
//             <div className="relative">
//                 <textarea
//                     value={rawText}
//                     onChange={handleTextChange}
//                     rows={10}
//                     className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/8 focus:border-[#ff6b00] transition-all font-mono text-sm text-slate-300 placeholder:text-slate-700 outline-none resize-none"
//                     placeholder={"What is the capital of France?\nA. Berlin\nB. Paris\nC. Madrid\nD. Rome\nANSWER: B\n\nNext question here..."}
//                 />
//                 {rawText && (
//                     <button type="button" onClick={handleClear} className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 transition-colors">
//                         <Trash2 size={16} />
//                     </button>
//                 )}
//             </div>

//             {/* Parse Button */}
//             {rawText && !parsed && (
//                 <button
//                     type="button"
//                     onClick={handleParseText}
//                     className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-lg italic uppercase tracking-tight p-6 rounded-2xl transition-all"
//                 >
//                     <Eye size={22} /> Parse & Preview Questions
//                 </button>
//             )}

//             {/* Parse Results */}
//             {parsed && (
//                 <div className="space-y-6">
//                     {/* Stats Banner */}
//                     <div className="flex items-center gap-6 bg-white/5 rounded-2xl p-6 border border-white/10">
//                         <div className="text-center">
//                             <p className="font-black text-4xl text-[#ff6b00] italic">{parsed.questions.length}</p>
//                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Questions Found</p>
//                         </div>
//                         <div className="w-px h-12 bg-white/10"></div>
//                         <div className="text-center">
//                             <p className={`font-black text-4xl italic ${parsed.errors.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
//                                 {parsed.errors.length}
//                             </p>
//                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Errors</p>
//                         </div>
//                         <div className="flex-1"></div>
//                         {parsed.errors.length > 0 && (
//                             <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
//                                 <p className="text-yellow-400 font-bold text-xs">Valid questions will still be loaded</p>
//                             </div>
//                         )}
//                     </div>

//                     {/* Errors */}
//                     {parsed.errors.length > 0 && (
//                         <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-2">
//                             <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Parse Errors</p>
//                             {parsed.errors.map((err, i) => (
//                                 <div key={i} className="flex items-start gap-2">
//                                     <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
//                                     <p className="text-red-300 text-sm font-mono">{err}</p>
//                                 </div>
//                             ))}
//                         </div>
//                     )}

//                     {/* Question Preview */}
//                     {parsed.questions.length > 0 && (
//                         <div className="space-y-4">
//                             <button
//                                 type="button"
//                                 onClick={() => setPreviewOpen(p => !p)}
//                                 className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors font-black text-sm uppercase tracking-widest"
//                             >
//                                 {previewOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
//                                 {previewOpen ? 'Hide' : 'Show'} Question Preview
//                             </button>

//                             {previewOpen && (
//                                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
//                                     {parsed.questions.map((q, qi) => (
//                                         <div key={qi} className="bg-white/5 border border-white/10 rounded-3xl p-8">
//                                             <div className="flex items-start gap-4 mb-6">
//                                                 <span className="bg-[#ff6b00]/20 text-[#ff6b00] font-black text-lg w-10 h-10 rounded-xl flex items-center justify-center shrink-0 italic">
//                                                     {qi + 1}
//                                                 </span>
//                                                 <p className="font-bold text-white text-lg leading-snug">{q.questionText}</p>
//                                             </div>
//                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                                                 {q.options.map((opt, oi) => (
//                                                     <div key={oi} className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all
//                                                         ${opt === q.correctAnswer
//                                                             ? 'border-green-500/60 bg-green-500/15 ring-2 ring-green-500/30'
//                                                             : kahootColors[oi % kahootColors.length]}`}>
//                                                         <span className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-sm shrink-0
//                                                             ${opt === q.correctAnswer ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}>
//                                                             {String.fromCharCode(65 + oi)}
//                                                         </span>
//                                                         <span className="font-bold text-white text-sm">{opt}</span>
//                                                         {opt === q.correctAnswer && (
//                                                             <CheckCircle size={16} className="text-green-400 ml-auto shrink-0" />
//                                                         )}
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}

//                             <button
//                                 type="button"
//                                 onClick={handleLoadQuestions}
//                                 className="w-full flex items-center justify-center gap-4 bg-[#ff6b00] hover:scale-[1.02] active:scale-95 text-white font-black text-xl italic uppercase tracking-tight p-7 rounded-[2rem] transition-all shadow-2xl shadow-[#ff6b00]/20 border-b-4 border-[#cc5500]"
//                             >
//                                 <CheckCircle size={26} />
//                                 Load {parsed.questions.length} Question{parsed.questions.length !== 1 ? 's' : ''} into Editor
//                             </button>
//                         </div>
//                     )}

//                     {parsed.questions.length === 0 && parsed.errors.length > 0 && (
//                         <div className="text-center py-8">
//                             <p className="text-red-400 font-black text-lg italic uppercase">No valid questions could be extracted.</p>
//                             <p className="text-slate-500 text-sm font-bold mt-2">Fix the errors above and try again.</p>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }

// // ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// export default function CreateQuizText() {
//     const navigate = useNavigate();
//     const location = useLocation();

//     const [activeTab, setActiveTab] = useState('manual');
//     const [title, setTitle] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [duration, setDuration] = useState(10);
//     const [isAssessment, setIsAssessment] = useState(false);
//     const [aikenLoaded, setAikenLoaded] = useState(false);
//     const [questions, setQuestions] = useState(
//         Array(5).fill(null).map(() => ({
//             questionText: '',
//             options: ['', '', '', ''],
//             correctAnswer: '',
//             points: 10
//         }))
//     );

//     useEffect(() => {
//         if (location.state) {
//             if (location.state.questions) setQuestions(location.state.questions);
//             if (location.state.title) setTitle(location.state.title);
//             if (location.state.duration) setDuration(location.state.duration);
//             if (location.state.isAssessment !== undefined) setIsAssessment(location.state.isAssessment);
//         }
//     }, [location.state]);

//     const handleAikenLoad = (parsedQuestions) => {
//         setQuestions(parsedQuestions);
//         setAikenLoaded(true);
//         setActiveTab('manual');
//     };

//     const addQuestion = () => {
//         setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: '', points: 10 }]);
//     };

//     const deleteQuestion = (index) => {
//         if (questions.length <= 1) return;
//         setQuestions(questions.filter((_, i) => i !== index));
//     };

//     const addOption = (qIndex) => {
//         const newQuestions = [...questions];
//         if (newQuestions[qIndex].options.length >= 6) return;
//         newQuestions[qIndex].options.push('');
//         setQuestions(newQuestions);
//     };

//     const deleteOption = (qIndex, oIndex) => {
//         const newQuestions = [...questions];
//         if (newQuestions[qIndex].options.length <= 2) return;
//         const optToDelete = newQuestions[qIndex].options[oIndex];
//         newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
//         if (newQuestions[qIndex].correctAnswer === optToDelete) newQuestions[qIndex].correctAnswer = '';
//         setQuestions(newQuestions);
//     };

//     const updateQuestion = (index, field, value) => {
//         const newQuestions = [...questions];
//         newQuestions[index][field] = value;
//         setQuestions(newQuestions);
//     };

//     const updateOption = (qIndex, oIndex, value) => {
//         const newQuestions = [...questions];
//         const oldVal = newQuestions[qIndex].options[oIndex];
//         newQuestions[qIndex].options[oIndex] = value;
//         if (newQuestions[qIndex].correctAnswer === oldVal && oldVal !== '') newQuestions[qIndex].correctAnswer = value;
//         setQuestions(newQuestions);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (questions.some(q => !q.questionText || !q.correctAnswer || q.options.some(opt => !opt))) {
//             return alert('Please fill in all questions, options, and select correct answers.');
//         }
//         setLoading(true);
//         try {
//             const payload = {
//                 title: title || 'Untitled Quiz',
//                 type: 'manual',
//                 questions,
//                 isLive: !isAssessment,
//                 isActive: true,
//                 isAssessment,
//                 timerPerQuestion: isAssessment ? 0 : 30,
//                 duration: isAssessment ? 0 : duration
//             };
//             const res = await api.post('/quiz/create', payload);
//             if (res.data.isAssessment) navigate('/my-quizzes');
//             else navigate(`/live-room-teacher/${res.data.joinCode}`);
//             alert(isAssessment ? 'Assessment Published!' : 'Live Quiz Created!');
//         } catch (err) {
//             console.error(err);
//             alert(err.response?.data?.msg || 'Failed to save quiz');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const kahootColors = [
//         'border-red-500/50 bg-red-500/10 hover:bg-red-500/20',
//         'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20',
//         'border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20',
//         'border-green-500/50 bg-green-500/10 hover:bg-green-500/20'
//     ];
//     const kahootAccents = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

//     return (
//         <DashboardLayout role="teacher">
//             <div className="max-w-4xl mx-auto pb-20">
//                 <div className="mb-12">
//                     <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
//                         Create <span className="text-[#ff6b00]">New Quiz</span>
//                     </h1>
//                 </div>

//                 {/* Tab Switcher */}
//                 <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 mb-10 w-fit">
//                     <button
//                         type="button"
//                         onClick={() => setActiveTab('manual')}
//                         className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all
//                             ${activeTab === 'manual' ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' : 'text-slate-400 hover:text-white'}`}
//                     >
//                         <Type size={16} />
//                         Manual Entry
//                         {aikenLoaded && activeTab !== 'manual' && <span className="ml-1 w-2 h-2 bg-green-400 rounded-full inline-block"></span>}
//                     </button>
//                     <button
//                         type="button"
//                         onClick={() => setActiveTab('aiken')}
//                         className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all
//                             ${activeTab === 'aiken' ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' : 'text-slate-400 hover:text-white'}`}
//                     >
//                         <Upload size={16} />
//                         Upload AIKEN
//                     </button>
//                 </div>

//                 {/* AIKEN Tab */}
//                 {activeTab === 'aiken' && (
//                     <AikenUploadPanel onQuestionsLoaded={handleAikenLoad} />
//                 )}

//                 {/* Manual Tab */}
//                 {activeTab === 'manual' && (
//                     <>
//                         {aikenLoaded && (
//                             <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-8">
//                                 <CheckCircle size={20} className="text-green-400 shrink-0" />
//                                 <div>
//                                     <p className="text-green-400 font-black text-sm uppercase tracking-wider">AIKEN Questions Loaded!</p>
//                                     <p className="text-green-300/70 text-xs font-bold mt-0.5">
//                                         {questions.length} questions imported — review and edit below, then publish.
//                                     </p>
//                                 </div>
//                                 <button
//                                     type="button"
//                                     onClick={() => setActiveTab('aiken')}
//                                     className="ml-auto text-green-400 hover:text-green-300 font-black text-xs uppercase tracking-widest underline"
//                                 >
//                                     Change file
//                                 </button>
//                             </div>
//                         )}

//                         <form onSubmit={handleSubmit} className="space-y-12">
//                             <div className="space-y-8">
//                                 <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-10 ring-1 ring-white/5 w-full">
//                                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Quiz Title</label>
//                                     <input
//                                         type="text"
//                                         value={title}
//                                         onChange={(e) => setTitle(e.target.value)}
//                                         className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-2xl text-white placeholder:text-slate-700 outline-none"
//                                         placeholder="Enter quiz title..."
//                                         required
//                                     />
//                                 </div>

//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                                     <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-10 ring-1 ring-white/5 h-full">
//                                         <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Quiz Mode</label>
//                                         <label className="flex items-center gap-4 cursor-pointer group/toggle">
//                                             <div className="relative w-16 h-10">
//                                                 <input type="checkbox" className="sr-only peer" checked={isAssessment} onChange={(e) => setIsAssessment(e.target.checked)} />
//                                                 <div className="w-16 h-10 bg-white/10 peer-checked:bg-[#ff6b00] rounded-full transition-all duration-300 ring-1 ring-white/10 shadow-inner"></div>
//                                                 <div className="absolute left-1 top-1 w-8 h-8 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-lg"></div>
//                                             </div>
//                                             <div>
//                                                 <span className="block font-black text-xl text-white tracking-tighter italic uppercase group-hover/toggle:text-[#ff6b00] transition-colors">Assessment Mode</span>
//                                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fixed Link • No Timers</span>
//                                             </div>
//                                         </label>
//                                     </div>

//                                     {!isAssessment ? (
//                                         <div className="bg-[#ff6b00] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-[#ff6b00]/20 min-h-[160px]">
//                                             <div className="relative z-10">
//                                                 <label className="flex items-center gap-2 text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">
//                                                     <Clock size={16} /> Total Time (Mins)
//                                                 </label>
//                                                 <input
//                                                     type="number" min="1" max="180" value={duration}
//                                                     onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
//                                                     className="w-full bg-transparent border-none p-0 font-black text-5xl text-white outline-none focus:ring-0"
//                                                     required
//                                                 />
//                                             </div>
//                                             <Clock className="absolute -right-8 -bottom-8 opacity-10" size={140} />
//                                         </div>
//                                     ) : (
//                                         <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 min-h-[160px]">
//                                             <div className="relative z-10">
//                                                 <label className="flex items-center gap-2 text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">Status</label>
//                                                 <p className="font-black text-4xl text-white italic tracking-tighter uppercase">Asynchronous</p>
//                                                 <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-2">Will be live for all students</p>
//                                             </div>
//                                             <CheckCircle className="absolute -right-8 -bottom-8 opacity-10" size={140} />
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                             <div className="space-y-12">
//                                 {questions.map((q, qIndex) => (
//                                     <div key={qIndex} className="bg-white/5 rounded-[3rem] border border-white/10 p-12 space-y-10 relative group ring-1 ring-white/5 overflow-hidden">
//                                         <div className="absolute top-0 right-0 p-8 flex items-center gap-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
//                                             <button
//                                                 type="button"
//                                                 onClick={() => deleteQuestion(qIndex)}
//                                                 className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-2xl border border-red-500/20 transition-all shadow-lg"
//                                             >
//                                                 <Minus size={20} />
//                                             </button>
//                                         </div>

//                                         <div className="flex flex-col gap-10">
//                                             <div className="flex items-center gap-6">
//                                                 <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center text-slate-700 font-black text-2xl group-hover:bg-[#ff6b00] group-hover:text-white transition-all duration-300 shrink-0 border border-white/10 italic">
//                                                     {qIndex + 1}
//                                                 </div>
//                                                 <div className="flex-1">
//                                                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Question Text</label>
//                                                     <input
//                                                         type="text"
//                                                         value={q.questionText}
//                                                         onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
//                                                         className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-xl text-white placeholder:text-slate-700 outline-none"
//                                                         placeholder="Ask your question here..."
//                                                         required
//                                                     />
//                                                 </div>
//                                             </div>

//                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
//                                                 {q.options.map((opt, oIndex) => (
//                                                     <div key={oIndex} className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all group/opt relative overflow-hidden ${kahootColors[oIndex % 4]} ${q.correctAnswer === opt && opt !== '' ? 'ring-4 ring-green-500/50 scale-[1.02]' : ''}`}>
//                                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black ${kahootAccents[oIndex % 4]} shrink-0 shadow-lg`}>
//                                                             {String.fromCharCode(65 + oIndex)}
//                                                         </div>
//                                                         <input
//                                                             type="text"
//                                                             value={opt}
//                                                             onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
//                                                             className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-white placeholder:text-white/20 py-3 text-lg"
//                                                             placeholder={`Option ${oIndex + 1}`}
//                                                             required
//                                                         />
//                                                         <div className="flex items-center gap-2">
//                                                             <input
//                                                                 type="radio"
//                                                                 name={`correct-${qIndex}`}
//                                                                 checked={q.correctAnswer === opt && opt !== ''}
//                                                                 onChange={() => updateQuestion(qIndex, 'correctAnswer', opt)}
//                                                                 className="w-8 h-8 text-green-500 bg-white/10 border-white/20 focus:ring-green-500 cursor-pointer"
//                                                                 required
//                                                             />
//                                                             {q.options.length > 2 && (
//                                                                 <button type="button" onClick={() => deleteOption(qIndex, oIndex)} className="p-2 text-white/30 hover:text-red-500 transition-colors">
//                                                                     <Minus size={16} />
//                                                                 </button>
//                                                             )}
//                                                         </div>
//                                                     </div>
//                                                 ))}

//                                                 {q.options.length < 6 && (
//                                                     <button
//                                                         type="button"
//                                                         onClick={() => addOption(qIndex)}
//                                                         className="flex items-center justify-center gap-2 p-6 rounded-3xl border-2 border-dashed border-white/10 text-slate-500 hover:border-[#ff6b00]/50 hover:text-[#ff6b00] transition-all group/addopt"
//                                                     >
//                                                         <Plus size={20} className="group-hover/addopt:scale-125 transition-transform" />
//                                                         <span className="font-black text-sm uppercase tracking-widest">Add Option</span>
//                                                     </button>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 ))}

//                                 <button
//                                     type="button"
//                                     onClick={addQuestion}
//                                     className="w-full flex items-center justify-center gap-4 p-10 rounded-[3rem] border-4 border-dashed border-white/10 text-slate-500 hover:border-[#ff6b00]/50 hover:text-[#ff6b00] transition-all group/addq bg-white/2"
//                                 >
//                                     <Plus size={32} className="group-hover/addq:scale-125 transition-transform" />
//                                     <span className="font-black text-2xl uppercase tracking-widest italic">Add New Question</span>
//                                 </button>
//                             </div>

//                             <div className="flex justify-center pt-12 border-t border-white/5">
//                                 <button
//                                     type="submit"
//                                     disabled={loading}
//                                     className="group flex items-center gap-6 bg-[#ff6b00] text-white px-20 py-8 rounded-[2.5rem] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-[#ff6b00]/20 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-8 border-[#cc5500]"
//                                 >
//                                     {loading ? <Loader2 className="animate-spin" size={32} /> : <CheckCircle size={32} />}
//                                     {loading ? 'PUBLISHING...' : (isAssessment ? 'PUBLISH ASSESSMENT' : 'CREATE LIVE QUIZ')}
//                                 </button>
//                             </div>
//                         </form>
//                     </>
//                 )}
//             </div>
//         </DashboardLayout>
//     );
// }

// import { useState, useEffect } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import api from '../utils/api';
// import DashboardLayout from '../components/DashboardLayout';
// import { Type, Loader2, Plus, Minus, CheckCircle, Clock, Radio } from 'lucide-react';

// export default function CreateQuizText() {
//     const navigate = useNavigate();
//     const location = useLocation();

//     const [title, setTitle] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [duration, setDuration] = useState(10); // Default 10 minutes
//     const [isAssessment, setIsAssessment] = useState(false);
//     const [questions, setQuestions] = useState(
//         Array(5).fill(null).map(() => ({
//             questionText: '',
//             options: ['', '', '', ''],
//             correctAnswer: '',
//             points: 10
//         }))
//     );

//     useEffect(() => {
//         if (location.state) {
//             if (location.state.questions) setQuestions(location.state.questions);
//             if (location.state.title) setTitle(location.state.title);
//             if (location.state.duration) setDuration(location.state.duration);
//             if (location.state.isAssessment !== undefined) setIsAssessment(location.state.isAssessment);
//         }
//     }, [location.state]);

//     const addQuestion = () => {
//         setQuestions([...questions, {
//             questionText: '',
//             options: ['', '', '', ''],
//             correctAnswer: '',
//             points: 10
//         }]);
//     };

//     const deleteQuestion = (index) => {
//         if (questions.length <= 1) return;
//         setQuestions(questions.filter((_, i) => i !== index));
//     };

//     const addOption = (qIndex) => {
//         const newQuestions = [...questions];
//         if (newQuestions[qIndex].options.length >= 6) return;
//         newQuestions[qIndex].options.push('');
//         setQuestions(newQuestions);
//     };

//     const deleteOption = (qIndex, oIndex) => {
//         const newQuestions = [...questions];
//         if (newQuestions[qIndex].options.length <= 2) return;
//         const optToDelete = newQuestions[qIndex].options[oIndex];
//         newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
//         if (newQuestions[qIndex].correctAnswer === optToDelete) {
//             newQuestions[qIndex].correctAnswer = '';
//         }
//         setQuestions(newQuestions);
//     };

//     const updateQuestion = (index, field, value) => {
//         const newQuestions = [...questions];
//         newQuestions[index][field] = value;
//         setQuestions(newQuestions);
//     };

//     const updateOption = (qIndex, oIndex, value) => {
//         const newQuestions = [...questions];
//         const oldVal = newQuestions[qIndex].options[oIndex];
//         newQuestions[qIndex].options[oIndex] = value;
//         if (newQuestions[qIndex].correctAnswer === oldVal && oldVal !== '') {
//             newQuestions[qIndex].correctAnswer = value;
//         }
//         setQuestions(newQuestions);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         if (questions.some(q => !q.questionText || !q.correctAnswer || q.options.some(opt => !opt))) {
//             return alert('Please fill in all questions, options, and select correct answers.');
//         }

//         setLoading(true);
//         try {
//             const payload = {
//                 title: title || 'Untitled Quiz',
//                 type: 'manual',
//                 questions,
//                 isLive: !isAssessment,
//                 isActive: true, // Always active so join code is searchable
//                 isAssessment,
//                 timerPerQuestion: isAssessment ? 0 : 30, // Default 30s for live, 0 for assessment
//                 duration: isAssessment ? 0 : duration // Disable global timer for assessment if live timers are disabled? Or maybe keep it? User said "timer should be disabled because it is not live quiz"
//             };

//             // Re-read user: "automatically the timer should be disabled because it is not live quiz"
//             // This probably means both per-question and global duration.
//             if (isAssessment) {
//                 payload.duration = 0;
//                 payload.timerPerQuestion = 0;
//             }

//             const res = await api.post('/quiz/create', payload);

//             if (res.data.isAssessment) {
//                 navigate('/my-quizzes');
//             } else {
//                 navigate(`/live-room-teacher/${res.data.joinCode}`);
//             }
//             alert(isAssessment ? 'Assessment Published!' : 'Live Quiz Created!');
//         } catch (err) {
//             console.error(err);
//             alert(err.response?.data?.msg || 'Failed to save quiz');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const kahootColors = [
//         'border-red-500/50 bg-red-500/10 hover:bg-red-500/20',
//         'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20',
//         'border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20',
//         'border-green-500/50 bg-green-500/10 hover:bg-green-500/20'
//     ];

//     const kahootAccents = [
//         'bg-red-500',
//         'bg-blue-500',
//         'bg-yellow-500',
//         'bg-green-500'
//     ];

//     return (
//         <DashboardLayout role="teacher">
//             <div className="max-w-4xl mx-auto pb-20">
//                 <div className="mb-12 flex items-center justify-between">
//                     <div>
//                         <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
//                             Create <span className="text-[#ff6b00]">New Quiz</span>
//                         </h1>
//                     </div>
//                 </div>

//                 <form onSubmit={handleSubmit} className="space-y-12">
//                     {/* Basic Info */}
//                     <div className="space-y-8">
//                         {/* Title Row - Full Width */}
//                         <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-10 ring-1 ring-white/5 w-full">
//                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Quiz Title</label>
//                             <input
//                                 type="text"
//                                 value={title}
//                                 onChange={(e) => setTitle(e.target.value)}
//                                 className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-2xl text-white placeholder:text-slate-700 outline-none"
//                                 placeholder="Enter quiz title..."
//                                 required
//                             />
//                         </div>

//                         {/* Mode and Timer Row */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                             {/* Assessment Toggle */}
//                             <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-10 ring-1 ring-white/5 h-full">
//                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Quiz Mode</label>
//                                 <label className="flex items-center gap-4 cursor-pointer group/toggle">
//                                     <div className="relative w-16 h-10">
//                                         <input
//                                             type="checkbox"
//                                             className="sr-only peer"
//                                             checked={isAssessment}
//                                             onChange={(e) => setIsAssessment(e.target.checked)}
//                                         />
//                                         <div className="w-16 h-10 bg-white/10 peer-checked:bg-[#ff6b00] rounded-full transition-all duration-300 ring-1 ring-white/10 shadow-inner"></div>
//                                         <div className="absolute left-1 top-1 w-8 h-8 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-lg"></div>
//                                     </div>
//                                     <div>
//                                         <span className="block font-black text-xl text-white tracking-tighter italic uppercase group-hover/toggle:text-[#ff6b00] transition-colors">Assessment Mode</span>
//                                         <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fixed Link • No Timers</span>
//                                     </div>
//                                 </label>
//                             </div>

//                             {!isAssessment ? (
//                                 <div className="bg-[#ff6b00] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-[#ff6b00]/20 min-h-[160px]">
//                                     <div className="relative z-10">
//                                         <label className="flex items-center gap-2 text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">
//                                             <Clock size={16} /> Total Time (Mins)
//                                         </label>
//                                         <input
//                                             type="number"
//                                             min="1"
//                                             max="180"
//                                             value={duration}
//                                             onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
//                                             className="w-full bg-transparent border-none p-0 font-black text-5xl text-white outline-none focus:ring-0"
//                                             required
//                                         />
//                                     </div>
//                                     <Clock className="absolute -right-8 -bottom-8 opacity-10" size={140} />
//                                 </div>
//                             ) : (
//                                 <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 min-h-[160px]">
//                                     <div className="relative z-10">
//                                         <label className="flex items-center gap-2 text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">
//                                             Status
//                                         </label>
//                                         <p className="font-black text-4xl text-white italic tracking-tighter uppercase">Asynchronous</p>
//                                         <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-2">Will be live for all students</p>
//                                     </div>
//                                     <CheckCircle className="absolute -right-8 -bottom-8 opacity-10" size={140} />
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Questions Section */}
//                     <div className="space-y-12">
//                         {questions.map((q, qIndex) => (
//                             <div key={qIndex} className="bg-white/5 rounded-[3rem] border border-white/10 p-12 space-y-10 relative group ring-1 ring-white/5 overflow-hidden">
//                                 <div className="absolute top-0 right-0 p-8 flex items-center gap-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
//                                     <button
//                                         type="button"
//                                         onClick={() => deleteQuestion(qIndex)}
//                                         className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-2xl border border-red-500/20 transition-all shadow-lg"
//                                         title="Delete Question"
//                                     >
//                                         <Minus size={20} />
//                                     </button>
//                                 </div>

//                                 <div className="flex flex-col gap-10">
//                                     <div className="flex items-center gap-6">
//                                         <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center text-slate-700 font-black text-2xl group-hover:bg-[#ff6b00] group-hover:text-white transition-all duration-300 shrink-0 border border-white/10 italic">
//                                             {qIndex + 1}
//                                         </div>
//                                         <div className="flex-1">
//                                             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Question Text</label>
//                                             <input
//                                                 type="text"
//                                                 value={q.questionText}
//                                                 onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
//                                                 className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-xl text-white placeholder:text-slate-700 outline-none"
//                                                 placeholder="Ask your question here..."
//                                                 required
//                                             />
//                                         </div>
//                                     </div>

//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
//                                         {q.options.map((opt, oIndex) => (
//                                             <div key={oIndex} className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all group/opt relative overflow-hidden ${kahootColors[oIndex % 4]} ${q.correctAnswer === opt && opt !== '' ? 'ring-4 ring-green-500/50 scale-[1.02]' : ''}`}>
//                                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black ${kahootAccents[oIndex % 4]} shrink-0 shadow-lg`}>
//                                                     {String.fromCharCode(65 + oIndex)}
//                                                 </div>
//                                                 <input
//                                                     type="text"
//                                                     value={opt}
//                                                     onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
//                                                     className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-white placeholder:text-white/20 py-3 text-lg"
//                                                     placeholder={`Option ${oIndex + 1}`}
//                                                     required
//                                                 />
//                                                 <div className="flex items-center gap-2">
//                                                     <input
//                                                         type="radio"
//                                                         name={`correct-${qIndex}`}
//                                                         checked={q.correctAnswer === opt && opt !== ''}
//                                                         onChange={() => updateQuestion(qIndex, 'correctAnswer', opt)}
//                                                         className="w-8 h-8 text-green-500 bg-white/10 border-white/20 focus:ring-green-500 cursor-pointer"
//                                                         required
//                                                     />
//                                                     {q.options.length > 2 && (
//                                                         <button
//                                                             type="button"
//                                                             onClick={() => deleteOption(qIndex, oIndex)}
//                                                             className="p-2 text-white/30 hover:text-red-500 transition-colors"
//                                                         >
//                                                             <Minus size={16} />
//                                                         </button>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         ))}

//                                         {q.options.length < 6 && (
//                                             <button
//                                                 type="button"
//                                                 onClick={() => addOption(qIndex)}
//                                                 className="flex items-center justify-center gap-2 p-6 rounded-3xl border-2 border-dashed border-white/10 text-slate-500 hover:border-[#ff6b00]/50 hover:text-[#ff6b00] transition-all group/addopt"
//                                             >
//                                                 <Plus size={20} className="group-hover/addopt:scale-125 transition-transform" />
//                                                 <span className="font-black text-sm uppercase tracking-widest">Add Option</span>
//                                             </button>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}

//                         <button
//                             type="button"
//                             onClick={addQuestion}
//                             className="w-full flex items-center justify-center gap-4 p-10 rounded-[3rem] border-4 border-dashed border-white/10 text-slate-500 hover:border-[#ff6b00]/50 hover:text-[#ff6b00] transition-all group/addq bg-white/2"
//                         >
//                             <Plus size={32} className="group-hover/addq:scale-125 transition-transform" />
//                             <span className="font-black text-2xl uppercase tracking-widest italic">Add New Question</span>
//                         </button>
//                     </div>

//                     {/* Submit */}
//                     <div className="flex justify-center pt-12 border-t border-white/5">
//                         <button
//                             type="submit"
//                             disabled={loading}
//                             className="group flex items-center gap-6 bg-[#ff6b00] text-white px-20 py-8 rounded-[2.5rem] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-[#ff6b00]/20 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-8 border-[#cc5500]"
//                         >
//                             {loading ? <Loader2 className="animate-spin" size={32} /> : <CheckCircle size={32} />}
//                             {loading ? 'PUBLISHING...' : (isAssessment ? 'PUBLISH ASSESSMENT' : 'CREATE LIVE QUIZ')}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </DashboardLayout>
//     );
// }


import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { Type, Loader2, Plus, Minus, CheckCircle, Clock, Upload, FileText, AlertCircle, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// ─── AIKEN PARSER ────────────────────────────────────────────────────────────
// Robust state-machine parser: works whether questions are separated by
// blank lines OR just a single newline (both are common in real AIKEN files).
// Strategy: ANSWER line is the hard end-of-question marker. After seeing it,
// the very next non-blank, non-option, non-answer line begins a new question.
function parseAiken(text) {
    const errors = [];
    const questions = [];

    const isOption = line => /^[A-Z]\.\s+.+$/.test(line);
    const isAnswer = line => /^ANSWER\s*:\s*[A-Z]$/i.test(line);

    const rawLines = text.split('\n').map(l => l.trim());

    // Build chunks: each chunk is the lines for one question.
    // We flush a new chunk whenever we see an ANSWER line and then hit the
    // start of what looks like the next question (non-blank, non-option, non-answer).
    const chunks = [];
    let current = [];
    let sawAnswer = false;

    for (const line of rawLines) {
        if (line === '') continue; // skip blank lines entirely

        if (sawAnswer && !isOption(line) && !isAnswer(line)) {
            // Previous question ended; this line starts the next one
            if (current.length > 0) {
                chunks.push(current);
                current = [];
            }
            sawAnswer = false;
        }

        current.push(line);

        if (isAnswer(line)) {
            sawAnswer = true;
        }
    }
    if (current.length > 0) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
        const lines = chunks[i];
        const qNum = i + 1;

        if (lines.length < 3) {
            errors.push(`Question ${qNum}: Too few lines to be valid.`);
            continue;
        }

        const questionText = lines[0];
        const options = [];
        let correctAnswer = '';

        for (let j = 1; j < lines.length; j++) {
            const optMatch = lines[j].match(/^([A-Z])\.\s+(.+)$/);
            const ansMatch = lines[j].match(/^ANSWER\s*:\s*([A-Z])$/i);

            if (optMatch) {
                options.push({ letter: optMatch[1], text: optMatch[2] });
            } else if (ansMatch) {
                correctAnswer = ansMatch[1].toUpperCase();
            } else {
                errors.push(`Question ${qNum}: Unrecognized line → "${lines[j]}"`);
            }
        }

        if (options.length < 2) {
            errors.push(`Question ${qNum}: Needs at least 2 options.`);
            continue;
        }
        if (!correctAnswer) {
            errors.push(`Question ${qNum}: Missing ANSWER line.`);
            continue;
        }
        const correctOpt = options.find(o => o.letter === correctAnswer);
        if (!correctOpt) {
            errors.push(`Question ${qNum}: ANSWER "${correctAnswer}" does not match any option letter.`);
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

// ─── AIKEN UPLOAD PANEL ──────────────────────────────────────────────────────
function AikenUploadPanel({ onQuestionsLoaded }) {
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState('');
    const [rawText, setRawText] = useState('');
    const [parsed, setParsed] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [fileError, setFileError] = useState('');
    const fileInputRef = useRef();

    const kahootColors = [
        'border-red-500/40 bg-red-500/10',
        'border-blue-500/40 bg-blue-500/10',
        'border-yellow-500/40 bg-yellow-500/10',
        'border-green-500/40 bg-green-500/10',
        'border-purple-500/40 bg-purple-500/10',
        'border-pink-500/40 bg-pink-500/10',
    ];

    const handleFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(txt|aiken)$/i)) {
            setFileError('Please upload a .txt or .aiken file.');
            return;
        }
        setFileName(file.name);
        setFileError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            setRawText(text);
            const result = parseAiken(text);
            setParsed(result);
            setPreviewOpen(true);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleTextChange = (e) => {
        setRawText(e.target.value);
        setParsed(null);
    };

    const handleParseText = () => {
        if (!rawText.trim()) return;
        const result = parseAiken(rawText);
        setParsed(result);
        setPreviewOpen(true);
    };

    const handleClear = () => {
        setRawText('');
        setParsed(null);
        setFileName('');
        setPreviewOpen(false);
        setFileError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleLoadQuestions = () => {
        if (!parsed || parsed.questions.length === 0) return;
        onQuestionsLoaded(parsed.questions);
    };

    return (
        <div className="space-y-8">
            {/* Format Guide */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-4">
                    <FileText size={20} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AIKEN Format Guide</span>
                </div>
                <pre className="text-slate-300 text-sm font-mono leading-loose whitespace-pre-wrap">{`What is the capital of France?\nA. Berlin\nB. Paris\nC. Madrid\nD. Rome\nANSWER: B\n\nWhich planet is closest to the Sun?\nA. Venus\nB. Earth\nC. Mercury\nD. Mars\nANSWER: C`}</pre>
                <p className="text-slate-500 text-xs font-bold mt-4 uppercase tracking-wider">
                    • One question per block • Separate blocks with a blank line • ANSWER: uses the option letter
                </p>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-4 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all duration-300
                    ${dragOver ? 'border-[#ff6b00] bg-[#ff6b00]/10 scale-[1.01]' : 'border-white/10 bg-white/2 hover:border-[#ff6b00]/40 hover:bg-white/5'}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.aiken"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                />
                <Upload size={48} className={`mx-auto mb-4 transition-colors ${dragOver ? 'text-[#ff6b00]' : 'text-slate-600'}`} />
                {fileName ? (
                    <div>
                        <p className="font-black text-xl text-[#ff6b00] italic uppercase">{fileName}</p>
                        <p className="text-slate-500 text-sm font-bold mt-1">Click to change file</p>
                    </div>
                ) : (
                    <div>
                        <p className="font-black text-2xl text-white italic uppercase tracking-tight">Drop your AIKEN file here</p>
                        <p className="text-slate-500 font-bold mt-2">or click to browse — .txt or .aiken files</p>
                    </div>
                )}
            </div>

            {fileError && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                    <p className="text-red-400 font-bold text-sm">{fileError}</p>
                </div>
            )}

            {/* OR Divider */}
            <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-slate-600 font-black text-xs uppercase tracking-widest">Or paste directly</span>
                <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Paste Area */}
            <div className="relative">
                <textarea
                    value={rawText}
                    onChange={handleTextChange}
                    rows={10}
                    className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/8 focus:border-[#ff6b00] transition-all font-mono text-sm text-slate-300 placeholder:text-slate-700 outline-none resize-none"
                    placeholder={"What is the capital of France?\nA. Berlin\nB. Paris\nC. Madrid\nD. Rome\nANSWER: B\n\nNext question here..."}
                />
                {rawText && (
                    <button type="button" onClick={handleClear} className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Parse Button */}
            {rawText && !parsed && (
                <button
                    type="button"
                    onClick={handleParseText}
                    className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-lg italic uppercase tracking-tight p-6 rounded-2xl transition-all"
                >
                    <Eye size={22} /> Parse & Preview Questions
                </button>
            )}

            {/* Parse Results */}
            {parsed && (
                <div className="space-y-6">
                    {/* Stats Banner */}
                    <div className="flex items-center gap-6 bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="text-center">
                            <p className="font-black text-4xl text-[#ff6b00] italic">{parsed.questions.length}</p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Questions Found</p>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="text-center">
                            <p className={`font-black text-4xl italic ${parsed.errors.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {parsed.errors.length}
                            </p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Errors</p>
                        </div>
                        <div className="flex-1"></div>
                        {parsed.errors.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                <p className="text-yellow-400 font-bold text-xs">Valid questions will still be loaded</p>
                            </div>
                        )}
                    </div>

                    {/* Errors */}
                    {parsed.errors.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-2">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Parse Errors</p>
                            {parsed.errors.map((err, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-red-300 text-sm font-mono">{err}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Question Preview */}
                    {parsed.questions.length > 0 && (
                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(p => !p)}
                                className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors font-black text-sm uppercase tracking-widest"
                            >
                                {previewOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                {previewOpen ? 'Hide' : 'Show'} Question Preview
                            </button>

                            {previewOpen && (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {parsed.questions.map((q, qi) => (
                                        <div key={qi} className="bg-white/5 border border-white/10 rounded-3xl p-8">
                                            <div className="flex items-start gap-4 mb-6">
                                                <span className="bg-[#ff6b00]/20 text-[#ff6b00] font-black text-lg w-10 h-10 rounded-xl flex items-center justify-center shrink-0 italic">
                                                    {qi + 1}
                                                </span>
                                                <p className="font-bold text-white text-lg leading-snug">{q.questionText}</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt, oi) => (
                                                    <div key={oi} className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all
                                                        ${opt === q.correctAnswer
                                                            ? 'border-green-500/60 bg-green-500/15 ring-2 ring-green-500/30'
                                                            : kahootColors[oi % kahootColors.length]}`}>
                                                        <span className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-sm shrink-0
                                                            ${opt === q.correctAnswer ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}>
                                                            {String.fromCharCode(65 + oi)}
                                                        </span>
                                                        <span className="font-bold text-white text-sm">{opt}</span>
                                                        {opt === q.correctAnswer && (
                                                            <CheckCircle size={16} className="text-green-400 ml-auto shrink-0" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleLoadQuestions}
                                className="w-full flex items-center justify-center gap-4 bg-[#ff6b00] hover:scale-[1.02] active:scale-95 text-white font-black text-xl italic uppercase tracking-tight p-7 rounded-[2rem] transition-all shadow-2xl shadow-[#ff6b00]/20 border-b-4 border-[#cc5500]"
                            >
                                <CheckCircle size={26} />
                                Load {parsed.questions.length} Question{parsed.questions.length !== 1 ? 's' : ''} into Editor
                            </button>
                        </div>
                    )}

                    {parsed.questions.length === 0 && parsed.errors.length > 0 && (
                        <div className="text-center py-8">
                            <p className="text-red-400 font-black text-lg italic uppercase">No valid questions could be extracted.</p>
                            <p className="text-slate-500 text-sm font-bold mt-2">Fix the errors above and try again.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CreateQuizText() {
    const navigate = useNavigate();
    const location = useLocation();
    const isGeneratedSource = location.state?.source === 'generated';

    const [activeTab, setActiveTab] = useState('manual');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [duration, setDuration] = useState(10);
    const [isAssessment, setIsAssessment] = useState(false);
    const [aikenLoaded, setAikenLoaded] = useState(false);
    const [questions, setQuestions] = useState(
        Array(5).fill(null).map(() => ({
            questionText: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            points: 10
        }))
    );

    useEffect(() => {
        if (location.state) {
            if (location.state.questions) setQuestions(location.state.questions);
            if (location.state.title) setTitle(location.state.title);
            if (location.state.duration) setDuration(location.state.duration);
            if (location.state.isAssessment !== undefined) setIsAssessment(location.state.isAssessment);
        }
    }, [location.state]);

    const handleAikenLoad = (parsedQuestions) => {
        setQuestions(parsedQuestions);
        setAikenLoaded(true);
        setActiveTab('manual');
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: '', points: 10 }]);
    };

    const deleteQuestion = (index) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const addOption = (qIndex) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options.length >= 6) return;
        newQuestions[qIndex].options.push('');
        setQuestions(newQuestions);
    };

    const deleteOption = (qIndex, oIndex) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options.length <= 2) return;
        const optToDelete = newQuestions[qIndex].options[oIndex];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        if (newQuestions[qIndex].correctAnswer === optToDelete) newQuestions[qIndex].correctAnswer = '';
        setQuestions(newQuestions);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        const oldVal = newQuestions[qIndex].options[oIndex];
        newQuestions[qIndex].options[oIndex] = value;
        if (newQuestions[qIndex].correctAnswer === oldVal && oldVal !== '') newQuestions[qIndex].correctAnswer = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (questions.some(q => !q.questionText || !q.correctAnswer || q.options.some(opt => !opt))) {
            return alert('Please fill in all questions, options, and select correct answers.');
        }
        setLoading(true);
        try {
            const payload = {
                title: title || 'Untitled Quiz',
                type: 'manual',
                questions,
                isLive: !isAssessment,
                isActive: true,
                isAssessment,
                timerPerQuestion: isAssessment ? 0 : 30,
                duration: isAssessment ? 0 : duration
            };
            const res = await api.post('/quiz/create', payload);
            if (res.data.isAssessment) navigate('/my-quizzes');
            else navigate(`/live-room-teacher/${res.data.joinCode}`);
            alert(isAssessment ? 'Assessment Published!' : 'Live Quiz Created!');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || 'Failed to save quiz');
        } finally {
            setLoading(false);
        }
    };

    const kahootColors = [
        'border-red-500/50 bg-red-500/10 hover:bg-red-500/20',
        'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20',
        'border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20',
        'border-green-500/50 bg-green-500/10 hover:bg-green-500/20'
    ];
    const kahootAccents = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

    return (
        <DashboardLayout role="teacher">
            <div className="max-w-4xl mx-auto pb-20">
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
                        Create <span className="text-[#ff6b00]">New Quiz</span>
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 mb-10 w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all
                            ${activeTab === 'manual' ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Type size={16} />
                        Manual Entry
                        {aikenLoaded && activeTab !== 'manual' && <span className="ml-1 w-2 h-2 bg-green-400 rounded-full inline-block"></span>}
                    </button>
                    {!isGeneratedSource && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('aiken')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all
                            ${activeTab === 'aiken' ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Upload size={16} />
                        Upload AIKEN
                    </button>
                    )}
                </div>

                {/* AIKEN Tab */}
                {activeTab === 'aiken' && (
                    <AikenUploadPanel onQuestionsLoaded={handleAikenLoad} />
                )}

                {/* Manual Tab */}
                {activeTab === 'manual' && (
                    <>
                        {aikenLoaded && (
                            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-8">
                                <CheckCircle size={20} className="text-green-400 shrink-0" />
                                <div>
                                    <p className="text-green-400 font-black text-sm uppercase tracking-wider">AIKEN Questions Loaded!</p>
                                    <p className="text-green-300/70 text-xs font-bold mt-0.5">
                                        {questions.length} questions imported — review and edit below, then publish.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('aiken')}
                                    className="ml-auto text-green-400 hover:text-green-300 font-black text-xs uppercase tracking-widest underline"
                                >
                                    Change file
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-12">
                            <div className="space-y-8">
                                <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-10 ring-1 ring-white/5 w-full">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Quiz Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-2xl text-white placeholder:text-slate-700 outline-none"
                                        placeholder="Enter quiz title..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-10 ring-1 ring-white/5 h-full">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Quiz Mode</label>
                                        <label className="flex items-center gap-4 cursor-pointer group/toggle">
                                            <div className="relative w-16 h-10">
                                                <input type="checkbox" className="sr-only peer" checked={isAssessment} onChange={(e) => setIsAssessment(e.target.checked)} />
                                                <div className="w-16 h-10 bg-white/10 peer-checked:bg-[#ff6b00] rounded-full transition-all duration-300 ring-1 ring-white/10 shadow-inner"></div>
                                                <div className="absolute left-1 top-1 w-8 h-8 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-6 shadow-lg"></div>
                                            </div>
                                            <div>
                                                <span className="block font-black text-xl text-white tracking-tighter italic uppercase group-hover/toggle:text-[#ff6b00] transition-colors">Assessment Mode</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fixed Link • No Timers</span>
                                            </div>
                                        </label>
                                    </div>

                                    {!isAssessment ? (
                                        <div className="bg-[#ff6b00] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-[#ff6b00]/20 min-h-[160px]">
                                            <div className="relative z-10">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">
                                                    <Clock size={16} /> Total Time (Mins)
                                                </label>
                                                <input
                                                    type="number" min="1" max="180" value={duration}
                                                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-transparent border-none p-0 font-black text-5xl text-white outline-none focus:ring-0"
                                                    required
                                                />
                                            </div>
                                            <Clock className="absolute -right-8 -bottom-8 opacity-10" size={140} />
                                        </div>
                                    ) : (
                                        <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20 min-h-[160px]">
                                            <div className="relative z-10">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">Status</label>
                                                <p className="font-black text-4xl text-white italic tracking-tighter uppercase">Asynchronous</p>
                                                <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-2">Will be live for all students</p>
                                            </div>
                                            <CheckCircle className="absolute -right-8 -bottom-8 opacity-10" size={140} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-12">
                                {questions.map((q, qIndex) => (
                                    <div key={qIndex} className="bg-white/5 rounded-[3rem] border border-white/10 p-12 space-y-10 relative group ring-1 ring-white/5 overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 flex items-center gap-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                            <button
                                                type="button"
                                                onClick={() => deleteQuestion(qIndex)}
                                                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-2xl border border-red-500/20 transition-all shadow-lg"
                                            >
                                                <Minus size={20} />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-10">
                                            <div className="flex items-center gap-6">
                                                <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center text-slate-700 font-black text-2xl group-hover:bg-[#ff6b00] group-hover:text-white transition-all duration-300 shrink-0 border border-white/10 italic">
                                                    {qIndex + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Question Text</label>
                                                    <input
                                                        type="text"
                                                        value={q.questionText}
                                                        onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                                                        className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-xl text-white placeholder:text-slate-700 outline-none"
                                                        placeholder="Ask your question here..."
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all group/opt relative overflow-hidden ${kahootColors[oIndex % 4]} ${q.correctAnswer === opt && opt !== '' ? 'ring-4 ring-green-500/50 scale-[1.02]' : ''}`}>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black ${kahootAccents[oIndex % 4]} shrink-0 shadow-lg`}>
                                                            {String.fromCharCode(65 + oIndex)}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                            className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-white placeholder:text-white/20 py-3 text-lg"
                                                            placeholder={`Option ${oIndex + 1}`}
                                                            required
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name={`correct-${qIndex}`}
                                                                checked={q.correctAnswer === opt && opt !== ''}
                                                                onChange={() => updateQuestion(qIndex, 'correctAnswer', opt)}
                                                                className="w-8 h-8 text-green-500 bg-white/10 border-white/20 focus:ring-green-500 cursor-pointer"
                                                                required
                                                            />
                                                            {q.options.length > 2 && (
                                                                <button type="button" onClick={() => deleteOption(qIndex, oIndex)} className="p-2 text-white/30 hover:text-red-500 transition-colors">
                                                                    <Minus size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {q.options.length < 6 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => addOption(qIndex)}
                                                        className="flex items-center justify-center gap-2 p-6 rounded-3xl border-2 border-dashed border-white/10 text-slate-500 hover:border-[#ff6b00]/50 hover:text-[#ff6b00] transition-all group/addopt"
                                                    >
                                                        <Plus size={20} className="group-hover/addopt:scale-125 transition-transform" />
                                                        <span className="font-black text-sm uppercase tracking-widest">Add Option</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    className="w-full flex items-center justify-center gap-4 p-10 rounded-[3rem] border-4 border-dashed border-white/10 text-slate-500 hover:border-[#ff6b00]/50 hover:text-[#ff6b00] transition-all group/addq bg-white/2"
                                >
                                    <Plus size={32} className="group-hover/addq:scale-125 transition-transform" />
                                    <span className="font-black text-2xl uppercase tracking-widest italic">Add New Question</span>
                                </button>
                            </div>

                            <div className="flex justify-center pt-12 border-t border-white/5">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group flex items-center gap-6 bg-[#ff6b00] text-white px-20 py-8 rounded-[2.5rem] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-[#ff6b00]/20 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-8 border-[#cc5500]"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={32} /> : <CheckCircle size={32} />}
                                    {loading ? 'PUBLISHING...' : (isAssessment ? 'PUBLISH ASSESSMENT' : 'CREATE LIVE QUIZ')}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
