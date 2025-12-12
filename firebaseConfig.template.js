// ⚠️ THIS FILE NEEDS YOUR REAL FIREBASE CREDENTIALS ⚠️
// 
// Follow these steps:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project called "fintrack"
// 3. Add a Web app to your project
// 4. Copy your credentials (you'll see 6 values)
// 5. Replace ALL the placeholder values below with YOUR actual values
// 6. Save the file and refresh http://localhost:5173

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// STEP 1: Get these values from Firebase Console (console.firebase.google.com)
// STEP 2: Replace the "YOUR_..." text with your actual values
// STEP 3: Keep the quotes and commas exactly as they are
const firebaseConfig = {
  // Find this in Firebase Console under "apiKey"
  apiKey: "YOUR_API_KEY_HERE",
  
  // Find this in Firebase Console under "authDomain"  
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  
  // Find this in Firebase Console under "projectId"
  projectId: "YOUR_PROJECT_ID_HERE",
  
  // Find this in Firebase Console under "storageBucket"
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  
  // Find this in Firebase Console under "messagingSenderId"
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  
  // Find this in Firebase Console under "appId"
  appId: "YOUR_APP_ID_HERE"
};

// Initialize Firebase (leave this as is)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
