import React, { useState, useEffect, useMemo } from 'react';
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
  FileJson,
  Settings,
  X,
  Edit2,
  Plus
} from 'lucide-react';
import { auth, db } from './firebaseConfig';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  query, 
  onSnapshot, 
  doc,
  serverTimestamp,
  setLogLevel 
} from 'firebase/firestore';
// --- Helper Functions ---
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // Assuming dateStr is in YYYY-MM-DD format
  const date = new Date(dateStr + 'T00:00:00'); 
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Logo Component
const Logo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background circle */}
    <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" opacity="0.1" stroke="url(#logoGradient)" strokeWidth="2"/>
    
    {/* Wallet shape */}
    <rect x="20" y="35" width="60" height="40" rx="6" fill="url(#logoGradient)" opacity="0.8"/>
    
    {/* Card in wallet */}
    <rect x="30" y="45" width="40" height="20" rx="3" fill="white" opacity="0.9"/>
    
    {/* Coin shapes */}
    <circle cx="45" cy="55" r="5" fill="url(#coinGradient)"/>
    <circle cx="60" cy="55" r="5" fill="url(#coinGradient2)"/>
    
    {/* Arrow up (trending) */}
    <path d="M50 28 L50 40 M45 35 L50 30 L55 35" stroke="url(#logoGradient)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06B6D4"/>
        <stop offset="100%" stopColor="#0369A1"/>
      </linearGradient>
      <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
      <linearGradient id="coinGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B"/>
        <stop offset="100%" stopColor="#D97706"/>
      </linearGradient>
    </defs>
  </svg>
);

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
  <div className={`bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/15 p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl hover:border-white/30 w-full overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon, type = "button" }) => {
  const baseStyle = "sm:px-4 sm:py-2.5 px-3 py-2 min-h-touch min-w-touch rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:to-blue-700",
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

// User-Friendly Bar Chart for Daily Spending Trends
const TrendChart = ({ data, days }) => {
  if (!data || data.length === 0) return <div className="h-56 flex items-center justify-center text-white/60 text-sm">No data for this period</div>;

  const dateRange = getDaysArray(days);
  const chartData = dateRange.map(date => {
    const found = data.find(d => d.date === date);
    return { date, value: found ? found.value : 0 };
  });
  
  const values = chartData.map(d => d.value);
  const maxVal = Math.max(...values, 10);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;

  // Show every 2nd or 3rd date depending on number of days
  const showEveryN = days > 15 ? 3 : days > 7 ? 2 : 1;
  
  // For mobile, make chart scrollable if more than 14 days
  const isSmallScreen = days > 14;

  return (
    <div className="w-full h-56 flex flex-col">
      {/* Chart Info Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-white/70">
          <span className="font-semibold text-white">Total:</span> ₹{total.toFixed(2)} | <span className="font-semibold text-white">Daily Avg:</span> ₹{avg.toFixed(2)}
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className={`flex-1 rounded-xl p-4 border border-white/10 bg-white/3 overflow-x-auto ${isSmallScreen ? 'sm:overflow-x-visible' : ''}`}>
        <div className="flex items-end justify-between gap-1 h-full min-w-full sm:min-w-0">
          {chartData.map((d, i) => {
            const height = (d.value / maxVal) * 100 || 2;
            const isToday = i === chartData.length - 1;
            const barColor = d.value === 0 ? 'from-white/10 to-white/5' : 'from-cyan-400 to-blue-500';
            
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1 group min-w-[35px] sm:min-w-0">
                {/* Bar */}
                <div 
                  className={`w-full rounded-t-lg transition-all duration-300 bg-gradient-to-t ${barColor} hover:shadow-lg hover:shadow-cyan-500/50 cursor-pointer group-hover:opacity-100 opacity-90`}
                  style={{ height: `${height}%`, minHeight: d.value > 0 ? '8px' : '2px' }}
                  title={`${formatDate(d.date)}: ₹${d.value.toFixed(2)}`}
                >
                  {/* Value Label on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white text-center translate-y-[-28px] whitespace-nowrap">
                    ₹{d.value.toFixed(0)}
                  </div>
                </div>
                
                {/* Date Label */}
                {i % showEveryN === 0 && (
                  <span className="text-xs text-white/50 font-medium mt-1 whitespace-nowrap">{formatDate(d.date)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-cyan-400 to-blue-500 rounded-md"></div>
          <span>Daily Spending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-white/10"></div>
          <span>No Activity</span>
        </div>
      </div>
    </div>
  );
};

// Beautiful Enhanced Category Breakdown Chart
const DonutChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="h-80 flex flex-col items-center justify-center text-white/60">
      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 rounded-full mb-4"><PieChart size={32} className="opacity-40 text-cyan-300"/></div>
      <span className="text-sm font-medium">No spending data yet</span>
      <span className="text-xs text-white/40 mt-1">Start adding transactions to see breakdown</span>
    </div>
  );

  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;
  const colors = ['#06B6D4', '#0369A1', '#10B981', '#FF6B6B', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Donut Chart */}
      <div className="relative w-56 h-56 group">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-2xl">
          {/* Background circle */}
          <circle cx="50" cy="50" r="50" fill="rgba(255,255,255,0.02)" />
          
          {data.map((slice, i) => {
            const sliceAngle = (slice.value / total) * 360;
            const startAngleRad = (Math.PI * currentAngle) / 180;
            const endAngleRad = (Math.PI * (currentAngle + sliceAngle)) / 180;
            
            const x1 = 50 + 50 * Math.cos(startAngleRad);
            const y1 = 50 + 50 * Math.sin(startAngleRad);
            const x2 = 50 + 50 * Math.cos(endAngleRad);
            const y2 = 50 + 50 * Math.sin(endAngleRad);
            
            const largeArcFlag = sliceAngle > 180 ? 1 : 0;
            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            currentAngle += sliceAngle;
            
            return (
              <path 
                key={slice.name} 
                d={pathData} 
                fill={colors[i % colors.length]} 
                stroke="rgba(255,255,255,0.12)" 
                strokeWidth="1" 
                style={{ 
                  transition: 'all 300ms ease',
                  transformOrigin: '50% 50%',
                  filter: `drop-shadow(0 4px 12px ${colors[i % colors.length]}40)`
                }}
                className="cursor-pointer hover:brightness-125 hover:drop-shadow-lg"
              />
            );
          })}
          {/* Inner circle */}
          <circle cx="50" cy="50" r="36" fill="rgba(15,23,42,0.9)" />
        </svg>
        
        {/* Center Info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-white/60 font-semibold uppercase tracking-widest">Total Spending</span>
          <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 mt-1">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Enhanced Legend with Bars */}
      <div className="w-full space-y-3 max-w-sm">
        {data.slice(0, 6).map((item, i) => {
          const percentage = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} className="group/item">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <span 
                      className="w-4 h-4 rounded-lg shadow-lg block transition-all group-hover/item:scale-110" 
                      style={{ backgroundColor: colors[i % colors.length] }}
                    ></span>
                  </div>
                  <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-cyan-300 ml-2">{percentage}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r"
                  style={{
                    width: `${percentage}%`,
                    backgroundImage: `linear-gradient(to right, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`
                  }}
                ></div>
              </div>
              
              {/* Amount */}
              <span className="text-xs text-white/50 mt-1 inline-block">₹{item.value.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-xs text-white/60 block">Top Category</span>
            <span className="text-sm font-bold text-white mt-1">{data[0].name}</span>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
            <span className="text-xs text-white/60 block">Categories</span>
            <span className="text-sm font-bold text-white mt-1">{data.length} total</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'add'
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('fintrack-theme');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });
  
  // Auth State
  const [user, setUser] = useState(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  
  // Data State
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Categories State
  const [defaultCategories, setDefaultCategories] = useState([
    'Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Other'
  ]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  
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
  
  // Save theme preference
  useEffect(() => {
    localStorage.setItem('fintrack-theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  // Save categories preference
  useEffect(() => {
    localStorage.setItem('fintrack-categories', JSON.stringify(defaultCategories));
  }, [defaultCategories]);
  
  // Load saved categories
  useEffect(() => {
    const saved = localStorage.getItem('fintrack-categories');
    if (saved) {
      setDefaultCategories(JSON.parse(saved));
    }
  }, []);
  
  // Category Management Functions
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !defaultCategories.includes(newCategoryName.trim())) {
      setDefaultCategories([...defaultCategories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };
  
  const handleUpdateCategory = (oldName, newName) => {
    if (newName.trim() && !defaultCategories.includes(newName.trim())) {
      setDefaultCategories(defaultCategories.map(cat => cat === oldName ? newName.trim() : cat));
      setEditingCategory(null);
      setNewCategoryName('');
      // Update form data if editing this category
      if (formData.category === oldName) {
        setFormData({ ...formData, category: newName.trim() });
      }
    }
  };
  
  const handleDeleteCategory = (name) => {
    if (defaultCategories.length > 1) {
      setDefaultCategories(defaultCategories.filter(cat => cat !== name));
      if (formData.category === name) {
        setFormData({ ...formData, category: defaultCategories[0] });
      }
    }
  };

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
    doc.text(`Total Expense: Rs ${fmt(totalExpense)}`, 240, 110);
    doc.text(`Net: Rs ${fmt(balance)}`, 440, 110);

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

    // Footer with user attribution (use signed-in user's name/email when available,
    // otherwise fall back to the app name so developer name isn't shown for others)
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    const footerName = (user && !String(user.uid).startsWith('local_'))
      ? (user.displayName || user.email || `user:${String(user.uid).slice(0,6)}`)
      : 'FinTrack';
    doc.text(`Generated by ${footerName}`, 40, pageHeight - 30);
    doc.text(`fintrack - ${new Date().toLocaleDateString()}`, 400, pageHeight - 30);

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
    <div className={`min-h-screen flex flex-col md:flex-row font-sans overflow-x-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-900 text-white' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 text-gray-900'}`}>
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className={`hidden md:flex flex-col w-48 lg:w-64 fixed md:relative h-full z-20 shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-b from-cyan-600 via-blue-600 to-cyan-700 text-white' : 'bg-gradient-to-b from-cyan-400 via-blue-400 to-cyan-500 text-white'}`}>
        <div className="p-4 lg:p-6 flex items-center gap-2 lg:gap-3 text-white font-bold text-xl lg:text-2xl tracking-tight">
          <div className={`backdrop-blur-sm p-1.5 lg:p-2 rounded-lg border border-white/30 ${isDarkMode ? 'bg-white/10' : 'bg-white/20'}`}>
            <Logo size={28} />
          </div>
          <span className="text-base lg:text-lg">FinTrack</span>
        </div>
        
        <nav className="flex-1 px-3 lg:px-4 space-y-1 lg:space-y-2 mt-4 lg:mt-6">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-xl transition-all font-medium text-sm lg:text-base min-h-touch ${view === 'dashboard' ? `${isDarkMode ? 'bg-white/25 border-white/40' : 'bg-white/40 border-white/60'} text-white backdrop-blur-sm border shadow-lg` : `text-white/90 hover:bg-white/10 hover:text-white`}`}>

            <LayoutDashboard size={20} /> <span className="hidden lg:inline">Dashboard</span>
          </button>
          <button onClick={() => setView('add')} className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-xl transition-all font-medium text-sm lg:text-base min-h-touch ${view === 'add' ? 'bg-white/25 text-white backdrop-blur-sm border border-white/40 shadow-lg' : 'text-cyan-100 hover:bg-white/10 hover:text-white'}`}>
            <PlusCircle size={20} /> <span className="hidden lg:inline">Add</span>
          </button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-xl transition-all font-medium text-sm lg:text-base min-h-touch ${view === 'history' ? 'bg-white/25 text-white backdrop-blur-sm border border-white/40 shadow-lg' : 'text-cyan-100 hover:bg-white/10 hover:text-white'}`}>
            <History size={20} /> <span className="hidden lg:inline">History</span>
          </button>
        </nav>

        <div className="p-4 lg:p-6 border-t border-white/20">
           {/* Mini Stats in Sidebar */}
           <div className="space-y-4">
               <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white border border-white/20 shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                <p className="text-cyan-100 text-xs font-medium uppercase tracking-wide mb-1">Net Balance</p>
                <h3 className="text-2xl font-bold">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-400 to-blue-400 p-2 rounded-lg">
                        <CreditCard size={16} className="text-slate-900"/>
                    </div>
                </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between gap-2 text-sm">
              <div className="text-white/70">Income: <span className="font-semibold text-emerald-300">₹{totalIncome.toLocaleString()}</span></div>
              <div className="text-white/70">Expense: <span className="font-semibold text-red-300">₹{totalExpense.toLocaleString()}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex gap-2">
              <button onClick={() => exportData('csv')} className="text-xs text-cyan-100 hover:text-white flex items-center gap-1 transition-colors"><FileSpreadsheet size={12}/> CSV</button>
              <div className="w-px h-3 bg-white/30 self-center"></div>
              <button onClick={exportPDF} className="text-xs text-cyan-100 hover:text-white flex items-center gap-1 transition-colors"><FileJson size={12}/> PDF</button>
            </div>
              </div>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 md:ml-48 lg:ml-64 pb-24 md:pb-6 w-full overflow-hidden">
        {/* Header (Mobile & Desktop) */}
        <header className="sticky top-0 z-10 bg-white/5 backdrop-blur-xl border-b border-white/15 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 shadow-lg w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="md:hidden bg-white/10 backdrop-blur-sm p-1.5 rounded-lg border border-white/30">
                <Logo size={22} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white capitalize">{view === 'add' ? 'Add New Transaction' : view === 'history' ? 'Transaction History' : 'Dashboard'}</h1>
            </div>
            
            {/* Auth Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Settings Button */}
              <button
                onClick={() => setShowCategoryModal(!showCategoryModal)}
                className="p-2 rounded-lg border bg-white/10 hover:bg-white/20 border-white/30 hover:border-white/50 transition-all min-h-[40px] min-w-[40px] flex items-center justify-center text-white"
                title="Manage Categories"
              >
                <Settings size={18} />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-white/20"></div>

              {user && !String(user.uid).startsWith('local_') ? (
                <button onClick={handleSignOut} className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-all min-h-[40px]">Sign out</button>
              ) : (
                <button onClick={handleGoogleSignIn} className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 transition-all min-h-[40px]">Sign in</button>
              )}
            </div>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 w-full overflow-x-hidden">

            {useLocalFallback && (
              <div className="mb-4 p-3 sm:p-4 rounded-lg bg-yellow-500/20 text-yellow-100 text-center border border-yellow-400 text-xs sm:text-sm">
                ⚠️ Running in Local Mode — Firebase not configured. Data will be stored locally only.
              </div>
            )}

            {/* --- DASHBOARD VIEW --- */}
            {view === 'dashboard' && (
                <>
                    {/* Filter Controls Card */}
                    <Card className="bg-gradient-to-r from-white/5 to-white/[0.02] mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-white/70 text-sm font-medium mb-3">Filter Your Transactions</p>
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                    {/* Dropdown Menu */}
                                    <div className="group relative">
                                        {/* Filter Button */}
                                        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all shadow-lg hover:shadow-xl active:scale-95">
                                            <span>🔍</span>
                                            Filter By Time
                                        </button>

                                        {/* Dropdown Menu */}
                                        <div className="absolute left-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                            <div className="bg-gradient-to-b from-white/15 to-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                                                {/* Menu Items */}
                                                <div className="py-2">
                                                    {[
                                                        { id: '1', label: 'Today', icon: '📅' },
                                                        { id: '7', label: 'Last 7 Days', icon: '📊' },
                                                        { id: '30', label: 'Last 30 Days', icon: '📈' },
                                                        { id: 'all', label: 'All Time', icon: '🌍' },
                                                        { id: 'custom', label: 'Custom Range', icon: '📆' }
                                                    ].map((option) => (
                                                        <button
                                                            key={option.id}
                                                            onClick={() => {
                                                                setTimeFilter(option.id);
                                                                if (option.id !== 'custom') setActiveFilter({ type: option.id });
                                                            }}
                                                            className={`w-full px-4 py-3 text-left text-sm font-medium transition-all flex items-center gap-3 ${
                                                                timeFilter === option.id
                                                                    ? 'bg-cyan-600/60 text-white border-l-2 border-cyan-400'
                                                                    : 'text-white/80 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span className="text-base">{option.icon}</span>
                                                            {option.label}
                                                            {timeFilter === option.id && <span className="ml-auto">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Custom Range Section - Expandable */}
                                                {timeFilter === 'custom' && (
                                                    <div className="border-t border-white/20 bg-white/5 p-4 space-y-3">
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-white/70 font-semibold block">From Date</label>
                                                            <input 
                                                                type="date" 
                                                                value={customStart} 
                                                                onChange={e => setCustomStart(e.target.value)} 
                                                                className="w-full bg-white/10 border border-white/20 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs text-white/70 font-semibold block">To Date</label>
                                                            <input 
                                                                type="date" 
                                                                value={customEnd} 
                                                                onChange={e => setCustomEnd(e.target.value)} 
                                                                className="w-full bg-white/10 border border-white/20 px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 pt-2">
                                                            <button 
                                                                onClick={() => {
                                                                    if (customStart && customEnd) {
                                                                        setActiveFilter({ type: 'custom', start: customStart, end: customEnd });
                                                                        setTimeFilter('custom');
                                                                    } else {
                                                                        alert('Select both start and end dates');
                                                                    }
                                                                }} 
                                                                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-all"
                                                            >
                                                                Apply
                                                            </button>
                                                            <button 
                                                                onClick={() => { 
                                                                    setCustomStart(''); 
                                                                    setCustomEnd(''); 
                                                                    setTimeFilter('30'); 
                                                                    setActiveFilter({ type: '30' }); 
                                                                }} 
                                                                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Filter Badge */}
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 transition-all">
                                        <span className="text-xs text-white/70 font-medium">Active:</span>
                                        <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-emerald-600/60 to-cyan-600/60 rounded-full text-white border border-emerald-400/30">
                                            {activeFilter.type === 'all' ? '🌍 All Time' : activeFilter.type === 'custom' ? `📆 ${activeFilter.start?.slice(5) || '-'} → ${activeFilter.end?.slice(5) || '-'}` : activeFilter.type === '1' ? '📅 Today' : `📊 Last ${activeFilter.type} Days`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
                         <Card className="bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 text-white border-none relative overflow-hidden shadow-lg shadow-cyan-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} className="sm:w-120 sm:h-120" /></div>
                            <div className="relative z-10">
                                <p className="text-cyan-100 font-medium mb-1 flex items-center gap-2 text-xs sm:text-sm"><Filter size={14}/> {timeFilter === 'all' ? 'Lifetime' : `Last ${timeFilter}d`}</p>
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                <p className="text-cyan-100 text-xs sm:text-sm mt-4 flex items-center gap-1">
                                    <ArrowUpRight size={16}/> {filteredExpenses.length} txns
                                </p>
                            </div>
                         </Card>

                        {/* Income Card */}
                        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-none shadow-lg shadow-emerald-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} className="sm:w-120 sm:h-120" /></div>
                            <div>
                                <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2 text-xs sm:text-sm"><ArrowUpRight size={14}/> Income</p>
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">+₹{totalIncome.toLocaleString()}</h2>
                                <p className="text-emerald-100 text-xs sm:text-sm mt-4">
                                    Total earnings
                                </p>
                            </div>
                        </Card>

                        {/* Expense Card */}
                        <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none shadow-lg shadow-red-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} className="sm:w-120 sm:h-120" /></div>
                            <div>
                                <p className="text-red-100 font-medium mb-1 flex items-center gap-2 text-xs sm:text-sm"><TrendingUp size={14}/> Expenses</p>
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">-₹{totalExpense.toLocaleString()}</h2>
                                <p className="text-red-100 text-xs sm:text-sm mt-4">
                                    Total spending
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Trend Chart Card */}
                    <Card className="md:col-span-2 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><TrendingUp size={18} className="text-cyan-300"/> Spending Trend</h3>
                        </div>
                        {timeFilter === 'all' ? (
                            <div className="h-48 flex items-center justify-center text-white/60 bg-white/5 rounded-xl border border-dashed border-white/20">
                                Select '7 Days' or '30 Days' to see daily trends
                            </div>
                        ) : (
                            <TrendChart data={dailyTrendData} days={parseInt(timeFilter)} />
                        )}
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                        {/* Categories */}
                        <Card>
                            <h3 className="font-bold text-white mb-6 flex items-center gap-2"><PieChart size={18} className="text-cyan-300"/> Category Breakdown</h3>
                            <DonutChart data={categoryData} />
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2"><History size={18} className="text-cyan-300"/> Recent Activity</h3>
                                <button onClick={() => setView('history')} className="text-cyan-300 text-sm font-medium hover:text-cyan-200">View All →</button>
                            </div>
                            <div className="space-y-4">
                                {filteredExpenses.slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
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
                    <Card className={`border-t-4 border-t-cyan-500 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-white to-gray-50'}`}>
                        <form onSubmit={handleAdd} className="space-y-5">
                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Amount</label>
                                <div className="relative">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-white/50' : 'text-gray-400'}`}>₹</span>
                                    <input 
                                        type="number" step="0.01" required 
                                        className={`w-full pl-8 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none transition-all font-semibold text-lg ${
                                          isDarkMode
                                            ? 'bg-white/10 border border-white/30 focus:bg-white/20 text-white placeholder-white/50'
                                            : 'bg-gray-100 border border-gray-300 focus:bg-gray-50 text-gray-900 placeholder-gray-400'
                                        }`}
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                              <label className={`block text-sm font-medium mb-2.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Type</label>
                              <div className={`inline-flex rounded-xl p-1 ${isDarkMode ? 'bg-white/6' : 'bg-gray-200'}`}>
                                <button type="button" onClick={() => handleTypeSelect('expense')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${formData.type === 'expense' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : isDarkMode ? 'text-white/80 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-300'}`}>
                                  Expense
                                </button>
                                <button type="button" onClick={() => handleTypeSelect('income')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${formData.type === 'income' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' : isDarkMode ? 'text-white/80 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-300'}`}>
                                  Income
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Category</label>
                                    <div className="flex items-center gap-2">
                                      <select 
                                        className={`flex-1 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none transition-all ${
                                          isDarkMode
                                            ? 'bg-white/10 border border-white/30 text-white'
                                            : 'bg-gray-100 border border-gray-300 text-gray-900'
                                        } disabled:opacity-50`}
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        disabled={formData.type === 'income'}
                                      >
                                        <option value="" disabled className={isDarkMode ? 'text-white/60 bg-slate-900' : 'text-gray-500 bg-white'}>{formData.type === 'income' ? 'Not applicable for income' : 'Select category'}</option>
                                        {defaultCategories.map(c => <option key={c} value={c} className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>{c}</option>)}
                                      </select>
                                      <button
                                        onClick={() => setShowCategoryModal(true)}
                                        className={`p-2.5 rounded-lg border transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                          isDarkMode
                                            ? 'bg-white/10 border-white/30 hover:bg-white/20 text-white/70 hover:text-white'
                                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                                        }`}
                                        title="Manage Categories"
                                      >
                                        <Settings size={16} />
                                      </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Date</label>
                                    <input 
                                        type="date" required 
                                        className={`w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none transition-all ${
                                          isDarkMode
                                            ? 'bg-white/10 border border-white/30 text-white'
                                            : 'bg-gray-100 border border-gray-300 text-gray-900'
                                        }`}
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Description <span className={isDarkMode ? 'text-white/50' : 'text-gray-500'}>(Optional)</span></label>
                                <input 
                                    type="text"
                                    className={`w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none transition-all ${
                                      isDarkMode
                                        ? 'bg-white/10 border border-white/30 text-white placeholder-white/50'
                                        : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400'
                                    }`}
                                    placeholder="Dinner at Joe's..."
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button type="button" variant="secondary" onClick={() => setView('dashboard')} className="flex-1">Cancel</Button>
                                <Button type="submit" className="flex-1 justify-center py-3" disabled={loading}>{loading ? 'Saving...' : 'Save Transaction'}</Button>
                            </div>
                        </form>
                    </Card>
                 </div>
            )}

            {/* --- HISTORY VIEW --- */}
            {view === 'history' && (
                <Card className="overflow-hidden p-0">
                    <div className="flex justify-end p-4 border-b border-white/10">
                        <div className="flex space-x-2">
                             <Button onClick={() => exportData('csv')} variant="ghost" icon={FileSpreadsheet} className="text-xs">Export CSV</Button>
                             <Button onClick={exportPDF} variant="ghost" icon={FileJson} className="text-xs">Export PDF</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                      <table className="w-full text-left">
                        <thead className="bg-gradient-to-r from-white/5 to-white/[0.02] border-y border-white/10">
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
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-100">
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

      {/* --- Category Management Modal --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-safe sm:pb-4">
          <div className={`${isDarkMode ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-gradient-to-b from-gray-50 to-white'} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto shadow-2xl border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            {/* Modal Header */}
            <div className={`sticky top-0 p-4 sm:p-6 border-b ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-gray-200 bg-gray-50/50'} backdrop-blur-sm flex justify-between items-center`}>
              <h2 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Manage Categories</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`p-2 rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-white/70 hover:text-white'
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Add New Category */}
              <div className="space-y-3">
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  Add New Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="e.g., Entertainment"
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm transition-all min-h-[40px] ${
                      isDarkMode
                        ? 'bg-white/5 border-white/20 text-white placeholder-white/40 focus:bg-white/10 focus:border-cyan-400'
                        : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-cyan-400'
                    } focus:outline-none focus:ring-1 focus:ring-cyan-400`}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition-all active:scale-95 flex items-center gap-2 min-h-[40px]"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className={`h-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>

              {/* Categories List */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  Your Categories
                </label>
                {defaultCategories.length === 0 ? (
                  <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-gray-500'} text-center py-4`}>
                    No categories yet. Add one above!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {defaultCategories.map((cat, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isDarkMode
                            ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {cat}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(idx);
                              setNewCategoryName(cat);
                            }}
                            className={`p-1.5 rounded transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
                              isDarkMode
                                ? 'hover:bg-blue-500/20 text-blue-400'
                                : 'hover:bg-blue-100 text-blue-600'
                            }`}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(idx)}
                            className={`p-1.5 rounded transition-all min-h-[36px] min-w-[36px] flex items-center justify-center ${
                              isDarkMode
                                ? 'hover:bg-red-500/20 text-red-400'
                                : 'hover:bg-red-100 text-red-600'
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Mode */}
              {editingCategory !== null && (
                <>
                  <div className={`h-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                  <div className="space-y-3 pt-2">
                    <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Edit Category
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory()}
                        className={`flex-1 px-3 py-2.5 rounded-lg border text-sm transition-all min-h-[40px] ${
                          isDarkMode
                            ? 'bg-white/5 border-white/20 text-white focus:bg-white/10 focus:border-cyan-400'
                            : 'bg-gray-100 border-gray-300 text-gray-900 focus:bg-white focus:border-cyan-400'
                        } focus:outline-none focus:ring-1 focus:ring-cyan-400`}
                      />
                      <button
                        onClick={handleUpdateCategory}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium rounded-lg transition-all active:scale-95 min-h-[40px]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setNewCategoryName('');
                        }}
                        className={`px-4 py-2.5 rounded-lg border font-medium transition-all min-h-[40px] ${
                          isDarkMode
                            ? 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                            : 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 p-4 sm:p-6 border-t ${isDarkMode ? 'border-white/10 bg-slate-900/50' : 'border-gray-200 bg-gray-50/50'} backdrop-blur-sm flex gap-2`}>
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg border font-medium transition-all min-h-[40px] ${
                  isDarkMode
                    ? 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                    : 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Mobile Bottom Nav --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-xl border-t border-white/20 flex justify-around p-2 md:hidden z-30 pb-safe">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-touch min-w-touch rounded-lg transition-colors ${view === 'dashboard' ? 'text-cyan-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard size={20} />
            <span>Home</span>
        </button>
        <button onClick={() => setView('add')} className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-touch min-w-touch rounded-lg transition-colors ${view === 'add' ? 'text-cyan-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-2 rounded-full -mt-4 shadow-2xl border-4 border-slate-900/50">
                <PlusCircle size={20} />
            </div>
            <span>Add</span>
        </button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-touch min-w-touch rounded-lg transition-colors ${view === 'history' ? 'text-cyan-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <History size={20} />
            <span>History</span>
        </button>
      </nav>
    </div>
  );
};

export default App;