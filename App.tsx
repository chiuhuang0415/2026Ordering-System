
import React, { useState, useEffect, useMemo } from 'react';
import { View, Product, CartItem, Order, OrderStatus, Category, User, NewsItem, LedgerEntry } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { fetchProductsFromSheet, fetchUsersFromSheet, submitOrderToSheet, fetchNewsFromSheet, fetchOrderHistoryFromSheet, fetchLedgerFromSheet, submitLedgerToSheet } from './services/sheetService';
import Navigation from './components/Navigation';

const getApiUrl = () => {
  try {
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_SHEET_API_URL;
    if (envUrl) return envUrl;
  } catch (e) {}
  return "https://script.google.com/macros/s/AKfycbyHeGPTjPuwOSFg-VVkksSoRZIZUnD_IMBDfbTVlPpGpvoMXvrgvhPzf_xn4-U-xafL8Q/exec";
};

const GOOGLE_SHEET_API_URL = getApiUrl();

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [currentView, setCurrentView] = useState<View>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<(Category | string)[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]); 
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [orderSubView, setOrderSubView] = useState<'list' | 'summary' | 'ledger'>('list');

  // 收支表單狀態
  const [isShowingLedgerForm, setIsShowingLedgerForm] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({
    type: '收入' as '收入' | '支出',
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    note: ''
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('franchise_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('franchise_user');
      }
    }
    setTimeout(() => setIsInitializing(false), 800);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const [productData, newsData] = await Promise.all([
          fetchProductsFromSheet(GOOGLE_SHEET_API_URL),
          fetchNewsFromSheet(GOOGLE_SHEET_API_URL)
        ]);
        if (productData && productData.length > 0) {
          setProducts(productData);
          setDynamicCategories(Array.from(new Set(productData.map(p => p.category))) as Category[]);
        }
        if (newsData) setNews(newsData);
      } catch (err) {
        console.error("載入失敗");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentView !== 'orders') return;
    const loadFinancialData = async () => {
      setIsLoadingOrders(true);
      setIsLoadingLedger(true);
      try {
        const [history, ledger] = await Promise.all([
          fetchOrderHistoryFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName),
          fetchLedgerFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName)
        ]);
        setOrders(history);
        setLedgerEntries(ledger);
      } catch (err) {
        console.error("載入失敗");
      } finally {
        setIsLoadingOrders(false);
        setIsLoadingLedger(false);
      }
    };
    loadFinancialData();
  }, [isAuthenticated, currentView, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const users = await fetchUsersFromSheet(GOOGLE_SHEET_API_URL);
      const user = users.find(u => u.username === loginForm.username.trim() && u.password === loginForm.password.trim());
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('franchise_user', JSON.stringify(user));
      } else {
        setLoginError('帳號或密碼錯誤');
      }
    } catch (err) {
      setLoginError('系統連線異常');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('確定要登出系統嗎？')) {
      localStorage.removeItem('franchise_user');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCart([]);
      setCurrentView('home');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id 
          ? { ...item, quantity: Math.round((item.quantity + product.minUnit) * 100) / 100 } 
          : item
        );
      }
      return [...prev, { ...product, quantity: product.minUnit }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.round((item.quantity + delta) * 100) / 100;
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSetAllToMin = () => {
    if (filteredProducts.length === 0) return;
    if (!window.confirm(`確定要將目前顯示的 ${filteredProducts.length} 個品項全部填入最小單位嗎？`)) return;
    setCart(prev => {
      const newCart = [...prev];
      filteredProducts.forEach(p => {
        const index = newCart.findIndex(item => item.id === p.id);
        if (index > -1) {
          newCart[index] = { ...newCart[index], quantity: p.minUnit };
        } else {
          newCart.push({ ...p, quantity: p.minUnit });
        }
      });
      return newCart;
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !currentUser) return;
    setIsSubmitting(true);
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toLocaleDateString('zh-TW'),
      total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      items: [...cart],
      status: OrderStatus.PENDING,
      deliveryDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('zh-TW'),
    };
    try {
      const success = await submitOrderToSheet(GOOGLE_SHEET_API_URL, newOrder, currentUser.franchiseName);
      if (success) {
        setCart([]);
        setCurrentView('orders');
        alert('叫貨單已送出！');
        const history = await fetchOrderHistoryFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName);
        setOrders(history);
      }
    } catch (err) {
      alert('發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !ledgerForm.amount) return;
    setIsSubmitting(true);
    const newEntry: LedgerEntry = {
      id: `LGR-${Date.now()}`,
      date: ledgerForm.date.replace(/-/g, '/'),
      franchiseName: currentUser.franchiseName,
      type: ledgerForm.type,
      category: ledgerForm.category || (ledgerForm.type === '收入' ? '今日營業額' : '雜項支出'),
      amount: parseFloat(ledgerForm.amount),
      note: ledgerForm.note
    };
    try {
      const success = await submitLedgerToSheet(GOOGLE_SHEET_API_URL, newEntry);
      if (success) {
        setLedgerEntries(prev => [newEntry, ...prev]);
        setIsShowingLedgerForm(false);
        setLedgerForm({ ...ledgerForm, amount: '', note: '', category: '' });
        alert('紀錄已儲存！');
      }
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === '全部' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.date) return false;
      const orderDateStr = order.date.toString().replace(/-/g, '/');
      const [y, m] = selectedMonth.split('/');
      const monthShort = parseInt(m).toString();
      return orderDateStr.includes(`${y}/${m}`) || orderDateStr.includes(`${y}/${monthShort}`);
    });
  }, [orders, selectedMonth]);

  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter(entry => {
      if (!entry.date) return false;
      const dateStr = entry.date.toString().replace(/-/g, '/');
      const [y, m] = selectedMonth.split('/');
      const monthShort = parseInt(m).toString();
      return dateStr.includes(`${y}/${m}`) || dateStr.includes(`${y}/${monthShort}`);
    });
  }, [ledgerEntries, selectedMonth]);

  const itemAggregation = useMemo(() => {
    const aggregate: Record<string, number> = {};
    filteredOrders.forEach(order => {
      if (!order.itemsSummary) return;
      order.itemsSummary.split(', ').forEach(part => {
        const [name, qtyStr] = part.split('*');
        if (name && qtyStr) {
          const qty = parseFloat(qtyStr);
          if (!isNaN(qty)) aggregate[name.trim()] = (aggregate[name.trim()] || 0) + qty;
        }
      });
    });
    return Object.entries(aggregate).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const monthlyOrderTotal = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.total, 0), [filteredOrders]);
  const monthlyIncome = useMemo(() => filteredLedger.filter(l => l.type === '收入').reduce((sum, l) => sum + l.amount, 0), [filteredLedger]);
  const monthlyExpenseManual = useMemo(() => filteredLedger.filter(l => l.type === '支出').reduce((sum, l) => sum + l.amount, 0), [filteredLedger]);
  const monthlyTotalExpense = monthlyOrderTotal + monthlyExpenseManual;
  const monthlyProfit = monthlyIncome - monthlyTotalExpense;

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      result.push(`${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    return result;
  }, []);

  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFBF7]">
        <div className="w-20 h-20 bg-[#8B7355] rounded-[2rem] flex items-center justify-center text-white text-3xl animate-bounce shadow-2xl shadow-[#8B7355]/20">🐔</div>
        <p className="mt-6 text-[#8B7355] font-black text-sm tracking-widest animate-pulse">大葛格鹹水雞 系統啟動中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FDFBF7]">
        <div className="flex-1 flex flex-col justify-center px-8">
          <div className="mb-10 text-center">
            <div className="w-24 h-24 bg-[#8B7355] rounded-2.5rem flex items-center justify-center text-white shadow-xl shadow-[#8B7355]/20 mx-auto mb-6">
              <span className="text-4xl font-black">🐔</span>
            </div>
            <h1 className="text-3xl font-black text-[#4A3728] tracking-tight">大葛格鹹水雞</h1>
            <p className="text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Franchise Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input required type="text" className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl text-[#4A3728] font-bold outline-none" placeholder="門店帳號" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input required type="password" className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl text-[#4A3728] font-bold outline-none" placeholder="密碼" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            {loginError && <p className="text-rose-500 text-[11px] font-bold text-center">{loginError}</p>}
            <button disabled={isLoggingIn} type="submit" className="w-full py-5 rounded-2xl font-black text-lg bg-[#8B7355] text-white shadow-xl active:scale-95 transition-all">{isLoggingIn ? '驗證中...' : '進入系統'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7] text-[#4A3728]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5D3BC] px-4 h-16 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-black text-[#8B7355] flex items-center gap-2">
          <div className="w-8 h-8 bg-[#8B7355] rounded-xl flex items-center justify-center text-white text-xs">🐔</div>
          <span className="tracking-tighter">大葛格鹹水雞</span>
        </h1>
        <button onClick={handleLogout} className="text-[#D2B48C] text-xs font-bold uppercase tracking-widest">{currentUser?.franchiseName} 登出</button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {currentView === 'home' && (
          <div className="space-y-6">
            <div className="px-1 pt-4">
               <h2 className="text-2xl font-black text-[#4A3728] tracking-tight">你好，{currentUser?.franchiseName} 👋</h2>
               <p className="text-[11px] text-[#A68966] font-bold mt-1 uppercase tracking-widest">今日也要元氣滿滿的出攤喔！</p>
            </div>
            <section className="bg-white p-6 rounded-[2.5rem] border border-[#E5D3BC] shadow-sm">
               <h3 className="text-[10px] font-black text-[#A68966] uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span> 最新公告
               </h3>
               {news.length > 0 ? (
                 <div className="space-y-4">
                    <h4 className="text-lg font-black text-[#8B7355]">{news[0].title}</h4>
                    <p className="text-sm font-medium text-stone-500 leading-relaxed">{news[0].content}</p>
                 </div>
               ) : <p className="text-stone-300 text-xs font-bold">目前無新公告</p>}
            </section>
            <section className="grid grid-cols-2 gap-4">
               <button onClick={() => setCurrentView('catalog')} className="bg-white p-6 rounded-[2rem] border border-[#E5D3BC] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
                  <span className="text-3xl">🍲</span>
                  <span className="text-sm font-black text-[#4A3728]">食材訂購</span>
               </button>
               <button onClick={() => setCurrentView('orders')} className="bg-white p-6 rounded-[2rem] border border-[#E5D3BC] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all">
                  <span className="text-3xl">📊</span>
                  <span className="text-sm font-black text-[#4A3728]">叫貨與收支</span>
               </button>
            </section>
          </div>
        )}

        {currentView === 'catalog' && (
           <div className="space-y-4">
              <input type="text" placeholder="搜尋食材..." className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl text-sm font-bold shadow-sm outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="flex overflow-x-auto gap-2 hide-scrollbar py-2">
                {['全部', ...dynamicCategories].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#8B7355] text-white shadow-lg' : 'bg-white border border-[#E5D3BC] text-stone-500'}`}>{cat}</button>
                ))}
              </div>
              <button onClick={handleSetAllToMin} className="w-full bg-[#F5E6D3] border-2 border-[#E5D3BC] py-3 rounded-2xl font-black text-[#8B7355] text-xs uppercase tracking-widest active:scale-95 transition-all">一鍵填寫最小單位</button>
              <div className="grid grid-cols-1 gap-3 pb-8">
                {filteredProducts.map(product => {
                  const inCart = cart.find(item => item.id === product.id);
                  return (
                    <div key={product.id} className="bg-white rounded-2xl border border-[#E5D3BC] p-4 flex items-center justify-between shadow-sm">
                      <div className="flex-1">
                        <span className="text-[9px] font-bold text-[#8B7355] bg-[#F5E6D3] px-1.5 py-0.5 rounded uppercase">{product.category}</span>
                        <h4 className="text-base font-black text-[#4A3728] mt-1">{product.name}</h4>
                        <p className="text-sm font-black text-[#8B7355] mt-1">${product.price} <span className="text-[10px] text-stone-300 font-bold">/ {product.unit}</span></p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-[#F5E6D3] rounded-xl p-1 border border-[#E5D3BC]">
                          <button onClick={() => updateQuantity(product.id, -product.minUnit)} className="w-8 h-8 flex items-center justify-center text-[#8B7355] font-black">-</button>
                          <span className="text-xs font-black min-w-[20px] text-center">{inCart.quantity}</span>
                          <button onClick={() => updateQuantity(product.id, product.minUnit)} className="w-8 h-8 flex items-center justify-center text-[#8B7355] font-black">+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(product)} className="bg-[#8B7355] text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">選購</button>
                      )}
                    </div>
                  );
                })}
              </div>
           </div>
        )}

        {currentView === 'cart' && (
          <div className="space-y-6">
             <h2 className="text-2xl font-black text-[#4A3728] tracking-tight">我的購物車</h2>
             {cart.length === 0 ? (
                <div className="py-20 text-center text-stone-300 font-bold uppercase tracking-widest">購物車是空的 🛒</div>
             ) : (
                <div className="space-y-4">
                   {cart.map(item => (
                     <div key={item.id} className="bg-white p-4 rounded-3xl border border-[#E5D3BC] flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="text-sm font-black">{item.name}</h4>
                          <p className="text-xs font-bold text-stone-400">${item.price} x {item.quantity}</p>
                        </div>
                        <span className="text-base font-black text-[#8B7355]">${Math.round(item.price * item.quantity * 100) / 100}</span>
                     </div>
                   ))}
                   <div className="bg-[#8B7355] p-6 rounded-[2.5rem] text-white shadow-xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">總計金額</p>
                        <p className="text-2xl font-black">${Math.round(cart.reduce((a, b) => a + b.price * b.quantity, 0) * 100) / 100}</p>
                      </div>
                      <button onClick={handleCheckout} disabled={isSubmitting} className="bg-white text-[#8B7355] px-8 py-3 rounded-2xl font-black active:scale-95 transition-all">{isSubmitting ? '送出中...' : '送出訂單'}</button>
                   </div>
                </div>
             )}
          </div>
        )}

        {currentView === 'orders' && (
           <div className="space-y-6 pb-20">
              <div className="bg-[#F5E6D3] p-1 rounded-2xl flex border border-[#E5D3BC] shadow-inner mb-4">
                {['list', 'summary', 'ledger'].map(v => (
                  <button key={v} onClick={() => setOrderSubView(v as any)} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${orderSubView === v ? 'bg-[#8B7355] text-white shadow-md' : 'text-[#8B7355]'}`}>
                    {v === 'list' ? '叫貨清單' : v === 'summary' ? '品項累計' : '收支統計'}
                  </button>
                ))}
              </div>

              <div className="flex overflow-x-auto gap-2 hide-scrollbar mb-6">
                {months.map(m => (
                  <button key={m} onClick={() => setSelectedMonth(m)} className={`px-5 py-2 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${selectedMonth === m ? 'bg-[#8B7355] text-white' : 'bg-white border border-[#E5D3BC] text-stone-400'}`}>{m}</button>
                ))}
              </div>

              {orderSubView === 'ledger' ? (
                <div className="space-y-6">
                  {/* 盈餘看版 */}
                  <div className={`p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden transition-colors ${monthlyProfit >= 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{selectedMonth} 預估損益</p>
                        <p className="text-3xl font-black">${Math.round(monthlyProfit * 100) / 100}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase opacity-80">本月狀態</p>
                        <p className="text-lg font-black">{monthlyProfit >= 0 ? '👍 盈利' : '👎 赤字'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 收支按鈕 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setIsShowingLedgerForm(true); setLedgerForm({...ledgerForm, type: '收入'}); }} className="bg-emerald-50 py-4 rounded-2xl border-2 border-emerald-100 flex flex-col items-center gap-1 active:scale-95 transition-all">
                       <span className="text-emerald-600 font-black text-xs">＋ 記錄收入</span>
                    </button>
                    <button onClick={() => { setIsShowingLedgerForm(true); setLedgerForm({...ledgerForm, type: '支出'}); }} className="bg-rose-50 py-4 rounded-2xl border-2 border-rose-100 flex flex-col items-center gap-1 active:scale-95 transition-all">
                       <span className="text-rose-600 font-black text-xs">－ 記錄支出</span>
                    </button>
                  </div>

                  {/* 填寫表單 */}
                  {isShowingLedgerForm && (
                    <div className="bg-white p-6 rounded-[2rem] border-2 border-[#8B7355] shadow-2xl animate-in slide-in-from-bottom-4">
                       <div className="flex justify-between mb-4">
                          <h4 className="text-sm font-black text-[#8B7355]">新增{ledgerForm.type}紀錄</h4>
                          <button onClick={() => setIsShowingLedgerForm(false)} className="text-stone-300 text-sm">✕</button>
                       </div>
                       <form onSubmit={handleSubmitLedger} className="space-y-3">
                          <input required type="date" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-sm font-bold" value={ledgerForm.date} onChange={e => setLedgerForm({...ledgerForm, date: e.target.value})} />
                          <input required type="text" placeholder="類別 (如: 外送收入, 店內租金)" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-sm font-bold" value={ledgerForm.category} onChange={e => setLedgerForm({...ledgerForm, category: e.target.value})} />
                          <input required type="number" placeholder="金額" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-sm font-bold" value={ledgerForm.amount} onChange={e => setLedgerForm({...ledgerForm, amount: e.target.value})} />
                          <input type="text" placeholder="備註 (選填)" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-sm font-bold" value={ledgerForm.note} onChange={e => setLedgerForm({...ledgerForm, note: e.target.value})} />
                          <button disabled={isSubmitting} type="submit" className="w-full bg-[#8B7355] text-white py-4 rounded-xl font-black text-sm">{isSubmitting ? '儲存中...' : '儲存紀錄'}</button>
                       </form>
                    </div>
                  )}

                  {/* 收支明細列表 */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-[#8B7355] uppercase tracking-widest">本月財務明細</h5>
                    
                    {/* 自動匯入的叫貨支出 */}
                    {monthlyOrderTotal > 0 && (
                      <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex justify-between items-center border-l-4 border-l-rose-500">
                         <div>
                            <p className="text-[9px] font-black text-stone-300">自動匯入 (叫貨紀錄)</p>
                            <h6 className="text-sm font-black text-[#4A3728]">食材進貨支出</h6>
                            <p className="text-[10px] text-stone-400 font-bold">{filteredOrders.length} 筆訂單彙整</p>
                         </div>
                         <span className="text-base font-black text-rose-500">-${monthlyOrderTotal}</span>
                      </div>
                    )}

                    {/* 手動輸入的明細 */}
                    {filteredLedger.map(l => (
                      <div key={l.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center border-l-4 ${l.type === '收入' ? 'border-emerald-100 border-l-emerald-500' : 'border-rose-100 border-l-rose-500'}`}>
                         <div>
                            <p className="text-[9px] font-black text-stone-300">{l.date}</p>
                            <h6 className="text-sm font-black text-[#4A3728]">{l.category}</h6>
                            {l.note && <p className="text-[10px] text-stone-400 font-bold">{l.note}</p>}
                         </div>
                         <span className={`text-base font-black ${l.type === '收入' ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {l.type === '收入' ? '+' : '-'}${l.amount}
                         </span>
                      </div>
                    ))}
                    
                    {filteredLedger.length === 0 && monthlyOrderTotal === 0 && (
                      <div className="py-12 text-center text-stone-300 text-xs font-bold bg-white rounded-3xl border border-dashed">尚未有收支紀錄</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="bg-[#8B7355] p-5 rounded-[2rem] text-white flex justify-between items-center shadow-lg">
                      <div>
                        <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">當月叫貨總額</p>
                        <p className="text-2xl font-black">${monthlyOrderTotal}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black opacity-80 uppercase">訂單數</p>
                        <p className="text-lg font-black">{filteredOrders.length} 筆</p>
                      </div>
                   </div>

                   {isLoadingOrders ? <p className="py-20 text-center animate-pulse text-[#8B7355] font-black text-xs uppercase">讀取中...</p> : 
                    orderSubView === 'list' ? (
                      filteredOrders.map(order => (
                        <div key={order.id} className="bg-white p-4 rounded-2xl border border-[#E5D3BC] shadow-sm space-y-2 border-l-[6px] border-l-[#8B7355]">
                           <div className="flex justify-between items-start">
                              <p className="text-[10px] font-black text-stone-400">{order.date} | #{order.id.slice(-6)}</p>
                              <span className="text-[9px] font-black bg-[#F5E6D3] text-[#8B7355] px-2 py-0.5 rounded-full">{order.status}</span>
                           </div>
                           <p className="text-xs font-medium text-stone-500 leading-relaxed line-clamp-2">{order.itemsSummary}</p>
                           <div className="flex justify-between items-center pt-1">
                              <span className="text-xs font-black text-[#8B7355]">金額:</span>
                              <span className="text-lg font-black text-[#8B7355]">${order.total}</span>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-3xl border border-[#E5D3BC] overflow-hidden">
                        <div className="bg-[#FDFBF7] px-5 py-3 border-b border-[#E5D3BC] flex justify-between text-[10px] font-black text-[#8B7355] uppercase tracking-widest">
                          <span>食材名稱</span>
                          <span>本月累計總量</span>
                        </div>
                        {itemAggregation.length > 0 ? itemAggregation.map((item, idx) => (
                          <div key={idx} className="px-5 py-4 flex justify-between items-center border-b border-[#E5D3BC]/40 last:border-0">
                            <span className="text-sm font-black">{item.name}</span>
                            <span className="text-base font-black text-[#8B7355]">{item.total}</span>
                          </div>
                        )) : <div className="p-10 text-center text-stone-300 text-xs">尚無累計資料</div>}
                      </div>
                    )
                   }
                </div>
              )}
           </div>
        )}
      </main>
      <Navigation currentView={currentView} onViewChange={setCurrentView} cartCount={cartItemCount} />
    </div>
  );
};

export default App;
