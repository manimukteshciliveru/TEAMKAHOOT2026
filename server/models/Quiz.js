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
    paceControl: {
        type: Boolean,
        default: true
    },
    duration: {
        type: Number,
        default: 0 // minutes, 0 = no limit
    },
    topic: {
        type: String
    },
    timerMode: {
        type: String,
        enum: ['per-question', 'total'],
        default: 'total'
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
        enum: ['processing', 'waiting', 'started', 'finished'],
        default: 'waiting' 
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    finalLeaderboard: [{
        studentId: String,
        name: String,
        currentScore: Number,
        answeredQuestions: Number,
        rank: Number
    }],
    finalInsights: {
        hardestQuestion: String,
        easiestQuestion: String,
        topStudent: String
    },
    allowedSections: [{ type: String }],
    allowedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    allowedBranches: [{ type: String }],
    scheduledStartTime: {
        type: Date
    },
    scheduledEndTime: {
        type: Date
    }
});

module.exports = mongoose.model('Quiz', QuizSchema);
