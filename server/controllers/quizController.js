const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const officeParser = require('officeparser');
const Groq = require('groq-sdk');
const { compareAnswers } = require('../utils/helpers');
const ocrService = require('../utils/ocrService');
const backgroundWorker = require('../utils/backgroundWorker');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // Need uuid for job tracking

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || 'http://localhost:8000/generate';
const COLAB_AI_URL = process.env.COLAB_AI_URL; // Optional: for ngrok tunnels to Colab

// Centralized Model Selection with Fallback
const getModelWithFallback = async (prompt, generationConfig = {}) => {
    // Updated model names — use the stable API aliases
    const FALLBACK_MODELS = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest'
    ];
    
    for (const modelName of FALLBACK_MODELS) {
        try {
            console.log(`☁️ AI Request: Attempting ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig
            });
            const text = result.response.text();
            if (text) return text;
        } catch (err) {
            console.warn(`⚠️ Model ${modelName} failed:`, err.message.substring(0, 120));
            // Continue to next model on any error
        }
    }
    throw new Error("All AI models are currently at capacity.");
};

// Helper for AI insights
const getAIInsights = async (question, selected, correct, isCorrect) => {
    try {
        const prompt = `
            Question: ${question}
            Student Answer: ${selected}
            Correct Answer: ${correct}
            Status: ${isCorrect ? 'Correct' : 'Incorrect'}

            Provide a 1-sentence supportive educational insight for the student. 
            If correct, reinforce the concept. If incorrect, explain the common misconception simply.
        `;
        const text = await getModelWithFallback(prompt);
        return text.trim();
    } catch (err) {
        return "Keep learning! Every question is a chance to grow.";
    }
};




// Mock AI Generation for fallback
const generateMockQuestions = (count = 5, errorMsg = "AI generation is temporarily unavailable.") => {
    const questions = [];
    for (let i = 1; i <= count; i++) {
        questions.push({
            questionText: `Sample Question ${i}: ${errorMsg}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            points: 10,
            type: 'multiple-choice'
        });
    }
    return questions;
};


const BAD_WORDS = ['fuck', 'shit', 'asshole', 'bitch', 'damn', 'piss', 'dick', 'pussy', 'bastard', 'slut', 'whore'];

const containsBadWords = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return BAD_WORDS.some(word => lowerText.includes(word));
};

