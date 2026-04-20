# AI APIs for Quiz Question Generation

## 🎯 Current Implementation

Your project **already uses OpenAI API** for generating questions from PDFs and topics!

**Location:** `server/controllers/quizController.js`
**Current API:** OpenAI GPT-3.5-turbo
**Features:**
- ✅ Generates questions from PDF content
- ✅ Generates questions from topics
- ✅ Supports difficulty levels (Easy, Medium, Thinkable, Hard)
- ✅ Generates multiple-choice and true/false questions
- ✅ Fallback to mock questions if API key not provided

---

## 🔑 How to Set Up OpenAI API (Current Solution)

### Step 1: Get OpenAI API Key

1. Go to [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Create an account or sign in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)

### Step 2: Add API Key to Your Project

Edit `server/.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-quiz-platform
JWT_SECRET=supersecretkey123
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 3: Restart Backend Server

```powershell
cd server
npm start
```

**That's it!** Your project will now use real AI to generate questions.

---

## 💰 OpenAI Pricing (as of 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-3.5-turbo | $0.50 | $1.50 |
| GPT-4o-mini | $0.15 | $0.60 |
| GPT-4o | $2.50 | $10.00 |

**For quiz generation:**
- Generating 5 questions ≈ 500-1000 tokens
- Cost per quiz ≈ $0.001 - $0.002 (less than a penny!)
- 1000 quizzes ≈ $1-2

---

## 🆓 Alternative Free/Cheaper AI APIs

### 1. **Google Gemini API** (Recommended - Free Tier Available)

**Pricing:**
- **Free tier:** 60 requests per minute
- **Paid:** Starting at $0.00025 per 1K characters

**How to integrate:**

```javascript
// Install package
npm install @google/generative-ai

// In quizController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateQuestionsGemini = async (type, content, count = 5, difficulty = 'Medium') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Generate a quiz with exactly ${count} ${difficulty} level multiple-choice questions...`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return JSON.parse(text).questions;
    } catch (err) {
        console.error('Gemini Error:', err);
        return generateMockQuestions(count);
    }
};
```

**Get API Key:** [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

---

### 2. **Anthropic Claude API**

**Pricing:**
- Claude 3.5 Sonnet: $3 per 1M input tokens, $15 per 1M output tokens
- Claude 3 Haiku: $0.25 per 1M input tokens, $1.25 per 1M output tokens

**How to integrate:**

```javascript
// Install package
npm install @anthropic-ai/sdk

// In quizController.js
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const generateQuestionsClaude = async (type, content, count = 5, difficulty = 'Medium') => {
    try {
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: [{
                role: "user",
                content: `Generate ${count} ${difficulty} quiz questions from: ${content}`
            }]
        });
        
        return JSON.parse(message.content[0].text).questions;
    } catch (err) {
        console.error('Claude Error:', err);
        return generateMockQuestions(count);
    }
};
```

**Get API Key:** [https://console.anthropic.com/](https://console.anthropic.com/)

---

### 3. **Cohere API** (Free Tier Available)

**Pricing:**
- **Free tier:** 100 API calls per minute
- **Paid:** Starting at $1 per 1M tokens

**How to integrate:**

```javascript
// Install package
npm install cohere-ai

// In quizController.js
const { CohereClient } = require('cohere-ai');

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY,
});

const generateQuestionsCohere = async (type, content, count = 5, difficulty = 'Medium') => {
    try {
        const response = await cohere.generate({
            model: 'command',
            prompt: `Generate ${count} ${difficulty} quiz questions from: ${content}`,
            max_tokens: 1000,
        });
        
        return JSON.parse(response.generations[0].text).questions;
    } catch (err) {
        console.error('Cohere Error:', err);
        return generateMockQuestions(count);
    }
};
```

**Get API Key:** [https://dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)

---

### 4. **Hugging Face Inference API** (Free!)

**Pricing:**
- **Free tier:** Rate-limited but free
- **Paid:** $9/month for faster inference

**How to integrate:**

```javascript
// Install package
npm install @huggingface/inference

