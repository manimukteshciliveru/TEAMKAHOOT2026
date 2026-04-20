const mongoose = require('mongoose');

// EXACT URI from user
const uri = "mongodb+srv://vamshikrishnabanoth6677_db_user:Vamshinani@cluster0.mgmfzpn.mongodb.net/?appName=Cluster0";

const testConnect = async () => {
    try {
        console.log('Connecting to Atlas (Direct)...');
        await mongoose.connect(uri);
        console.log('Connected!');

        const db = mongoose.connection.useDb('test');
        const count = await db.collection('users').countDocuments({ role: 'student' });
        console.log(`Students in 'test' database: ${count}`);

        if (count > 0) {
            const sample = await db.collection('users').find({ role: 'student' }).limit(1).toArray();
            console.log('Sample student in test:', sample[0].username);
        }

        const dbs = await mongoose.connection.db.admin().listDatabases();
        console.log('All Databases:', dbs.databases.map(d => d.name));

        process.exit(0);
    } catch (err) {
        console.error('FAILED TO CONNECT:', err.message);
        process.exit(1);
    }
};

testConnect();
