const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 1. CONNECT TO PERMANENT CLOUD DATABASE
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to Permanent MongoDB Atlas"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// 2. DEFINE HOW USER DATA IS SAVED
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: String,
    role: { type: String, default: 'client' },
    hasAIAccess: { type: Boolean, default: false },
    osData: { 
        type: Object, 
        default: { tasks: [], goals: [], finance: { checking: 0, savings: 0, transactions: [] }, chatHistory: [], notes: [], flashcards: {} } 
    }
});
const User = mongoose.model('User', UserSchema);

// 3. SECURE AUTHENTICATION ROUTES
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const newUser = new User({ email, password, name });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (err) { 
        res.status(400).json({ success: false, error: "An account with this email already exists." }); 
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, error: "Invalid email or password." });
    }
});

// 4. SAVE WORKSPACE DATA (Auto-saves tasks, money, goals)
app.post('/api/save-data', async (req, res) => {
    try {
        const { email, osData } = req.body;
        await User.findOneAndUpdate({ email }, { osData });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to save data" });
    }
});

// 5. HOST THE FRONTEND WEBSITE
app.use(express.static(path.join(__dirname, '.')));

// The Express 5 fix for catch-all routes
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. START THE SERVER (Bound to 0.0.0.0 for Render)
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Mache OS Live on port ${port}`);
});