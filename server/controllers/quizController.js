const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

// Mock AI Generation for testing without API Key
const generateMockQuestions = (count = 5) => {
    const questions = [];
    for (let i = 1; i <= count; i++) {
        questions.push({
            questionText: `Sample Question ${i}: Is this a real AI generated question?`,
            options: ['Yes', 'No', 'Maybe', 'I am a mock'],
            correctAnswer: 'I am a mock',
            points: 10,
            type: 'multiple-choice'
        });
    }
    return questions;
};

// LOCAL AI Generation - Calling the FastAPI service
const fs = require('fs');
const generateQuestions = async (type, content, count = 5, difficulty = 'Medium') => {
    try {
        console.log(`🤖 Requesting Local AI: ${type} | Count: ${count} | Difficulty: ${difficulty}`);
        
        const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        let payloadContent = content;

        // Base64 logic for hybrid cloud deployment
        // If we have a file path, read it as base64 to send across the network reliably.
        if (type !== 'topic' && fs.existsSync(content)) {
            console.log(`📦 Converting file to base64 for reliable transmission to AI service...`);
            payloadContent = "base64:" + fs.readFileSync(content, { encoding: 'base64' });
            
            // Clean up the temporary upload from Multer after reading it
            try { fs.unlinkSync(content); } catch(e) { console.error('Failed to cleanup file:', e); }
        }

        const response = await fetch(`${aiUrl}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, content: payloadContent, count, difficulty })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'AI Service Error');
        }

        const data = await response.json();
        console.log(`✅ AI successfully generated ${data.questions.length} questions`);
        return data.questions;

    } catch (err) {
        console.error('❌ AI error:', err.message);
        return generateMockQuestions(count);
    }
};

const generateJoinCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.createQuiz = async (req, res) => {
    try {
        let { title, type, content, questions: manualQuestions, questionCount, difficulty, timerPerQuestion, topic, isLive, isAssessment, isActive, duration } = req.body;
        let finalQuestions = [];

        if (manualQuestions && manualQuestions.length > 0) {
            finalQuestions = Array.isArray(manualQuestions) ? manualQuestions : JSON.parse(manualQuestions);
        } else if (req.file) {
            // New logic: Use the local file path for our Python AI service
            const absolutePath = require('path').resolve(req.file.path);
            console.log(`📄 Processing file: ${req.file.originalname} via ${absolutePath}`);
            
            // Detect type if it was generically set
            let fileType = type;
            const ext = require('path').extname(req.file.originalname).toLowerCase();
            if (['.jpg', '.jpeg', '.png'].includes(ext)) fileType = 'image';
            else if (ext === '.docx') fileType = 'docx';
            else if (ext === '.pptx') fileType = 'pptx';
            else if (ext === '.pdf') fileType = 'pdf';

            finalQuestions = await generateQuestions(fileType, absolutePath, questionCount, difficulty);
        } else if (content || topic) {
            console.log('📚 Generating from topic/content:', (content || topic).substring(0, 100));
            finalQuestions = await generateQuestions('topic', content || topic, questionCount, difficulty);
        }

        if (isLive === 'true' || isLive === true) {
            // Automatic Cleanup: Deactivate existing active live quizzes for this teacher
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

        // Generate a unique join code
        let joinCode = generateJoinCode();
        let codeExists = await Quiz.findOne({ joinCode });
        while (codeExists) {
            joinCode = generateJoinCode();
            codeExists = await Quiz.findOne({ joinCode });
        }

        const newQuiz = new Quiz({
            title: title || `${topic || 'Untitled'} ${type} Quiz`,
            description: `Level: ${difficulty || 'Medium'}`,
            questions: finalQuestions,
            createdBy: req.user.id,
            isActive: isActive === undefined ? true : (isActive === 'true' || isActive === true),
            joinCode,
            difficulty: difficulty || 'Medium',
            timerPerQuestion: timerPerQuestion || 30,
            duration: duration || 0, // 0 means no global limit
            topic: topic || '',
            isLive: isLive === 'true' || isLive === true,
            isAssessment: isAssessment === 'true' || isAssessment === true,
            status: (isLive === 'true' || isLive === true) ? 'waiting' : 'started'
        });

        const quiz = await newQuiz.save();
        res.json(quiz);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.joinByCode = async (req, res) => {
    try {
        const { code } = req.body;
        console.log(`🔍 Try join by code: ${code} (User: ${req.user.id})`);
        const quiz = await Quiz.findOne({ joinCode: code.toString(), isActive: true });

        if (!quiz) {
            console.log(`❌ Quiz not found or not active for code: ${code}`);
            return res.status(404).json({ msg: 'Quiz not found or not active' });
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
        res.json(quizzes);
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
        const quizzes = await Quiz.find({ isActive: true }).sort({ createdAt: -1 });

        const quizzesWithAttempts = await Promise.all(quizzes.map(async (quiz) => {
            const result = await Result.findOne({ quiz: quiz._id, student: req.user.id });
            return {
                ...quiz.toObject(),
                isAttempted: !!result,
                score: result ? result.score : 0,
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

        res.json({
            ...quiz.toObject(),
            previousResult
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { quizId, answers } = req.body;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ msg: 'Quiz not found' });
        }

        let score = 0;
        let totalTimeTaken = 0;
        const formattedAnswers = quiz.questions.map((q, idx) => {
            const selectedOption = (answers[idx]?.selectedOption || '').toString().trim();
            const correctOption = (q.correctAnswer || '').toString().trim();

            let isCorrect = selectedOption.toLowerCase() === correctOption.toLowerCase();

            // Fallback for labels (A, B, C...) or indices
            if (!isCorrect && q.options) {
                const labels = ['a', 'b', 'c', 'd', 'e'];
                const labelIdx = labels.indexOf(correctOption.toLowerCase());
                if (labelIdx !== -1 && q.options[labelIdx]) {
                    isCorrect = selectedOption.toLowerCase() === q.options[labelIdx].toString().trim().toLowerCase();
                } else if (correctOption !== '' && !isNaN(correctOption) && q.options[parseInt(correctOption)]) {
                    isCorrect = selectedOption.toLowerCase() === q.options[parseInt(correctOption)].toString().trim().toLowerCase();
                }
            }

            const qTimeTaken = 0; // Standard submit doesn't track per-question time yet

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

        const existingResult = await Result.findOne({ quiz: quizId, student: req.user.id });

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

        const isTeacher = req.user.id === quiz.createdBy.toString();
        const isAdmin = req.user.role === 'admin';
        const canSeeFullLeaderboard = isTeacher || isAdmin;

        // Fetch all results for this quiz
        const allResults = await Result.find({ quiz: req.params.quizId })
            .populate('student', 'username email');

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

        // Calculate total time and sort: score DESC, totalTime ASC
        const processedResults = allResults.map(r => {
            const startedAt = r.startedAt ? new Date(r.startedAt).getTime() : 0;
            const completedAt = r.completedAt ? new Date(r.completedAt).getTime() : Date.now();
            const totalTime = completedAt - startedAt;
            return {
                ...r.toObject(),
                totalTime
            };
        }).sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
            }
            return (a.totalTime || 0) - (b.totalTime || 0);
        });

        const totalParticipants = processedResults.length;
        const totalScore = processedResults.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalScore / totalParticipants;
        const highestScore = processedResults[0].score;

        // Build ranked list with TIES (rank is same for same score & time)
        const rankedResults = [];
        let currentRank = 1;

        for (let i = 0; i < processedResults.length; i++) {
            const r = processedResults[i];

            // If not the first result and matches previous score AND totalTime, keep same rank
            if (i > 0) {
                const prev = processedResults[i - 1];
                if (r.score !== prev.score || r.totalTime !== prev.totalTime) {
                    currentRank = i + 1;
                }
            }

            rankedResults.push({
                studentId: r.student._id,
                username: r.student.username,
                currentScore: r.score,
                totalTimeTaken: r.totalTimeTaken || r.totalTime || 0,
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
            // Teacher gets full data INCLUDING answers for the answer-map dots
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

exports.getTeacherStats = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.user.id }).sort({ createdAt: -1 });

        const stats = await Promise.all(quizzes.map(async (quiz) => {
            // Fetch live results for the quiz
            const dbResults = await Result.find({ quiz: quiz._id })
                .populate('student', 'username email')
                .sort({ score: -1, completedAt: 1 });

            const results = dbResults.map(r => ({
                studentName: r.student?.username || 'Unknown',
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

exports.submitAttempt = async (req, res) => {
    // Alias for submitQuiz
    return exports.submitQuiz(req, res);
};

exports.updateQuiz = async (req, res) => {
    try {
        const { title, description, questions, difficulty, timerPerQuestion, duration, isLive, isActive, isAssessment } = req.body;

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

        // Activation / Deactivation logic
        if (isActive !== undefined) {
            const requestedActive = isActive === 'true' || isActive === true;

            if (requestedActive && !quiz.isActive) {
                // Automatic Cleanup: Deactivate other active sessions for this teacher
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
        let { type, content, questionCount, difficulty, topic } = req.body;
        let finalQuestions = [];
        let extractedTitle = topic || '';

        if (req.file && type === 'pdf') {
            try {
                const data = await pdfParse(req.file.buffer);
                const cleanedText = data.text.replace(/\s+/g, ' ').trim();
                finalQuestions = await generateQuestions('pdf', cleanedText, questionCount, difficulty);
                extractedTitle = req.file.originalname.replace('.pdf', '');
            } catch (pdfErr) {
                console.error('❌ PDF Parsing Error:', pdfErr.message);
                finalQuestions = generateMockQuestions(questionCount || 5);
            }
        } else if (content || topic) {
            finalQuestions = await generateQuestions(type, content || topic, questionCount, difficulty);
        }

        res.json({
            questions: finalQuestions,
            title: extractedTitle,
            duration: 10 // Default duration for review
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Generation Error: ' + err.message });
    }
};

exports.getStudentHistory = async (req, res) => {
    try {
        // Find all quizzes that are finished
        const finishedQuizzes = await Quiz.find({
            $or: [
                { status: 'finished' },
                { isActive: false }
            ]
        }).sort({ createdAt: -1 });

        const history = await Promise.all(finishedQuizzes.map(async (quiz) => {
            const result = await Result.findOne({ quiz: quiz._id, student: req.user.id });

            return {
                _id: quiz._id,
                title: quiz.title,
                topic: quiz.topic,
                description: quiz.description,
                date: quiz.createdAt,
                completedAt: result ? result.completedAt : null,
                score: result ? result.score : 0,
                totalQuestions: quiz.questions.length,
                status: result ? 'Completed' : 'Missed',
                isAttempted: !!result
            };
        }));

        res.json(history);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};
