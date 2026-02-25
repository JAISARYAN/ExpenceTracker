import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  query, 
  onSnapshot, 
  doc,
  serverTimestamp,
  setLogLevel 
} from 'firebase/firestore';
import { 
  PieChart, 
  LayoutDashboard,
  PlusCircle, 
  Trash2, 
  FileSpreadsheet, 
  TrendingUp, 
  History,
  WalletCards,
  Filter,
  ArrowUpRight,
  CreditCard,
  FileJson
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAB0d7zZZ-BNtBIO9zEs2VxSF6bGQhADoA",
  authDomain: "expence-tracker-d2672.firebaseapp.com",
  projectId: "expence-tracker-d2672",
  storageBucket: "expence-tracker-d2672.firebasestorage.app",
  messagingSenderId: "378986349668",
  appId: "1:378986349668:web:5e4463a08cadb5aa0d4b71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set Firebase log level to error to reduce console noise
setLogLevel('error');

// Set auth persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });
  
// For production, keep Firestore logs minimal. Change to 'error' or remove when deploying.
setLogLevel('error');

// Generate a sanitized app ID for Firestore collections
const sanitizedAppId = 'expense-tracker-app';

// --- Helper Functions ---
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // Assuming dateStr is in YYYY-MM-DD format
  const date = new Date(dateStr + 'T00:00:00'); 
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Generates an array of date strings (YYYY-MM-DD) for the last 'days'
const getDaysArray = (days) => {
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Format to YYYY-MM-DD for consistency with form data
    arr.push(d.toISOString().split('T')[0]); 
  }
  return arr;
};

// --- UI Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-4 md:p-6 lg:p-8 transition-all duration-300 hover:shadow-3xl hover:border-white/40 hover:from-white/20 hover:to-white/8 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon, type = "button" }) => {
  const baseStyle = "px-3 md:px-4 py-2 md:py-2.5 min-h-[44px] min-w-[44px] rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-sm active:scale-95 shadow-md";
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/60 hover:scale-105 transform",
    secondary: "bg-white/20 text-white border border-white/40 backdrop-blur-sm hover:bg-white/35 hover:border-white/60 hover:shadow-lg hover:scale-105",
    danger: "bg-gradient-to-r from-red-500/30 to-rose-500/30 text-red-100 hover:from-red-500/50 hover:to-rose-500/50 border border-red-500/50 hover:shadow-lg",
    ghost: "text-white/70 hover:text-white hover:bg-white/15 hover:shadow-md"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// Custom SVG Line Chart for Daily Trends
const TrendChart = ({ data, days }) => {
  if (!data || data.length === 0) return <div className="h-40 md:h-48 flex items-center justify-center text-white/60 text-xs md:text-sm">No data for this period</div>;

  // 1. Prepare Data: Fill in missing days with 0 and ensure correct sorting/mapping
  const dateRange = getDaysArray(days);
  const chartData = dateRange.map(date => {
    const found = data.find(d => d.date === date);
    return { date, value: found ? found.value : 0 };
  });
  const values = chartData.map(d => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 10);
  const range = maxVal - minVal || 1;

  // map value to SVG Y coordinate (10 -> top, 90 -> bottom) with 10px padding
  const yFor = (v) => {
    const normalized = (v - minVal) / range; // 0..1
    return 100 - (normalized * 80 + 10);
  };

  const pointsArr = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = yFor(d.value);
    return `${x},${y}`;
  });
  const points = pointsArr.join(' ');

  const zeroY = yFor(0);
  const avg = values.reduce((s, a) => s + a, 0) / values.length;
  const strokeColor = avg >= 0 ? '#10B981' : '#EF4444';

  return (
    <div className="w-full h-40 md:h-48 relative pt-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Grid lines */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="#E2E8F0" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4" />
        <line x1="0" y1="0" x2="100" y2="0" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4" />

        {/* Zero baseline */}
        <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeDasharray="2" />

        {/* Area fill relative to zero */}
        <path d={`M 0 ${zeroY} L ${pointsArr.map(p => p).join(' L ')} L 100 ${zeroY} Z`} fill={avg >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)'} />

        {/* The Line */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {chartData.map((d, i) => {
          const [x, y] = pointsArr[i].split(',').map(Number);
          return <circle key={d.date} cx={x} cy={y} r={0.9} fill={d.value >= 0 ? '#10B981' : '#EF4444'} />;
        })}
      </svg>

      {/* Date Labels */}
      <div className="flex justify-between text-xs text-white/60 mt-2 font-medium">
        <span className="truncate">{formatDate(dateRange[0])}</span>
        {dateRange.length > 1 && <span className="truncate">{formatDate(dateRange[Math.floor(dateRange.length/2)])}</span>}
        {dateRange.length > 0 && <span className="truncate">{formatDate(dateRange[dateRange.length - 1])}</span>}
      </div>
    </div>
  );
};

