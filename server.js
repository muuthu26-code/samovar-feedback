// --- CORRECTED & ROBUST FIREBASE INITIALIZATION ---
let db; 
try {
    const keyPath = process.env.RENDER ? '/etc/secrets/firebase-key.json' : './firebase-key.json';
    const serviceAccount = require(keyPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    // Initialize db ONLY here, after success
    db = admin.firestore();
    console.log("🔥 Firebase Database connected successfully!");
} catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
    // This allows the app to stay alive so Render doesn't crash immediately,
    // but you will see the error in your logs so you can fix the key.
}
// ------------------------------------------