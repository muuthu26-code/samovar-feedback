const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Render puts secret files either in the root directory or relative to the app execution context
const localPath = path.join(__dirname, 'firebase-service-account.json');
const rootPath = path.join(process.cwd(), 'firebase-service-account.json');

let secretPath = null;

if (fs.existsSync(localPath)) {
  secretPath = localPath;
} else if (fs.existsSync(rootPath)) {
  secretPath = rootPath;
}

try {
  if (secretPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase initialized successfully from Secret File!");
  } else {
    throw new Error("Secret file 'firebase-service-account.json' missing from all paths.");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error.message);
}