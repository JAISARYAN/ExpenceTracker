# FinTrack - Smart Finance Manager

A modern, beautiful expense tracking application built with React, Vite, Tailwind CSS, and Firebase.

## Features

✨ **Modern UI** - Glassmorphic design with dark gradient backgrounds  
📊 **Dashboard** - View spending breakdown with interactive pie charts  
📈 **Spending Trends** - Visualize daily spending patterns  
💰 **Expense Management** - Add, delete, and organize expenses  
📋 **Transaction History** - View all transactions with filtering options  
📥 **Export Data** - Download expenses as CSV or JSON  
⏱️ **Time Filtering** - Filter by 7 days, 30 days, or all time  
📱 **Responsive** - Works perfectly on mobile, tablet, and desktop  

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account (free)

### Installation

1. Clone the repository
```bash
git clone https://github.com/JAISARYAN/ExpenceTracker.git
cd expense-tracker-pro
```

2. Install dependencies
```bash
npm install
```

3. **IMPORTANT: Setup Firebase** (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
   - Create Firebase project
   - Copy your credentials
   - Update `src/firebaseConfig.js` or create a `.env.local` (development) / `.env.production` (production)

4. Start development server
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

## Firebase Setup

**⚠️ The app won't work without Firebase configuration!**

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions on:
- Creating a Firebase project
- Getting your credentials
- Configuring the app

## Tech Stack

- **Frontend:** React 19, Vite 7
- **Styling:** Tailwind CSS 4, PostCSS
- **Backend:** Firebase (Firestore, Authentication)
- **Icons:** Lucide React
- **Package Manager:** npm

## Project Structure

```
src/
├── App.jsx              # Main app component
├── App.css              # App styles
├── index.css            # Tailwind imports
├── main.jsx             # Entry point
├── firebaseConfig.js    # Firebase configuration (⚠️ SETUP REQUIRED)
└── assets/              # Images and assets
```

## Available Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## User Guide

### Adding an Expense
1. Click "Add Expense" tab
2. Enter amount
3. Select category
4. Choose date
5. (Optional) Add description
6. Click "Save Expense"

### Viewing Dashboard
- See total spending for selected period
- View category breakdown chart
- Check spending trends over time
- Browse recent transactions

### Managing Expenses
- **Filter:** Use time filter buttons (7 Days / 30 Days / All Time)
- **Delete:** Click trash icon on any transaction
- **Export:** Download as CSV or JSON

## Troubleshooting

### Expenses not saving?
Make sure Firebase is properly configured. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### Text not visible?
Try clearing browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)

### Build errors?
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

## Security Note

- Never commit real Firebase credentials!
- Use environment variables for production
- Implement proper Firestore security rules
- Enable authentication for production use

## Deployment

Preferred: use Firebase Hosting when using Firestore. Alternatively Vercel/Netlify work well with Vite.

Example Firebase Hosting flow:
```bash
# Install Firebase CLI
npm i -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy --only hosting
```

If deploying on Vercel/Netlify, add the `VITE_FIREBASE_*` vars in the platform's environment settings and set build command to `npm run build` and publish directory to `dist`.

## License

This project is open source and available on GitHub.

## Links

- 🌐 Live Demo: http://localhost:5173
- 📖 Firebase Setup: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- 💻 GitHub: https://github.com/JAISARYAN/ExpenceTracker
- 🐛 Report Issues: GitHub Issues

---

Built with ❤️ by Aditya
