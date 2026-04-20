const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const searchAllDbs = async () => {
    try {
        const client = await mongoose.connect('mongodb://localhost:27017');
        const admin = client.connection.db.admin();
        const dbs = await admin.listDatabases();

        console.log('--- DATABASE SCAN ---');
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            const db = client.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);

            console.log(`\nDB: ${dbName}`);
            if (collectionNames.includes('users')) {
                const count = await db.collection('users').countDocuments({});
                const students = await db.collection('users').countDocuments({ role: 'student' });
                console.log(`  - users collection: ${count} documents (${students} students)`);

                if (count > 0) {
                    const sample = await db.collection('users').find({}).limit(1).toArray();
                    console.log(`  - Sample username: ${sample[0].username} (role: ${sample[0].role})`);
                }
            } else {
                console.log('  - No users collection found');
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
searchAllDbs();
