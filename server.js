require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;

// Enable CORS for all local requests
app.use(cors());
app.use(express.json());

// Initialize Google SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use the standard flash model
const MODEL_NAME = "gemini-2.5-flash";

// --- ROUTE 1: PERSONAL AI CHAT & SUMMARIZER ---
app.post('/api/chat', async (req, res) => {
    try {
        const { history, newMessage } = req.body;
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You are Gemini, an advanced Personal AI built by Google, integrated directly into Mache OS. Help the user optimize their daily workflow, academic studies, and organize their life. Be concise and professional."
        });

        // Google requires history to start with a 'user' message. 
        // We filter out any leading AI greetings to prevent crashes.
        let safeHistory = history.filter(msg => msg.text && msg.text.trim() !== "");
        while(safeHistory.length > 0 && safeHistory[0].role !== 'user') {
            safeHistory.shift(); 
        }

        const formattedHistory = safeHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(newMessage);
        
        res.json({ success: true, text: result.response.text() });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ success: false, error: "AI Error: " + error.message });
    }
});

// --- ROUTE 2: AI FLASHCARD GENERATOR ---
app.post('/api/flashcards', async (req, res) => {
    try {
        const { text } = req.body;
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Analyze the following lecture notes/document. 
        Create exactly 5 to 10 study flashcards based on the most important concepts.
        You MUST respond ONLY with a raw, valid JSON array containing objects with "q" (question) and "a" (answer) keys.
        Do not include markdown formatting like \`\`\`json. 
        Match the exact language of the provided text.

        Document Text:
        "${text}"
        
        Expected JSON Format:
        [{"q": "Question here", "a": "Answer here"}]
        `;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // Clean up markdown block formatting if Gemini adds it
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const flashcards = JSON.parse(responseText);

        res.json({ success: true, flashcards: flashcards });

    } catch (error) {
        console.error("Flashcard Error:", error);
        res.status(500).json({ success: false, error: "Failed to generate flashcards. Please check the text format." });
    }
});

const path = require('path');

// ... keep all your existing AI routes above ...

// NEW: Tell the server to serve your static frontend files
app.use(express.static(path.join(__dirname, '.')));

// NEW: Fix the "Cannot GET /" by sending the index.html when people visit the link
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// FIX: Change 127.0.0.1 to 0.0.0.0 for Render compatibility
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Mache OS Live on port ${port}`);
});