// server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully!');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1); 
    }
};

connectDB();

// --- Simple Root Route ---
app.get('/', (req, res) => {
    res.send('Expense Tracker API is running...');
});

// Start the server
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));

// *** NOTE: Routes will go here (e.g., app.use('/api/auth', require('./routes/auth'))); ***