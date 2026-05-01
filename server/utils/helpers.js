/**
 * Normalizes a string for comparison by trimming whitespace and converting to lowercase.
 * @param {string} str 
 * @returns {string}
 */
const normalize = (str) => (str || "").toString().trim().toLowerCase();

/**
 * Compares a student's answer with the correct answer, including fallbacks for labels and indices.
 * @param {string} studentAnswer 
 * @param {string} correctAnswer 
 * @param {string[]} options 
 * @returns {boolean}
 */
const compareAnswers = (studentAnswer, correctAnswer, options = []) => {
    const sNorm = normalize(studentAnswer);
    const cNorm = normalize(correctAnswer);

    // 1. Direct Text Match
    if (sNorm === cNorm) return true;

    // 2. Fallback for Labels (A, B, C...) or Indices (0, 1, 2...)
    if (options && options.length > 0) {
        const labels = ['a', 'b', 'c', 'd', 'e'];
        
        // Case A: correctAnswer is a label ('a', 'b'...)
        const labelIdx = labels.indexOf(cNorm);
        if (labelIdx !== -1 && options[labelIdx]) {
            if (sNorm === normalize(options[labelIdx])) return true;
        }

        // Case B: correctAnswer is an index ('0', '1'...)
        if (!isNaN(cNorm) && cNorm !== '') {
            const idx = parseInt(cNorm);
            if (options[idx] && sNorm === normalize(options[idx])) return true;
        }

        // Case C: studentAnswer is a label and matches the correct option text
        if (labels.includes(sNorm)) {
            const studentLabelIdx = labels.indexOf(sNorm);
            if (options[studentLabelIdx] && normalize(options[studentLabelIdx]) === cNorm) return true;
        }
    }

    return false;
};

/**
 * Escapes special characters for use in a regular expression.
 * @param {string} string 
 * @returns {string}
 */
const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
    normalize,
    compareAnswers,
    escapeRegExp
};
