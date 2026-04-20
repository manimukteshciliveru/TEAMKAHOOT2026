const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    questions: [{
        questionText: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: String, required: true },
        explanation: { type: String },
        points: { type: Number, default: 10 },
        type: { type: String, enum: ['multiple-choice', 'true-false', 'input'], default: 'multiple-choice' }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true // Making it active by default for live join
    },
    joinCode: {
        type: String,
        unique: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Thinkable', 'Hard'],
        default: 'Medium'
    },
    timerPerQuestion: {
        type: Number,
        default: 30 // seconds
    },
    duration: {
        type: Number,
        default: 0 // minutes, 0 = no limit
    },
    topic: {
        type: String
    },
    isLive: {
        type: Boolean,
        default: false
    },
    isAssessment: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['waiting', 'started', 'finished'],
        default: 'waiting' // Live quizzes start in waiting, changed when teacher starts
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    finalLeaderboard: [{
        studentId: String,
        username: String,
        currentScore: Number,
        answeredQuestions: Number,
        rank: Number
    }],
    finalInsights: {
        hardestQuestion: String,
        easiestQuestion: String,
        topStudent: String
    }
});

module.exports = mongoose.model('Quiz', QuizSchema);
