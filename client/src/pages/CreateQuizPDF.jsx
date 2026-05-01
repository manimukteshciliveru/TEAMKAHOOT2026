// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../utils/api';
// import DashboardLayout from '../components/DashboardLayout';
// import { FileText, Upload, Loader2, CheckCircle, FilePlus, Hash, Activity } from 'lucide-react';

// export default function CreateQuizPDF() {
//     const [file, setFile] = useState(null);
//     const [questionCount, setQuestionCount] = useState(5);
//     const [difficulty, setDifficulty] = useState('Medium');
//     const [loading, setLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleFileChange = (e) => {
//         setFile(e.target.files[0]);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (!file) return;

//         setLoading(true);
//         try {
//             const formData = new FormData();
//             formData.append('file', file);
//             formData.append('type', 'file');
//             formData.append('questionCount', questionCount.toString());
//             formData.append('difficulty', difficulty);

//             const res = await api.post('/quiz/generate', formData, {
//                 headers: { 'Content-Type': 'multipart/form-data' }
//             });

//             navigate('/create-quiz/text', {
//                 state: {
//                     questions: res.data.questions,
//                     title: res.data.title || file.name.replace('.pdf', ''),
//                     duration: res.data.duration || 10
//                 }
//             });
//         } catch (err) {
//             console.error(err);
//             alert('Failed to generate quiz');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <DashboardLayout role="teacher">
//             <div className="max-w-4xl mx-auto pb-20 relative">
//                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff6b00]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>

//                 <div className="mb-12 flex items-center justify-between">
//                     <div>
//                         <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
//                             AI <span className="text-[#ff6b00]">Document Parser</span>
//                         </h1>
//                         <p className="text-slate-400 mt-2 font-bold uppercase tracking-wider text-sm italic">Analyze Slides, Word docs, or Photos to generate questions</p>
//                     </div>
//                 </div>

//                 <form onSubmit={handleSubmit} className="space-y-12">
//                     <div className="bg-white/5 rounded-[3rem] border border-white/10 p-12 ring-1 ring-white/5 relative overflow-hidden group">
//                         <div className="relative z-10 space-y-10">
//                             <div className="space-y-6">
//                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Document</label>
//                                 <div className="relative border-4 border-dashed border-white/10 rounded-[2.5rem] hover:border-[#ff6b00]/50 transition-all bg-white/5 group/upload">
//                                     <input
//                                         type="file"
//                                         accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
//                                         onChange={handleFileChange}
//                                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
//                                         required
//                                     />
//                                     <div className="p-16 flex flex-col items-center gap-6">
//                                         {file ? (
//                                             <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
//                                                 <div className="bg-[#ff6b00] p-6 rounded-[1.5rem] text-white shadow-[0_10px_40px_rgba(255,107,0,0.3)]">
//                                                     <FilePlus size={48} />
//                                                 </div>
//                                                 <p className="font-black text-2xl text-white italic tracking-tighter">{file.name}</p>
//                                                 <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Ready for processing</p>
//                                             </div>
//                                         ) : (
//                                             <>
//                                                 <div className="bg-white/5 p-6 rounded-[1.5rem] text-slate-700 shadow-inner group-hover/upload:text-[#ff6b00] transition-colors">
//                                                     <Upload size={48} />
//                                                 </div>
//                                                 <div className="text-center">
//                                                     <p className="text-white font-black text-2xl italic tracking-tighter">DROP MATERIAL HERE</p>
//                                                     <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">PDF, DOCX, PPTX OR IMAGES (MAX 10MB)</p>
//                                                 </div>
//                                             </>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                                 <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 flex items-center gap-6">
//                                     <div className="bg-[#ff6b00] w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl">
//                                         <Hash size={32} />
//                                     </div>
//                                     <div className="flex-1">
//                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Question Count</p>
//                                         <input
//                                             type="number"
//                                             min="1"
//                                             max="20"
//                                             value={questionCount}
//                                             onChange={(e) => setQuestionCount(parseInt(e.target.value))}
//                                             className="bg-transparent border-none text-2xl font-black text-white italic outline-none w-full"
//                                         />
//                                     </div>
//                                 </div>
//                                 <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 flex items-center gap-6">
//                                     <div className="bg-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl">
//                                         <Activity size={32} />
//                                     </div>
//                                     <div className="flex-1">
//                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Difficulty</p>
//                                         <select
//                                             value={difficulty}
//                                             onChange={(e) => setDifficulty(e.target.value)}
//                                             className="bg-transparent border-none text-2xl font-black text-white italic outline-none w-full appearance-none cursor-pointer"
//                                         >
//                                             <option value="Easy" className="text-black">Easy</option>
//                                             <option value="Medium" className="text-black">Medium</option>
//                                             <option value="Thinkable" className="text-black">Thinkable</option>
//                                             <option value="Hard" className="text-black">Hard</option>
//                                         </select>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                         <FileText className="absolute -right-20 -bottom-20 opacity-[0.03] text-white group-hover:rotate-12 transition-transform duration-700" size={400} />
//                     </div>

