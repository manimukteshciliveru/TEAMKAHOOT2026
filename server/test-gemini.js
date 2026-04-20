require('dotenv').config();

const https = require('https');

const key = process.env.GEMINI_API_KEY;
console.log('Key:', key ? key.substring(0, 20) + '...' : 'MISSING');

const body = JSON.stringify({
    contents: [{ parts: [{ text: 'Say hello in 3 words' }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(data);
        if (parsed.candidates) {
            console.log('SUCCESS:', parsed.candidates[0].content.parts[0].text);
        } else {
            console.log('ERROR response:', JSON.stringify(parsed).substring(0, 300));
        }
    });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(body);
req.end();
