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
  ArrowDownLeft,
  CreditCard,
  FileJson,
  Settings,
  X,
  Edit2,
  Plus,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  Heart,
  Zap,
  MoreHorizontal,
  DollarSign,
  Wallet,
  Bell,
  RefreshCw,
  Book,
  ChevronDown
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { auth, db } from './firebaseConfig';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  query, 
  onSnapshot, 
  doc,
  serverTimestamp
} from 'firebase/firestore';
// App identifier for local storage keys and artifact paths
const sanitizedAppId = 'expense-tracker-app';
const APP_VERSION = '1.0.0';

// Update Notification Component
const UpdateNotification = ({ onUpdate, onDismiss }) => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 shadow-lg">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell size={20} className="animate-bounce" />
        <span className="text-sm font-semibold">A new version is available! Refresh to update.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUpdate}
          className="flex items-center gap-2 bg-white text-indigo-600 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
        >
          <RefreshCw size={16} /> Update
        </button>
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  </div>
);

// Version Display Component
const VersionBadge = () => (
  <div className="text-xs text-white/40 flex items-center gap-1">
    <span>v{APP_VERSION}</span>
  </div>
);

// Category Icons & Colors Mapping
const categoryIconMap = {
  'Food': { icon: Utensils, color: 'from-orange-400 to-red-500' },
  'Transport': { icon: Car, color: 'from-blue-400 to-cyan-500' },
  'Rent': { icon: Home, color: 'from-amber-400 to-orange-500' },
  'Shopping': { icon: ShoppingBag, color: 'from-pink-400 to-rose-500' },
  'Entertainment': { icon: Gamepad2, color: 'from-purple-400 to-indigo-500' },
  'Health': { icon: Heart, color: 'from-red-400 to-pink-500' },
  'Bills': { icon: Zap, color: 'from-yellow-400 to-orange-500' },
  'Other': { icon: MoreHorizontal, color: 'from-gray-400 to-slate-500' }
};

// Get icon and color for category
const getCategoryIcon = (category) => {
  return categoryIconMap[category] || categoryIconMap['Other'];
};

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

const TrendTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-xl">
        <p className="text-white/70 text-xs mb-1">{formatDate(label)}</p>
        <p className="text-cyan-400 font-bold text-sm">₹{payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

// User-Friendly Bar/Area Chart for Daily Spending Trends
const TrendChart = ({ data, days }) => {
  if (!data || data.length === 0) return <div className="h-56 flex items-center justify-center text-white/60 text-sm">No data for this period</div>;

  const dateRange = getDaysArray(days);
  const chartData = dateRange.map(date => {
    const found = data.find(d => d.date === date);
    return { date, value: found ? found.value : 0 };
  });

  const values = chartData.map(d => d.value);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;



  return (
    <div className="w-full h-[280px] flex flex-col">
      {/* Chart Info Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-white/70">
          <span className="font-semibold text-white">Total:</span> ₹{total.toFixed(2)} | <span className="font-semibold text-white">Daily Avg:</span> ₹{avg.toFixed(2)}
        </div>
      </div>

      <div className="flex-1 w-full h-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              tickFormatter={(val) => formatDate(val).split(' ')[0]}
              minTickGap={20}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              tickFormatter={(val) => `₹${val}`}
            />
            <RechartsTooltip content={<TrendTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
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
  const colors = ['#06B6D4', '#0369A1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'];

const DonutTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-xl">
        <p className="text-white font-bold text-sm">{payload[0].name}</p>
        <p className="text-white/80 text-xs">₹{payload[0].value.toFixed(2)}</p>
        <p className="text-cyan-400 font-semibold text-xs mt-1">
          {Math.round((payload[0].value / total) * 100)}%
        </p>
      </div>
    );
  }
  return null;
};

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Donut Chart */}
      <div className="relative w-full h-64 -mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]} 
                  style={{ filter: `drop-shadow(0 4px 6px ${colors[index % colors.length]}40)` }}
                />
              ))}
            </Pie>
            <RechartsTooltip content={(props) => <DonutTooltip {...props} total={total} />} />
          </RechartsPieChart>
        </ResponsiveContainer>
        
        {/* Center Info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-white/50 font-semibold uppercase tracking-widest mt-1">Total</span>
          <span className="text-xl font-bold text-white">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Enhanced Legend with Bars */}
      <div className="w-full space-y-3 max-w-sm -mt-2">
        {data.slice(0, 6).map((item, i) => {
          const percentage = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} className="group/item">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <span 
                      className="w-3 h-3 rounded-full shadow-lg block transition-all group-hover/item:scale-110" 
                      style={{ backgroundColor: colors[i % colors.length], boxShadow: `0 0 10px ${colors[i % colors.length]}80` }}
                    ></span>
                  </div>
                  <span className="text-sm font-semibold text-white/90 truncate">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-white/70 ml-2">₹{item.value.toFixed(0)} <span className="text-cyan-400 ml-1">({percentage}%)</span></span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[i % colors.length]
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'add'
  // eslint-disable-next-line no-unused-vars
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
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Update State
  // eslint-disable-next-line no-unused-vars
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  
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

  // Accounts State
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('fintrack-accounts');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Personal' }];
  });
  const [activeAccountId, setActiveAccountId] = useState(() => {
    return localStorage.getItem('fintrack-active-account') || 'default';
  });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [showMobileFilterDropdown, setShowMobileFilterDropdown] = useState(false);
  const [showMobileDashboardDropdown, setShowMobileDashboardDropdown] = useState(false);
  
  // Save theme preference
  useEffect(() => {
    localStorage.setItem('fintrack-theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Save accounts preference
  useEffect(() => {
    localStorage.setItem('fintrack-accounts', JSON.stringify(accounts));
  }, [accounts]);

  // Save active account preference
  useEffect(() => {
    localStorage.setItem('fintrack-active-account', activeAccountId);
  }, [activeAccountId]);

  // Account Management
  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      const newAcc = { 
        id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, 
        name: newAccountName.trim() 
      };
      setAccounts([...accounts, newAcc]);
      setNewAccountName('');
      setActiveAccountId(newAcc.id);
    }
  };

  const handleDeleteAccount = (id) => {
    if (accounts.length > 1) {
      if (!window.confirm('Are you sure you want to delete this account?')) return;
      const updated = accounts.filter(a => a.id !== id);
      setAccounts(updated);
      if (activeAccountId === id) {
        setActiveAccountId(updated[0].id);
      }
    } else {
      alert("You must have at least one account.");
    }
  };
  
  // Save categories preference
  useEffect(() => {
    localStorage.setItem('fintrack-categories', JSON.stringify(defaultCategories));
  }, [defaultCategories]);
  
  // Detect Service Worker Updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready
                setUpdateAvailable(true);
                setShowUpdateNotification(true);
              }
            });
          });
        });
      });
    }
  }, []);
  
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

  // Update Handlers
  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismissUpdate = () => {
    setShowUpdateNotification(false);
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
    // CRITICAL: Check localStorage FIRST before Firebase listener
    // This ensures session persists across app close/refresh
    const persistedUser = localStorage.getItem('fintrack-user');
    if (persistedUser) {
      try {
        const user = JSON.parse(persistedUser);
        setUser(user);
        setUseLocalFallback(false);
        console.log("✓ Session restored from localStorage:", user.email);
      } catch (e) {
        console.error('Failed to restore persisted session:', e);
      }
    }
    
    const initAuth = async () => {
        try {
            // eslint-disable-next-line no-undef
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
        // Only set if no persisted user
        if (!persistedUser) {
          setUser({ uid: `local_${sanitizedAppId}` });
        }
        setLoading(false);
        }
    };
    initAuth();
    
    // Set up Auth State Listener with Session Persistence
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        console.log("✓ User authenticated:", u.uid);
        setUser(u);
        // ALWAYS persist to localStorage - this is the key to session persistence
        localStorage.setItem('fintrack-user', JSON.stringify({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL
        }));
        setUseLocalFallback(false);
      }
      // IMPORTANT: Don't clear user on auth state change - rely on localStorage
      // This prevents accidental sign-out on refresh
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

  // Filter expenses based on selected time period and active account
  const filteredExpenses = useMemo(() => {
    const accountExpenses = expenses.filter(e => e.accountId === activeAccountId || (!e.accountId && activeAccountId === 'default'));

    const now = new Date();
    let startDate = new Date();
    const filter = activeFilter || { type: timeFilter };
    
    if (filter.type === 'all') return accountExpenses;
    
    if (filter.type === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      return accountExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    } else if (filter.type !== 'all') {
      const days = parseInt(filter.type) || 30;
      startDate.setDate(now.getDate() - days);
    }
    
    return accountExpenses.filter(expense => new Date(expense.date) >= startDate);
  }, [expenses, activeFilter, timeFilter, customStart, customEnd, activeAccountId]);

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
          date: formData.date,
          accountId: activeAccountId
        };
        const updated = [newItem, ...current];
        localStorage.setItem(key, JSON.stringify(updated));
        setExpenses(prev => [newItem, ...prev]);
        setFormData({ amount: '', category: 'Food', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] });
        
        // Show success feedback
        const transactionType = formData.type === 'income' ? 'Income' : 'Expense';
        setSuccessMessage(`✓ ${transactionType} added successfully!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        
        setView('dashboard');
        return;
      }

      const expensesCollectionPath = `artifacts/${sanitizedAppId}/users/${user.uid}/expenses`;
      await addDoc(collection(db, expensesCollectionPath), {
        ...formData,
        amount: amountFloat,
        type: formData.type || 'expense',
        accountId: activeAccountId,
        createdAt: serverTimestamp() // Adds Firestore timestamp for internal sorting/tracking
      });
      // Reset form and switch view
      setFormData({ amount: '', category: 'Food', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] });
      
      // Show success feedback
      const transactionType = formData.type === 'income' ? 'Income' : 'Expense';
      setSuccessMessage(`✓ ${transactionType} added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setView('dashboard');
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
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // Persist user data to localStorage for session recovery
        localStorage.setItem('fintrack-user', JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        }));
        
        setUser(result.user);
        setUseLocalFallback(false);
        
        // Show success message
        setSuccessMessage(`✓ Signed in as ${result.user.displayName || result.user.email}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Google sign-in failed:', err);
      alert('Google sign-in failed: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Clear persisted user session
      localStorage.removeItem('fintrack-user');
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
    <>
      {/* Account Management Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Book size={18} className="text-cyan-400"/> Manage Dashboards</h3>
              <button onClick={() => setShowAccountModal(false)} className="text-white/50 hover:text-white transition-colors p-1"><X size={20}/></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New Dashboard Name..."
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                />
                <button 
                  onClick={handleAddAccount}
                  disabled={!newAccountName.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-1"
                >
                  <Plus size={16}/> Add
                </button>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Your Dashboards</label>
                {accounts.map(acc => (
                  <div key={acc.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <span className="font-medium text-white flex items-center gap-2">
                       {acc.name}
                       {activeAccountId === acc.id && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">ACTIVE</span>}
                    </span>
                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      disabled={accounts.length <= 1}
                      className="text-white/40 hover:text-red-400 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete dashboard"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Notification */}
      {showUpdateNotification && (
        <UpdateNotification 
          onUpdate={handleUpdate} 
          onDismiss={handleDismissUpdate} 
        />
      )}
      
      <div className={`min-h-screen flex flex-col md:flex-row font-sans overflow-x-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-900 text-white' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 text-gray-900'}`}>
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className={`hidden md:flex flex-col w-48 lg:w-64 fixed md:relative h-full z-20 shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-b from-cyan-600 via-blue-600 to-cyan-700 text-white' : 'bg-gradient-to-b from-cyan-400 via-blue-400 to-cyan-500 text-white'}`}>
        <div className="p-4 lg:p-6 flex items-center gap-2 lg:gap-3 text-white font-bold text-xl lg:text-2xl tracking-tight">
          <div className={`backdrop-blur-sm p-1.5 lg:p-2 rounded-lg border border-white/30 ${isDarkMode ? 'bg-white/10' : 'bg-white/20'}`}>
            <Logo size={28} />
          </div>
          <span className="text-base lg:text-lg">FinTrack</span>
        </div>
        
        <div className="px-3 lg:px-4 mt-4">
          <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDarkMode ? 'text-white/50' : 'text-white/70'}`}>Active Dashboard</label>
          <div className="relative group">
            <button className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'}`}>
              <div className="flex items-center gap-2 truncate">
                <Book size={16} className="text-cyan-300" />
                <span className="font-semibold text-sm truncate">
                  {accounts.find(a => a.id === activeAccountId)?.name || 'Personal'}
                </span>
              </div>
              <ChevronDown size={16} className="text-white/50" />
            </button>
            <div className="absolute left-0 top-full mt-2 w-full invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
              <div className="bg-slate-800 rounded-xl shadow-xl border border-white/10 overflow-hidden py-1">
                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setActiveAccountId(acc.id)}
                    className={`w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between ${activeAccountId === acc.id ? 'bg-white/5 font-semibold' : ''}`}
                  >
                    <span className="truncate">{acc.name}</span>
                    {activeAccountId === acc.id && <span className="text-cyan-400">✓</span>}
                  </button>
                ))}
                <div className="border-t border-white/10 my-1"></div>
                <button 
                  onClick={() => setShowAccountModal(true)}
                  className="w-full text-left px-4 py-2 text-sm text-cyan-400 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Manage Dashboards
                </button>
              </div>
            </div>
          </div>
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
            <div className="mt-4 pt-3 border-t border-white/20 text-center">
              <VersionBadge />
            </div>
              </div>
           </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 md:ml-48 lg:ml-64 pb-24 md:pb-6 w-full overflow-hidden">
        {/* Header (Mobile & Desktop) */}
        <header className="sticky top-0 z-10 bg-white/5 backdrop-blur-xl border-b border-white/15 px-3 sm:px-6 py-2 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 shadow-lg w-full overflow-x-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="md:hidden bg-white/10 backdrop-blur-sm p-1 rounded-lg border border-white/30 flex-shrink-0">
                <Logo size={20} />
              </div>
              <h1 className="text-base sm:text-2xl font-bold text-white capitalize truncate">{view === 'add' ? 'Add New' : view === 'history' ? 'History' : 'Dashboard'}</h1>
            </div>
            
            {/* Auth Controls */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Settings Button - Disabled during loading */}
              <button
                onClick={() => setShowCategoryModal(!showCategoryModal)}
                disabled={loading}
                className={`p-1.5 sm:p-2 rounded-lg border transition-all h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-white ${
                  loading 
                    ? 'bg-white/5 border-white/20 opacity-50 cursor-not-allowed' 
                    : 'bg-white/10 hover:bg-white/20 border-white/30 hover:border-white/50'
                }`}
                title={loading ? "Saving transaction..." : "Manage Categories"}
              >
                <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-white/20"></div>

              {user && !String(user.uid).startsWith('local_') ? (
                <button onClick={handleSignOut} disabled={loading} className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all h-9 sm:h-10 ${loading ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}>Sign out</button>
              ) : (
                <button onClick={handleGoogleSignIn} disabled={loading} className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all h-9 sm:h-10 ${loading ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}>Sign in</button>
              )}
            </div>
        </header>

        {/* Success Message Toast */}
        {successMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-pulse px-4">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg border border-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
              {successMessage}
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 w-full overflow-x-hidden">

            {/* --- DASHBOARD VIEW --- */}
            {view === 'dashboard' && (
                <>
                    {/* PROMINENT FILTER SECTION AT TOP */}
                    <div className="mb-8 -mx-4 md:mx-0 px-4 md:px-0">
                        <Card className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-2 border-cyan-400/50 mb-0">
                            <div className="space-y-4">
                                <h2 className="text-white text-lg md:text-xl font-bold flex items-center gap-2">
                                    <Filter size={24} className="text-cyan-300"/>
                                    Filter Your Transactions
                                </h2>
                                
                                {/* Filter Options - Horizontal on Desktop, Vertical on Mobile */}
                                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full">
                                    {/* Dropdown Menu */}
                                    <div className="relative flex-1 md:flex-none">
                                        {/* Filter Button - Much Larger on Mobile */}
                                        <button 
                                            onClick={() => setShowMobileFilterDropdown(!showMobileFilterDropdown)} 
                                            className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 md:px-5 py-3 md:py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-base md:text-sm font-bold rounded-lg border-2 border-cyan-300 hover:border-cyan-200 transition-all shadow-lg hover:shadow-xl active:scale-95 min-h-touch"
                                        >
                                            <span className="text-xl md:text-base">🔍</span>
                                            <span>Filter By Time</span>
                                            <ChevronDown size={20} className={`ml-auto md:ml-1 transition-transform ${showMobileFilterDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown Menu - Fixed positioning to avoid off-screen */}
                                        <div className={`absolute left-0 right-0 md:left-0 md:right-auto top-[calc(100%+8px)] transform transition-all duration-200 z-50 ${showMobileFilterDropdown ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`} style={{minWidth: '320px'}}>
                                            <div className="bg-gradient-to-b from-white/20 to-white/10 backdrop-blur-xl border-2 border-cyan-400/50 rounded-xl shadow-2xl overflow-hidden">
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
                                                                setShowMobileFilterDropdown(false);
                                                            }}
                                                            className={`w-full px-4 py-3 text-left text-base font-medium transition-all flex items-center gap-3 ${
                                                                timeFilter === option.id
                                                                    ? 'bg-cyan-600/80 text-white border-l-4 border-cyan-300'
                                                                    : 'text-white/90 hover:text-white hover:bg-white/15'
                                                            }`}
                                                        >
                                                            <span className="text-xl">{option.icon}</span>
                                                            {option.label}
                                                            {timeFilter === option.id && <span className="ml-auto text-lg font-bold">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Custom Range Section - Expandable */}
                                                {timeFilter === 'custom' && (
                                                    <div className="border-t-2 border-white/20 bg-white/5 p-4 space-y-3">
                                                        <div className="space-y-2">
                                                            <label className="text-sm text-white/80 font-bold block">From Date</label>
                                                            <input 
                                                                type="date" 
                                                                value={customStart} 
                                                                onChange={e => setCustomStart(e.target.value)} 
                                                                className="w-full bg-white/10 border-2 border-white/30 px-3 py-2 rounded-lg text-base text-white focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all font-medium"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm text-white/80 font-bold block">To Date</label>
                                                            <input 
                                                                type="date" 
                                                                value={customEnd} 
                                                                onChange={e => setCustomEnd(e.target.value)} 
                                                                className="w-full bg-white/10 border-2 border-white/30 px-3 py-2 rounded-lg text-base text-white focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all font-medium"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 pt-3">
                                                            <button 
                                                                onClick={() => {
                                                                    if (customStart && customEnd) {
                                                                        setActiveFilter({ type: 'custom', start: customStart, end: customEnd });
                                                                        setTimeFilter('custom');
                                                                    } else {
                                                                        alert('Select both start and end dates');
                                                                    }
                                                                }} 
                                                                className="flex-1 px-3 py-2 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-all"
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
                                                                className="flex-1 px-3 py-2 rounded-lg text-sm font-bold bg-white/20 hover:bg-white/30 text-white transition-all"
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Filter Badge - Larger on Mobile */}
                                    <div className="flex items-center gap-2 px-3 md:px-2 py-3 md:py-2 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 backdrop-blur-sm rounded-lg border-2 border-emerald-400/50 hover:bg-gradient-to-r hover:from-emerald-600/60 hover:to-cyan-600/60 transition-all w-full md:w-auto">
                                        <span className="text-sm md:text-xs text-white/90 font-bold">Active:</span>
                                        <span className="px-3 py-1 text-sm md:text-xs font-bold bg-cyan-600/70 rounded-full text-white border-2 border-cyan-300/50 whitespace-nowrap">
                                            {activeFilter.type === 'all' ? '🌍 All' : activeFilter.type === 'custom' ? `📆 ${activeFilter.start?.slice(5) || '-'} → ${activeFilter.end?.slice(5) || '-'}` : activeFilter.type === '1' ? '📅 Today' : `📊 ${activeFilter.type}d`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full -mx-4 md:mx-0 px-4 md:px-0">
                         <Card className="bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 text-white border-none relative overflow-hidden shadow-lg shadow-cyan-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={100} className="md:w-120 md:h-120" /></div>
                            <div className="relative z-10">
                                <p className="text-cyan-100 font-bold mb-2 flex items-center gap-2 text-sm md:text-xs"><Filter size={16}/> {timeFilter === 'all' ? 'Lifetime' : `Last ${timeFilter}d`}</p>
                                <h2 className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-bold tracking-tight">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                                <p className="text-cyan-100 text-sm md:text-xs mt-4 flex items-center gap-1">
                                    <ArrowUpRight size={18}/> {filteredExpenses.length} txns
                                </p>
                            </div>
                         </Card>

                        {/* Income Card */}
                        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-none shadow-lg shadow-emerald-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={100} className="md:w-120 md:h-120" /></div>
                            <div className="relative z-10">
                                <p className="text-emerald-100 font-bold mb-2 flex items-center gap-2 text-sm md:text-xs"><Wallet size={16}/> Income</p>
                                <h2 className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-bold tracking-tight">+₹{totalIncome.toLocaleString()}</h2>
                                <p className="text-emerald-100 text-sm md:text-xs mt-4">
                                    Total earnings
                                </p>
                            </div>
                        </Card>

                        {/* Expense Card */}
                        <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none shadow-lg shadow-red-500/30">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} className="md:w-120 md:h-120" /></div>
                            <div className="relative z-10">
                                <p className="text-red-100 font-bold mb-2 flex items-center gap-2 text-sm md:text-xs"><DollarSign size={16}/> Expenses</p>
                                <h2 className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-bold tracking-tight">-₹{totalExpense.toLocaleString()}</h2>
                                <p className="text-red-100 text-sm md:text-xs mt-4">
                                    Total spending
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Trend Chart Card */}
                    <Card className="md:col-span-2 flex flex-col justify-between -mx-4 md:mx-0 px-4 md:px-0">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-white text-lg md:text-base flex items-center gap-2"><TrendingUp size={20} className="text-cyan-300"/> Spending Trend</h3>
                        </div>
                        {timeFilter === 'all' ? (
                            <div className="h-56 md:h-48 flex items-center justify-center text-white/60 bg-white/5 rounded-xl border border-dashed border-white/20 text-center px-4">
                                Select '7 Days' or '30 Days' to see daily trends
                            </div>
                        ) : (
                            <TrendChart data={dailyTrendData} days={parseInt(timeFilter)} />
                        )}
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full -mx-4 md:mx-0 px-4 md:px-0">
                        {/* Categories */}
                        <Card className="-mx-4 md:mx-0 px-4 md:px-0">
                            <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-lg md:text-base"><PieChart size={20} className="text-cyan-300"/> Category Breakdown</h3>
                            <DonutChart data={categoryData} />
                        </Card>

                        {/* Recent Transactions */}
                        <Card className="lg:col-span-2 -mx-4 md:mx-0 px-4 md:px-0">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-white flex items-center gap-2 text-lg md:text-base"><History size={20} className="text-cyan-300"/> Recent Activity</h3>
                                <button onClick={() => setView('history')} className="text-cyan-300 text-sm md:text-xs font-bold hover:text-cyan-200 transition-colors">View All →</button>
                            </div>
                            <div className="space-y-3">
                                {filteredExpenses.slice(0, 5).map(item => {
                                  const categoryInfo = getCategoryIcon(item.category);
                                  const IconComponent = categoryInfo.icon;
                                  return (
                                    <div key={item.id} className="flex items-center justify-between p-3 md:p-2 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/20">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`w-12 md:w-11 h-12 md:h-11 rounded-full bg-gradient-to-br ${categoryInfo.color} flex items-center justify-center text-white font-bold text-xl md:text-lg flex-shrink-0 shadow-lg`}>
                                                <IconComponent size={24} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-white text-base md:text-sm truncate">{item.category}</p>
                                                <p className="text-xs md:text-[11px] text-white/50">{formatDate(item.date)} {item.description && `• ${item.description.substring(0, 20)}`}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-2">
                                    <p className={`font-bold text-base md:text-sm ${item.type === 'income' ? 'text-emerald-300 flex items-center gap-1' : 'text-red-300 flex items-center gap-1'}`}>
                                      {item.type === 'income' ? (
                                        <>
                                          <ArrowDownLeft size={16} /> +₹{item.amount.toFixed(0)}
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUpRight size={16} /> -₹{item.amount.toFixed(0)}
                                        </>
                                      )}
                                    </p>
                                        </div>
                                    </div>
                                  );
                                })}
                                {filteredExpenses.length === 0 && <p className="text-white/60 text-center py-8">No transactions found.</p>}
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* --- ADD EXPENSE VIEW --- */}
            {view === 'add' && (
                 <div className="max-w-xl mx-auto pt-4 -mx-4 md:mx-0 px-4 md:px-0">
                    <Card className={`border-t-4 border-t-cyan-500 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-white to-gray-50'}`}>
                        <form onSubmit={handleAdd} className="space-y-6">
                            <div>
                                <label className={`block text-base md:text-sm font-bold mb-2 md:mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Amount</label>
                                <div className="relative">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg md:text-base ${isDarkMode ? 'text-white/50' : 'text-gray-400'}`}>₹</span>
                                    <input 
                                        type="number" step="0.01" required 
                                        className={`w-full pl-8 pr-4 py-4 md:py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none transition-all font-bold text-2xl md:text-lg ${
                                          isDarkMode
                                            ? 'bg-white/10 border-2 border-white/30 focus:bg-white/20 text-white placeholder-white/50'
                                            : 'bg-gray-100 border-2 border-gray-300 focus:bg-gray-50 text-gray-900 placeholder-gray-400'
                                        }`}
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                              <label className={`block text-base md:text-sm font-bold mb-3 md:mb-2.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Type</label>
                              <div className={`inline-flex rounded-xl p-1 gap-1 w-full md:w-auto ${isDarkMode ? 'bg-white/6' : 'bg-gray-200'}`}>
                                <button type="button" onClick={() => handleTypeSelect('expense')} className={`flex-1 md:flex-initial px-4 md:px-4 py-3 md:py-2 rounded-lg text-base md:text-sm font-bold transition ${formData.type === 'expense' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : isDarkMode ? 'text-white/80 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-300'}`}>
                                  Expense
                                </button>
                                <button type="button" onClick={() => handleTypeSelect('income')} className={`flex-1 md:flex-initial px-4 md:px-4 py-3 md:py-2 rounded-lg text-base md:text-sm font-bold transition ${formData.type === 'income' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' : isDarkMode ? 'text-white/80 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-300'}`}>
                                  Income
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
                                {/* Category & Settings Button - ONLY show for EXPENSE */}
                                {formData.type === 'expense' && (
                                  <div>
                                    <label className={`block text-base md:text-sm font-bold mb-2 md:mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Category</label>
                                    <div className="flex items-center gap-2">
                                      <select 
                                        className={`flex-1 px-4 py-3 md:py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none transition-all text-base md:text-sm font-semibold border-2 ${
                                          isDarkMode
                                            ? 'bg-white/10 border border-white/30 text-white'
                                            : 'bg-gray-100 border border-gray-300 text-gray-900'
                                        } disabled:opacity-50`}
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        disabled={loading}
                                      >
                                        <option value="" disabled className={isDarkMode ? 'text-white/60 bg-slate-900' : 'text-gray-500 bg-white'}>Select category</option>
                                        {defaultCategories.map(c => <option key={c} value={c} className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>{c}</option>)}
                                      </select>
                                      <button
                                        onClick={() => setShowCategoryModal(true)}
                                        disabled={loading}
                                        className={`p-2.5 rounded-lg border transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                          isDarkMode
                                            ? 'bg-white/10 border-white/30 hover:bg-white/20 text-white/70 hover:text-white'
                                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={loading ? "Saving transaction..." : "Manage Categories"}
                                      >
                                        <Settings size={16} />
                                      </button>
                                    </div>
                                  </div>
                                )}
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
                                <Button type="button" variant="secondary" onClick={() => setView('dashboard')} disabled={loading} className="flex-1">Cancel</Button>
                                <Button type="submit" className="flex-1 justify-center py-3" disabled={loading}>{loading ? (
                                  <span className="flex items-center gap-2">
                                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Saving...
                                  </span>
                                ) : 'Save Transaction'}</Button>
                            </div>
                        </form>
                    </Card>
                 </div>
            )}

            {/* --- HISTORY VIEW --- */}
            {view === 'history' && (
                <Card className="overflow-hidden p-0 -mx-4 md:mx-0 px-0 md:px-0">
                    <div className="flex justify-end p-4 border-b border-white/10 gap-2 flex-wrap">
                        <div className="flex space-x-2 flex-wrap">
                             <Button onClick={() => exportData('csv')} variant="ghost" icon={FileSpreadsheet} className="text-xs md:text-xs">Export CSV</Button>
                             <Button onClick={exportPDF} variant="ghost" icon={FileJson} className="text-xs md:text-xs">Export PDF</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                      <table className="w-full text-left">
                        <thead className="bg-gradient-to-r from-white/5 to-white/[0.02] border-y border-white/10">
                          <tr>
                            <th className="min-w-[100px] px-4 md:px-6 py-3 md:py-4 text-xs md:text-xs font-bold text-white/90 uppercase tracking-wider">Date</th>
                            <th className="min-w-[100px] px-4 md:px-6 py-3 md:py-4 text-xs md:text-xs font-bold text-white/90 uppercase tracking-wider">Category</th>
                            <th className="min-w-[200px] px-4 md:px-6 py-3 md:py-4 text-xs md:text-xs font-bold text-white/90 uppercase tracking-wider">Description</th>
                            <th className="min-w-[80px] px-4 md:px-6 py-3 md:py-4 text-xs md:text-xs font-bold text-white/90 uppercase tracking-wider text-right">Amount</th>
                            <th className="min-w-[80px] px-4 md:px-6 py-3 md:py-4 text-xs md:text-xs font-bold text-white/90 uppercase tracking-wider text-center">Action</th>
                          </tr>
                        </thead>
                            <tbody className="divide-y divide-white/10">
                                {filteredExpenses.map((expense) => {
                                  const categoryInfo = getCategoryIcon(expense.category);
                                  const IconComponent = categoryInfo.icon;
                                  return (
                                    <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm md:text-sm font-semibold text-white whitespace-nowrap">{formatDate(expense.date)}</td>
                                        <td className="px-4 md:px-6 py-3 md:py-4">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${categoryInfo.color} flex items-center justify-center text-white flex-shrink-0`}>
                                              <IconComponent size={18} />
                                            </div>
                                            <span className="inline-flex items-center text-xs md:text-xs font-bold text-white truncate">
                                              {expense.category}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm md:text-sm text-white/80 truncate max-w-xs">{expense.description || '—'}</td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm md:text-sm font-bold text-right">
                                          {expense.type === 'income' ? (
                                            <span className="text-emerald-300 flex items-center justify-end gap-1">
                                              <ArrowDownLeft size={16} /> +₹{expense.amount.toFixed(0)}
                                            </span>
                                          ) : (
                                            <span className="text-red-300 flex items-center justify-end gap-1">
                                              <ArrowUpRight size={16} /> -₹{expense.amount.toFixed(0)}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                                          <button 
                                            onClick={() => handleDelete(expense.id)}
                                            className="p-2 text-white/70 hover:text-red-400 hover:bg-red-50/10 rounded-lg transition-all"
                                            title="Delete Transaction"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </td>
                                    </tr>
                                  );
                                })}
                                {filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-white/60 text-sm md:text-sm">
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
        <div className="relative">
          <button onClick={() => setShowMobileDashboardDropdown(!showMobileDashboardDropdown)} className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-touch min-w-touch rounded-lg transition-colors ${showMobileDashboardDropdown ? 'text-cyan-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
              <Book size={20} />
              <span>Board</span>
          </button>
          {showMobileDashboardDropdown && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 rounded-xl shadow-xl border border-white/10 overflow-hidden py-1 z-50">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setActiveAccountId(acc.id);
                    setShowMobileDashboardDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10 transition-colors flex items-center justify-between ${activeAccountId === acc.id ? 'bg-white/5 font-semibold' : ''}`}
                >
                  <span className="truncate">{acc.name}</span>
                  {activeAccountId === acc.id && <span className="text-cyan-400 text-sm">✓</span>}
                </button>
              ))}
              <div className="border-t border-white/10 my-1"></div>
              <button 
                onClick={() => {
                  setShowAccountModal(true);
                  setShowMobileDashboardDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-cyan-400 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Plus size={12} /> Manage
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setView('history')} className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-touch min-w-touch rounded-lg transition-colors ${view === 'history' ? 'text-cyan-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
            <History size={20} />
            <span>History</span>
        </button>
      </nav>
    </div>
    </>
  );
};

export default App;