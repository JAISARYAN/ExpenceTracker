/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ensure Tailwind knows which files to scan for classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Configure Inter as the default font, as used in the React app
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // You can define custom colors or extend default ones here if needed
      colors: {
        'indigo-600': '#4f46e5',
        'violet-600': '#7c3aed',
        'slate-50': '#f8fafc',
      },
      // Touch-friendly minimum sizes for mobile
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      // Safe area support for notched devices
      spacing: {
        'safe': 'max(1rem, env(safe-area-inset-bottom))',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        'safe-top': 'env(safe-area-inset-top)',
      }
    },
  },
  plugins: [],
}