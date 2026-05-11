// Firebase configuration
// INSTRUCTIONS: Replace the values below with your Firebase project config.
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (e.g., "westjet-pool")
// 3. Click "Add app" → Web → Register app
// 4. Copy the firebaseConfig object and paste it below
// 5. Enable Firestore: Build → Firestore Database → Create database → Start in test mode

const firebaseConfig = {
  apiKey: "AIzaSyCl3WifeWtbEA6POCvRicD3LdWHyB7hxiU",
  authDomain: "moes-tavern-e64fe.firebaseapp.com",
  projectId: "moes-tavern-e64fe",
  storageBucket: "moes-tavern-e64fe.firebasestorage.app",
  messagingSenderId: "792557823543",
  appId: "1:792557823543:web:bf4e26a0c1cf527f46c1b2",
  measurementId: "G-4ME3900DTV"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