// In quizController.js
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const generateQuestionsHuggingFace = async (type, content, count = 5, difficulty = 'Medium') => {
    try {
        const response = await hf.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.2',
            inputs: `Generate ${count} ${difficulty} quiz questions from: ${content}`,
            parameters: {
                max_new_tokens: 1000,
                return_full_text: false,
            }
        });
        
        return JSON.parse(response.generated_text).questions;
    } catch (err) {
        console.error('HuggingFace Error:', err);
        return generateMockQuestions(count);
    }
};
```

**Get API Key:** [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

---

### 5. **Groq API** (Fast & Affordable)

**Pricing:**
- **Free tier:** 30 requests per minute
- **Very fast inference** (fastest LLM API)

**How to integrate:**

```javascript
// Install package
npm install groq-sdk

// In quizController.js
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const generateQuestionsGroq = async (type, content, count = 5, difficulty = 'Medium') => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [{
                role: "user",
                content: `Generate ${count} ${difficulty} quiz questions from: ${content}`
            }],
            model: "mixtral-8x7b-32768",
            temperature: 0.7,
        });
        
        return JSON.parse(completion.choices[0].message.content).questions;
    } catch (err) {
        console.error('Groq Error:', err);
        return generateMockQuestions(count);
    }
};
```

**Get API Key:** [https://console.groq.com/keys](https://console.groq.com/keys)

---

## 📊 Comparison Table

| API | Free Tier | Cost (per 1M tokens) | Speed | Quality | Best For |
|-----|-----------|---------------------|-------|---------|----------|
| **OpenAI GPT-3.5** | No | $0.50-$1.50 | Fast | Excellent | Production (current) |
| **Google Gemini** | ✅ Yes | $0.00025 | Fast | Excellent | **Best free option** |
| **Anthropic Claude** | No | $0.25-$15 | Medium | Excellent | High-quality questions |
| **Cohere** | ✅ Yes | $1+ | Fast | Good | Free tier testing |
| **Hugging Face** | ✅ Yes | Free | Slow | Good | Completely free |
| **Groq** | ✅ Yes | Free | **Fastest** | Good | Speed-critical apps |

---

## 🚀 Recommended Setup

### Option 1: Keep OpenAI (Easiest)
**Just add your API key to `.env`** - everything already works!

### Option 2: Switch to Google Gemini (Free)
**Best for development/testing without spending money**

1. Install package:
```powershell
cd server
npm install @google/generative-ai
```

2. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. Add to `.env`:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

4. Update `quizController.js` (I can help with this!)

### Option 3: Use Multiple APIs (Fallback Chain)
**Most reliable - falls back if one fails**

Order: Gemini (free) → OpenAI (paid) → Mock (offline)

---

## 🔧 Integration Steps (Choose One)

### I can help you integrate any of these APIs! Just tell me:

1. **Which API do you want to use?**
   - Keep OpenAI (just need API key)
   - Switch to Google Gemini (free)
   - Use Groq (fast & free)
   - Use multiple APIs with fallback

2. **Do you want me to:**
   - Show you how to get the API key?
   - Update the code to use the new API?
   - Set up multiple APIs with fallback?

---

## 📝 Current Code Location

Your AI generation code is in:
- **File:** `server/controllers/quizController.js`
- **Function:** `generateQuestions()` (line 26)
- **Usage:**
  - PDF upload → extracts text → generates questions
  - Topic input → generates questions from topic
  - Manual questions → uses provided questions

---

## 💡 Quick Start: Add OpenAI API Key

**Fastest way to enable AI:**

1. Get free trial credits from OpenAI: [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Create API key
3. Add to `server/.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
4. Restart server:
   ```powershell
   cd server
   npm start
   ```

**You'll get $5 free credits** (enough for ~2500 quizzes!)

---

## 🎓 Need Help?

Tell me which API you want to use, and I'll:
1. ✅ Help you get the API key
2. ✅ Update the code if needed
3. ✅ Test it with you
4. ✅ Set up fallback options
