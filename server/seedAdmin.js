const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quiz-portal');
        console.log('MongoDB Connected...');

        const employeeId = 'admin2026';
        const password = 'admin@2026$';
        const role = 'admin';


        let user = await User.findOne({ employeeId });
        if (user) {
            console.log('Admin user already exists. Updating password...');
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
            console.log('Admin password updated.');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({
                name: 'Administrator',
                employeeId,
                password: hashedPassword,
                role
            });


            await user.save();
            console.log('Admin user created successfully.');
        }

        process.exit();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

seedAdmin();
