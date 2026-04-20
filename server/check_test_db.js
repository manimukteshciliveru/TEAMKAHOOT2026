const mongoose = require('mongoose');

const checkTestDb = async () => {
    try {
        const c = await mongoose.connect('mongodb://localhost:27017/test');
        const User = c.connection.db.collection('users');
        const users = await User.find({}).toArray();
        console.log('TEST_DB_USERS:');
        console.log(JSON.stringify(users.map(u => ({ username: u.username, role: u.role, email: u.email })), null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkTestDb();
