const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin'); // Ensure this is at the very top

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Firebase
let db;
try {
    const keyPath = process.env.RENDER ? '/etc/secrets/firebase-key.json' : './firebase-key.json';
    const serviceAccount = require(keyPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    console.log("🔥 Firebase Database connected successfully!");
} catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
}

// Example usage of db
app.post('/submit-feedback', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");
        // Your logic here...
        res.status(200).send("Feedback saved");
    } catch (error) {
        res.status(500).send(error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));