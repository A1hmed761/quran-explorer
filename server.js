import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 5000;
// ... rest of your code

app.use(cors());
app.use(express.json()); 

// 1. Production Database Configuration
// Uses the Atlas Cloud URI if live, falls back to local machine if testing locally
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'Holy-Quran'; 

// 2. Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startServer() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB Database Host");
        const db = client.db(dbName);
        const collection = db.collection('verses'); 

        // ROUTE A: Fetch Surah from MongoDB
        app.get('/api/surah/:id', async (req, res) => {
            const surahId = parseInt(req.params.id);
            const verses = await collection
                .find({ chapter: surahId })
                .sort({ verse: 1 })
                .toArray();

            if (verses.length === 0) {
                return res.status(404).json({ success: false, message: "Chapter not found in DB" });
            }
            res.json({ success: true, data: verses });
        });

        // ROUTE B: Ask Gemini about Highlighted Text
        app.post('/api/ask', async (req, res) => {
            const { sourceText, question } = req.body;

            if (!sourceText || !question) {
                return res.status(400).json({ error: "Both text and question are required." });
            }

            const prompt = `
                You are an expert, compassionate Islamic teacher and linguistic analyst. 
                Answer the question or provide analysis based on the highlighted Quranic verse text provided.
                Provide clear, deeply respectful, and contextually grounded answers using authentic sources.

                Highlighted Text:
                "${sourceText}"

                User's Question:
                "${question}"
            `;

            const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
            const maxRetries = 3; 
            let waitTime = 2000;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                for (const currentModel of modelsToTry) {
                    try {
                        console.log(`[Attempt ${attempt}/${maxRetries}] Processing request with ${currentModel}...`);
                        
                        const response = await ai.models.generateContent({
                            model: currentModel,
                            contents: prompt,
                        });

                        console.log(`\x1b[32m%s\x1b[0m`, `✅ Response generated successfully via ${currentModel}!`);
                        return res.json({ answer: response.text });

                    } catch (error) {
                        const isOverloaded = error.status === 503 || 
                                             (error.message && error.message.includes('high demand')) || 
                                             (error.message && error.message.includes('UNAVAILABLE'));

                        if (isOverloaded) {
                            console.warn(`⚠️ ${currentModel} reported high demand / busy status.`);
                            continue;
                        }

                        console.error("Critical Gemini API Exception:", error);
                        return res.status(500).json({ error: "Internal AI integration configuration processing error." });
                    }
                }

                if (attempt < maxRetries) {
                    console.log(`⏳ Both models busy. Applying backoff wrapper. Pausing for ${waitTime / 1000} seconds...`);
                    await delay(waitTime);
                    waitTime *= 2;
                }
            }

            return res.status(503).json({ 
                error: "Google's public AI clusters are heavily overloaded right now. Please wait a few moments and click 'Ask' again." 
            });
        });

        // ROUTE C: Moved inside startServer to ensure the 'collection' variable is fully assigned
        app.get('/api/grammar-examples', async (req, res) => {
            try {
                const { tag } = req.query;
                
                if (!tag) {
                    return res.status(400).json({ success: false, message: "Tag query parameter is required" });
                }

                const examples = await collection
                    .find({ grammar_tags: tag })
                    .project({ chapter: 1, verse: 1, text: 1, grammar_highlights: 1 }) 
                    .toArray();

                res.json({ success: true, data: examples });
            } catch (error) {
                console.error("Grammar fetch exception:", error);
                res.status(500).json({ success: false, error: "Internal server data compilation issue." });
            }
        });

        // Start Server bound properly for cloud routing
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Unified Server running dynamically on port ${port}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error);
    }
}

startServer();