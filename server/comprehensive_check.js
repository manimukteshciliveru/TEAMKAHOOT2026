const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const checkAll = async () => {
    try {
        const client = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-quiz-platform');
        const admin = client.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('DATABASES_START');
        console.log(JSON.stringify(dbs.databases, null, 2));
        console.log('DATABASES_END');

        const collections = await client.connection.db.listCollections().toArray();
        console.log('COLLECTIONS_START');
        console.log(JSON.stringify(collections.map(c => c.name), null, 2));
        console.log('COLLECTIONS_END');

        const User = require('./models/User');
        const count = await User.countDocuments({});
        const studentCount = await User.countDocuments({ role: 'student' });
        const teacherCount = await User.countDocuments({ role: 'teacher' });
        console.log('COUNTS_START');
        console.log(`Total: ${count}, Students: ${studentCount}, Teachers: ${teacherCount}`);

        const sample = await User.find({}).limit(5).select('username role email').lean();
        console.log('SAMPLE_START');
        console.log(JSON.stringify(sample, null, 2));
        console.log('SAMPLE_END');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkAll();
