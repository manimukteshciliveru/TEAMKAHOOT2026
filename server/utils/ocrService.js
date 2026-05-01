const { createWorker, createScheduler } = require('tesseract.js');

class OCRService {
    constructor() {
        this.scheduler = null;
        this.isInitialized = false;
        this.workerCount = 3; // Number of parallel workers in the pool
    }

    async initialize() {
        if (this.scheduler) return;
        
        // DEPLOYMENT READY: Scale workers based on environment
        // Render Free Tier has 512MB RAM, so we use 1-2 workers.
        // Local/Powerful servers can use more.
        const workerCount = process.env.NODE_ENV === 'production' ? 2 : 3;
        
        console.log(`[OCRService] Initializing Scheduler with ${workerCount} workers...`);
        this.scheduler = createScheduler();
        for (let i = 0; i < workerCount; i++) {
            const worker = await createWorker('eng');
            this.scheduler.addWorker(worker);
        }
        
        this.isInitialized = true;
        console.log('✅ OCR Service Ready.');
    }

    /**
     * Recognizes text from a buffer or file path using the persistent worker pool.
     */
    async recognize(imageSource) {
        if (!this.isInitialized) await this.initialize();
        
        try {
            const result = await this.scheduler.addJob('recognize', imageSource);
            return result.data.text;
        } catch (err) {
            console.error('❌ OCR Job Failed:', err.message);
            throw err;
        }
    }

    /**
     * Processes multiple images in parallel using the scheduler.
     */
    async recognizeMultiple(sources) {
        if (!this.isInitialized) await this.initialize();
        
        const jobs = sources.map(source => this.scheduler.addJob('recognize', source));
        const results = await Promise.all(jobs);
        return results.map(res => res.data.text);
    }

    async terminate() {
        if (this.scheduler) {
            await this.scheduler.terminate();
            this.isInitialized = false;
        }
    }
}

// Export a singleton instance
module.exports = new OCRService();
