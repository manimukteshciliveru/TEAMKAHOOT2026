const Quiz = require('../models/Quiz');
const { io } = require('../index'); // Import io to notify the client

/**
 * Simulates a background worker by processing the quiz generation asynchronously.
 * In a larger scale system, this would be a separate process using BullMQ/Redis.
 */
class BackgroundWorker {
    /**
     * Executes a quiz generation task in the "background".
     * @param {string} jobId - Unique ID for the job
     * @param {string} userId - ID of the user who started the job
     * @param {Function} generationTask - The async function that generates the questions
     * @param {Object} quizData - Initial quiz data to save
     */
    async enqueueQuizGeneration(jobId, userId, generationTask, quizData) {
        console.log(`[BackgroundWorker] Enqueued Job: ${jobId} for User: ${userId}`);
        
        // 1. Create a "Ghost Quiz" placeholder in the DB immediately
        const placeholderQuiz = new Quiz({
            ...quizData,
            status: 'processing',
            questions: [] // Empty for now
        });
        await placeholderQuiz.save();

        // Notify client that processing has started
        if (io) io.emit(`job_status_${userId}`, { jobId, status: 'processing', message: 'Extracting content and generating questions...' });

        // Start processing without awaiting (Background style)
        setImmediate(async () => {
            try {
                // 2. Run the heavy task (OCR + AI)
                const questions = await generationTask();

                // 3. Update the Ghost Quiz with final data
                placeholderQuiz.questions = questions;
                placeholderQuiz.status = quizData.isLive ? 'waiting' : 'finished';
                await placeholderQuiz.save();

                console.log(`[BackgroundWorker] Job Complete: ${jobId}`);
                
                // 4. Notify client of completion
                if (io) io.emit(`job_status_${userId}`, { 
                    jobId, 
                    status: 'completed', 
                    quizId: placeholderQuiz._id,
                    message: 'Quiz generated successfully!' 
                });

            } catch (err) {
                console.error(`[BackgroundWorker] Job Failed: ${jobId}`, err.message);
                
                // Update quiz to failed status (or just delete it)
                await Quiz.findByIdAndDelete(placeholderQuiz._id);

                if (io) io.emit(`job_status_${userId}`, { 
                    jobId, 
                    status: 'failed', 
                    message: 'Generation failed: ' + err.message 
                });
            }
        });
    }
}

module.exports = new BackgroundWorker();
