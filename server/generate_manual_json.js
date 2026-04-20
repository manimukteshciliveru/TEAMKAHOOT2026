const fs = require('fs');
const bcrypt = require('bcryptjs');
const students = JSON.parse(fs.readFileSync('server/student_data/cse_a_b_c.json', 'utf8'));

async function generateAtlasJSON() {
    console.log('Generating Atlas-ready JSON (hashing passwords)...');

    // Hash 'kmit' once for efficiency
    const hashedPassword = await bcrypt.hash('kmit', 10);

    const atlasReady = students.map(s => ({
        username: s.rollNo,
        email: s.rollNo, // App uses rollNo as email/login
        password: hashedPassword,
        role: 'student',
        name: s.name,
        createdAt: { "$date": new Date().toISOString() }
    }));

    fs.writeFileSync('server/student_data/atlas_ready_students.json', JSON.stringify(atlasReady, null, 2));
    console.log('Done! File created: server/student_data/atlas_ready_students.json');
}

generateAtlasJSON();
