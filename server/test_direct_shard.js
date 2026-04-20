const mongoose = require('mongoose');

// This uses the DIRECT shard addresses to bypass the DNS SRV block
const directUri = "mongodb://vamshikrishnabanoth6677_db_user:Vamshinani@cluster0-shard-00-00.mgmfzpn.mongodb.net:27017,cluster0-shard-00-01.mgmfzpn.mongodb.net:27017,cluster0-shard-00-02.mgmfzpn.mongodb.net:27017/ai-quiz-platform?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function testDirect() {
    console.log('Attempting DIRECT connection (bypassing SRV)...');
    try {
        await mongoose.connect(directUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('SUCCESS! Connected to Atlas directly.');
        const count = await mongoose.connection.db.collection('users').countDocuments({ role: 'student' });
        console.log(`Verified: Found ${count} students in Atlas.`);
        process.exit(0);
    } catch (err) {
        console.error('Direct connection failed:', err.message);
        console.log('\nFinal Troubleshooting Steps:');
        console.log('1. Connect to a Mobile Hotspot (99% chance of working).');
        console.log('2. Check if your IP is whitelisted in Atlas -> Network Access.');
        process.exit(1);
    }
}

testDirect();
