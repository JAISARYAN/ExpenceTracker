# Firebase Hosting Deployment Guide

## Step 1: Login to Firebase
```bash
firebase login
```
- A browser window will open
- Sign in with the Google account that owns the Firebase project
- Accept the permissions
- Close the browser

## Step 2: Deploy
After login is complete, run:
```bash
firebase deploy --project expence-tracker-d2672
```

## ✅ Security Checklist Before Deployment

### Environment Variables (Protected ✓)
- `.env.local` - Added to `.gitignore` ✓
- Contains: API key, project ID, auth domain, etc.
- Never committed to GitHub ✓

### Credentials (Protected ✓)
- `src/firebaseConfig.js` - Added to `.gitignore` ✓
- Imports from environment variables ✓
- API key removed from source code ✓

### Git History (Needs Attention ⚠️)
- Old commits still contain exposed API key
- Use `git filter-branch` or `BFG` to clean history
- Or: Create new private repository

### Firebase Security Settings (Recommended)
Go to Firebase Console → Project Settings → API restrictions:
1. Click on your API key
2. Add Application restrictions
3. Add Website restrictions:
   - Website URL: `expence-tracker-d2672.web.app`
   - Also add your custom domain
4. Save

### Firestore Security Rules (Current)
Current rules allow anonymous + authenticated users.
For production, consider:
- Rate limiting
- User data isolation
- Category validation

## Step 3: Set Environment Variables (If Needed)
Firebase Hosting uses environment variables during build time.
Your `.env.local` is already configured for local dev.

For CI/CD or if needed on Firebase:
- Use `.firebaserc` or environment variable configuration
- Variables are baked into the build (`VITE_*` prefix)

## Deployment Success
Once deployed, your app will be live at:
```
https://expence-tracker-d2672.web.app
```

## Post-Deployment Checks
1. ✓ App loads without errors
2. ✓ Firebase auth works (sign in/out)
3. ✓ Data persists in Firestore
4. ✓ PDFs export correctly
5. ✓ Mobile responsive
6. ✓ PWA works (installable)

## Rollback (if needed)
```bash
firebase hosting:list
firebase hosting:clone [previous-version-hash]
```
