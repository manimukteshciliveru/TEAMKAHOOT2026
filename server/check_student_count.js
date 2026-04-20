const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

const checkStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-quiz-platform');
        const studentCount = await User.countDocuments({ role: 'student' });
        console.log(`Total Students in DB: ${studentCount}`);

        const students = await User.find({ role: 'student' }).select('username email').limit(10).lean();
        console.log('Sample Students:');
        console.log(JSON.stringify(students, null, 2));

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkStudents();
