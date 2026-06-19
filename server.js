// --- DIAGNOSTIC INITIALIZATION ---
let db;
try {
    const keyPath = process.env.RENDER ? '/etc/secrets/firebase-key.json' : './firebase-key.json';
    console.log("Looking for key at:", keyPath);
    
    // Check if file exists/loads
    const serviceAccount = require(keyPath);
    console.log("Service account loaded:", !!serviceAccount);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    console.log("🔥 Firebase Database connected successfully!");
} catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
    console.error("Stack trace:", err.stack);
}