//                     <div className="flex justify-center pt-8">
//                         <button
//                             type="submit"
//                             disabled={loading || !file}
//                             className="group flex items-center gap-6 bg-[#ff6b00] text-white px-20 py-8 rounded-[2.5rem] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-[#ff6b00]/20 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-8 border-[#cc5500]"
//                         >
//                             {loading ? <Loader2 className="animate-spin" size={32} /> : <CheckCircle size={32} />}
//                             {loading ? 'PARSING MATERIAL...' : 'ANALYZE DOCUMENT'}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </DashboardLayout>
//     );
// }

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import { FileText, Upload, Loader2, CheckCircle, FilePlus, Hash, Activity, Clock } from 'lucide-react';
import PremiumDropdown from '../components/PremiumDropdown';
import PremiumNumberInput from '../components/PremiumNumberInput';
import socket from '../utils/socket';
import { runClientSideOCR } from '../utils/ocrUtils';
import AuthContext from '../context/AuthContext';
import { useContext } from 'react';

export default function CreateQuizPDF() {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    const [description, setDescription] = useState('');
    const [quizType, setQuizType] = useState('live');
    const [paceControl, setPaceControl] = useState(true);
    const [timerMode, setTimerMode] = useState('total');
    const [timerPerQuestion, setTimerPerQuestion] = useState(30);
    const [duration, setDuration] = useState(10);
    const [startMode, setStartMode] = useState('now');
    
    const getDefaultDateTime = (addHours = 0) => {
        const d = new Date();
        d.setHours(d.getHours() + addHours);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };
    const [scheduledStartTime, setScheduledStartTime] = useState(getDefaultDateTime());
    const [scheduledEndTime, setScheduledEndTime] = useState(getDefaultDateTime(24));

    const [loading, setLoading] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const { showToast } = useToast();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Listen for background job updates
    useEffect(() => {
        if (!user) return;
        
        const channel = `job_status_${user._id}`;
        socket.on(channel, (data) => {
            console.log('Background Job Update:', data);
            setProcessingMessage(data.message);
            
            if (data.status === 'completed') {
                showToast(data.message, 'success');
                setLoading(false);
                navigate(`/create-quiz/text`, {
                    state: {
                        quizId: data.quizId,
                        source: 'background_job'
                    }
                });
            } else if (data.status === 'failed') {
                showToast(data.message, 'error');
                setLoading(false);
            }
        });

        return () => socket.off(channel);
    }, [user, navigate, showToast]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setProcessingMessage('Initializing parser...');
        
        try {
            const formData = new FormData();
            
            // PERFORMANCE UPGRADE: Client-Side OCR Offloading
            // If it's a simple image, we can run OCR here and just send the text
            const isImage = file.type.startsWith('image/');
            if (isImage) {
                setProcessingMessage('Running Client-Side OCR...');
                const extractedText = await runClientSideOCR(file, (progress) => {
                    setProcessingMessage(`Scanning Image: ${progress}%`);
                });
                formData.append('content', extractedText);
                formData.append('type', 'topic'); // Send as topic/text instead of file
            } else {
                formData.append('file', file);
                formData.append('type', 'file');
            }

            formData.append('questionCount', questionCount.toString());
            formData.append('difficulty', difficulty);
            formData.append('description', description);
            formData.append('title', title || file.name.split('.')[0]);

            const res = await api.post('/quiz/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // If response is 202 Accepted, it's processing in background
            if (res.status === 202) {
                setProcessingMessage('Processing in background. You can stay on this page or come back later.');
            } else {
                // Manual/Immediate success
                navigate('/create-quiz/text', {
                    state: {
                        questions: res.data.questions,
                        title: title || res.data.title || file.name.replace('.pdf', ''),
                        quizType,
                        paceControl,
                        timerMode,
                        timerPerQuestion,
                        duration,
                        startMode,
                        scheduledStartTime,
                        scheduledEndTime,
                        source: 'generated'
                    }
                });
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to start generation', 'error');
            setLoading(false);
        }
    };

    return (
        <DashboardLayout role="faculty">
            <div className="max-w-4xl mx-auto pb-20 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff6b00]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>

                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
                            AI <span className="text-[#ff6b00]">File Parser</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-bold uppercase tracking-wider text-sm italic">Analyze PDF, DOCX, TXT or Images to generate questions</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="bg-white/5 rounded-[3rem] border border-white/10 p-12 ring-1 ring-white/5 relative group">
                        <div className="relative z-10 space-y-10">
                            <div className="space-y-6">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quiz Title (Optional)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-black text-xl text-white placeholder:text-slate-700 outline-none"
                                    placeholder="e.g. Midterm Exam"
                                />
                            </div>

                            <div className="space-y-6">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Document</label>
                                <div className="relative border-4 border-dashed border-white/10 rounded-[2.5rem] hover:border-[#ff6b00]/50 transition-all bg-white/5 group/upload">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        required
                                    />
                                    <div className="p-16 flex flex-col items-center gap-6">
                                        {file ? (
                                            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                                <div className="bg-[#ff6b00] p-6 rounded-[1.5rem] text-white shadow-[0_10px_40px_rgba(255,107,0,0.3)]">
                                                    <FilePlus size={48} />
                                                </div>
                                                <p className="font-black text-2xl text-white italic tracking-tighter">{file.name}</p>
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Ready for processing</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-white/5 p-6 rounded-[1.5rem] text-slate-700 shadow-inner group-hover/upload:text-[#ff6b00] transition-colors">
                                                    <Upload size={48} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white font-black text-2xl italic tracking-tighter">DROP FILE HERE</p>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">PDF, DOCX, TXT, PPTX OR IMAGES (MAX 10MB)</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <PremiumNumberInput 
                                    label="Question Count"
                                    value={questionCount}
                                    onChange={setQuestionCount}
                                    icon={Hash}
                                    min={1}
                                    max={50}
                                    suffix="QNS"
                                />
                                 <PremiumDropdown 
                                    label="Difficulty"
                                    value={difficulty}
                                    onChange={setDifficulty}
                                    icon={Activity}
                                    color="bg-purple-600"
                                    options={[
                                        { label: 'Easy', value: 'Easy' },
                                        { label: 'Medium', value: 'Medium' },
                                        { label: 'Thinkable', value: 'Thinkable' },
                                        { label: 'Hard', value: 'Hard' }
                                    ]}
                                />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                                 <div className="space-y-4">
                                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quiz Type</label>
                                     <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                         <button type="button" onClick={() => setQuizType('live')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${quizType === 'live' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Live Quiz</button>
                                         <button type="button" onClick={() => setQuizType('assignment')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${quizType === 'assignment' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Assignment</button>
                                     </div>
                                 </div>
                                 
                                 {quizType === 'live' && (
                                     <div className="space-y-4">
                                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pacing</label>
                                         <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                             <button type="button" onClick={() => setPaceControl(true)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${paceControl ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Teacher</button>
                                             <button type="button" onClick={() => setPaceControl(false)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!paceControl ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Self</button>
                                         </div>
                                     </div>
                                 )}
                             </div>

                             <div className="space-y-6 pt-4 border-t border-white/5">
                                 <div className="flex items-center justify-between">
                                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Timer Configuration</label>
                                     <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-72">
                                         <button type="button" onClick={() => setTimerMode('per-question')} className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${timerMode === 'per-question' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500'}`}>PER QUESTION</button>
                                         <button type="button" onClick={() => setTimerMode('total')} className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${timerMode === 'total' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500'}`}>TOTAL TIME</button>
                                     </div>
                                 </div>
                                 
                                 {timerMode === 'per-question' ? (
                                     <PremiumNumberInput label="Seconds per Question" value={timerPerQuestion} onChange={setTimerPerQuestion} icon={Clock} min={5} max={300} suffix="SEC" />
                                 ) : (
                                     <PremiumNumberInput label="Total Duration" value={duration} onChange={setDuration} icon={Clock} min={1} max={300} suffix="MIN" />
                                 )}
                             </div>

                             <div className="space-y-6 pt-4 border-t border-white/5">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Scheduling</label>
                                 <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-72">
                                     <button type="button" onClick={() => setStartMode('now')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${startMode === 'now' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Start Now</button>
                                     <button type="button" onClick={() => setStartMode('scheduled')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${startMode === 'scheduled' ? 'bg-[#ff6b00] text-white shadow-lg' : 'text-slate-500'}`}>Schedule</button>
                                 </div>
                                 
                                 {startMode === 'scheduled' && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
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

                             <div className="space-y-4 pt-4 border-t border-white/5">
                                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Additional Instructions (Optional)</label>
                                 <textarea
                                     value={description}
                                     onChange={(e) => setDescription(e.target.value)}
                                     rows={4}
                                     className="w-full p-6 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-[#ff6b00] transition-all font-bold text-lg text-white placeholder:text-slate-700 outline-none resize-none"
                                     placeholder="Add extra information to generate questions in detail based on your requirement (e.g., focus on specific chapters, avoid certain topics)..."
                                 />
                             </div>
                         </div>
                        <div className="absolute -right-16 -bottom-16 opacity-[0.03] text-white group-hover:rotate-12 transition-transform duration-700 pointer-events-none overflow-hidden rounded-[3rem]">
                            <FileText size={280} />
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <button
                            type="submit"
                            disabled={loading || !file}
                            className="group flex items-center gap-6 bg-[#ff6b00] text-white px-20 py-8 rounded-[2.5rem] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-[#ff6b00]/20 font-black text-3xl italic uppercase tracking-tighter active:scale-95 border-b-8 border-[#cc5500]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={32} /> : <CheckCircle size={32} />}
                            {loading ? (processingMessage || 'PARSING FILE...') : 'ANALYZE FILE'}
                        </button>
                    </div>
                    
                    {loading && (
                        <div className="flex flex-col items-center gap-4 mt-8 animate-in fade-in duration-500">
                             <div className="w-full max-w-md bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                                 <div className="bg-[#ff6b00] h-full animate-progress" style={{ width: '100%' }}></div>
                             </div>
                             <p className="text-[#ff6b00] font-black italic uppercase tracking-widest text-[10px] animate-pulse">{processingMessage}</p>
                        </div>
                    )}
                </form>
            </div>
        </DashboardLayout>
    );
}
