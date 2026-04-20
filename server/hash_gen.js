const bcrypt = require('bcryptjs');

const fs = require('fs');

async function generateHash() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('kahootkmit', salt);
    console.log('Hash for kahootkmit:', hash);
    fs.writeFileSync('hash_output.txt', hash);
}

generateHash();