// Custom SVG Donut Chart for Category Breakdown
const DonutChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="h-48 md:h-64 flex flex-col items-center justify-center text-white/60">
      <div className="bg-white/5 p-4 rounded-full mb-2"><PieChart size={24} className="opacity-20 text-white/30"/></div>
      <span className="text-xs md:text-sm">No expenses yet</span>
    </div>
  );

  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;
  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40 md:w-52 md:h-52">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {data.map((slice, i) => {
            const sliceAngle = (slice.value / total) * 360;
            
            // Calculate starting and ending points on the circle circumference
            const startAngleRad = (Math.PI * currentAngle) / 180;
            const endAngleRad = (Math.PI * (currentAngle + sliceAngle)) / 180;
            
            const x1 = 50 + 50 * Math.cos(startAngleRad);
            const y1 = 50 + 50 * Math.sin(startAngleRad);
            const x2 = 50 + 50 * Math.cos(endAngleRad);
            const y2 = 50 + 50 * Math.sin(endAngleRad);
            
            const largeArcFlag = sliceAngle > 180 ? 1 : 0;
            
            // SVG Path for a pie slice: Move to center (50,50), Line to start point, Arc to end point, Close path
            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            currentAngle += sliceAngle;
            
            return (
              <path 
                key={slice.name} 
                d={pathData} 
                fill={colors[i % colors.length]} 
                stroke="rgba(255,255,255,0.08)" 
                strokeWidth="0.6" 
                style={{ transition: 'transform 220ms ease', transformOrigin: '50% 50%', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' }}
                className="cursor-pointer hover:scale-105"
              />
            );
          })}
          {/* Inner circle to create the "donut" effect (subtle translucent to match dark glass) */}
          <circle cx="50" cy="50" r="38" fill="rgba(255,255,255,0.06)" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-white/70 font-medium uppercase tracking-wider">Total</span>
          <span className="text-lg md:text-xl font-bold text-white">₹{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 w-full">
        {data.slice(0, 6).map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ring-1 ring-white/10" style={{ backgroundColor: colors[i % colors.length] }}></span>
              <span className="text-white font-medium truncate">{item.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white">₹{item.value.toFixed(2)}</span>
              <span className="text-white/60 text-xs">{Math.round((item.value / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'add'
  
  // Auth State
  const [user, setUser] = useState(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  
  // Data State
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [timeFilter, setTimeFilter] = useState('30'); // '7', '30', 'all'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeFilter, setActiveFilter] = useState({ type: '30' });
  
  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    type: 'expense',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Handle mobile detection and window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Set loading to false after initial render
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // --- 1. Authentication and Initialization ---
  useEffect(() => {
    const initAuth = async () => {
        try {
            const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (token) {
                // Sign in using the custom token provided by the Canvas environment
                await signInWithCustomToken(auth, token);
                console.log("✓ Custom token auth successful");
            } else {
                // Fallback to anonymous sign-in if no token is available
                await signInAnonymously(auth);
                console.log("✓ Anonymous auth successful");
            }
        } catch (error) {
        console.error("❌ Firebase Auth Init Failed:", error.message);
        console.log("⚠️ Make sure Firebase credentials are configured in src/firebaseConfig.js");
        // Enable local fallback so the UI remains usable without Firebase
        setUseLocalFallback(true);
        // Create a local pseudo-user so other code can operate
        setUser({ uid: `local_${sanitizedAppId}` });
        setLoading(false);
        }
    };
    initAuth();
    
    // Set up Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        console.log("✓ User authenticated:", u.uid);
        setUser(u);
      } else {
        console.log("⚠️ No authenticated user");
        // If auth isn't available, enable local fallback
        setUseLocalFallback(true);
        setUser({ uid: `local_${sanitizedAppId}` });
      }
      // Stop loading once auth status is known
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // Run only once on mount

  // --- 2. Data Fetching and Real-time Listener (onSnapshot) ---
  useEffect(() => {
    if (!user) return;

    // If running in local fallback mode, read/write from localStorage instead of Firestore
    if (useLocalFallback || String(user.uid).startsWith('local_')) {
      try {
        const key = `fintrack:${sanitizedAppId}:expenses`;
        const raw = localStorage.getItem(key);
        const localData = raw ? JSON.parse(raw) : [];
        // Ensure amounts are numbers and dates are present
        const normalized = localData.map(d => ({
          id: d.id,
          amount: typeof d.amount === 'number' ? d.amount : parseFloat(d.amount) || 0,
          category: d.category || 'Other',
          description: d.description || '',
          date: d.date || new Date().toISOString().split('T')[0],
          type: d.type || 'expense'
        }));
        normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(normalized);
      } catch (err) {
        console.error('Local storage read error:', err);
        setExpenses([]);
      } finally {
        setLoading(false);
      }

      // No Firestore listener to clean up when in local mode
      return;
    }

    // Construct the private collection path: /artifacts/{appId}/users/{userId}/expenses
    const expensesCollectionPath = `artifacts/${sanitizedAppId}/users/${user.uid}/expenses`;
    const expensesCollectionRef = collection(db, expensesCollectionPath);
    
    // Create a simple query (no orderBy to avoid mandatory index creation issues)
    const q = query(expensesCollectionRef);

    // Set up the real-time listener
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        // Ensure amount is a number and date is a string for consistent sorting/filtering
        amount: d.data().amount ? parseFloat(d.data().amount) : 0, 
        date: d.data().date || new Date().toISOString().split('T')[0]
      }));
      
      // Sort in memory by date (most recent first)
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(data);
      setLoading(false);
    }, (err) => { 
      console.error("Firestore Listener Error:", err); 
      setLoading(false); 
    });
    
    // Cleanup the listener when the component unmounts or user changes
    return () => unsub();
  }, [user, useLocalFallback]); // Re-run when user object or fallback flag changes

  // Filter expenses based on selected time period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    const filter = activeFilter || { type: timeFilter };
    
    if (filter.type === 'all') return expenses;
    
    if (filter.type === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    } else if (filter.type !== 'all') {
      const days = parseInt(filter.type) || 30;
      startDate.setDate(now.getDate() - days);
    }
    
    return expenses.filter(expense => new Date(expense.date) >= startDate);
  }, [expenses, activeFilter, timeFilter, customStart, customEnd]);

  // Calculate category data for charts
  const categoryData = useMemo(() => {
    const stats = {};
    filteredExpenses.filter(i => i.type !== 'income').forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + item.amount;
    });
    return Object.entries(stats).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  }, [filteredExpenses]);

  // Calculate total income, expenses, and balance
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    return filteredExpenses.reduce((acc, item) => {
      if (item.type === 'income') {
        acc.totalIncome += item.amount;
      } else {
        acc.totalExpense += item.amount;
      }
      acc.balance = acc.totalIncome - acc.totalExpense;
      return acc;
    }, { totalIncome: 0, totalExpense: 0, balance: 0 });
  }, [filteredExpenses]);

  // --- 3. Computed Data (Filtering, Aggregation) ---

  // Aggregate daily totals for the trend chart
  const dailyTrendData = useMemo(() => {
    if (timeFilter === 'all') return []; 
    const stats = {};
    // For trend, treat income as positive and expenses as negative to show net movement
    filteredExpenses.forEach(item => {
      const delta = item.type === 'income' ? item.amount : -item.amount;
      stats[item.date] = (stats[item.date] || 0) + delta;
    });
    // Convert object to array of { date, value }
    return Object.keys(stats).map(date => ({ date, value: stats[date] }));
  }, [filteredExpenses, timeFilter]);

  // --- 4. CRUD Operations ---
  // Handle selecting Income vs Expense in the form
  const handleTypeSelect = (t) => {
    setFormData(prev => ({
      ...prev,
      type: t,
      // Clear category when selecting income so user picks none
      category: t === 'income' ? '' : (prev.category || 'Food')
    }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.amount) {
      alert('Please fill in the amount field');
      return;
    }
    
    if (!user) {
      alert('⚠️ Authentication failed. Please configure Firebase credentials in src/firebaseConfig.js');
      return;
    }
    
    const amountFloat = parseFloat(formData.amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      // Local fallback (no Firebase) - persist to localStorage
      if (useLocalFallback || String(user.uid).startsWith('local_')) {
        const key = `fintrack:${sanitizedAppId}:expenses`;
        const raw = localStorage.getItem(key);
        const current = raw ? JSON.parse(raw) : [];
        const newItem = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          amount: amountFloat,
          category: formData.category,
          type: formData.type || 'expense',
          description: formData.description,
          date: formData.date
        };
        const updated = [newItem, ...current];
        localStorage.setItem(key, JSON.stringify(updated));
        setExpenses(prev => [newItem, ...prev]);
        setFormData({ amount: '', category: 'Food', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] });
        setView('dashboard');
        alert('Expense added locally (Firebase not configured).');
        return;
      }

      const expensesCollectionPath = `artifacts/${sanitizedAppId}/users/${user.uid}/expenses`;
      await addDoc(collection(db, expensesCollectionPath), {
        ...formData,
        amount: amountFloat,
        type: formData.type || 'expense',
        createdAt: serverTimestamp() // Adds Firestore timestamp for internal sorting/tracking
      });
      // Reset form and switch view
      setFormData({ amount: '', category: 'Food', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] });
      setView('dashboard');
      alert('Expense added successfully!');
    } catch(e) { 
      console.error("Add failed:", e);
      alert('Error adding expense: ' + e.message);
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      // Local fallback deletion
      if (useLocalFallback || String(user.uid).startsWith('local_')) {
        const key = `fintrack:${sanitizedAppId}:expenses`;
        const raw = localStorage.getItem(key);
        const current = raw ? JSON.parse(raw) : [];
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem(key, JSON.stringify(updated));
        setExpenses(prev => prev.filter(e => e.id !== id));
        alert('Expense deleted (local).');
        return;
      }

      const expenseDocPath = `artifacts/${sanitizedAppId}/users/${user.uid}/expenses/${id}`;
      await deleteDoc(doc(db, expenseDocPath));
      alert('Expense deleted successfully!');
    }
    catch(e){ 
      console.error("Deletion failed:", e);
      alert('Error deleting expense: ' + e.message);
    }
  };
  
  const exportData = (type) => {
    if(filteredExpenses.length === 0) return console.log("No data to export");
    
    // Prepare the data structure
    const dataToExport = filteredExpenses.map(e => ({
      Date: e.date,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
      Type: e.type || 'expense',
      ID: e.id 
    }));

    let dataStr;
    let mimeType;
    let extension;
    
    if (type === 'json') {
      dataStr = JSON.stringify(dataToExport, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else { // CSV
      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(row => 
        Object.values(row).map(value => 
          // Simple CSV sanitation: wrap strings containing commas or quotes in double quotes
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      );
      dataStr = [headers, ...rows].join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    }
    
    // Trigger download
    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${timeFilter}days.${extension}`;
    a.click();
    URL.revokeObjectURL(url); // Clean up
  };

  const exportPDF = async () => {
    if (filteredExpenses.length === 0) return console.log('No data to export');
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 15;

    // Helper for currency formatting
    const fmt = (n) => {
      if (n == null || isNaN(n)) return '0.00';
      return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // ===== HEADER SECTION =====
    // Background color for header
    doc.setFillColor(75, 85, 99); // Dark slate background
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('FinTrack', 15, 12);
    doc.setFontSize(10);
    doc.text('Financial Report', 15, 20);

    // Date and Range info on right side
    doc.setFontSize(9);
    const rangeLabel = timeFilter === 'all' ? 'All Time' : `Last ${timeFilter} Days`;
    const generatedDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.text(`Range: ${rangeLabel}`, pageWidth - 60, 12);
    doc.text(`Generated: ${generatedDate}`, pageWidth - 60, 20);

    yPosition = 35;

    // ===== SUMMARY CARDS SECTION =====
    doc.setTextColor(0, 0, 0);
    const cardWidth = (pageWidth - 20 - 10) / 3;
    const cardHeight = 22;
    const cardY = yPosition;

    // Income Card
    doc.setFillColor(34, 197, 94); // Emerald green
    doc.rect(10, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Total Income', 12, cardY + 7);
    doc.setFontSize(14);
    doc.text(`₹ ${fmt(totalIncome)}`, 12, cardY + 17);

    // Expense Card
    doc.setFillColor(239, 68, 68); // Red
    doc.rect(10 + cardWidth + 5, cardY, cardWidth, cardHeight, 'F');
    doc.setFontSize(10);
    doc.text('Total Expense', 12 + cardWidth + 5, cardY + 7);
    doc.setFontSize(14);
    doc.text(`₹ ${fmt(totalExpense)}`, 12 + cardWidth + 5, cardY + 17);

    // Balance Card
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(10 + 2 * (cardWidth + 5), cardY, cardWidth, cardHeight, 'F');
    doc.setFontSize(10);
    doc.text('Net Balance', 12 + 2 * (cardWidth + 5), cardY + 7);
    doc.setFontSize(14);
    doc.setTextColor(balance >= 0 ? 34 : 239, balance >= 0 ? 197 : 68, balance >= 0 ? 94 : 68);
    doc.text(`₹ ${fmt(balance)}`, 12 + 2 * (cardWidth + 5), cardY + 17);

    yPosition += cardHeight + 12;

    // ===== CATEGORY BREAKDOWN SECTION =====
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Category Breakdown', 15, yPosition);
    yPosition += 8;

    // Category table with better styling
    const catRows = categoryData.map(c => [c.name, `₹ ${fmt(c.value)}`]);
    doc.autoTable({
      head: [['Category', 'Amount']],
      body: catRows,
      startY: yPosition,
      margin: { left: 15, right: 15 },
      styles: {
        font: 'Helvetica',
        fontSize: 9,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [99, 102, 241], // Indigo
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    yPosition = doc.lastAutoTable.finalY + 12;

    // ===== DETAILED TRANSACTIONS SECTION =====
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Transaction Details', 15, yPosition);
    yPosition += 8;

    // Transactions table with comprehensive details
    const txRows = filteredExpenses.map(e => [
      formatDate(e.date),
      e.type === 'income' ? 'Income' : 'Expense',
      e.category || '-',
      `₹ ${fmt(e.amount)}`,
      e.description || '-'
    ]);

    doc.autoTable({
      head: [['Date', 'Type', 'Category', 'Amount', 'Description']],
      body: txRows,
      startY: yPosition,
      margin: { left: 15, right: 15 },
      styles: {
        font: 'Helvetica',
        fontSize: 8,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [220, 220, 220],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [99, 102, 241], // Indigo
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Date
        1: { cellWidth: 20 }, // Type
        2: { cellWidth: 25 }, // Category
        3: { cellWidth: 25, halign: 'right' }, // Amount
        4: { cellWidth: 'auto' } // Description
      },
      didDrawCell: function(data) {
        // Color code the Type column
        if (data.column.index === 1 && data.row.index >= 0) {
          const text = data.cell.text[0];
          if (text === 'Income') {
            data.cell.styles.textColor = [34, 197, 94]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (text === 'Expense') {
            data.cell.styles.textColor = [239, 68, 68]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      willDrawPage: function(data) {
        // Page numbers at bottom
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('FinTrack Report', 15, pageHeight - 10);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 25, pageHeight - 10);
      }
    });

    // ===== SUMMARY STATISTICS SECTION =====
    yPosition = doc.lastAutoTable.finalY + 12;

    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary Statistics', 15, yPosition);
    yPosition += 8;

    // Statistics in a nice format
    const stats = [
      ['Total Transactions', filteredExpenses.length.toString()],
      ['Average Transaction', filteredExpenses.length > 0 ? `₹ ${fmt(filteredExpenses.reduce((a, e) => a + e.amount, 0) / filteredExpenses.length)}` : '₹ 0.00'],
      ['Highest Income', totalIncome > 0 ? `₹ ${fmt(Math.max(...filteredExpenses.filter(e => e.type === 'income').map(e => e.amount) || [0]))}` : 'N/A'],
      ['Highest Expense', totalExpense > 0 ? `₹ ${fmt(Math.max(...filteredExpenses.filter(e => e.type === 'expense').map(e => e.amount) || [0]))}` : 'N/A'],
      ['Savings Rate', totalIncome > 0 ? `${((balance / totalIncome) * 100).toFixed(1)}%` : 'N/A']
    ];

    doc.autoTable({
      body: stats,
      startY: yPosition,
      margin: { left: 15, right: 15 },
      styles: {
        font: 'Helvetica',
        fontSize: 9,
        cellPadding: 4,
        textColor: [0, 0, 0],
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80, fillColor: [245, 245, 245] },
        1: { halign: 'right', cellWidth: 'auto' }
      }
    });

    // ===== FOOTER SECTION =====
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerName = (user && !String(user.uid).startsWith('local_'))
      ? (user.displayName || user.email || `user:${String(user.uid).slice(0, 6)}`)
      : 'FinTrack User';
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < pageHeight - 20) {
      doc.text(`Generated by: ${footerName}`, 15, finalY);
      doc.text(`Report Date: ${new Date().toLocaleString('en-IN')}`, 15, finalY + 5);
      doc.text('This is an automated financial report generated by FinTrack', 15, finalY + 10);
    }

    // Save with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`FinTrack_Report_${rangeLabel.replace(/\s+/g, '_')}_${timestamp}.pdf`);
  };

  // --- Auth Helpers for Interactive Sign-in ---
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setUseLocalFallback(false);
      alert('Signed in with Google');
    } catch (err) {
      console.error('Google sign-in failed:', err);
      alert('Google sign-in failed: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUseLocalFallback(true);
      alert('Signed out');
    } catch (err) {
      console.error('Sign-out failed:', err);
      alert('Sign-out failed: ' + err.message);
    }
  };

  // Show loading spinner while app is initializing
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading Expense Tracker...</p>
        </div>
      </div>
    );
  }

  if (loading && !expenses.length) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col md:flex-row font-sans text-white overflow-hidden">
      
      {/* --- Animated Background Effects --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-60 lg:w-72 bg-gradient-to-b from-purple-900/40 via-purple-800/20 to-indigo-900/40 fixed md:relative h-full z-20 shadow-2xl overflow-y-auto border-r border-white/10 backdrop-blur-xl">
        <div className="p-4 lg:p-6 flex items-center gap-3 text-white font-bold text-lg lg:text-xl tracking-tight sticky top-0 bg-gradient-to-b from-purple-900/60 to-transparent">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl border border-white/20 flex-shrink-0 shadow-lg">
            <WalletCards size={24} />
          </div>
          <span>FinTrack</span>
        </div>
        
        <nav className="flex-1 px-3 lg:px-4 space-y-2 mt-6">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all font-semibold text-sm lg:text-base min-h-[48px] ${view === 'dashboard' ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/60 text-white backdrop-blur-sm border border-white/30 shadow-xl' : 'text-indigo-100 hover:bg-white/10 hover:text-white hover:border-white/20'}`}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button onClick={() => setView('add')} className={`w-full flex items-center gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all font-semibold text-sm lg:text-base min-h-[48px] ${view === 'add' ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/60 text-white backdrop-blur-sm border border-white/30 shadow-xl' : 'text-indigo-100 hover:bg-white/10 hover:text-white hover:border-white/20'}`}>
            <PlusCircle size={20} /> <span>Add Expense</span>
          </button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-4 py-3 lg:py-4 rounded-2xl transition-all font-semibold text-sm lg:text-base min-h-[48px] ${view === 'history' ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/60 text-white backdrop-blur-sm border border-white/30 shadow-xl' : 'text-indigo-100 hover:bg-white/10 hover:text-white hover:border-white/20'}`}>
            <History size={20} /> <span>History</span>
          </button>
        </nav>

        <div className="p-4 lg:p-6 border-t border-white/10 sticky bottom-0 bg-gradient-to-b from-transparent to-purple-900/40">
           <div className="space-y-4">
               <div className="bg-gradient-to-br from-purple-600/30 to-indigo-600/20 backdrop-blur-md rounded-3xl p-4 text-white border border-white/30 shadow-xl hover:shadow-2xl transition-all hover:border-white/50">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-1">Net Balance</p>
                <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent break-words">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-lg flex-shrink-0 shadow-lg">
                        <CreditCard size={18} className="text-white"/>
                    </div>
                </div>
            <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
              <div className="text-white/70"><span className="font-bold text-emerald-300 block">₹{totalIncome.toLocaleString()}</span><span className="text-white/60 text-xs">Income</span></div>
              <div className="text-white/70"><span className="font-bold text-rose-300 block">₹{totalExpense.toLocaleString()}</span><span className="text-white/60 text-xs">Expense</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex gap-2">
              <button onClick={() => exportData('csv')} className="text-xs text-indigo-200 hover:text-emerald-300 flex items-center gap-1 transition-colors flex-1 justify-center font-semibold"><FileSpreadsheet size={14}/> CSV</button>
              <button onClick={exportPDF} className="text-xs text-indigo-200 hover:text-rose-300 flex items-center gap-1 transition-colors flex-1 justify-center font-semibold"><FileJson size={14}/> PDF</button>
            </div>
              </div>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 w-full md:w-auto md:ml-60 lg:ml-72 pb-28 md:pb-8 flex flex-col relative z-10">
        {/* Header (Mobile & Desktop) */}
        <header className="sticky top-0 z-10 bg-gradient-to-b from-slate-900/80 via-purple-900/40 to-transparent backdrop-blur-2xl border-b border-white/10 px-4 md:px-6 lg:px-8 py-3 md:py-4 shadow-2xl">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-white capitalize bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">{view === 'add' ? 'Add New Expense' : view === 'history' ? 'Transactions' : 'Dashboard'}</h1>
                
                {/* Auth Controls */}
                <div className="flex items-center gap-2 md:gap-3">
                  {user && !String(user.uid).startsWith('local_') ? (
                    <button onClick={handleSignOut} className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold bg-gradient-to-r from-red-500/30 to-rose-500/30 hover:from-red-500/50 hover:to-rose-500/50 text-red-100 border border-red-500/40 transition-all hover:shadow-lg min-h-[44px] flex items-center">Sign out</button>
                  ) : (
                    <button onClick={handleGoogleSignIn} className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold bg-gradient-to-r from-blue-500/30 to-cyan-500/30 hover:from-blue-500/50 hover:to-cyan-500/50 text-blue-100 border border-blue-500/40 transition-all hover:shadow-lg min-h-[44px] flex items-center">Sign in</button>
                  )}
                </div>
              </div>

              {/* Time Filter Toggle */}
              {view !== 'add' && (
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
                    <div className="flex bg-white/8 backdrop-blur-md p-1 rounded-2xl border border-white/20 overflow-x-auto shadow-lg">
                        {['1','7', '30','custom', 'all'].map((t) => (
                            <button
                                key={t}
                                onClick={() => {
                                  setTimeFilter(t);
                                  if (t !== 'custom') setActiveFilter({ type: t });
                                }}
                                className={`px-2 md:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] flex items-center ${timeFilter === t ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-lg border border-white/30' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                            >
                                {t === 'all' ? 'All' : t === 'custom' ? 'Custom' : t === '1' ? 'Today' : `${t}d`}
                            </button>
                        ))}
                    </div>

                    {timeFilter === 'custom' && (
                      <div className="inline-flex flex-col md:flex-row items-start md:items-center bg-white/8 p-2 rounded-2xl gap-2 w-full md:w-auto border border-white/20 backdrop-blur-md">
                        <label className="text-xs text-white/60 font-semibold">From</label>
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-white/10 border border-white/30 px-2 py-1 rounded-lg text-sm text-white min-h-[44px] w-full md:w-auto focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 outline-none" />
                        <label className="text-xs text-white/60 font-semibold">To</label>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-white/10 border border-white/30 px-2 py-1 rounded-lg text-sm text-white min-h-[44px] w-full md:w-auto focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 outline-none" />
                        <div className="flex gap-2 w-full md:w-auto">
                          <button onClick={() => {
                            if (customStart && customEnd) {
                              setActiveFilter({ type: 'custom', start: customStart, end: customEnd });
                              setTimeFilter('custom');
                            } else {
                              alert('Select both start and end dates');
                            }
                          }} className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white min-h-[44px] flex items-center flex-1 md:flex-none justify-center hover:shadow-lg transition-all">Apply</button>
                          <button onClick={() => { setCustomStart(''); setCustomEnd(''); setTimeFilter('30'); setActiveFilter({ type: '30' }); }} className="px-3 py-1 rounded-lg text-xs font-bold bg-white/15 text-white min-h-[44px] flex items-center flex-1 md:flex-none justify-center hover:bg-white/25">Clear</button>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
        </header>

        <div className="flex-1 p-3 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 md:space-y-6">

            {useLocalFallback && (
              <div className="p-3 md:p-4 rounded-2xl bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-100 text-center border border-yellow-500/50 text-xs md:text-sm backdrop-blur-md shadow-lg">
                ⚠️ Running in Local Mode — Firebase not configured. Data will be stored locally only.
              </div>
            )}

            {/* --- DASHBOARD VIEW --- */}
            {view === 'dashboard' && (
                <>
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                         <Card className="bg-gradient-to-br from-purple-600/40 via-violet-600/30 to-indigo-700/40 text-white border-none relative overflow-hidden shadow-2xl hover:shadow-3xl lg:col-span-1 group">
                            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 group-hover:opacity-10 transition-all"><TrendingUp size={100} /></div>
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl group-hover:blur-2xl transition-all"></div>
                            <div className="relative z-10">
                                <p className="text-indigo-100 font-bold mb-2 flex items-center gap-2 text-xs md:text-sm"><Filter size={14}/> {timeFilter === 'all' ? 'Lifetime' : `Last ${timeFilter}d`}</p>
                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent break-words">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                <p className="text-indigo-200 text-xs md:text-sm mt-4 flex items-center gap-1">
                                    <ArrowUpRight size={16}/> {filteredExpenses.length} transactions
                                </p>
                            </div>
                         </Card>

                        {/* Trend Chart Card */}
                         <Card className="md:col-span-1 lg:col-span-2 flex flex-col justify-between group">
                            <div className="flex justify-between items-center mb-2 md:mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent"><TrendingUp size={18} className="text-violet-300"/> Spending Trend</h3>
                            </div>
                            {timeFilter === 'all' ? (
                                <div className="h-40 md:h-48 flex items-center justify-center text-white/60 bg-white/5 rounded-2xl border border-dashed border-white/20 text-xs md:text-sm font-medium">
                                    Select a time period to see trends
                                </div>
                            ) : (
                                <TrendChart data={dailyTrendData} days={parseInt(timeFilter)} />
                            )}
                         </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                        {/* Categories */}
                        <Card className="lg:col-span-1 group">
                            <h3 className="font-bold text-white mb-4 md:mb-6 flex items-center gap-2 text-sm md:text-base bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent"><PieChart size={18} className="text-violet-300"/> Breakdown</h3>
                            <DonutChart data={categoryData} />
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="lg:col-span-2 group">
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent"><History size={18} className="text-violet-300"/> Recent Activity</h3>
                                <button onClick={() => setView('history')} className="text-indigo-300 hover:text-emerald-300 text-xs md:text-sm font-semibold hover:scale-110 transition-all">View All →</button>
                            </div>
                            <div className="space-y-2 md:space-y-3">
                                {filteredExpenses.slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-white/8 transition-all duration-300 border border-transparent hover:border-white/30 gap-3 min-h-[56px] group/item">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/50 to-indigo-600/50 flex items-center justify-center text-purple-200 font-bold text-sm flex-shrink-0 border border-white/20 shadow-lg">
                                                {item.category[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-white text-sm truncate">{item.category}</p>
                                                <p className="text-xs text-white/50">{formatDate(item.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                    <p className={`font-bold text-sm ${item.type === 'income' ? 'text-emerald-300' : 'text-white'}`}>{item.type === 'income' ? `+₹${item.amount.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}</p>
                                            <p className="text-xs text-white/50 truncate max-w-[120px]">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {filteredExpenses.length === 0 && <p className="text-white/60 text-center py-8 text-sm font-medium">No transactions found.</p>}
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* --- ADD EXPENSE VIEW --- */}
            {view === 'add' && (
                 <div className="max-w-2xl mx-auto w-full pt-2 md:pt-4">
                    <Card className="border-t-4 border-t-purple-500 group">
                        <form onSubmit={handleAdd} className="space-y-4 md:space-y-5">
                            <div>
                                <label className="block text-xs md:text-sm font-bold text-white mb-1.5 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-lg font-bold">₹</span>
                                    <input 
                                        type="number" step="0.01" required 
                                        className="w-full pl-8 pr-4 py-3 md:py-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/30 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:bg-white/15 outline-none transition-all font-semibold text-base md:text-lg text-white placeholder-white/50 min-h-[48px] shadow-lg hover:border-white/40"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                              <label className="block text-xs md:text-sm font-bold text-white mb-2.5 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Type</label>
                              <div className="inline-flex rounded-2xl bg-white/8 p-1 border border-white/20 shadow-lg">
                                <button type="button" onClick={() => handleTypeSelect('expense')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl text-sm font-bold transition-all min-h-[44px] ${formData.type === 'expense' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                                  💰 Expense
                                </button>
                                <button type="button" onClick={() => handleTypeSelect('income')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl text-sm font-bold transition-all min-h-[44px] ${formData.type === 'income' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                                  💵 Income
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-white mb-1.5 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Category</label>
                                    <select 
                                      className="w-full px-4 py-3 md:py-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/30 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all text-white text-sm md:text-base min-h-[48px] shadow-lg hover:border-white/40 font-semibold"
                                      value={formData.category}
                                      onChange={e => setFormData({...formData, category: e.target.value})}
                                      disabled={formData.type === 'income'}
                                    >
                                      <option value="" disabled className="text-white/60">{formData.type === 'income' ? 'Not applicable for income' : 'Select category'}</option>
                                      {['Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Other'].map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-white mb-1.5 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Date</label>
                                    <input 
                                        type="date" required 
                                        className="w-full px-4 py-3 md:py-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/30 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all text-white text-sm md:text-base min-h-[48px] shadow-lg hover:border-white/40 font-semibold"
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-bold text-white mb-1.5 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">Description <span className="text-white/50 font-normal">(Optional)</span></label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-3 md:py-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/30 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all text-white placeholder-white/50 text-sm md:text-base min-h-[48px] shadow-lg hover:border-white/40 font-semibold"
                                    placeholder="Lunch with friends..."
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="pt-4 flex flex-col md:flex-row gap-3 md:gap-4">
                                <Button type="button" variant="secondary" onClick={() => setView('dashboard')} className="flex-1 min-h-[48px] font-bold">Cancel</Button>
                                <Button type="submit" className="flex-1 min-h-[48px] font-bold" disabled={loading}>{loading ? '⏳ Saving...' : '✨ Save Expense'}</Button>
                            </div>
                        </form>
                    </Card>
                 </div>
            )}

            {/* --- HISTORY VIEW --- */}
            {view === 'history' && (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4">
                      <h3 className="font-bold text-white text-lg md:text-xl bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">All Transactions</h3>
                      <div className="flex gap-2 w-full md:w-auto">
                           <Button onClick={() => exportData('csv')} variant="ghost" icon={FileSpreadsheet} className="text-xs flex-1 md:flex-none min-h-[44px] font-bold">CSV</Button>
                           <Button onClick={exportPDF} variant="ghost" icon={FileJson} className="text-xs flex-1 md:flex-none min-h-[44px] font-bold">PDF</Button>
                      </div>
                  </div>
                  
                  <Card className="overflow-hidden p-0 group">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-y border-white/20">
                          <tr>
                            <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-white/90 uppercase tracking-wider">Date</th>
                            <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-white/90 uppercase tracking-wider">Category</th>
                            <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-white/90 uppercase tracking-wider">Description</th>
                            <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-white/90 uppercase tracking-wider text-right">Amount</th>
                            <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-white/90 uppercase tracking-wider text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-white/10 transition-all group/row">
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-white whitespace-nowrap font-semibold">{formatDate(expense.date)}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600/40 to-indigo-600/40 text-white border border-white/30">
                                        {expense.category}
                                      </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-white/80 max-w-[200px] truncate font-semibold">{expense.description}</td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-bold text-right">
                                      {expense.type === 'income' ? (
                                        <span className="text-emerald-300">+₹{expense.amount.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-white">-₹{expense.amount.toFixed(2)}</span>
                                      )}
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                      <button 
                                        onClick={() => handleDelete(expense.id)}
                                        className="p-2 text-white/70 hover:text-red-400 hover:bg-red-50/10 rounded-lg transition-all inline-flex items-center justify-center hover:scale-110"
                                        title="Delete Transaction"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-4 md:px-6 py-8 md:py-10 text-center text-white/60 font-medium">
                                        No transactions found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-3">
                      {filteredExpenses.map((expense) => (
                        <div key={expense.id} className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 border border-white/20 hover:border-white/40 transition-all hover:shadow-lg group/card">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/50 to-indigo-600/50 text-purple-200 font-bold text-sm flex-shrink-0 border border-white/30 shadow-lg">
                                {expense.category[0]}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white text-sm">{expense.category}</p>
                                <p className="text-xs text-white/50">{formatDate(expense.date)}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDelete(expense.id)}
                              className="p-2 text-white/70 hover:text-red-400 transition-all flex-shrink-0 hover:scale-110"
                              title="Delete Transaction"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-xs text-white/70 mb-2 truncate font-semibold">{expense.description}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <span className="text-xs text-white/60 font-semibold">Amount</span>
                            <span className={`font-bold text-sm ${expense.type === 'income' ? 'text-emerald-300' : 'text-white'}`}>
                              {expense.type === 'income' ? `+₹${expense.amount.toFixed(2)}` : `-₹${expense.amount.toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <div className="text-center text-white/60 py-8 font-medium">
                          No transactions found for this period.
                        </div>
                      )}
                    </div>
                  </Card>
                </>
            )}
        </div>
      </main>

      {/* --- Mobile Bottom Nav --- */}
      <nav className="fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-slate-900/90 to-slate-900/50 backdrop-blur-2xl border-t border-white/20 flex justify-around items-end md:hidden z-30 pb-safe shadow-2xl">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center justify-center gap-1 text-xs font-bold min-h-[60px] flex-1 transition-all ${view === 'dashboard' ? 'text-purple-400 bg-gradient-to-t from-purple-600/20 to-transparent' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard size={22} />
            <span>Home</span>
        </button>
        <button onClick={() => setView('add')} className={`flex flex-col items-center justify-center gap-1 text-xs font-bold flex-1 transition-all relative`}>
            <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 text-white p-3 rounded-full -mt-7 shadow-2xl border-4 border-slate-950 flex items-center justify-center hover:scale-110 transition-all transform">
                <PlusCircle size={26} />
            </div>
            <span className="mt-1">Add</span>
        </button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center justify-center gap-1 text-xs font-bold min-h-[60px] flex-1 transition-all ${view === 'history' ? 'text-purple-400 bg-gradient-to-t from-purple-600/20 to-transparent' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <History size={22} />
            <span>History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;