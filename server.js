const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Render explicitly mounts all secret files to this exact global directory
const secretPath = '/etc/secrets/firebase-service-account.json';

try {
  if (fs.existsSync(secretPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase initialized successfully from /etc/secrets!");
  } else {
    throw new Error(`Secret file missing at designated mount path: ${secretPath}`);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error.message);
}