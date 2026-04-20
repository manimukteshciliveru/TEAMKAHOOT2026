const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// --- CONFIGURATION ---
require('dotenv').config({ path: path.join(__dirname, '.env') });
const REMOTE_MONGO_URI = process.env.MONGO_URI;
const DEFAULT_PASSWORD = 'kmit';
// ---------------------

async function populateRemote() {
    try {
        if (!REMOTE_MONGO_URI) {
            console.error('ERROR: MONGO_URI is missing from .env file!');
            process.exit(1);
        }

        const sanitizedUri = REMOTE_MONGO_URI.replace(/:([^@]+)@/, ':****@');
        console.log(`Connecting to: ${sanitizedUri}`);

        await mongoose.connect(REMOTE_MONGO_URI);
        console.log('Connected successfully.');

        console.log('Hashing default password...');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        // Path to the student data directory
        const dataDir = path.join(__dirname, 'student_data');
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

        let allStudents = [];

        console.log('Reading student data files...');
        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const formatted = data.map(s => ({
                username: s.name,
                email: s.rollNo, // Using Roll Number in the email field
                password: passwordHash,
                role: 'student'
            }));

            allStudents = allStudents.concat(formatted);
            console.log(`- Loaded ${data.length} students from ${file}`);
        }

        console.log(`Total students to import: ${allStudents.length}`);

        // 1. Delete existing students
        console.log('Clearing existing students from database...');
        const deleteResult = await User.deleteMany({ role: 'student' });
        console.log(`Deleted ${deleteResult.deletedCount} existing students.`);

        // 2. Bulk insert new students
        console.log('Importing new students...');
        // We use insertMany with ordered: false to continue even if some duplicates exist
        const result = await User.insertMany(allStudents, { ordered: false });
        console.log(`Successfully imported ${result.length} students.`);

        process.exit(0);
    } catch (err) {
        if (err.code === 11000) {
            console.warn('Warning: Some duplicate records were skipped.');
            process.exit(0);
        } else {
            console.error('CRITICAL ERROR:', err.message);
            process.exit(1);
        }
    }
}

populateRemote();
