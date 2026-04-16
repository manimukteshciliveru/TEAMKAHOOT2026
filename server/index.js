require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// Middleware
app.use(cors({
    origin: ['https://kmit-khaoot.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz', require('./routes/quiz'));

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for the live app
        methods: ["GET", "POST"]
    }
});

// Store participants for each room
const roomParticipants = new Map(); // { quizId: [{ username, role, socketId }] }
// Store current state for each room
const roomState = new Map(); // { quizId: { currentQuestion: 0, status: 'started', endTime: TIMESTAMP } }
// Map to track which room/user a socket belongs to
const socketToUser = new Map(); // { socketId: { quizId, username } }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ quizId, user }) => {
        socket.join(quizId);

        // Track this socket's association for disconnect cleanup
        socketToUser.set(socket.id, { quizId, username: user.username });

        if (!roomParticipants.has(quizId)) {
            roomParticipants.set(quizId, []);
        }

        const participants = roomParticipants.get(quizId);
        const existingIdx = participants.findIndex(p => p.username === user.username);

        const userData = { ...user, socketId: socket.id, isOnline: true };
        if (existingIdx !== -1) {
            participants[existingIdx] = userData;
        } else if (user.username) {
            participants.push(userData);
        }

        console.log(`User ${user.username} (${user.role}) joined room ${quizId}. Total participants: ${participants.length}`);
        io.to(quizId).emit('participants_update', participants);

        // SYNC STATE
        const state = roomState.get(quizId);
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
                console.log(`Sending progress history to ${user.username} (${user.role})`);
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

    socket.on('reconnectUser', ({ quizId, user }) => {
        socket.join(quizId);
        socketToUser.set(socket.id, { quizId, username: user.username });

        if (!roomParticipants.has(quizId)) {
            roomParticipants.set(quizId, []);
        }

        const participants = roomParticipants.get(quizId);
        const existingIdx = participants.findIndex(p => p.username === user.username);

        // ROBUSTNESS: If client forgot the _id, try to restore it from existing participant entry
        const effectiveUser = { ...user };
        if (!effectiveUser._id && existingIdx !== -1 && participants[existingIdx]._id) {
            effectiveUser._id = participants[existingIdx]._id;
        }

        const userData = { ...effectiveUser, socketId: socket.id, isOnline: true };
        if (existingIdx !== -1) {
            participants[existingIdx] = userData;
        } else if (user.username) {
            participants.push(userData);
        }

        console.log(`User ${user.username} (${user.role}) reconnected to room ${quizId}. ID: ${userData._id}`);
        io.to(quizId).emit('participants_update', participants);

        const sendRestoreState = async () => {
            let state = roomState.get(quizId) || {};
            
            // Re-fetch/Rebuild state logic ...
             if (!state.leaderboard || !state.progress) {
                 try {
                     const Result = require('./models/Result');
                     const Quiz = require('./models/Quiz');
                     const quizInfo = await Quiz.findById(quizId);
                     
                     if (quizInfo) {
                         const allResults = await Result.find({ quiz: quizId }).populate('student', 'username');
                         
                         // Rebuild Leaderboard
                         const leaderboard = allResults
                             .map(r => ({
                                 studentId: r.student?._id || null,
                                 username: r.student?.username || 'Unknown',
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
                         roomState.set(quizId, state);
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
             socket.emit('restoreState', restoreStatePayload);
             console.log(`Sent restoreState to ${user.username}`);
        };
        
        sendRestoreState();
    });

    socket.on('start_quiz', async (quizId) => {
        try {
            const Quiz = require('./models/Quiz');
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

            const state = roomState.get(quizId) || {};
            roomState.set(quizId, { ...state, status: 'started', currentQuestion: 0, endTime });

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
        roomState.delete(quizId);
        try {
            const Quiz = require('./models/Quiz');
            const Result = require('./models/Result');

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
            const allResults = await Result.find({ quiz: quizId }).populate('student', 'username');
            const finalLeaderboard = allResults
                .map(r => ({
                    studentId: r.student?._id?.toString(),
                    username: r.student?.username || 'Unknown',
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
            const topStudent = finalLeaderboard[0]?.username || null;
            await Quiz.findByIdAndUpdate(quizId, {
                status: 'finished',
                finalLeaderboard: finalLeaderboard.map(r => ({
                    studentId: r.studentId,
                    username: r.username,
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
            const Quiz = require('./models/Quiz');
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
            const Quiz = require('./models/Quiz');
            const quiz = await Quiz.findById(quizId);
            if (!quiz) return;

            // Reset Master Time for the new question if it's per-question
            let endTime = null;
            if (quiz.duration === 0) {
                endTime = Date.now() + ((quiz.timerPerQuestion || 30) * 1000);
            }

            const state = roomState.get(quizId) || {};
            if (endTime) state.endTime = endTime;

            roomState.set(quizId, { ...state, currentQuestion: parseInt(questionIndex) });

            io.to(quizId).emit('change_question', { questionIndex });
            if (endTime) io.to(quizId).emit('sync_timer', { timeLeft: Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) });
        } catch (err) {
            console.error('Error changing question:', err);
        }
    });

    // Tracking which question a student is currently viewing
    socket.on('student_question_focus', ({ quizId, studentId, username, questionIndex }) => {
        console.log(`Student ${username} focused on question ${questionIndex} in quiz ${quizId}`);

        // Broadcast to teacher only (or everyone in room if room UI needs it)
        io.to(quizId).emit('student_focus_update', {
            studentId,
            username,
            questionIndex
        });
    });

    // Increase time for the current question
    socket.on('increase_time', ({ quizId, additionalSeconds }) => {
        const state = roomState.get(quizId);
        if (state && state.endTime) {
            state.endTime += (additionalSeconds * 1000);
            roomState.set(quizId, { ...state, endTime: state.endTime });

            const timeLeft = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
            io.to(quizId).emit('timer_update', { additionalSeconds });
            io.to(quizId).emit('sync_timer', { timeLeft });
        }
    });

    // Handle individual question submission during live quiz
    socket.on('submit_question_answer', async ({ quizId, studentId, questionIndex, answer, timeRemaining }) => {
        // Ensure questionIndex is an integer
        questionIndex = parseInt(questionIndex);
        console.log(`Student ${studentId} submitted answer for question ${questionIndex}`);

        // PERSISTENCE: Save to In-Memory Room State for immediate access/recovery
        const state = roomState.get(quizId) || {};
        const currentProgress = state.progress || {};

        if (!currentProgress[studentId]) currentProgress[studentId] = {};
        
        // We will update the progress dictionary *again* down below once we know if it was correct or not.
        // For now, mark it superficially as 'answered: true' so UI updates immediately (optimistic).
        currentProgress[studentId][questionIndex] = { answered: true, isCorrect: false };

        roomState.set(quizId, { ...state, progress: currentProgress });

        try {
            const Quiz = require('./models/Quiz');
            const Result = require('./models/Result');

            const quiz = await Quiz.findById(quizId);
            if (!quiz) return;

            // Calculate time taken for this question
            const timerMax = quiz.duration > 0 ? (quiz.duration * 60) : (quiz.timerPerQuestion || 30);
            const qTimeTaken = Math.max(0, timerMax - (timeRemaining || 0));

            let result = await Result.findOne({ quiz: quizId, student: studentId }).populate('student', 'username');

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

                // Extra robust normalization
                const studentAnswer = (answer || "").toString().trim().toLowerCase();
                const correctAnswer = (question.correctAnswer || "").toString().trim().toLowerCase();

                let isCorrect = studentAnswer === correctAnswer;

                // Fallback for AI-generated labels (A, B, C...) or indices (0, 1, 2...)
                if (!isCorrect && question.options) {
                    const labels = ['a', 'b', 'c', 'd', 'e'];
                    const labelIdx = labels.indexOf(correctAnswer);
                    if (labelIdx !== -1 && question.options[labelIdx]) {
                        isCorrect = studentAnswer === question.options[labelIdx].toString().trim().toLowerCase();
                    } else if (correctAnswer !== '' && !isNaN(correctAnswer) && question.options[parseInt(correctAnswer)]) {
                        isCorrect = studentAnswer === question.options[parseInt(correctAnswer)].toString().trim().toLowerCase();
                    }
                }

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
                roomState.set(quizId, { ...state, progress: updatedProgress });

                result.status = 'in-progress';
                if (!result.startedAt) result.startedAt = Date.now();

                // Track when the last answer was submitted for tiebreaking
                result.lastAnsweredAt = new Date();

                await result.save();

                // Broadcast student progress to teacher with isCorrect
                io.to(quizId).emit('student_progress_update', {
                    studentId: studentId.toString(),
                    username: result.student ? result.student.username : 'Student',
                    questionIndex,
                    answered: true,
                    isCorrect // FIX: Added isCorrect to broadcast
                });

                // Leaderboard calculation with speed tie-breaker
                const allResults = await Result.find({ quiz: quizId }).populate('student', 'username');
                const leaderboard = allResults
                    .map(r => ({
                        studentId: r.student._id,
                        username: r.student.username,
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
                const updatedState = roomState.get(quizId) || {};
                roomState.set(quizId, { ...updatedState, leaderboard });

                io.to(quizId).emit('question_leaderboard', {
                    questionIndex,
                    leaderboard
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
            const Quiz = require('./models/Quiz');
            const Result = require('./models/Result');

            const quiz = await Quiz.findById(quizId);
            const result = await Result.findOne({ quiz: quizId, student: studentId });

            if (quiz && result && quiz.questions[questionIndex]) {
                const studentAnswer = (answer || "").toString().trim().toLowerCase();
                const correctAnswer = (question.correctAnswer || "").toString().trim().toLowerCase();

                let isCorrect = studentAnswer === correctAnswer;

                // Fallback for AI-generated labels (A, B, C...) or indices (0, 1, 2...)
                if (!isCorrect && question.options) {
                    const labels = ['a', 'b', 'c', 'd', 'e'];
                    const labelIdx = labels.indexOf(correctAnswer);
                    if (labelIdx !== -1 && question.options[labelIdx]) {
                        isCorrect = studentAnswer === question.options[labelIdx].toString().trim().toLowerCase();
                    } else if (correctAnswer !== '' && !isNaN(correctAnswer) && question.options[parseInt(correctAnswer)]) {
                        isCorrect = studentAnswer === question.options[parseInt(correctAnswer)].toString().trim().toLowerCase();
                    }
                }

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
            const { quizId, username } = info;
            const participants = roomParticipants.get(quizId);
            if (participants) {
                const existingIdx = participants.findIndex(p => p.username === username);
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
