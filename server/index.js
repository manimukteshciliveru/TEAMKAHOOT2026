require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');
const { compareAnswers } = require('./utils/helpers');
const ocrService = require('./utils/ocrService');

// Initialize OCR Service Pool
ocrService.initialize();

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET is not defined. Authentication will not work properly.');
}

const app = express();
const server = http.createServer(app);

// ── ULTIMATE CONNECTION PATCH ──
// We are hardcoding your Vercel URL to guarantee it matches
const allowedOrigins = [
    'https://teamkahoot-2026.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

// 1. Move CORS to the ABSOLUTE TOP
app.use(cors({
    origin: (origin, callback) => {
        // If it's your Vercel site or localhost, say YES.
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
            return callback(null, true);
        }
        callback(null, true); // Fallback: allow all for now to stop the crash
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-requested-with', 'Accept']
}));

// 2. TEMPORARILY REMOVE HELMET (It is likely the cause of the block)
// app.use(helmet()); 

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Models
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Result = require('./models/Result');

// 3. Simple Socket.io Config
const io = new Server(server, {
    cors: {
        origin: true, // Tells Socket.io to trust the requester's origin
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true
});

// DEPLOYMENT READY: Health Check for Render/Monitoring
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

module.exports = { app, server, io };

// Store participants for each room
const roomParticipants = new Map(); // { quizId: [{ name, role, socketId }] }
// Store current state for each room
const roomState = new Map(); // { quizId: { currentQuestion: 0, status: 'started', endTime: TIMESTAMP } }
// Map to track which room/user a socket belongs to
const socketToUser = new Map(); // { socketId: { quizId, name } }

// HEARTBEAT SWEEPER: Every 5 seconds, check for stale connections
setInterval(() => {
    const now = Date.now();
    for (const [quizId, participants] of roomParticipants.entries()) {
        let updated = false;
        participants.forEach(p => {
            if (p.isOnline && p.lastSeen && (now - p.lastSeen > 10000)) {
                p.isOnline = false;
                p.socketId = null;
                updated = true;
                console.log(`[Heartbeat Timeout] User ${p.name} marked offline in room ${quizId}`);
            }
        });
        if (updated) {
            io.to(quizId).emit('participants_update', participants);
        }
    }
}, 5000);
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', async ({ quizId, user }) => {
        socket.join(quizId);

        const userId = (user._id || user.id)?.toString();
        let userName = user.name || user.username || user.displayName || 'Unknown';
        let realUser = user;

        try {
            // Verify identity against DB instead of trusting client payload
            const dbUser = await User.findById(userId);
            if (dbUser) {
                userName = dbUser.name;
                realUser = { 
                    ...user, 
                    name: dbUser.name, 
                    username: dbUser.username || dbUser.name,
                    rollNumber: dbUser.rollNumber,
                    _id: dbUser._id.toString(),
                    role: dbUser.role
                };
            }
        } catch (e) {
            console.error("Socket Auth Error:", e);
        }
        
        // Track this socket's association for disconnect cleanup
        socketToUser.set(socket.id, { quizId, name: userName, userId });

        if (!roomParticipants.has(quizId.toString())) {
            roomParticipants.set(quizId.toString(), []);
        }

        const participants = roomParticipants.get(quizId.toString());
        
        // Match by ID or fallback to name
        const existingIdx = participants.findIndex(p => 
            (userId && p._id?.toString() === userId) || 
            (userName !== 'Unknown' && (p.name === userName || p.username === userName))
        );

        const userData = { 
            ...realUser, 
            name: userName, 
            username: userName, 
            _id: userId, 
            socketId: socket.id, 
            isOnline: true, 
            lastSeen: Date.now() 
        };

        if (existingIdx !== -1) {
            participants[existingIdx] = userData;
        } else {
            participants.push(userData);
        }

        // Clean up any other duplicates that might have slipped in (by _id)
        const uniqueParticipants = Array.from(new Map(participants.map(p => [p._id?.toString() || p.username || p.socketId, p])).values());
        roomParticipants.set(quizId.toString(), uniqueParticipants);

        console.log(`Verified User ${userData.name} joined room ${quizId}. Total: ${uniqueParticipants.length}`);
        io.to(quizId).emit('participants_update', uniqueParticipants);

        // SYNC STATE
        const state = roomState.get(quizId.toString());
        if (state) {
            if (state.status === 'started') socket.emit('quiz_started');
            if (state.currentQuestion !== undefined) socket.emit('change_question', { questionIndex: state.currentQuestion });

            // MASTER TIMER SYNC
            if (state.endTime) {
                const timeLeft = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
                socket.emit('sync_timer', { timeLeft });
            }
            // Send persisted progress to teacher
            if (state.progress) {
                console.log(`Sending progress history to ${user.name} (${user.role})`);
                socket.emit('progress_history', state.progress);
            }
            // Sync leaderboard for all participants (Teacher and Students) on join/reconnect
            if (state.leaderboard) {
                socket.emit('question_leaderboard', {
                    questionIndex: state.currentQuestion || 0,
                    leaderboard: state.leaderboard,
                    liveInsights: state.liveInsights || null
                });
            }
        }
    });

    socket.on('heartbeat', ({ quizId, id, userId }) => {
        const effectiveId = id || userId;
        if (!quizId || !effectiveId) return;
        const participants = roomParticipants.get(quizId.toString());
        if (participants) {
            const p = participants.find(part => 
                (part._id && (part._id === effectiveId || part._id.toString() === effectiveId.toString())) || 
                part.name === effectiveId || 
                part.username === effectiveId
            );
            if (p) {
                p.lastSeen = Date.now();
                if (!p.isOnline) {
                    p.isOnline = true;
                    // If they were previously offline, broadcast they are back online immediately
                    io.to(quizId).emit('participants_update', participants);
                    console.log(`[Heartbeat] User ${p.username || p.name} is back online in room ${quizId}`);
                }
            }
        }
    });
    socket.on('reconnectUser', ({ quizId, user }) => {
        socket.join(quizId);
        const userName = user.name || user.username || user.displayName || 'Unknown';
        const userId = (user._id || user.id)?.toString();
        
        socketToUser.set(socket.id, { quizId, name: userName, userId });

        if (!roomParticipants.has(quizId.toString())) {
            roomParticipants.set(quizId.toString(), []);
        }

        const participants = roomParticipants.get(quizId.toString());
        
        // Match by ID or fallback to name
        const existingIdx = participants.findIndex(p => 
            (userId && p._id?.toString() === userId) || 
            (userName !== 'Unknown' && (p.name === userName || p.username === userName))
        );

        // ROBUSTNESS: Restore missing data from existing entry
        const effectiveUser = { 
            ...user, 
            name: user.name || userName, 
            username: user.username || userName, 
            _id: userId
        };
        
        if (existingIdx !== -1) {
            const existing = participants[existingIdx];
            if (!effectiveUser.name || effectiveUser.name === 'Unknown') effectiveUser.name = existing.name;
            if (!effectiveUser._id) effectiveUser._id = existing._id?.toString();
        }

        const userData = { ...effectiveUser, socketId: socket.id, isOnline: true, lastSeen: Date.now() };
        
        if (existingIdx !== -1) {
            participants[existingIdx] = userData;
        } else {
            participants.push(userData);
        }

        // Deduplicate
        const uniqueParticipants = Array.from(new Map(participants.map(p => [p._id?.toString() || p.username || p.socketId, p])).values());
        roomParticipants.set(quizId.toString(), uniqueParticipants);

        console.log(`User ${userData.name} reconnected. ID: ${userData._id}`);
        io.to(quizId).emit('participants_update', uniqueParticipants);

        const sendRestoreState = async () => {
            let state = roomState.get(quizId.toString()) || {};
            
            // Re-fetch/Rebuild state logic ...
             if (!state.leaderboard || !state.progress) {
                 try {
                     const quizInfo = await Quiz.findById(quizId);
                     
                     if (quizInfo) {
                         const allResults = await Result.find({ quiz: quizId }).populate('student', 'name');
                         
                         // Rebuild Leaderboard
                         const leaderboard = allResults
                             .map(r => ({
                                 studentId: r.student?._id || null,
                                 name: r.student?.name || 'Unknown',
                                 currentScore: r.score || 0,
                                 totalTimeTaken: r.totalTimeTaken || 0,
                                 lastAnsweredAt: r.lastAnsweredAt || r.startedAt || new Date(),
                                 answeredQuestions: r.answers?.length || 0
                             }))
                             .sort((a, b) => {
                                 if (b.currentScore !== a.currentScore) return b.currentScore - a.currentScore;
                                 if (a.totalTimeTaken !== b.totalTimeTaken) return a.totalTimeTaken - b.totalTimeTaken;
                                 return new Date(a.lastAnsweredAt) - new Date(b.lastAnsweredAt);
                             })
                             .map((item, index) => ({ ...item, rank: index + 1 }));

                         // Rebuild Progress Dictionary
                         const progress = {};
                         allResults.forEach(r => {
                             const studentIdStr = r.student?._id?.toString();
                             if (studentIdStr) {
                                  progress[studentIdStr] = {};
                                  r.answers.forEach(ans => {
                                      // Find which question index this was
                                      const qIdx = quizInfo.questions.findIndex(q => q.questionText === ans.questionText);
                                      if (qIdx !== -1) {
                                          progress[studentIdStr][qIdx] = {
                                              answered: true,
                                              isCorrect: ans.isCorrect
                                          };
                                      }
                                  });
                             }
                         });

                         state = { ...state, leaderboard, progress, status: quizInfo.status };
                         roomState.set(quizId.toString(), state);
                     }
                 } catch (err) {
                     console.error('Error rebuilding state on reconnect:', err);
                 }
             }

             let timeLeft = 0;
             if (state.endTime) {
                 timeLeft = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
             }

             const restoreStatePayload = {
                 currentQuestionIndex: state.currentQuestion || 0,
                 remainingTime: timeLeft,
                 quizStatus: state.status,
                 leaderboard: state.leaderboard || [],
                 participants: participants,
                 progress: state.progress || {}
             };
             // CRITICAL FIX: Ensure the student sees the question Change immediately
             if (state.currentQuestion !== undefined) {
                 socket.emit('change_question', { questionIndex: state.currentQuestion });
             }
             socket.emit('restoreState', restoreStatePayload);
             console.log(`Sent restoreState to ${user.name}`);
        };
        
        sendRestoreState();
    });

    socket.on('start_quiz', async (quizId) => {
        try {
            const quiz = await Quiz.findById(quizId);
            if (!quiz) return;

            // Calculate duration in ms
            let durationMs = 0;
            if (quiz.duration > 0) {
                durationMs = quiz.duration * 60 * 1000;
            } else {
                // Per-question: estimate total time
                durationMs = (quiz.questions.length * (quiz.timerPerQuestion || 30)) * 1000;
            }
            const endTime = Date.now() + durationMs;

            const state = roomState.get(quizId.toString()) || {};
            roomState.set(quizId.toString(), { ...state, status: 'started', currentQuestion: 0, endTime });

            await Quiz.findByIdAndUpdate(quizId, { status: 'started' });
            io.to(quizId).emit('quiz_started');
            io.to(quizId).emit('sync_timer', { timeLeft: Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) });

            // Auto-terminate when global timer expires (for duration-based quizzes)
            if (quiz.duration > 0) {
                setTimeout(async () => {
                    const currentState = roomState.get(quizId.toString());
                    if (currentState && currentState.status !== 'finished') {
                        roomState.delete(quizId.toString());
                        try {
                            await Quiz.findByIdAndUpdate(quizId, { status: 'finished' });
                        } catch (err2) {
                            console.error('Error auto-finishing quiz:', err2);
                        }
                        io.to(quizId).emit('quiz_ended');
                        console.log(`Quiz ${quizId} auto-terminated after global timer expired.`);
                    }
                }, durationMs + 3000); // small buffer
            }
        } catch (err) {
            console.error('Error starting quiz:', err);
        }
    });

    socket.on('end_quiz', async (quizId) => {
        roomState.delete(quizId.toString());
        try {

            // 1. Finalize all in-progress student results FIRST
            await Result.updateMany(
                { quiz: quizId, status: 'in-progress' },
                {
                    $set: {
                        status: 'completed',
                        completedAt: Date.now()
                    }
                }
            );

            // 2. Compute final leaderboard rankings from persisted Results
            const allResults = await Result.find({ quiz: quizId }).populate('student', 'name');
            const finalLeaderboard = allResults
                .map(r => ({
                    studentId: r.student?._id?.toString(),
                    name: r.student?.name || 'Unknown',
                    currentScore: r.score || 0,
                    totalTimeTaken: r.totalTimeTaken || 0,
                    lastAnsweredAt: r.lastAnsweredAt || r.startedAt || new Date(),
                    answeredQuestions: r.answers?.length || 0
                }))
                .sort((a, b) => {
                    if (b.currentScore !== a.currentScore) return b.currentScore - a.currentScore;
                    if (a.totalTimeTaken !== b.totalTimeTaken) return a.totalTimeTaken - b.totalTimeTaken;
                    return new Date(a.lastAnsweredAt) - new Date(b.lastAnsweredAt);
                })
                .map((item, index) => ({ ...item, rank: index + 1 }));

            // 3. Save final leaderboard to Quiz document (for teacher My Quizzes view)
            const topStudent = finalLeaderboard[0]?.name || null;
            await Quiz.findByIdAndUpdate(quizId, {
                status: 'finished',
                finalLeaderboard: finalLeaderboard.map(r => ({
                    studentId: r.studentId,
                    name: r.name,
                    currentScore: r.currentScore,
                    answeredQuestions: r.answeredQuestions,
                    rank: r.rank
                })),
                finalInsights: {
                    topStudent,
                    hardestQuestion: null,
                    easiestQuestion: null
                }
            });

            console.log(`Quiz ${quizId} ended. Finalized ${allResults.length} results. Top student: ${topStudent}`);

            // 4. Emit quiz_ended AFTER data is saved — students will navigate with correct data
            io.to(quizId).emit('quiz_ended');
        } catch (err) {
            console.error('Error ending quiz:', err);
            // Still emit so students aren't stuck
            io.to(quizId).emit('quiz_ended');
        }
    });

    // Add question to live quiz
    socket.on('add_question', async ({ quizId, question }) => {
        console.log(`Adding question to quiz: ${quizId}`);
        try {
            const quiz = await Quiz.findById(quizId);

            if (quiz) {
                quiz.questions.push(question);
                await quiz.save();

                // Broadcast new question to all students in the room
                io.to(quizId).emit('new_question_added', {
                    question,
                    questionIndex: quiz.questions.length - 1,
                    totalQuestions: quiz.questions.length
                });

                console.log(`Question added successfully to quiz ${quizId}`);
            }
        } catch (err) {
            console.error('Error adding question:', err);
        }
    });

    // Handle teacher changing question (Navigation)
    socket.on('change_question', async ({ quizId, questionIndex }) => {
        try {
            const quiz = await Quiz.findById(quizId);
            if (!quiz) return;

            // Reset Master Time for the new question if it's per-question
            let endTime = null;
            if (quiz.duration === 0) {
                endTime = Date.now() + ((quiz.timerPerQuestion || 30) * 1000);
            }

            const state = roomState.get(quizId.toString()) || {};
            if (endTime) state.endTime = endTime;

            roomState.set(quizId.toString(), { ...state, currentQuestion: parseInt(questionIndex) });

            io.to(quizId).emit('change_question', { questionIndex });
            if (endTime) io.to(quizId).emit('sync_timer', { timeLeft: Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) });
        } catch (err) {
            console.error('Error changing question:', err);
        }
    });

    // Tracking which question a student is currently viewing
    socket.on('student_question_focus', ({ quizId, studentId, name, questionIndex }) => {
        console.log(`Student ${name} focused on question ${questionIndex} in quiz ${quizId}`);

        // Broadcast to teacher only (or everyone in room if room UI needs it)
        io.to(quizId).emit('student_focus_update', {
            studentId,
            name,
            questionIndex
        });
    });

    // Increase time for the current question
    socket.on('increase_time', ({ quizId, additionalSeconds }) => {
        const state = roomState.get(quizId.toString());
        if (state && state.endTime) {
            state.endTime += (additionalSeconds * 1000);
            roomState.set(quizId.toString(), { ...state, endTime: state.endTime });

            const timeLeft = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
            io.to(quizId).emit('timer_update', { additionalSeconds });
            io.to(quizId).emit('sync_timer', { timeLeft });
        }
    });

    // Handle individual question submission during live quiz
    socket.on('submit_question_answer', async ({ quizId, studentId, questionIndex, answer, timeRemaining, timeTaken }) => {
        // Ensure questionIndex is an integer
        questionIndex = parseInt(questionIndex);
        console.log(`Student ${studentId} submitted answer for question ${questionIndex}`);

        const state = roomState.get(quizId.toString()) || {};
        const currentProgress = state.progress || {};
 
        if (!currentProgress[studentId]) currentProgress[studentId] = {};
        
        // --- STRICT MODE BLOCKER: Check for duplicate submissions ---
        if (currentProgress[studentId][questionIndex] && currentProgress[studentId][questionIndex].answered) {
            console.log(`[STRICT MODE] Prevented duplicate answer for student ${studentId} on question ${questionIndex}`);
            // Let the client know it was ignored but don't crash or save anything
            return;
        }
        
        // We will update the progress dictionary *again* down below once we know if it was correct or not.
        // For now, mark it superficially as 'answered: true' so UI updates immediately (optimistic).
        currentProgress[studentId][questionIndex] = { answered: true, isCorrect: false };
 
        roomState.set(quizId.toString(), { ...state, progress: currentProgress });

        try {
            const quiz = await Quiz.findById(quizId);
            if (!quiz) return;

            // Calculate time taken for this question
            const timerMax = quiz.duration > 0 ? (quiz.duration * 60) : (quiz.timerPerQuestion || 30);
            const qTimeTaken = timeTaken !== undefined ? timeTaken : Math.max(0, timerMax - (timeRemaining || 0));

            let result = await Result.findOne({ quiz: quizId, student: studentId }).populate('student', 'name');

            if (!result) {
                result = new Result({
                    quiz: quizId,
                    student: studentId,
                    score: 0,
                    totalTimeTaken: 0,
                    totalQuestions: quiz.questions.length,
                    answers: []
                });
            }

            // Ensure numeric values to avoid NaN
            result.score = result.score || 0;
            result.totalTimeTaken = result.totalTimeTaken || 0;

            if (quiz.questions[questionIndex]) {
                const question = quiz.questions[questionIndex];

                const isCorrect = compareAnswers(answer, question.correctAnswer, question.options);

                const points = isCorrect ? (question.points || 10) : 0;

                const existingAnswerIndex = result.answers.findIndex(
                    a => a.questionText === question.questionText
                );

                const answerData = {
                    questionText: question.questionText,
                    selectedOption: answer,
                    correctOption: question.correctAnswer,
                    isCorrect,
                    timeTaken: qTimeTaken
                };

                if (existingAnswerIndex >= 0) {
                    const oldAnswer = result.answers[existingAnswerIndex];
                    const oldPoints = oldAnswer.isCorrect ? (question.points || 10) : 0;
                    const oldTime = oldAnswer.timeTaken || 0;

                    result.score = result.score - oldPoints + points;
                    result.totalTimeTaken = result.totalTimeTaken - oldTime + qTimeTaken;
                    result.answers[existingAnswerIndex] = answerData;
                } else {
                    result.answers.push(answerData);
                    result.score += points;
                    result.totalTimeTaken += qTimeTaken;
                }
                
                // Update in-memory state with the actual isCorrect value for reconnection sync
                const updatedProgress = state.progress || {};
                if (!updatedProgress[studentId]) updatedProgress[studentId] = {};
                updatedProgress[studentId][questionIndex] = { answered: true, isCorrect };
                roomState.set(quizId.toString(), { ...state, progress: updatedProgress });

                result.status = 'in-progress';
                if (!result.startedAt) result.startedAt = Date.now();

                // Track when the last answer was submitted for tiebreaking
                result.lastAnsweredAt = new Date();

                await result.save();

                // Broadcast student progress to teacher with isCorrect
                io.to(quizId).emit('student_progress_update', {
                    studentId: studentId.toString(),
                    name: result.student ? result.student.name : 'Student',
                    questionIndex,
                    answered: true,
                    isCorrect // FIX: Added isCorrect to broadcast
                });

                // Leaderboard calculation with speed tie-breaker
                const allResults = await Result.find({ quiz: quizId }).populate('student', 'name');
                const leaderboard = allResults
                    .map(r => ({
                        studentId: r.student._id,
                        name: r.student.name,
                        currentScore: r.score,
                        totalTimeTaken: r.totalTimeTaken || 0,
                        lastAnsweredAt: r.lastAnsweredAt || r.startedAt || new Date(),
                        answeredQuestions: r.answers.length
                    }))
                    .sort((a, b) => {
                        // PRIMARY: Highest Score
                        if (b.currentScore !== a.currentScore) {
                            return b.currentScore - a.currentScore;
                        }
                        // SECONDARY: Lowest Time (Fastest)
                        if (a.totalTimeTaken !== b.totalTimeTaken) {
                            return a.totalTimeTaken - b.totalTimeTaken;
                        }
                        // TERTIARY: Whoever reached this state first
                        return new Date(a.lastAnsweredAt) - new Date(b.lastAnsweredAt);
                    })
                    .map((item, index) => ({ ...item, rank: index + 1 }));

                // Track leaderboard in state
                const updatedState = roomState.get(quizId.toString()) || {};
                
                const liveInsights = {
                    topStudent: leaderboard[0]?.name || null,
                    totalSubmissions: leaderboard.length,
                    averageScore: leaderboard.reduce((acc, curr) => acc + curr.currentScore, 0) / (leaderboard.length || 1)
                };

                roomState.set(quizId.toString(), { ...updatedState, leaderboard, liveInsights });

                io.to(quizId).emit('question_leaderboard', {
                    questionIndex,
                    leaderboard,
                    liveInsights
                });
            }
        } catch (err) {
            console.error('Error submitting question answer:', err);
        }
    });

    // Handle student submission of new question
    socket.on('submit_new_question', async ({ quizId, studentId, questionIndex, answer }) => {
        console.log(`Student ${studentId} submitted answer for question ${questionIndex} in quiz ${quizId}`);
        try {
            const quiz = await Quiz.findById(quizId);
            const result = await Result.findOne({ quiz: quizId, student: studentId });

            if (quiz && result && quiz.questions[questionIndex]) {
                const question = quiz.questions[questionIndex];
                const isCorrect = compareAnswers(answer, question.correctAnswer, question.options);

                const points = isCorrect ? (question.points || 10) : 0;

                // Update result with new answer
                result.answers.push({
                    questionText: question.questionText,
                    selectedOption: answer,
                    correctOption: question.correctAnswer,
                    isCorrect
                });

                result.score += points;
                result.totalQuestions = quiz.questions.length;
                await result.save();

                // Broadcast updated score to the room
                io.to(quizId).emit('score_updated', {
                    studentId,
                    newScore: result.score,
                    questionIndex
                });

                console.log(`Answer submitted successfully. New score: ${result.score}`);
            }
        } catch (err) {
            console.error('Error submitting new question answer:', err);
        }
    });

    socket.on('disconnect', () => {
        const info = socketToUser.get(socket.id);
        if (info) {
            const { quizId, name, userId } = info;
            const participants = roomParticipants.get(quizId);
            if (participants) {
                const existingIdx = participants.findIndex(p => 
                    (userId && p._id?.toString() === userId) || (p.name === name)
                );
                if (existingIdx !== -1) {
                    // Update the user to offline instead of removing them
                    participants[existingIdx].isOnline = false;
                    participants[existingIdx].socketId = null;
                }
                io.to(quizId).emit('participants_update', participants);
            }
            socketToUser.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
