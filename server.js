const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CLEANED UP FIREBASE INITIALIZATION ---
try {
    const keyPath = process.env.RENDER ? '/etc/secrets/firebase-key.json' : './firebase-key.json';
    const serviceAccount = require(keyPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    console.log("🔥 Firebase Database connected successfully!");
} catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
}

// Now initialize db safely
const db = admin.firestore();
// ------------------------------------------

// ... rest of your code (routes, etc.) ...