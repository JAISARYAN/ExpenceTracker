import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
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

// --- Firebase Configuration and Initialization (Using Canvas Globals) ---
// Global variables are automatically provided by the Canvas environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { apiKey: "DUMMY_API_KEY", projectId: "DUMMY_PROJECT_ID" }; 

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; 
// Sanitize the app ID to ensure it is a valid Firestore document/collection ID
const sanitizedAppId = rawAppId.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '_'); 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set Firestore debug level to help diagnose connection issues
setLogLevel('debug');

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
  <div className={`bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 transition-all duration-300 hover:shadow-2xl hover:border-white/40 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon, type = "button" }) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:to-indigo-700",
    secondary: "bg-white/20 text-white border border-white/30 backdrop-blur-sm hover:bg-white/30 hover:border-white/50",
    danger: "bg-red-500/20 text-red-200 hover:bg-red-500/40 border border-red-500/40",
    ghost: "text-white/70 hover:text-white hover:bg-white/10"
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
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-white/60 text-sm">No data for this period</div>;

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
    <div className="w-full h-48 relative pt-4">
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
        <span>{formatDate(dateRange[0])}</span>
        {dateRange.length > 1 && <span>{formatDate(dateRange[Math.floor(dateRange.length/2)])}</span>}
        {dateRange.length > 0 && <span>{formatDate(dateRange[dateRange.length - 1])}</span>}
      </div>
    </div>
  );
};

// Custom SVG Donut Chart for Category Breakdown
const DonutChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="h-64 flex flex-col items-center justify-center text-white/60">
      <div className="bg-white/5 p-4 rounded-full mb-2"><PieChart size={24} className="opacity-20 text-white/30"/></div>
      <span className="text-sm">No expenses yet</span>
    </div>
  );

  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;
  const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-52">
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
          <span className="text-xl font-bold text-white">₹{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-y-2 mt-6 w-full max-w-xs">
        {data.slice(0, 6).map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full ring-1 ring-white/10" style={{ backgroundColor: colors[i % colors.length] }}></span>
              <span className="text-white font-medium truncate max-w-[160px]">{item.name}</span>
            </div>
            <div className="flex items-baseline gap-3">
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
export default function App() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'add'
  const [timeFilter, setTimeFilter] = useState('30'); // '7', '30', 'all'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    type: 'expense',
    description: '',
    // Initialize date to today's date in YYYY-MM-DD format
    date: new Date().toISOString().split('T')[0] 
  });

  // If Firebase is not configured or auth fails, use localStorage fallback
  const [useLocalFallback, setUseLocalFallback] = useState(false);

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

  // --- 3. Computed Data (Filtering, Aggregation) ---
  const filteredExpenses = useMemo(() => {
    if (timeFilter === 'all') return expenses;

    if (timeFilter === 'custom') {
      if (!customStart || !customEnd) return expenses;
      const start = new Date(customStart + 'T00:00:00');
      const end = new Date(customEnd + 'T23:59:59');
      return expenses.filter(e => {
        const expenseDate = new Date(e.date + 'T12:00:00');
        return expenseDate >= start && expenseDate <= end;
      });
    }

    // For numeric day filters (including '1' for today)
    const days = parseInt(timeFilter);
    const cutoff = new Date();
    // Set cutoff to the beginning of the day 'days' ago
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0,0,0,0);

    return expenses.filter(e => {
        // Create Date object from YYYY-MM-DD string
        const expenseDate = new Date(e.date + 'T00:00:00'); 
        return expenseDate >= cutoff;
    });
  }, [expenses, timeFilter]);

  const totalSpent = useMemo(() => 
    // Treat expenses as positive amounts; income will be accounted separately
    filteredExpenses.reduce((sum, item) => sum + (item.type === 'income' ? 0 : item.amount), 0)
  , [filteredExpenses]);
  
  const totalIncome = useMemo(() =>
    filteredExpenses.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : 0), 0)
  , [filteredExpenses]);

  const netBalance = useMemo(() => totalIncome - totalSpent, [totalIncome, totalSpent]);
  
  const categoryData = useMemo(() => {
    // Only include expense-type transactions for category breakdown
    const stats = {};
    filteredExpenses.filter(i => i.type !== 'income').forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + item.amount;
    });
    return Object.keys(stats)
      .map(key => ({ name: key, value: stats[key] }))
      .sort((a, b) => b.value - a.value); // Sort by highest spending
  }, [filteredExpenses]);

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
    // Dynamically import to avoid bundler issues if package missing
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    // Use a standard font (Helvetica) and ASCII-only number formatting to avoid glyph issues
    doc.setFont('Helvetica');
    const title = 'FinTrack - Expense Report';
    const rangeLabel = timeFilter === 'all' ? 'All time' : `${timeFilter} days`;
    doc.setFontSize(16);
    doc.text(title, 40, 50);
    doc.setFontSize(11);
    doc.text(`Range: ${rangeLabel}`, 40, 70);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 86);

    const fmt = (n) => {
      if (n == null || isNaN(n)) return '0.00';
      // plain ASCII thousands separator with 2 decimals
      return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Totals (use 'Rs' prefix instead of rupee glyph to avoid missing-glyph issues)
    doc.setFontSize(12);
    doc.text(`Total Income: Rs ${fmt(totalIncome)}`, 40, 110);
    doc.text(`Total Expense: Rs ${fmt(totalSpent)}`, 240, 110);
    doc.text(`Net: Rs ${fmt(netBalance)}`, 440, 110);

    // Category table
    const catRows = categoryData.map(c => [c.name, `Rs ${fmt(c.value)}`]);
    // @ts-ignore - autotable attaches to doc
    doc.autoTable({
      head: [['Category', 'Amount']],
      body: catRows,
      startY: 130,
      styles: { fontSize: 10 }
    });

    // Transactions table - place after categories
    const afterCats = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 250;
    const txRows = filteredExpenses.map(e => [formatDate(e.date), e.type.toUpperCase(), e.category || '-', `Rs ${fmt(e.amount)}`, e.description || '']);
    doc.autoTable({
      head: [['Date','Type','Category','Amount','Description']],
      body: txRows,
      startY: afterCats,
      styles: { fontSize: 9 },
      columnStyles: { 4: { cellWidth: 160 } }
    });

    doc.save(`fintrack_report_${timeFilter}.pdf`);
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

  if (loading && !expenses.length) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex font-sans text-white">
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700 fixed h-full z-20 shadow-2xl">
        <div className="p-6 flex items-center gap-3 text-white font-bold text-2xl tracking-tight">
          <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg border border-white/30">
            <WalletCards size={28} />
          </div>
          <span>FinTrack</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${view === 'dashboard' ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30 shadow-lg' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setView('add')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${view === 'add' ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30 shadow-lg' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>
            <PlusCircle size={20} /> Add Expense
          </button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${view === 'history' ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30 shadow-lg' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}>
            <History size={20} /> Transactions
          </button>
        </nav>

        <div className="p-6 border-t border-white/20">
           {/* Mini Stats in Sidebar */}
           <div className="space-y-4">
               <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white border border-white/20 shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                <p className="text-indigo-100 text-xs font-medium uppercase tracking-wide mb-1">Net Balance</p>
                <h3 className="text-2xl font-bold">₹{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg">
                        <CreditCard size={16} className="text-white"/>
                    </div>
                </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between gap-2 text-sm">
              <div className="text-white/70">Income: <span className="font-semibold text-emerald-300">₹{totalIncome.toLocaleString()}</span></div>
              <div className="text-white/70">Expense: <span className="font-semibold text-rose-300">₹{totalSpent.toLocaleString()}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex gap-2">
              <button onClick={() => exportData('csv')} className="text-xs text-indigo-100 hover:text-white flex items-center gap-1 transition-colors"><FileSpreadsheet size={12}/> CSV</button>
              <div className="w-px h-3 bg-white/30 self-center"></div>
              <button onClick={exportPDF} className="text-xs text-indigo-100 hover:text-white flex items-center gap-1 transition-colors"><FileJson size={12}/> PDF</button>
            </div>
              </div>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-6">
        {/* Header (Mobile & Desktop) */}
        <header className="sticky top-0 z-10 bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex justify-between items-center shadow-lg">
            <h1 className="text-2xl font-bold text-white capitalize">{view === 'add' ? 'Add New Expense' : view === 'history' ? 'Transaction History' : 'Dashboard'}</h1>
            
            {/* Time Filter Toggle */}
            {view !== 'add' && (
              <div className="flex items-center gap-3">
                <div className="flex bg-white/10 backdrop-blur-sm p-1 rounded-lg border border-white/20">
                  {['1','7', '30','custom', 'all'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeFilter(t)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeFilter === t ? 'bg-indigo-600/80 text-white shadow-lg border border-indigo-400' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    >
                      {t === 'all' ? 'All' : t === 'custom' ? 'Custom' : t === '1' ? 'Today' : `${t} Days`}
                    </button>
                  ))}
                </div>

                {timeFilter === 'custom' && (
                  <div className="inline-flex items-center bg-white/6 p-2 rounded-lg gap-2">
                  <label className="text-xs text-white/60">From</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent border border-white/20 px-2 py-1 rounded-md text-sm text-white" />
                  <label className="text-xs text-white/60">To</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent border border-white/20 px-2 py-1 rounded-md text-sm text-white" />
                  <button onClick={() => { if(customStart && customEnd) setTimeFilter('custom'); else alert('Select both dates'); }} className="px-3 py-1 rounded-md text-xs bg-indigo-600">Apply</button>
                  <button onClick={() => { setCustomStart(''); setCustomEnd(''); setTimeFilter('30'); }} className="px-2 py-1 rounded-md text-xs bg-white/10">Clear</button>
                  </div>
                )}
              </div>
            )}
            {/* Auth Controls */}
            <div className="flex items-center gap-3">
              {user && !String(user.uid).startsWith('local_') ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-white/80">{user.displayName || user.email || user.uid.slice(0,6)}</div>
                  <button onClick={handleSignOut} className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">Sign out</button>
                </div>
              ) : (
                <div>
                  <button onClick={handleGoogleSignIn} className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">Sign in</button>
                </div>
              )}
            </div>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

            {useLocalFallback && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 text-yellow-100 text-center border border-yellow-400">
                ⚠️ Running in Local Mode — Firebase not configured. Data will be stored locally only. Create a `.env.local` from `.env.example` or update `src/firebaseConfig.js` to enable cloud sync.
              </div>
            )}

            {/* --- DASHBOARD VIEW --- */}
            {view === 'dashboard' && (
                <>
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                         <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white border-none relative overflow-hidden shadow-lg shadow-indigo-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={120} /></div>
                            <div className="relative z-10">
                                <p className="text-indigo-100 font-medium mb-1 flex items-center gap-2"><Filter size={14}/> {timeFilter === 'all' ? 'Lifetime' : `Last ${timeFilter} Days`}</p>
                                <h2 className="text-4xl font-bold tracking-tight">₹{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                <p className="text-indigo-200 text-sm mt-4 flex items-center gap-1">
                                    <ArrowUpRight size={16}/> {filteredExpenses.length} transactions
                                </p>
                            </div>
                         </Card>

                        {/* Trend Chart Card */}
                         <Card className="md:col-span-2 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-white flex items-center gap-2"><TrendingUp size={18} className="text-indigo-300"/> Spending Trend</h3>
                            </div>
                            {timeFilter === 'all' ? (
                                <div className="h-48 flex items-center justify-center text-white/60 bg-white/5 rounded-xl border border-dashed border-white/20">
                                    Select '7 Days' or '30 Days' to see daily trends
                                </div>
                            ) : (
                                <TrendChart data={dailyTrendData} days={parseInt(timeFilter)} />
                            )}
                         </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Categories */}
                        <Card>
                            <h3 className="font-bold text-white mb-6 flex items-center gap-2"><PieChart size={18} className="text-indigo-300"/> Breakdown</h3>
                            <DonutChart data={categoryData} />
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2"><History size={18} className="text-indigo-300"/> Recent Activity</h3>
                                <button onClick={() => setView('history')} className="text-indigo-300 text-sm font-medium hover:text-indigo-200">View All</button>
                            </div>
                            <div className="space-y-4">
                                {filteredExpenses.slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                                                {item.category[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{item.category}</p>
                                                <p className="text-xs text-white/60">{formatDate(item.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                    <p className={`font-bold ${item.type === 'income' ? 'text-emerald-300' : 'text-white'}`}>{item.type === 'income' ? `+₹${item.amount.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`}</p>
                                            <p className="text-xs text-white/60 truncate max-w-[120px]">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {filteredExpenses.length === 0 && <p className="text-white/60 text-center py-8">No transactions found.</p>}
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* --- ADD EXPENSE VIEW --- */}
            {view === 'add' && (
                 <div className="max-w-xl mx-auto pt-4">
                    <Card className="border-t-4 border-t-indigo-500">
                        <form onSubmit={handleAdd} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white mb-1.5">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">₹</span>
                                    <input 
                                        type="number" step="0.01" required 
                                        className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 outline-none transition-all font-semibold text-lg text-white placeholder-white/50"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-white mb-2.5">Type</label>
                              <div className="inline-flex rounded-xl bg-white/6 p-1">
                                <button type="button" onClick={() => handleTypeSelect('expense')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${formData.type === 'expense' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'text-white/80 hover:bg-white/5'}`}>
                                  Expense
                                </button>
                                <button type="button" onClick={() => handleTypeSelect('income')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${formData.type === 'income' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white' : 'text-white/80 hover:bg-white/5'}`}>
                                  Income
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-1.5">Category</label>
                                    <select 
                                      className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none transition-all text-white"
                                      value={formData.category}
                                      onChange={e => setFormData({...formData, category: e.target.value})}
                                      disabled={formData.type === 'income'}
                                    >
                                      <option value="" disabled className="text-white/60">{formData.type === 'income' ? 'Not applicable for income' : 'Select category'}</option>
                                      {['Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Other'].map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-1.5">Date</label>
                                    <input 
                                        type="date" required 
                                        className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none transition-all text-white"
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-1.5">Description <span className="text-white/50">(Optional)</span></label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none transition-all text-white placeholder-white/50"
                                    placeholder="Dinner at Joe's..."
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button type="button" variant="secondary" onClick={() => setView('dashboard')} className="flex-1">Cancel</Button>
                                <Button type="submit" className="flex-1 justify-center py-3" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
                            </div>
                        </form>
                    </Card>
                 </div>
            )}

            {/* --- HISTORY VIEW --- */}
            {view === 'history' && (
                <Card className="overflow-hidden p-0">
                    <div className="flex justify-end p-4">
                        <div className="flex space-x-2">
                             <Button onClick={() => exportData('csv')} variant="ghost" icon={FileSpreadsheet} className="text-xs">Export CSV</Button>
                             <Button onClick={exportPDF} variant="ghost" icon={FileJson} className="text-xs">Export PDF</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-white/5 border-y border-white/10">
                          <tr>
                            <th className="min-w-[100px] px-6 py-4 text-xs font-semibold text-white/80 uppercase tracking-wider">Date</th>
                            <th className="min-w-[100px] px-6 py-4 text-xs font-semibold text-white/80 uppercase tracking-wider">Category</th>
                            <th className="min-w-[200px] px-6 py-4 text-xs font-semibold text-white/80 uppercase tracking-wider">Description</th>
                            <th className="min-w-[80px] px-6 py-4 text-xs font-semibold text-white/80 uppercase tracking-wider text-right">Amount</th>
                            <th className="min-w-[80px] px-6 py-4 text-xs font-semibold text-white/80 uppercase tracking-wider text-center">Action</th>
                          </tr>
                        </thead>
                            <tbody className="divide-y divide-white/10">
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-white whitespace-nowrap">{formatDate(expense.date)}</td>
                                        <td className="px-6 py-4">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/30 text-white">
                                            {expense.category}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white/80">{expense.description}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-white text-right">
                                          {expense.type === 'income' ? (
                                            <span className="text-emerald-300">+₹{expense.amount.toFixed(2)}</span>
                                          ) : (
                                            <span className="text-white">-₹{expense.amount.toFixed(2)}</span>
                                          )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => handleDelete(expense.id)}
                                            className="p-2 text-white/70 hover:text-red-400 hover:bg-red-50/10 rounded-lg transition-all"
                                            title="Delete Transaction"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-white/60">
                                            No transactions found for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

        </div>
      </main>

      {/* --- Mobile Bottom Nav --- */}
      <nav className="fixed bottom-0 w-full bg-white/10 backdrop-blur-xl border-t border-white/20 flex justify-around p-3 md:hidden z-30 pb-safe">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 text-xs font-medium ${view === 'dashboard' ? 'text-indigo-400' : 'text-white/70'}`}>
            <LayoutDashboard size={20} />
            Home
        </button>
        <button onClick={() => setView('add')} className={`flex flex-col items-center gap-1 text-xs font-medium ${view === 'add' ? 'text-indigo-400' : 'text-white/70'}`}>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-3 rounded-full -mt-6 shadow-2xl border-4 border-slate-900/50">
                <PlusCircle size={24} />
            </div>
            Add
        </button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 text-xs font-medium ${view === 'history' ? 'text-indigo-400' : 'text-white/70'}`}>
            <History size={20} />
            History
        </button>
      </nav>
      
    </div>
  );
}