// CLOUD AI Generation with Local Fallback
const generateQuestions = async (type, content, count = 5, difficulty = 'Medium', description = '') => {
    try {
        console.log(`☁️ AI Request: ${type} | Count: ${count} | Difficulty: ${difficulty} | Desc: ${description ? 'Yes' : 'No'}`);
        
        let contextText = content || "No content provided";

        const cloudSupportedTypes = ['pdf', 'docx', 'pptx', 'image', 'txt'];
        if (cloudSupportedTypes.includes(type) && fs.existsSync(content)) {
            const extracted = await extractCloudText(type, content);
            if (extracted && extracted.trim().length > 0) contextText = extracted;
            // Clean up temporary file
            try { fs.unlinkSync(content); } catch(e) {}
        }

        let difficultyInstruction = "";
        if (difficulty === 'Easy') difficultyInstruction = "Test basic definitions and recall. The wrong options should be obviously incorrect.";
        else if (difficulty === 'Medium') difficultyInstruction = "Require understanding concepts. Use plausible distractors.";
        else if (difficulty === 'Hard') difficultyInstruction = "Use scenario-based or application-based questions. Subtle differences.";

        let prompt = `
            You are an Expert Educator and Quiz Master. 
            Generate exactly ${count} multiple-choice questions for the following content.
            Difficulty Level: ${difficulty}
            Difficulty Instructions: ${difficultyInstruction || "Ensure questions are relevant and challenging."}
            
            ${description ? `FACULTY INSTRUCTIONS/CONTEXT: ${description}` : ''}

            CONTENT: ${contextText.substring(0, 30000)}

            Format MUST be a valid JSON object.
            JSON FORMAT:
            {
              "questions": [
                {
                  "questionText": "Question here?",
                  "options": ["A", "B", "C", "D"],
                  "correctAnswer": "Exact string of correct option",
                  "explanation": "Why this is correct",
                  "points": 10,
                  "type": "multiple-choice"
                }
              ]
            }
        `;

        // 1. Try Cloud AI (Gemini)
        try {
            const text = await getModelWithFallback(prompt, { responseMimeType: "application/json" });
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);
            
            if (data.questions && data.questions.length > 0) {
                // Quality Filter
                const filtered = data.questions.filter(q => {
                    const txt = q.questionText.toLowerCase();
                    // Basic sanity check for file system noise
                    const systemNoise = ['file format', 'directory', 'path', 'extension', 'microsoft', 'powerpoint'];
                    const isSystemNoise = systemNoise.some(word => txt.includes(word));
                    
                    // Bad words check
                    const hasBadWords = containsBadWords(q.questionText) || q.options.some(opt => containsBadWords(opt));
                    
                    return !isSystemNoise && !hasBadWords;
                });
                
                if (filtered.length > 0) {
                    console.log(`✅ Gemini generated ${filtered.length} quality questions`);
                    return filtered;
                }
            }
        } catch (aiErr) {
            console.error('⚠️ Gemini AI failed:', aiErr.message);
        }

        // 2. Fallback to OpenAI (Gold Standard)
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('🤖 AI Request: Attempting OpenAI...');
                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
                });

                if (response.data?.choices?.[0]?.message?.content) {
                    const data = JSON.parse(response.data.choices[0].message.content);
                    if (data.questions && data.questions.length > 0) {
                        console.log(`✅ OpenAI generated ${data.questions.length} quality questions`);
                        return data.questions;
                    }
                }
            } catch (oaErr) {
                console.warn('⚠️ OpenAI failed:', oaErr.message);
            }
        }

        // 3. Fallback to Groq AI (Llama 3 - Ultra Fast)
        if (process.env.GROQ_API_KEY) {
            try {
                console.log('⚡ AI Request: Attempting Groq (Llama 3)...');
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'llama3-70b-8192',
                    response_format: { type: 'json_object' },
                    temperature: 0.5
                });

                const data = JSON.parse(chatCompletion.choices[0].message.content);
                if (data.questions && data.questions.length > 0) {
                    console.log(`✅ Groq generated ${data.questions.length} fast questions`);
                    return data.questions;
                }
            } catch (groqErr) {
                console.warn('⚠️ Groq AI failed:', groqErr.message);
            }
        }

        // 4. Fallback to DeepSeek (High Logic)
        if (process.env.DEEPSEEK_API_KEY) {
            try {
                console.log('🐳 AI Request: Attempting DeepSeek...');
                const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
                });

                if (response.data?.choices?.[0]?.message?.content) {
                    const data = JSON.parse(response.data.choices[0].message.content);
                    if (data.questions && data.questions.length > 0) {
                        console.log(`✅ DeepSeek generated ${data.questions.length} logic questions`);
                        return data.questions;
                    }
                }
            } catch (dsErr) {
                console.warn('⚠️ DeepSeek failed:', dsErr.message);
            }
        }

        // 5. Fallback to Mistral AI (Global Stability)
        if (process.env.MISTRAL_API_KEY) {
            try {
                console.log('🌪️ AI Request: Attempting Mistral...');
                const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
                    model: 'mistral-small-latest',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` }
                });

                if (response.data?.choices?.[0]?.message?.content) {
                    const data = JSON.parse(response.data.choices[0].message.content);
                    if (data.questions && data.questions.length > 0) {
                        console.log(`✅ Mistral generated ${data.questions.length} quality questions`);
                        return data.questions;
                    }
                }
            } catch (mistralErr) {
                console.warn('⚠️ Mistral AI failed:', mistralErr.message);
            }
        }

        // 6. Fallback to Colab AI (Remote Python Service via Ngrok)
        if (COLAB_AI_URL && COLAB_AI_URL.includes('ngrok')) {
            try {
                console.log('🚀 Attempting Colab AI Fallback...');
                const response = await axios.post(COLAB_AI_URL, {
                    type: 'topic',
                    content: contextText,
                    count: count,
                    difficulty: difficulty
                }, { timeout: 45000 });

                if (response.data && response.data.questions) {
                    console.log(`✅ Colab AI generated ${response.data.questions.length} questions`);
                    return response.data.questions;
                }
            } catch (colabErr) {
                console.warn('⚠️ Colab AI failed:', colabErr.message);
            }
        }

        // 7. Fallback to Local AI (Python Service)
        try {
            console.log('🏠 Attempting Local AI Fallback...');
            const response = await axios.post(LOCAL_AI_URL, {
                type: 'topic', 
                content: contextText,
                count: count,
                difficulty: difficulty
            }, { timeout: 30000 });

            if (response.data && response.data.questions) {
                console.log(`✅ Local AI generated ${response.data.questions.length} questions`);
                return response.data.questions;
            }
        } catch (localErr) {
            console.error('❌ Local AI also failed:', localErr.message);
        }

        console.error('❌ All AI options exhausted.');
        return generateMockQuestions(count, "AI services are currently unavailable. Using sample questions.");

    } catch (err) {
        console.error('Final Generation Error:', err.message);
        return generateMockQuestions(count);
    }
};


// HELPER: Extract text from any common document format in the cloud
const extractCloudText = async (type, filePath) => {
    try {
        if (!fs.existsSync(filePath)) return null;

        if (type === 'pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (type === 'docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            let finalText = result && result.value ? result.value.trim() : "";

            // Always sequentially check up to 5 embedded images to combine with text safely
            console.log('👁️ Scanning DOCX for embedded images/graphs...');
            try {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(filePath);
                const zipEntries = zip.getEntries();
                
                const imageEntries = zipEntries.filter(entry => entry.entryName.startsWith('word/media/') && 
                        (entry.entryName.toLowerCase().endsWith('.png') || entry.entryName.toLowerCase().endsWith('.jpg') || entry.entryName.toLowerCase().endsWith('.jpeg')));
                
                const maxImages = Math.min(imageEntries.length, 5); 
                const imagesToProcess = imageEntries.slice(0, maxImages);
                
                console.log(`👁️ OCR scanning ${imagesToProcess.length} DOCX images in parallel...`);
                
                // Process all images in parallel using the persistent worker pool
                const combinedResults = await ocrService.recognizeMultiple(
                    imagesToProcess.map(entry => entry.getData())
                );
                const combinedOcrText = combinedResults.join('\n');
                
                if (combinedOcrText.trim().length > 0) {
                    finalText += '\n[Supplemental Image Data]:\n' + combinedOcrText.trim();
                    console.log(`✅ Recovered ${combinedOcrText.trim().length} characters from DOCX images in parallel!`);
                }
            } catch (zipErr) {
                console.log('⚠️ Image parsing skipped:', zipErr.message);
            }
            return finalText.length > 5 ? finalText : null;
        } else if (type === 'pptx') {
            console.log('📉 Deep Parsing PPTX slides using officeParser...');
            const result = await officeParser.parseOffice(filePath);
            let finalText = result && result.toText ? result.toText().trim() : "";
            
            // Always sequentially check up to 5 embedded images to combine with text safely
            console.log('👁️ Scanning PPTX for embedded images/graphs...');
            try {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(filePath);
                const zipEntries = zip.getEntries();
                
                const imageEntries = zipEntries.filter(entry => entry.entryName.startsWith('ppt/media/') && 
                        (entry.entryName.toLowerCase().endsWith('.png') || entry.entryName.toLowerCase().endsWith('.jpg') || entry.entryName.toLowerCase().endsWith('.jpeg')));
                
                const maxImages = Math.min(imageEntries.length, 5);
                const imagesToProcess = imageEntries.slice(0, maxImages);
                
                console.log(`👁️ OCR scanning ${imagesToProcess.length} PPTX images in parallel...`);
                
                // Process all images in parallel using the persistent worker pool
                const combinedResults = await ocrService.recognizeMultiple(
                    imagesToProcess.map(entry => entry.getData())
                );
                const combinedOcrText = combinedResults.join('\n');
                
                if (combinedOcrText.trim().length > 0) {
                    finalText += '\n[Supplemental Image Data]:\n' + combinedOcrText.trim();
                    console.log(`✅ Recovered ${combinedOcrText.trim().length} characters from PPTX images in parallel!`);
                }
            } catch (zipErr) {
                console.log('⚠️ Image parsing skipped:', zipErr.message);
            }

            console.log(`✅ Extracted PPTX Text: ${finalText.length} characters.`);
            return finalText.length > 5 ? finalText : null;
        } else if (type === 'txt') {
            return fs.readFileSync(filePath, 'utf-8');
        } else if (type === 'image') {
            console.log('👁️ Running Persistent OCR Service...');
            return await ocrService.recognize(filePath);
        }
        
        return null; // Return null effectively hides the "Path" from the AI
    } catch (err) {
        console.error(`❌ Extraction error (${type}):`, err.message);
        return null;
    }
};

const generateJoinCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.createQuiz = async (req, res) => {
    try {
        let { title, type, content, questions: manualQuestions, questionCount, difficulty, timerPerQuestion, topic, isLive, isAssessment, isActive, duration, scheduledStartTime, scheduledEndTime } = req.body;
        let finalQuestions = [];

        if (manualQuestions && manualQuestions.length > 0) {
            finalQuestions = Array.isArray(manualQuestions) ? manualQuestions : JSON.parse(manualQuestions);
        } else {
            // ASYNC MODE: Return immediate response and process in background
            const jobId = uuidv4();
            const getUniqueCode = async () => {
                let code, exists;
                do {
                    code = Math.floor(100000 + Math.random() * 900000).toString();
                    exists = await Quiz.findOne({ joinCode: code });
                } while (exists);
                return code;
            };
            const joinCode = await getUniqueCode();

            const quizData = {
                title: title || `${topic || 'Untitled'} Quiz`,
                createdBy: req.user.id,
                joinCode,
                difficulty: difficulty || 'Medium',
                isLive: isLive === 'true' || isLive === true,
                isActive: true,
                status: isLive === 'true' || isLive === true ? 'waiting' : 'finished'
            };

            const generationTask = async () => {
                if (req.file) {
                    const absolutePath = path.resolve(req.file.path);
                    let fileType = type;
                    const ext = path.extname(req.file.originalname).toLowerCase();
                    if (['.jpg', '.jpeg', '.png'].includes(ext)) fileType = 'image';
                    else if (ext === '.docx') fileType = 'docx';
                    else if (ext === '.pptx') fileType = 'pptx';
                    else if (ext === '.pdf') fileType = 'pdf';
                    return await generateQuestions(fileType, absolutePath, questionCount, difficulty, req.body.description);
                } else {
                    return await generateQuestions('topic', content || topic, questionCount, difficulty, req.body.description);
                }
            };

            backgroundWorker.enqueueQuizGeneration(jobId, req.user.id, generationTask, quizData);
            return res.status(202).json({ jobId, message: 'Generation started in background.' });
        }

        if (isLive === 'true' || isLive === true) {
            // Automatic Cleanup: Deactivate existing active live quizzes for this faculty
            await Quiz.updateMany(
                {
                    createdBy: req.user.id,
                    isLive: true,
                    status: { $in: ['waiting', 'started'] }
                },
                {
                    $set: {
                        isActive: false,
                        status: 'finished'
                    }
                }
            );
        }

        // Generate a guaranteed unique join code (retry until free)
        const getUniqueCode = async () => {
            let code, exists;
            do {
                code = generateJoinCode();
                exists = await Quiz.findOne({ joinCode: code });
            } while (exists);
            return code;
        };
        const joinCode = await getUniqueCode();

        const quizData = {
            title: title || `${topic || content || 'Untitled'} Quiz`,
            description: `Level: ${difficulty || 'Medium'}`,
            questions: finalQuestions,
            createdBy: req.user.id,
            isActive: isActive === undefined ? true : (isActive === 'true' || isActive === true),
            joinCode,
            difficulty: difficulty || 'Medium',
            timerPerQuestion: timerPerQuestion !== undefined ? timerPerQuestion : 30,
            paceControl: req.body.paceControl !== undefined ? req.body.paceControl : true,
            duration: duration || 0,
            topic: topic || content || '',
            isLive: isLive === 'true' || isLive === true,
            isAssessment: isAssessment === 'true' || isAssessment === true,
            status: isLive === 'true' || isLive === true ? 'waiting' : 'finished',
            allowedSections: req.body.allowedSections || [],
            allowedStudents: req.body.allowedStudents || [],
            allowedBranches: req.body.allowedBranches || [],
            scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : null,
            scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null
        };

        let newQuiz;
        try {
            newQuiz = new Quiz(quizData);
            await newQuiz.save();
        } catch (saveErr) {
            // Handle rare duplicate key race condition — retry with a new code
            if (saveErr.code === 11000) {
                console.warn('⚠️ Duplicate joinCode race condition — retrying with new code...');
                quizData.joinCode = await getUniqueCode();
                newQuiz = new Quiz(quizData);
                await newQuiz.save();
            } else {
                throw saveErr;
            }
        }

        res.status(201).json(newQuiz);

    } catch (err) {
        console.error('❌ Final CreateQuiz Error:', err.message);
        res.status(500).json({ 
            message: 'Failed to create quiz', 
            error: err.message
        });
    }
};


exports.joinByCode = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ msg: 'Join code is required' });
        }
        console.log(`🔍 Try join by code: ${code} (User: ${req.user.id})`);
        const quiz = await Quiz.findOne({ joinCode: code.toString(), isActive: true });
        
        if (!quiz) {
            console.log(`❌ Quiz not found or not active for code: ${code}`);
            return res.status(404).json({ msg: 'Quiz not found or not active' });
        }

        // Check scheduling
        const now = new Date();
        const isCreator = quiz.createdBy.toString() === req.user.id;

        if (!isCreator) {
            if (quiz.scheduledStartTime && now < quiz.scheduledStartTime) {
                return res.status(403).json({ 
                    msg: `This quiz is scheduled to start at ${quiz.scheduledStartTime.toLocaleString()}`,
                    startTime: quiz.scheduledStartTime
                });
            }
            if (quiz.scheduledEndTime && now > quiz.scheduledEndTime) {
                return res.status(403).json({ 
                    msg: 'This quiz has expired and is no longer accepting attempts.',
                    endTime: quiz.scheduledEndTime
                });
            }
        }

        // Section & Student Restrictions
        const user = await User.findById(req.user.id);
        if (user.role === 'student') {
            const isSectionAllowed = quiz.allowedSections.length === 0 || quiz.allowedSections.includes(user.section);
            const isStudentAllowed = quiz.allowedStudents.length === 0 || quiz.allowedStudents.includes(user._id.toString());

            // If both are specified, user must meet at least one (usually either they are in the section OR specifically invited)
            // But usually if both are empty, it's open to all.
            // If only section is specified, must be in section.
            // If only student is specified, must be that student.
            // If both are specified, let's say "Student must be in an allowed section AND (if specific students are listed, must be one of them)"
            // Actually, usually "Section selection" filters the student list.
            // Let's implement: If restrictions exist, user must satisfy them.
            
            let allowed = true;
            if (quiz.allowedBranches && quiz.allowedBranches.length > 0 && !quiz.allowedBranches.includes(user.branch) && !quiz.allowedBranches.includes(user.department)) {
                allowed = false;
            }
            if (quiz.allowedSections && quiz.allowedSections.length > 0 && !quiz.allowedSections.includes(user.section)) {
                allowed = false;
            }
            if (quiz.allowedStudents && quiz.allowedStudents.length > 0 && !quiz.allowedStudents.some(id => id.toString() === user._id.toString())) {
                allowed = false;
            }

            if (!allowed) {
                return res.status(403).json({ msg: 'Access Denied: You are not authorized to join this quiz.' });
            }
        }

        console.log(`✅ Found quiz: ${quiz.title} (${quiz._id})`);

        // Check for existing result to handle resume/blocking
        const existingResult = await Result.findOne({ quiz: quiz._id, student: req.user.id });

        res.json({
            quizId: quiz._id,
            isLive: quiz.isLive,
            status: quiz.status,
            previousAttempt: existingResult ? {
                status: existingResult.status,
                startedAt: existingResult.startedAt
            } : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.getMyQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.user.id }).sort({ createdAt: -1 });

        const enriched = await Promise.all(quizzes.map(async (quiz) => {
            const results = await Result.find({ quiz: quiz._id })
                .populate('student', 'name')
                .sort({ score: -1, totalTimeTaken: 1 });
            const completionCount = results.length;
            const averageScore = completionCount > 0
                ? results.reduce((sum, r) => sum + r.score, 0) / completionCount
                : 0;
            return {
                ...quiz.toObject(),
                completionCount,
                averageScore,
                results: results
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(r => ({
                        studentName: r.student?.name || r.student?.name || 'Student',
                        score: r.score
                    }))
            };
        }));

        res.json(enriched);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        // Check user
        if (quiz.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Quiz.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Quiz removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.getLiveQuizzes = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const now = new Date();

        // Find quizzes that are:
        // 1. Active
        // 2. Not expired (if scheduledEndTime exists, it must be in the future)
        // 3. For student role: Must be in allowedSections/allowedStudents if those are specified
        let query = { isActive: true };
        
        // If it has an end time, it must be in the future (or null)
        query.$or = [
            { scheduledEndTime: { $gt: now } },
            { scheduledEndTime: { $exists: false } },
            { scheduledEndTime: null }
        ];

        let quizzes = await Quiz.find(query).sort({ createdAt: -1 });

        // Filter based on student restrictions
        if (user.role === 'student') {
            quizzes = quizzes.filter(quiz => {
                const isSectionAllowed = !quiz.allowedSections || quiz.allowedSections.length === 0 || quiz.allowedSections.includes(user.section);
                const isBranchAllowed = !quiz.allowedBranches || quiz.allowedBranches.length === 0 || quiz.allowedBranches.includes(user.branch);
                const isStudentAllowed = !quiz.allowedStudents || quiz.allowedStudents.length === 0 || quiz.allowedStudents.some(id => id.toString() === user._id.toString());
                
                // Also hide if not yet available
                const isStarted = !quiz.scheduledStartTime || now >= quiz.scheduledStartTime;

                return isSectionAllowed && isBranchAllowed && isStudentAllowed && isStarted;
            });
        }

        const quizzesWithAttempts = await Promise.all(quizzes.map(async (quiz) => {
            const result = await Result.findOne({ quiz: quiz._id, student: req.user.id });
            let rank = null;
            let percentage = 0;
            
            if (result) {
                const allResults = await Result.find({ quiz: quiz._id, status: 'completed' })
                    .sort({ score: -1, totalTimeTaken: 1 });
                const index = allResults.findIndex(r => r.student.toString() === req.user.id.toString());
                rank = index !== -1 ? index + 1 : null;
                percentage = (result.score / (quiz.questions.length * 10)) * 100;
            }

            return {
                ...quiz.toObject(),
                isAttempted: !!result,
                attemptStatus: result ? result.status : null,
                score: result ? result.score : 0,
                percentage,
                rank,
                totalQuestions: quiz.questions.length
            };
        }));

        res.json(quizzesWithAttempts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        // Attach previous result if it exists (for resume functionality)
        const previousResult = await Result.findOne({ quiz: req.params.id, student: req.user.id });

        // SANITIZATION: Remove correct answers for students
        const quizObj = quiz.toObject();
        if (req.user.role === 'student' && quiz.createdBy.toString() !== req.user.id) {
            quizObj.questions = quizObj.questions.map(q => {
                const { correctAnswer, ...rest } = q;
                return rest;
            });
            // Also hide faculty-only insights
            delete quizObj.finalInsights;
            delete quizObj.finalLeaderboard;
        }

        res.json({
            ...quizObj,
            previousResult
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.submitAttempt = async (req, res) => {
    try {
        const { quizId, answers } = req.body;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        // Enforcement of scheduling with a 30-second grace period
        const now = new Date();
        if (quiz.scheduledEndTime) {
            const gracePeriodMs = 30 * 1000;
            if (now.getTime() > (new Date(quiz.scheduledEndTime).getTime() + gracePeriodMs)) {
                return res.status(403).json({ msg: 'Submission rejected: This assignment has expired.' });
            }
        }

        // Prevent multiple submissions
        const existingResult = await Result.findOne({ quiz: quizId, student: req.user.id });
        if (existingResult && existingResult.status === 'completed') {
            return res.status(400).json({ msg: 'Quiz already attempted' });
        }

        let score = 0;
        let totalTimeTaken = 0;
        const formattedAnswers = quiz.questions.map((q, idx) => {
            const selectedOption = (answers[idx]?.selectedOption || '').toString().trim();
            const correctOption = (q.correctAnswer || '').toString().trim();

                const isCorrect = compareAnswers(selectedOption, correctOption, q.options);

            const qTimeTaken = answers[idx]?.timeTaken || 0;
            totalTimeTaken += qTimeTaken;

            if (isCorrect) {
                score += q.points || 10;
            }
            return {
                questionText: q.questionText,
                selectedOption,
                correctOption,
                isCorrect,
                timeTaken: qTimeTaken
            };
        });

        if (existingResult) {
            existingResult.score = score;
            existingResult.totalTimeTaken = totalTimeTaken;
            existingResult.answers = formattedAnswers;
            existingResult.totalQuestions = quiz.questions.length;
            existingResult.status = 'completed';
            existingResult.completedAt = Date.now();
            existingResult.lastAnsweredAt = Date.now();
            await existingResult.save();
            return res.json(existingResult);
        }

        const result = new Result({
            quiz: quizId,
            student: req.user.id,
            score,
            totalTimeTaken,
            totalQuestions: quiz.questions.length,
            answers: formattedAnswers,
            status: 'completed',
            startedAt: Date.now(),
            completedAt: Date.now(),
            lastAnsweredAt: Date.now()
        });

        await result.save();
        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) return res.status(404).json({ msg: 'Quiz not found' });

        const isfaculty = req.user.id === quiz.createdBy.toString();
        const isAdmin = req.user.role === 'admin';
        const canSeeFullLeaderboard = isfaculty || isAdmin;

        // Fetch all results for this quiz
        const allResults = await Result.find({ quiz: req.params.quizId })
            .populate('student', 'name email rollNumber');

        if (allResults.length === 0) {
            return res.json({
                results: [],
                stats: {
                    averageScore: 0,
                    highestScore: 0,
                    totalParticipants: 0,
                    userRank: null,
                    userScore: 0
                },
                isFinal: quiz.status === 'finished'
            });
        }

        // Calculate Difficulty Weights for each question (Inverse of Success Rate)
        const totalParticipantsCount = allResults.length;
        const questionWeights = quiz.questions.map((q, idx) => {
            const correctCount = allResults.filter(r => r.answers[idx]?.isCorrect).length;
            // Weight is 1 minus success rate. Harder questions = higher weight.
            return 1 - (correctCount / totalParticipantsCount);
        });

        // Calculate total time and sort: score DESC, tieBreakWeight DESC, totalTime ASC
        const processedResults = allResults.map(r => {
            const startedAt = r.startedAt ? new Date(r.startedAt).getTime() : 0;
            const completedAt = r.completedAt ? new Date(r.completedAt).getTime() : Date.now();
            const totalTime = completedAt - startedAt;

            // Calculate Difficulty-Based Tie-Break Weight
            const tieBreakWeight = r.answers.reduce((sum, ans, idx) => {
                if (ans.isCorrect) return sum + (questionWeights[idx] || 0);
                return sum;
            }, 0);

            return {
                ...r.toObject(),
                totalTime,
                tieBreakWeight
            };
        }).sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
            }
            // Tie-breaker 1: Difficulty Weight (Those who solved harder questions win)
            if ((b.tieBreakWeight || 0) !== (a.tieBreakWeight || 0)) {
                return (b.tieBreakWeight || 0) - (a.tieBreakWeight || 0);
            }
            // Tie-breaker 2: Total Time (Speed)
            return (a.totalTime || 0) - (b.totalTime || 0);
        });

        const totalParticipants = processedResults.length;
        const totalScore = processedResults.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalScore / totalParticipants;
        const highestScore = processedResults.length > 0 ? processedResults[0].score : 0;
        
        // Deduplicate: Keep only the best result per student (since sorted, first is best)
        const uniqueStudentIds = new Set();
        const deduplicatedResults = processedResults.filter(r => {
            const sid = (r.student?._id || r.studentId || r._id).toString();
            if (uniqueStudentIds.has(sid)) return false;
            uniqueStudentIds.add(sid);
            return true;
        });

        // Build ranked list with TIES
        const rankedResults = [];
        let currentRank = 1;

        for (let i = 0; i < deduplicatedResults.length; i++) {
            const r = deduplicatedResults[i];

            if (i > 0) {
                const prev = deduplicatedResults[i - 1];
                // Update rank if score, tieBreakWeight, OR time differs
                if (r.score !== prev.score || r.tieBreakWeight !== prev.tieBreakWeight || r.totalTime !== prev.totalTime) {
                    currentRank = i + 1;
                }
            }

            rankedResults.push({
                studentId: r.student?._id || r.studentId,
                name: r.student?.name || r.username || 'Unknown',
                rollNumber: r.student?.rollNumber || 'N/A',
                student: r.student, // Pass the full student object for frontend flexibility
                currentScore: r.score,
                tieBreakWeight: r.tieBreakWeight,
                totalTimeTaken: r.totalTime,
                answeredQuestions: r.answers.length,
                answers: r.answers,
                rank: currentRank
            });
        }

        // Find current student's rank
        const studentEntry = rankedResults.find(r => r.studentId.toString() === req.user.id);
        const studentRank = studentEntry ? studentEntry.rank : null;
        const studentScore = studentEntry ? studentEntry.currentScore : 0;

        let leaderboardData = [];
        if (canSeeFullLeaderboard) {
            // faculty gets full data INCLUDING answers for the answer-map dots
            leaderboardData = rankedResults;
        } else if (studentEntry) {
            // Student only sees their own result (Privacy Protection) — no answers needed
            const { answers, ...cleanEntry } = studentEntry;
            leaderboardData = [cleanEntry];
        }

        res.json({
            results: leaderboardData,
            stats: {
                averageScore,
                highestScore,
                totalParticipants,
                userRank: studentRank,
                userScore: studentScore
            },
            isFinal: quiz.status === 'finished' || !quiz.isActive
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

// Missing functions that routes expect
exports.publishQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        // Check user
        if (quiz.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        quiz.isActive = !quiz.isActive;
        await quiz.save();

        res.json(quiz);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.getFacultyStats = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.user.id }).sort({ createdAt: -1 });

        const stats = await Promise.all(quizzes.map(async (quiz) => {
            // Fetch live results for the quiz
            const dbResults = await Result.find({ quiz: quiz._id })
                .populate('student', 'name email')
                .sort({ score: -1, completedAt: 1 });

            const results = dbResults.map(r => ({
                studentName: r.student?.name || 'Unknown',
                score: r.score,
                totalQuestions: r.totalQuestions,
                completedAt: r.completedAt,
                answers: r.answers
            }));

            const completionCount = results.length;
            const averageScore = completionCount > 0
                ? (results.reduce((sum, r) => sum + r.score, 0) / completionCount)
                : 0;

            return {
                quizId: quiz._id,
                title: quiz.title,
                topic: quiz.topic,
                createdAt: quiz.createdAt,
                completionCount,
                averageScore,
                results
            };
        }));

        res.json(stats);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};



exports.updateQuiz = async (req, res) => {
    try {
        const { title, description, questions, difficulty, timerPerQuestion, duration, isLive, isActive, isAssessment, scheduledStartTime, scheduledEndTime } = req.body;

        let quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        // Check user
        if (quiz.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Update fields
        if (title) quiz.title = title;
        if (description) quiz.description = description;
        if (questions) {
            quiz.questions = Array.isArray(questions) ? questions : JSON.parse(questions);
        }
        if (difficulty) quiz.difficulty = difficulty;
        if (timerPerQuestion !== undefined) quiz.timerPerQuestion = timerPerQuestion;
        if (duration !== undefined) quiz.duration = duration;
        if (isAssessment !== undefined) quiz.isAssessment = isAssessment === 'true' || isAssessment === true;
        if (scheduledStartTime !== undefined) quiz.scheduledStartTime = scheduledStartTime ? new Date(scheduledStartTime) : null;
        if (scheduledEndTime !== undefined) quiz.scheduledEndTime = scheduledEndTime ? new Date(scheduledEndTime) : null;

        // Activation / Deactivation logic
        if (isActive !== undefined) {
            const requestedActive = isActive === 'true' || isActive === true;

            if (requestedActive && !quiz.isActive) {
                // Automatic Cleanup: Deactivate other active sessions for this faculty
                await Quiz.updateMany(
                    {
                        createdBy: req.user.id,
                        isActive: true,
                        _id: { $ne: quiz._id }
                    },
                    {
                        $set: {
                            isActive: false,
                            status: 'finished'
                        }
                    }
                );

                quiz.isActive = true;
                // If turning on, sync status
                if (quiz.isLive) quiz.status = 'waiting';
                else quiz.status = 'started';
            } else if (!requestedActive) {
                quiz.isActive = false;
                if (quiz.isLive) quiz.status = 'finished';
            }
        }

        // Handle isLive change
        if (isLive !== undefined) {
            quiz.isLive = isLive === 'true' || isLive === true;
            if (quiz.isActive) {
                quiz.status = quiz.isLive ? 'waiting' : 'started';
            }
        }

        await quiz.save();
        res.json(quiz);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.generateQuizQuestions = async (req, res) => {
    try {
        let { type, questionCount, difficulty, topic, content, description } = req.body;
        let finalQuestions = [];
        let extractedTitle = topic || 'AI Generated Quiz';
        let sourceType = type || 'topic';

        if (req.file) {
            console.log(`📄 Processing file for preview: ${req.file.originalname}`);
            const absolutePath = path.resolve(req.file.path);
            
            // Determine file type from extension
            const ext = path.extname(req.file.originalname).toLowerCase();
            if (['.jpg', '.jpeg', '.png'].includes(ext)) sourceType = 'image';
            else if (ext === '.docx') sourceType = 'docx';
            else if (ext === '.pptx') sourceType = 'pptx';
            else if (ext === '.pdf') sourceType = 'pdf';

            finalQuestions = await generateQuestions(sourceType, absolutePath, questionCount, difficulty, description);
            extractedTitle = req.file.originalname.replace(/\.[^/.]+$/, "");
        } else if (content || topic) {
            finalQuestions = await generateQuestions('topic', content || topic, questionCount, difficulty, description);
        }

        res.json({
            questions: finalQuestions,
            title: extractedTitle,
            duration: 10
        });

    } catch (err) {
        console.error('❌ Generation Controller Error:', err.message);
        res.status(500).json({ msg: 'Generation Error: ' + err.message });
    }
};

exports.getStudentHistory = async (req, res) => {
    try {
        const user = await mongoose.model('User').findById(req.user.id);
        const finishedQuizzes = await Quiz.find({
            $or: [
                { status: 'finished' },
                { isActive: false },
                { scheduledEndTime: { $lt: new Date() } }
            ]
        }).sort({ createdAt: -1 });

        // Filter based on student restrictions
        let relevantQuizzes = finishedQuizzes.filter(quiz => {
            const isSectionAllowed = !quiz.allowedSections || quiz.allowedSections.length === 0 || quiz.allowedSections.includes(user.section);
            const isBranchAllowed = !quiz.allowedBranches || quiz.allowedBranches.length === 0 || quiz.allowedBranches.includes(user.branch);
            const isStudentAllowed = !quiz.allowedStudents || quiz.allowedStudents.length === 0 || quiz.allowedStudents.some(id => id.toString() === user._id.toString());
            return isSectionAllowed && isBranchAllowed && isStudentAllowed;
        });

        const history = await Promise.all(relevantQuizzes.map(async (quiz) => {
            const result = await Result.findOne({ quiz: quiz._id, student: req.user.id });

            let rank = null;
            if (result) {
                // Compute rank for this specific quiz
                const allResults = await Result.find({ quiz: quiz._id, status: 'completed' })
                    .sort({ score: -1, totalTimeTaken: 1 });
                const index = allResults.findIndex(r => r._id.toString() === result._id.toString());
                rank = index !== -1 ? index + 1 : null;
            }

            return {
                _id: quiz._id,
                resultId: result ? result._id : null,
                title: quiz.title,
                topic: quiz.topic,
                description: quiz.description,
                date: quiz.createdAt,
                completedAt: result ? result.completedAt : null,
                score: result ? result.score : 0,
                totalQuestions: quiz.questions.length,
                status: result ? 'Completed' : 'Missed',
                isAttempted: !!result,
                rank,
                percentage: result ? (result.score / (quiz.questions.length * 10)) * 100 : 0
            };
        }));

        res.json(history);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

// Get detailed per-student quiz report (with AI insights)
exports.getStudentQuizReport = async (req, res) => {
    try {
        const { id } = req.params;
        let result = await Result.findById(id)
            .populate({
                path: 'quiz',
                select: 'title topic description questions createdBy joinCode timerPerQuestion'
            })
            .populate('student', 'name rollNumber branch section');

        // Fallback: If not a result ID, maybe it's a quiz ID?
        if (!result) {
            result = await Result.findOne({ quiz: id, student: req.user.id })
                .populate({
                    path: 'quiz',
                    select: 'title topic description questions createdBy joinCode timerPerQuestion'
                })
                .populate('student', 'name rollNumber branch section');
        }

        if (!result) return res.status(404).json({ msg: 'Result not found' });

        // Verify ownership — students can only see their own report
        if (result.student._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const quiz = result.quiz;
        const faculty = await mongoose.model('User').findById(quiz.createdBy).select('name');

        // Lazy-generate AI insights for each answer if missing
        let updated = false;
        for (let ans of result.answers) {
            if (!ans.aiInsight) {
                ans.aiInsight = await getAIInsights(
                    ans.questionText, ans.selectedOption, ans.correctOption, ans.isCorrect
                );
                updated = true;
            }
        }
        if (updated) await result.save();

        // Calculate Global Rank & Percentile with Difficulty-Aware Tie-Breaker
        const allResults = await Result.find({ quiz: quiz._id, status: 'completed' });
        const totalCount = allResults.length;

        // Difficulty weights for this quiz
        const questionWeights = quiz.questions.map((q, idx) => {
            const correctCount = allResults.filter(r => r.answers[idx]?.isCorrect).length;
            return 1 - (correctCount / totalCount);
        });
        
        // Compute metrics for all
        const processedAll = allResults.map(r => {
            const startedAt = r.startedAt ? new Date(r.startedAt).getTime() : 0;
            const completedAt = r.completedAt ? new Date(r.completedAt).getTime() : Date.now();
            const totalTime = completedAt - startedAt;
            const tieBreakWeight = r.answers.reduce((sum, ans, idx) => {
                if (ans.isCorrect) return sum + (questionWeights[idx] || 0);
                return sum;
            }, 0);
            return { _id: r._id, score: r.score, totalTime, tieBreakWeight };
        }).sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.tieBreakWeight !== a.tieBreakWeight) return b.tieBreakWeight - a.tieBreakWeight;
            return a.totalTime - b.totalTime;
        });

        // Compute rank with tie support
        let currentRank = 1;
        let globalRank = 1;
        for (let i = 0; i < processedAll.length; i++) {
            if (i > 0) {
                const prev = processedAll[i - 1];
                if (processedAll[i].score !== prev.score || processedAll[i].tieBreakWeight !== prev.tieBreakWeight || processedAll[i].totalTime !== prev.totalTime) {
                    currentRank = i + 1;
                }
            }
            if (processedAll[i]._id.toString() === result._id.toString()) {
                globalRank = currentRank;
                break;
            }
        }

        const percentile = processedAll.length > 1
            ? ((processedAll.length - globalRank) / (processedAll.length - 1)) * 100
            : 100;

        res.json({
            ...result.toObject(),
            quiz: {
                ...quiz.toObject(),
                teacherName: faculty ? faculty.name : 'Unknown'
            },
            stats: {
                globalRank,
                percentile,
                totalParticipants: processedAll.length
            }
        });
    } catch (err) {
        console.error('getStudentQuizReport error:', err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

// Get Quiz Stats for Faculty Dashboard
exports.getQuizStats = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ msg: 'Quiz not found' });

        // Ensure only the creator or admin can view stats
        if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const rawResults = await Result.find({ quiz: quiz._id, status: 'completed' })
            .populate('student', 'name rollNumber branch section');

        // 1. Deduplicate Results: Keep only the BEST attempt per student
        // Best attempt defined as: 1. Highest Score, 2. Fastest Time
        const processedResults = rawResults.map(r => {
            const startedAt = r.startedAt ? new Date(r.startedAt).getTime() : 0;
            const completedAt = r.completedAt ? new Date(r.completedAt).getTime() : Date.now();
            const totalTime = r.totalTimeTaken || (completedAt - startedAt);
            return { ...r.toObject(), totalTime };
        }).sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.totalTime - b.totalTime;
        });

        const uniqueStudentIds = new Set();
        const results = processedResults.filter(r => {
            const sid = r.student?._id?.toString() || r.student?.toString();
            if (!sid || uniqueStudentIds.has(sid)) return false;
            uniqueStudentIds.add(sid);
            return true;
        });

        const totalAttempted = results.length;
        
        // Calculate eligible students based on quiz restrictions
        let eligibleQuery = { role: 'student' };
        
        // Handle student-level restrictions
        if (quiz.allowedStudents && quiz.allowedStudents.length > 0) {
            eligibleQuery._id = { $in: quiz.allowedStudents };
        } else {
            // Apply branch/section filters if specific students aren't listed
            if (quiz.allowedBranches && quiz.allowedBranches.length > 0) {
                eligibleQuery.branch = { $in: quiz.allowedBranches };
            }
            if (quiz.allowedSections && quiz.allowedSections.length > 0) {
                eligibleQuery.section = { $in: quiz.allowedSections };
            }
        }
        
        const eligibleStudents = await mongoose.model('User').countDocuments(eligibleQuery);
        const totalStudents = eligibleStudents;

        const scores = results.map(r => r.score);
        const avgScore = totalAttempted > 0 ? (scores.reduce((a, b) => a + b, 0) / totalAttempted) : 0;
        const highestScore = totalAttempted > 0 ? Math.max(...scores) : 0;
        const lowestScore = totalAttempted > 0 ? Math.min(...scores) : 0;

        // 1. Score Distribution
        const distribution = [
            { range: '0-20%', count: 0 },
            { range: '21-40%', count: 0 },
            { range: '41-60%', count: 0 },
            { range: '61-80%', count: 0 },
            { range: '81-100%', count: 0 }
        ];

        results.forEach(r => {
            const percentage = (r.score / (quiz.questions.length * 10)) * 100;
            if (percentage <= 20) distribution[0].count++;
            else if (percentage <= 40) distribution[1].count++;
            else if (percentage <= 60) distribution[2].count++;
            else if (percentage <= 80) distribution[3].count++;
            else distribution[4].count++;
        });

        // 2. Section Performance (Avg)
        // Get target sections from quiz config
        const targetSections = quiz.allowedSections && quiz.allowedSections.length > 0 
            ? quiz.allowedSections 
            : [...new Set(results.map(r => r.student?.section).filter(Boolean))];

        const sectionPerformance = targetSections.map(sec => {
            const secResults = results.filter(r => r.student?.section === sec);
            const secAvg = secResults.length > 0 
                ? (secResults.reduce((a, b) => a + b.score, 0) / secResults.length) 
                : 0;
            return {
                section: sec,
                avgScore: parseFloat(secAvg.toFixed(1)),
                participation: secResults.length
            };
        });

        // 3. Question-wise Performance
        const questionPerformance = quiz.questions.map((q, idx) => {
            const qText = (q.questionText || '').trim().toLowerCase();
            const correctCount = results.filter(r => 
                r.answers.some(a => (a.questionText || '').trim().toLowerCase() === qText && a.isCorrect)
            ).length;
            const accuracy = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;
            return {
                name: `Q${idx + 1}`,
                correct: correctCount,
                accuracy: parseFloat(accuracy.toFixed(0)),
                status: accuracy >= 80 ? 'Easy' : accuracy >= 40 ? 'Moderate' : 'Hard'
            };
        });

        // 4. Top 5 Students
        const topStudents = results
            .sort((a, b) => b.score - a.score || a.totalTimeTaken - b.totalTimeTaken)
            .slice(0, 5)
            .map(r => ({
                id: r.student?.rollNumber || 'N/A',
                name: r.student?.name || 'Unknown',
                score: r.score,
                percentage: ((r.score / (quiz.questions.length * 10)) * 100).toFixed(0)
            }));

        res.json({
            metrics: {
                eligibleStudents,
                totalAttempted,
                participationPercentage: totalStudents > 0 ? ((totalAttempted / totalStudents) * 100).toFixed(1) : 0,
                averageScore: avgScore.toFixed(1),
                highestScore,
                lowestScore
            },
            charts: {
                scoreDistribution: distribution,
                sectionPerformance,
                questionPerformance,
                participationRate: [
                    { name: 'Attempted', value: totalAttempted },
                    { name: 'Absent', value: Math.max(0, eligibleStudents - totalAttempted) }
                ]
            },
            topStudents,
            results: results.map(r => {
                const studentAnswers = r.answers || [];
                const answerMap = {};
                studentAnswers.forEach(a => {
                    if (a.questionText) {
                        answerMap[a.questionText.trim().toLowerCase()] = a;
                    }
                });

                // Pre-align answers with current quiz questions
                const alignedAnswers = quiz.questions.map((q, qIdx) => {
                    const qText = (q.questionText || '').trim().toLowerCase();
                    // 1. Best: Match by question text
                    if (answerMap[qText]) return answerMap[qText];
                    // 2. Fallback: Match by index if the quiz hasn't changed structure much
                    if (studentAnswers[qIdx]) return studentAnswers[qIdx];
                    return null;
                });

                return {
                    name: r.student?.name,
                    rollNumber: r.student?.rollNumber,
                    section: r.student?.section,
                    branch: r.student?.branch,
                    score: r.score,
                    answers: alignedAnswers,
                    totalTimeTaken: r.totalTime,
                    completedAt: r.completedAt
                };
            }),
            quizInfo: {
                ...quiz.toObject(),
                title: quiz.title,
                code: quiz.joinCode,
                questionCount: quiz.questions.length,
                totalPoints: quiz.questions.length * 10
            }
        });
    } catch (err) {
        console.error('getQuizStats error:', err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};


