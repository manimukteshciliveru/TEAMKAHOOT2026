const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './server/.env' });

const scanAtlas = async () => {
    try {
        console.log('Connecting to Atlas...');
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const admin = conn.connection.db.admin();
        const dbs = await admin.listDatabases();

        console.log('\n--- ATLAS DATABASE SCAN ---');
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            const db = conn.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            console.log(`\nDB: ${dbName}`);
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments({});
                console.log(`  - ${col.name}: ${count} documents`);
                if (col.name === 'users' && count > 0) {
                    const sample = await db.collection('users').find({ role: 'student' }).limit(1).toArray();
                    if (sample.length > 0) {
                        console.log(`    (Contains Students: Yes, e.g., ${sample[0].username})`);
                    }
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

scanAtlas();
