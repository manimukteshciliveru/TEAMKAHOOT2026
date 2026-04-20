const mongoose = require('mongoose');

const scan = async () => {
    try {
        const c = await mongoose.connect('mongodb://localhost:27017');
        const admin = c.connection.db.admin();
        const dbs = await admin.listDatabases();

        console.log('SCAN_RESULTS');
        for (const d of dbs.databases) {
            if (['admin', 'config', 'local'].includes(d.name)) continue;
            const db = c.connection.useDb(d.name);
            const collections = await db.db.listCollections().toArray();
            const hasUsers = collections.some(col => col.name === 'users');

            if (hasUsers) {
                const count = await db.collection('users').countDocuments({});
                console.log(`${d.name}: ${count} total users`);
                const studentCount = await db.collection('users').countDocuments({ role: 'student' });
                console.log(`  - Students: ${studentCount}`);
            } else {
                console.log(`${d.name}: (No users collection)`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
scan();
