const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Result = require('./models/Result');

dotenv.config();

const resetDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-quiz-platform');
        console.log('Connected to MongoDB for reset...');

        await User.deleteMany({});
        console.log('Cleared all Users');

        await Quiz.deleteMany({});
        console.log('Cleared all Quizzes');

        await Result.deleteMany({});
        console.log('Cleared all Results');

        console.log('Database reset complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error resetting database:', err);
        process.exit(1);
    }
};

resetDB();
