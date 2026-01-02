# FinTrack - Firebase Setup Guide

## Why Can't I Add/Fetch Expenses?

Your app is currently configured with **placeholder Firebase credentials**. To make the expense tracking feature work, you need to:

1. Create a Firebase project
2. Get your real credentials
3. Update the configuration file

## Step-by-Step Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Enter project name (e.g., "FinTrack")
4. Follow the setup wizard (you can disable Google Analytics for now)
5. Click **"Create Project"**

### Step 2: Get Your Firebase Credentials

1. In Firebase Console, click the **Settings icon** (⚙️) → **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click on **Web** icon (or add web app if not present)
4. Copy the entire `firebaseConfig` object that looks like:

```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "yourproject.firebaseapp.com",
  projectId: "yourproject",
  storageBucket: "yourproject.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
}
```

### Step 3: Update Your Configuration

1. Open the file: `src/firebaseConfig.js`
2. Replace the entire `firebaseConfig` object with your real credentials from Step 2
3. Save the file

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD_tPx1234567890_YOUR_REAL_KEY",
  authDomain: "fintrack-app.firebaseapp.com",
  projectId: "fintrack-app",
  storageBucket: "fintrack-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 4: Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create Database"**
3. Choose **"Start in test mode"** (for development)
4. Select your preferred region
5. Click **"Enable"**

> **Note:** Test mode allows anyone with your API key to read/write. For production, implement proper security rules.

### Step 5: Test the App

1. Refresh your browser
2. Go to **"Add Expense"** tab
3. Fill in the form and click **"Save Expense"**
4. Check your Firestore Database - the expense should appear there!

## Features That Will Work After Setup

✅ **Add Expenses** - Create new expense entries  
✅ **View Dashboard** - See spending breakdown and trends  
✅ **Transaction History** - View all your expenses  
✅ **Category Breakdown** - See pie chart of spending by category  
✅ **Time Filtering** - Filter by 7 days, 30 days, or all time  
✅ **Export Data** - Download as CSV or JSON  
✅ **Delete Expenses** - Remove unwanted entries  

## Troubleshooting

### Issue: "Add failed: PERMISSION_DENIED"
**Solution:** Make sure Firestore is in test mode. Go to Firestore Rules tab and paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Issue: "Invalid API Key"
**Solution:** Double-check that you copied the credentials correctly from Firebase Console. Pay attention to special characters.

### Issue: "ProjectId is missing"
**Solution:** Verify all required fields are present in `firebaseConfig`:
- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId

## Security Note ⚠️

**Never commit real Firebase credentials to public repositories!** 

For production:
1. Use environment variables (`.env.local`)
2. Implement proper Firestore security rules
3. Use Firebase Authentication for user login
4. Never expose credentials in version control

For local development:
- `firebaseConfig.js` is included in `.gitignore` 
- Keep your credentials safe

## Need Help?

- Firebase Docs: https://firebase.google.com/docs
- Firestore Guide: https://firebase.google.com/docs/firestore
- FinTrack GitHub: https://github.com/JAISARYAN/ExpenceTracker
