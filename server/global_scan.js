const mongoose = require('mongoose');

const scanAll = async () => {
    try {
        const c = await mongoose.connect('mongodb://localhost:27017');
        const admin = c.connection.db.admin();
        const dbs = await admin.listDatabases();

        for (const d of dbs.databases) {
            if (['admin', 'config', 'local'].includes(d.name)) continue;
            const db = c.connection.useDb(d.name);
            const collections = await db.db.listCollections().toArray();
            for (const col of collections) {
                if (col.name === 'users') {
                    const users = await db.collection('users').find({}).toArray();
                    console.log(`DB: ${d.name}, Collection: users, Count: ${users.length}`);
                    if (users.length > 0) {
                        console.log('  - First User:', users[0].username, '(', users[0].role, ')');
                    }
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
scanAll();
