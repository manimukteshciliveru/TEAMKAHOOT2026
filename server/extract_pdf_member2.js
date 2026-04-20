const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

// PDF is in the parent directory (project root)
const pdfPath = path.join(__dirname, '../Member2_Quiz_AI_Integration_Guide.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdfParse(dataBuffer).then(data => {
    fs.writeFileSync('member2_guide_content.txt', data.text);
    console.log('Content saved to member2_guide_content.txt');
}).catch(err => {
    console.error('Error:', err);
});
