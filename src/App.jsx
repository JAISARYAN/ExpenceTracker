import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
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
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all duration-300 hover:shadow-md ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon, type = "button" }) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:to-indigo-700",
    secondary: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    ghost: "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
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
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-300 text-sm">No data for this period</div>;

  // 1. Prepare Data: Fill in missing days with 0 and ensure correct sorting/mapping
  const dateRange = getDaysArray(days);
  const chartData = dateRange.map(date => {
    const found = data.find(d => d.date === date);
    return { date, value: found ? found.value : 0 };
  });

  const values = chartData.map(d => d.value);
  const maxVal = Math.max(...values, 10); // Ensure min maxVal is 10 to prevent division by zero or overly flat lines
  
  // Calculate points for the SVG polyline
  const points = chartData.map((d, i) => {
    // X: evenly distributed across 0 to 100
    const x = (i / (chartData.length - 1)) * 100;
    // Y: scale value from maxVal to 15 (bottom) up to 100 (top, inverted)
    // We use a range from 15 to 100 to keep the line visible and allow some padding
    const y = 100 - (d.value / maxVal) * 90; 
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-48 relative pt-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Grid lines */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="#E2E8F0" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4" />
        <line x1="0" y1="0" x2="100" y2="0" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4" />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* The Area fill (Path starts at bottom-left, follows points, ends at bottom-right) */}
        <path
          d={`M 0,100 ${points} L 100,100 Z`}
          fill="url(#gradient)"
          opacity="0.2"
        />
        
        {/* The Line */}
        <polyline
          fill="none"
          stroke="#6366F1"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Date Labels */}
      <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
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
    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
      <div className="bg-slate-50 p-4 rounded-full mb-2"><PieChart size={24} className="opacity-20"/></div>
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
                stroke="white" 
                strokeWidth="2" 
                className="hover:opacity-90 transition-all cursor-pointer" 
              />
            );
          })}
          {/* Inner circle to create the "donut" effect */}
          <circle cx="50" cy="50" r="38" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</span>
          <span className="text-xl font-bold text-slate-800">${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full max-w-xs">
        {data.slice(0, 6).map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-sm group">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: colors[i % colors.length] }}></span>
              <span className="text-slate-600 truncate max-w-[80px]">{item.name}</span>
            </div>
            <span className="font-semibold text-slate-800">${item.value.toFixed(2)}</span>
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
  
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    description: '',
    // Initialize date to today's date in YYYY-MM-DD format
    date: new Date().toISOString().split('T')[0] 
  });

  // --- 1. Authentication and Initialization ---
  useEffect(() => {
    const initAuth = async () => {
        try {
            const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (token) {
                // Sign in using the custom token provided by the Canvas environment
                await signInWithCustomToken(auth, token);
            } else {
                // Fallback to anonymous sign-in if no token is available
                await signInAnonymously(auth); 
            }
        } catch (error) {
            console.error("Firebase Auth Init Failed:", error);
            setLoading(false);
        }
    };
    initAuth();
    
    // Set up Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Only set loading false if user is null (anonymous sign-in failed/not supported)
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []); // Run only once on mount

  // --- 2. Data Fetching and Real-time Listener (onSnapshot) ---
  useEffect(() => {
    // Only proceed if user object is available (authentication complete)
    if (!user) return;
    
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
  }, [user]); // Re-run when user object changes

  // --- 3. Computed Data (Filtering, Aggregation) ---
  const filteredExpenses = useMemo(() => {
    if (timeFilter === 'all') return expenses;
    
    const days = parseInt(timeFilter);
    const cutoff = new Date();
    // Set cutoff to the beginning of the day 'days' ago
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0,0,0,0);
    
    return expenses.filter(e => {
        // Create Date object from YYYY-MM-DD string
        const expenseDate = new Date(e.date + 'T00:00:00'); 
        return expenseDate >= cutoff;
    });
  }, [expenses, timeFilter]);

  const totalSpent = useMemo(() => 
    filteredExpenses.reduce((sum, item) => sum + item.amount, 0)
  , [filteredExpenses]);
  
  const categoryData = useMemo(() => {
    const stats = {};
    filteredExpenses.forEach(item => {
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
    filteredExpenses.forEach(item => {
      stats[item.date] = (stats[item.date] || 0) + item.amount;
    });
    // Convert object to array of { date, value }
    return Object.keys(stats).map(date => ({ date, value: stats[date] }));
  }, [filteredExpenses, timeFilter]);

  // --- 4. CRUD Operations ---
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.amount || !user) return; // Basic validation
    
    const amountFloat = parseFloat(formData.amount);
    if (isNaN(amountFloat) || amountFloat <= 0) return console.error("Invalid amount");

    setLoading(true);
    try {
      const expensesCollectionPath = `artifacts/${sanitizedAppId}/users/${user.uid}/expenses`;
      await addDoc(collection(db, expensesCollectionPath), {
        ...formData,
        amount: amountFloat,
        createdAt: serverTimestamp() // Adds Firestore timestamp for internal sorting/tracking
      });
      // Reset form and switch view
      setFormData({ amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] });
      setView('dashboard');
    } catch(e) { 
      console.error("Add failed:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    // IMPORTANT: Using console.log instead of window.confirm/alert
    console.log(`User confirmed deletion of expense ID: ${id}`); 
    try { 
        const expenseDocPath = `artifacts/${sanitizedAppId}/users/${user.uid}/expenses/${id}`;
        await deleteDoc(doc(db, expenseDocPath)); 
    }
    catch(e){ console.error("Deletion failed:", e); }
  };
  
  const exportData = (type) => {
    if(filteredExpenses.length === 0) return console.log("No data to export");
    
    // Prepare the data structure
    const dataToExport = filteredExpenses.map(e => ({
      Date: e.date,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
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

  if (loading && !expenses.length) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 text-indigo-700 font-bold text-2xl tracking-tight">
          <WalletCards size={32} />
          <span>FinTrack</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setView('add')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${view === 'add' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <PlusCircle size={20} /> Add Expense
          </button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${view === 'history' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <History size={20} /> Transactions
          </button>
        </nav>

        <div className="p-6 border-t border-slate-100">
           {/* Mini Stats in Sidebar */}
           <div className="space-y-4">
               <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-xl shadow-slate-300">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Total Spent</p>
                        <h3 className="text-2xl font-bold">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg">
                        <CreditCard size={16} className="text-white"/>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                    <button onClick={() => exportData('csv')} className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"><FileSpreadsheet size={12}/> CSV</button>
                    <div className="w-px h-3 bg-white/20 self-center"></div>
                    <button onClick={() => exportData('json')} className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"><FileJson size={12}/> JSON</button>
                </div>
              </div>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-6">
        {/* Header (Mobile & Desktop) */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-800 capitalize">{view === 'add' ? 'Add New Expense' : view === 'history' ? 'Transaction History' : 'Dashboard'}</h1>
            
            {/* Time Filter Toggle */}
            {view !== 'add' && (
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['7', '30', 'all'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeFilter(t)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeFilter === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t === 'all' ? 'All Time' : `${t} Days`}
                        </button>
                    ))}
                </div>
            )}
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

            {/* --- DASHBOARD VIEW --- */}
            {view === 'dashboard' && (
                <>
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                         <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={120} /></div>
                            <div className="relative z-10">
                                <p className="text-indigo-100 font-medium mb-1 flex items-center gap-2"><Filter size={14}/> {timeFilter === 'all' ? 'Lifetime' : `Last ${timeFilter} Days`}</p>
                                <h2 className="text-4xl font-bold tracking-tight">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                <p className="text-indigo-200 text-sm mt-4 flex items-center gap-1">
                                    <ArrowUpRight size={16}/> {filteredExpenses.length} transactions
                                </p>
                            </div>
                         </Card>

                        {/* Trend Chart Card */}
                         <Card className="md:col-span-2 flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500"/> Spending Trend</h3>
                            </div>
                            {timeFilter === 'all' ? (
                                <div className="h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
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
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><PieChart size={18} className="text-indigo-500"/> Breakdown</h3>
                            <DonutChart data={categoryData} />
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18} className="text-indigo-500"/> Recent Activity</h3>
                                <button onClick={() => setView('history')} className="text-indigo-600 text-sm font-medium hover:text-indigo-700">View All</button>
                            </div>
                            <div className="space-y-4">
                                {filteredExpenses.slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {item.category[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{item.category}</p>
                                                <p className="text-xs text-slate-400">{formatDate(item.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800">-${item.amount.toFixed(2)}</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[120px]">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                                {filteredExpenses.length === 0 && <p className="text-slate-400 text-center py-8">No transactions found.</p>}
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
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input 
                                        type="number" step="0.01" required 
                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-semibold text-lg"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                    >
                                        {['Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Other'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                                    <input 
                                        type="date" required 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                                <input 
                                    type="text" required 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                             <Button onClick={() => exportData('json')} variant="ghost" icon={FileJson} className="text-xs">Export JSON</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-y border-slate-200">
                                <tr>
                                    <th className="min-w-[100px] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="min-w-[100px] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="min-w-[200px] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="min-w-[80px] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="min-w-[80px] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{expense.date}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{expense.description}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700 text-right">-${expense.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Transaction"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
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
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 md:hidden z-30 pb-safe">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 text-xs font-medium ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <LayoutDashboard size={20} />
            Home
        </button>
        <button onClick={() => setView('add')} className={`flex flex-col items-center gap-1 text-xs font-medium ${view === 'add' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className="bg-indigo-600 text-white p-3 rounded-full -mt-6 shadow-lg border-4 border-slate-50">
                <PlusCircle size={24} />
            </div>
            Add
        </button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 text-xs font-medium ${view === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <History size={20} />
            History
        </button>
      </nav>
      
    </div>
  );
}