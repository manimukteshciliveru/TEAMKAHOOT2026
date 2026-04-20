const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-quiz-platform');
        const count = await User.countDocuments({ role: 'student' });
        console.log('STUDENT_COUNT_START');
        console.log(count);
        console.log('STUDENT_COUNT_END');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
check();
