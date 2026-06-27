const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

try {
  // Path to the Render secret file
  const secretPath = path.join(__dirname, 'firebase-service-account.json');
  
  if (fs.existsSync(secretPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase initialized successfully from Secret File!");
  } else {
    throw new Error("Secret file 'firebase-service-account.json' missing.");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error.message);
}