# Quick Firebase Setup Guide ⚡

## Step 1: Create Firebase Project (2 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Enter project name: `fintrack` (or anything you want)
4. Uncheck "Enable Google Analytics" (optional)
5. Click **"Create Project"**
6. Wait for it to complete, then click **"Continue"**

## Step 2: Register Your App (1 minute)

1. Click the **Web icon** (</>) to add a web app
2. App nickname: `fintrack-web`
3. Check "Also set up Firebase Hosting for this app"
4. Click **"Register app"**

## Step 3: Copy Your Credentials (1 minute)

You'll see your Firebase config. It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxx...",
  authDomain: "fintrack-xxx.firebaseapp.com",
  projectId: "fintrack-xxx",
  storageBucket: "fintrack-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

**Copy these exact values** - you'll need all 6 of them.

## Step 4: Update Your Code (2 minutes)

Open this file: `src/firebaseConfig.js`

Replace **ALL** placeholder values with your actual credentials:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔴 REPLACE THIS with your actual Firebase config from console
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY_HERE",           // ← From Firebase Console
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",        // ← From Firebase Console
  projectId: "YOUR_ACTUAL_PROJECT_ID",          // ← From Firebase Console
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",  // ← From Firebase Console
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_ID", // ← From Firebase Console
  appId: "YOUR_ACTUAL_APP_ID"                   // ← From Firebase Console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## Step 5: Enable Firestore Database (1 minute)

1. In Firebase Console, go to **"Firestore Database"**
2. Click **"Create Database"**
3. Select **"Start in test mode"** (for testing)
4. Choose region closest to you
5. Click **"Enable"**

⚠️ **Test mode warning**: This allows anyone to read/write. For production, set security rules.

## Step 6: Refresh & Test (1 minute)

1. Go back to your app: http://localhost:5173
2. Press **Ctrl+Shift+R** to hard refresh (clear cache)
3. Try adding an expense
4. You should see success message! ✅

## Troubleshooting

### Still seeing "Authentication failed"?
- Did you copy **ALL 6** values from Firebase Console?
- Did you refresh the page (Ctrl+Shift+R)?
- Are there typos in the config?

### Check browser console for errors:
1. Press **F12** to open Developer Tools
2. Go to **"Console"** tab
3. Look for ✓ or ❌ messages
4. If you see errors, paste them here

### "Permission denied" error?
- Make sure Firestore is in **test mode**
- Wait 1-2 minutes for Firestore to fully initialize

### Still stuck?
1. Check the console messages (F12)
2. Make sure Firebase credentials are saved in `src/firebaseConfig.js`
3. Restart the dev server: Stop it and run `npm run dev` again

---

**That's it!** Your app should work after these steps. 🎉
