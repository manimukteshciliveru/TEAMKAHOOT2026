import { createWorker } from 'tesseract.js';

/**
 * Runs OCR on a file directly in the browser.
 * This offloads computation from the server to the client.
 * @param {File} file - The image file to scan
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<string>} - The recognized text
 */
export const runClientSideOCR = async (file, onProgress) => {
    const worker = await createWorker('eng', 1, {
        logger: m => {
            if (onProgress && m.status === 'recognizing text') {
                onProgress(Math.round(m.progress * 100));
            }
        }
    });

    try {
        const { data: { text } } = await worker.recognize(file);
        return text;
    } catch (err) {
        console.error('Client-side OCR failed:', err);
        throw err;
    } finally {
        await worker.terminate();
    }
};
