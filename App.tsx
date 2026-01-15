import React, { useState, useEffect, useMemo } from 'react';
import { View, Product, CartItem, Order, OrderStatus, Category, User, NewsItem, LedgerEntry } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { fetchProductsFromSheet, loginToSheet, submitOrderToSheet, fetchNewsFromSheet, fetchOrderHistoryFromSheet, fetchActiveOrdersFromSheet, fetchLedgerFromSheet, submitLedgerToSheet } from './services/sheetService';
import Navigation from './components/Navigation';

const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyHeGPTjPuwOSFg-VVkksSoRZIZUnD_IMBDfbTVlPpGpvoMXvrgvhPzf_xn4-U-xafL8Q/exec";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // 分開管理歷史訂單與待處理訂單
  const [orders, setOrders] = useState<Order[]>([]); 
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [orderSubView, setOrderSubView] = useState<'ledger' | 'list' | 'summary'>('ledger');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
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
        if (productData.length > 0) {
          setProducts(productData);
          setDynamicCategories(Array.from(new Set(productData.map(p => p.category))) as Category[]);
        }
        if (newsData) setNews(newsData);
      } catch (err) {
        console.error("基礎資料載入失敗");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    
    const loadFinancialData = async () => {
      setIsLoadingOrders(true);
      try {
        if (currentView === 'orders') {
          const [history, ledger] = await Promise.all([
            fetchOrderHistoryFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName),
            fetchLedgerFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName)
          ]);
          setOrders(history);
          setLedgerEntries(ledger);
        }
        
        if (currentView === 'cart') {
          const active = await fetchActiveOrdersFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName);
          setPendingOrders(active);
        }
      } catch (err) {
        console.error("訂單資料載入失敗");
      } finally {
        setIsLoadingOrders(false);
      }
    };

    if (currentView === 'orders' || currentView === 'cart') {
      loadFinancialData();
    }
  }, [isAuthenticated, currentView, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const result = await loginToSheet(GOOGLE_SHEET_API_URL, loginForm.username, loginForm.password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem('franchise_user', JSON.stringify(result.user));
      } else {
        setLoginError(result.message || '帳號或密碼錯誤');
      }
    } catch (err) {
      setLoginError('連線異常');
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
        alert('叫貨單已送出！');
        const active = await fetchActiveOrdersFromSheet(GOOGLE_SHEET_API_URL, currentUser.franchiseName);
        setPendingOrders(active);
      } else {
        alert('送出失敗');
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
      category: ledgerForm.category || (ledgerForm.type === '收入' ? '店內收入' : '其他'),
      amount: parseFloat(ledgerForm.amount),
      note: ledgerForm.note
    };
    try {
      const success = await submitLedgerToSheet(GOOGLE_SHEET_API_URL, newEntry);
      if (success) {
        setLedgerEntries(prev => [newEntry, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
      const dateStr = order.date.toString().replace(/-/g, '/');
      const [y, m] = selectedMonth.split('/');
      // 同時支持 2024/05 與 2024/5 匹配
      return dateStr.includes(`${y}/${m}`) || dateStr.includes(`${y}/${parseInt(m)}`);
    });
  }, [orders, selectedMonth]);

  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter(entry => {
      if (!entry.date) return false;
      const dateStr = entry.date.toString().replace(/-/g, '/');
      const [y, m] = selectedMonth.split('/');
      return dateStr.includes(`${y}/${m}`) || dateStr.includes(`${y}/${parseInt(m)}`);
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
  
  // 總利潤 = 收入 - (手動記錄支出 + 叫貨支出)
  const monthlyProfit = monthlyIncome - (monthlyExpenseManual + monthlyOrderTotal);

  const months = useMemo(() => {
    const res = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      res.push(`${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    return res;
  }, []);

  const parsedItems = useMemo(() => {
    if (!selectedOrder?.itemsSummary) return [];
    return selectedOrder.itemsSummary.split(', ').map(s => {
      const [name, qty] = s.split('*');
      return { name: name.trim(), qty: qty?.trim() || "0" };
    });
  }, [selectedOrder]);

  const cartItemCount = useMemo(() => cart.length, [cart]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFBF7]">
        <div className="w-20 h-20 bg-[#8B7355] rounded-[2rem] flex items-center justify-center text-white text-3xl animate-bounce">🐔</div>
        <p className="mt-6 text-[#8B7355] font-black text-sm tracking-widest">系統載入中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FDFBF7] px-8 justify-center">
        <div className="mb-10 text-center">
          <div className="w-24 h-24 bg-[#8B7355] rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-[#8B7355]/20">
            <span className="text-4xl">🐔</span>
          </div>
          <h1 className="text-3xl font-black text-[#4A3728]">大葛格鹹水雞</h1>
          <p className="text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Franchise Portal</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input required type="text" className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl font-bold outline-none" placeholder="門店帳號" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
          <input required type="password" className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl font-bold outline-none" placeholder="密碼" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
          {loginError && <p className="text-rose-500 text-[11px] font-bold text-center">{loginError}</p>}
          <button disabled={isLoggingIn} type="submit" className="w-full py-5 rounded-2xl font-black text-lg bg-[#8B7355] text-white shadow-xl active:scale-95 transition-all">
            {isLoggingIn ? '驗證中...' : '進入系統'}
          </button>
        </form>
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
        <div className="flex items-center gap-2">
          <span className="text-[#D2B48C] text-[11px] font-black">{currentUser?.franchiseName}</span>
          <button onClick={handleLogout} className="text-[#D2B48C] text-[11px] font-black underline">登出</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {currentView === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="px-1 pt-4">
               <h2 className="text-2xl font-black text-[#4A3728]">你好，{currentUser?.franchiseName} 👋</h2>
               <p className="text-[11px] text-[#A68966] font-bold mt-1 uppercase tracking-widest">今日也要元氣滿滿的出攤喔！</p>
            </div>
            <section className="bg-white rounded-[2.5rem] border border-[#E5D3BC] shadow-sm overflow-hidden">
               <iframe src="https://indify.co/widgets/live/weather/znO94wvhhwqSGXWUXkE8" frameBorder="0" style={{ width: '100%', height: '160px' }}></iframe>
            </section>
            <section className="bg-white p-6 rounded-[2.5rem] border border-[#E5D3BC] shadow-sm">
               <h3 className="text-[10px] font-black text-[#A68966] uppercase tracking-widest mb-4 flex items-center gap-2">最新公告</h3>
               {news.length > 0 ? (
                 <div className="space-y-2">
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
                  <span className="text-sm font-black text-[#4A3728]">歷史清單</span>
               </button>
            </section>
          </div>
        )}

        {currentView === 'catalog' && (
           <div className="space-y-4 animate-in fade-in duration-300">
              <input type="text" placeholder="搜尋食材..." className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl text-sm font-bold shadow-sm outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="flex overflow-x-auto gap-2 py-2">
                {['全部', ...dynamicCategories].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#8B7355] text-white' : 'bg-white border border-[#E5D3BC] text-stone-500'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 pb-8">
                {filteredProducts.map(product => {
                  const inCart = cart.find(item => item.id === product.id);
                  return (
                    <div key={product.id} className="bg-white rounded-2xl border border-[#E5D3BC] p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-[9px] font-bold text-[#8B7355] bg-[#F5E6D3] px-1.5 py-0.5 rounded uppercase">{product.category}</span>
                        <h4 className="text-base font-black text-[#4A3728] mt-1">{product.name}</h4>
                        <p className="text-sm font-black text-[#8B7355] mt-1">${product.price} / {product.unit}</p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-[#F5E6D3] rounded-xl p-1 border border-[#E5D3BC]">
                          <button onClick={() => updateQuantity(product.id, -product.minUnit)} className="w-8 h-8 flex items-center justify-center font-black">-</button>
                          <span className="text-xs font-black min-w-[20px] text-center">{inCart.quantity}</span>
                          <button onClick={() => updateQuantity(product.id, product.minUnit)} className="w-8 h-8 flex items-center justify-center font-black">+</button>
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
          <div className="space-y-6 pb-20 animate-in slide-in-from-right duration-300">
             <h2 className="text-2xl font-black text-[#4A3728]">我的購物車</h2>
             {cart.length === 0 ? (
                <div className="py-20 text-center text-stone-300 font-bold">購物車是空的 🛒</div>
             ) : (
                <div className="space-y-4">
                   {cart.map(item => (
                     <div key={item.id} className="bg-white p-4 rounded-3xl border border-[#E5D3BC] flex justify-between items-center">
                        <div><h4 className="text-sm font-black">{item.name}</h4><p className="text-xs font-bold text-stone-400">${item.price} x {item.quantity}</p></div>
                        <span className="text-base font-black text-[#8B7355]">${Math.round(item.price * item.quantity * 100) / 100}</span>
                     </div>
                   ))}
                   <div className="bg-[#8B7355] p-6 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                      <div><p className="text-[10px] font-black uppercase opacity-70">總計金額</p><p className="text-2xl font-black">${Math.round(cart.reduce((a, b) => a + b.price * b.quantity, 0) * 100) / 100}</p></div>
                      <button onClick={handleCheckout} disabled={isSubmitting} className="bg-white text-[#8B7355] px-8 py-3 rounded-2xl font-black active:scale-95 transition-all">{isSubmitting ? '送出中...' : '送出訂單'}</button>
                   </div>
                </div>
             )}

             <div className="mt-10 pt-6 border-t border-[#E5D3BC]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-[#8B7355] flex items-center gap-2">
                    <span>📋</span> 待處理訂單紀錄
                  </h3>
                  {isLoadingOrders && <span className="text-[10px] font-black text-[#D2B48C] animate-pulse">同步中...</span>}
                </div>
                
                <div className="space-y-3">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-2xl border border-[#E5D3BC] shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-stone-400">日期: {order.date}</span>
                          <span className="text-[10px] font-black bg-[#F5E6D3] text-[#8B7355] px-2 py-0.5 rounded-full">待處理</span>
                        </div>
                        <p className="text-xs font-bold text-stone-600 line-clamp-2 bg-stone-50 p-2 rounded-lg">
                          {order.itemsSummary || "無品項摘要"}
                        </p>
                        <div className="flex justify-between items-center pt-1 border-t border-stone-50">
                          <span className="text-[10px] font-black text-stone-300">單號: {order.id.slice(-6)}</span>
                          <span className="text-sm font-black text-[#8B7355]">${order.total}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-stone-50/50 rounded-2xl border border-dashed border-[#E5D3BC] py-8 text-center">
                      <p className="text-stone-300 text-xs font-bold">目前沒有待處理的訂單</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}

        {currentView === 'orders' && (
           <div className="space-y-6 pb-20 animate-in fade-in duration-300">
              <div className="bg-[#F5E6D3] p-1 rounded-2xl flex border border-[#E5D3BC]">
                {['ledger', 'list', 'summary'].map(v => (
                  <button key={v} onClick={() => setOrderSubView(v as any)} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${orderSubView === v ? 'bg-[#8B7355] text-white shadow-md' : 'text-[#8B7355]'}`}>
                    {v === 'ledger' ? '收支統計' : v === 'list' ? '叫貨清單' : '品項累計'}
                  </button>
                ))}
              </div>

              <div className="flex overflow-x-auto gap-2 mb-6 hide-scrollbar">
                {months.map(m => (
                  <button key={m} onClick={() => setSelectedMonth(m)} className={`px-5 py-2 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${selectedMonth === m ? 'bg-[#8B7355] text-white' : 'bg-white border border-[#E5D3BC] text-stone-400'}`}>{m}</button>
                ))}
              </div>

              {/* 這裡使用嚴格的三元運算子分區渲染 */}
              {orderSubView === 'ledger' && (
                <div className="space-y-6" key="ledger-view">
                  <div className={`p-6 rounded-[2rem] text-white shadow-xl transition-colors ${monthlyProfit >= 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{selectedMonth} 預估損益</p>
                    <p className="text-3xl font-black">${Math.round(monthlyProfit * 100) / 100}</p>
                    <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-2 text-[10px] font-bold opacity-90">
                      <div>總收入: ${monthlyIncome}</div>
                      <div>總支出: ${monthlyExpenseManual + monthlyOrderTotal}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setIsShowingLedgerForm(true); setLedgerForm({...ledgerForm, type: '收入', category: '店內收入'}); }} className="bg-[#E6FFFA] py-5 rounded-2xl border-2 border-[#B2F5EA] text-[#2C7A7B] font-black text-sm active:scale-95 transition-all">＋ 記錄收入</button>
                    <button onClick={() => { setIsShowingLedgerForm(true); setLedgerForm({...ledgerForm, type: '支出', category: '其他'}); }} className="bg-[#FFF5F5] py-5 rounded-2xl border-2 border-[#FED7D7] text-[#C53030] font-black text-sm active:scale-95 transition-all">－ 記錄支出</button>
                  </div>
                  <div className="space-y-4">
                    <h5 className="text-[12px] font-black text-[#8B7355] bg-[#F5E6D3] px-3 py-1 rounded-full w-fit">本月明細 (不含叫貨)</h5>
                    {filteredLedger.length > 0 ? (
                      filteredLedger.map(l => (
                        <div key={l.id} className={`bg-white p-5 rounded-3xl border border-[#E5D3BC] flex justify-between items-center border-l-[10px] ${l.type === '收入' ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                           <div><p className="text-[9px] font-black text-stone-300">{l.date}</p><h6 className="text-base font-black text-[#4A3728]">{l.category}</h6></div>
                           <span className={`text-xl font-black ${l.type === '收入' ? 'text-emerald-600' : 'text-rose-600'}`}>{l.type === '收入' ? '+' : '-'}${l.amount}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-10 text-stone-300 font-bold text-xs">目前無手動收支紀錄</p>
                    )}
                  </div>
                </div>
              )}

              {orderSubView === 'list' && (
                <div className="space-y-4" key="order-list-view">
                   {isLoadingOrders ? <p className="py-20 text-center animate-pulse text-[#8B7355] font-black text-xs uppercase tracking-widest">同步試算表中...</p> : 
                      filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                          <div key={order.id} onClick={() => { setSelectedOrder(order); setCheckedItems(new Set()); }} className="bg-white p-5 rounded-3xl border border-[#E5D3BC] shadow-sm space-y-3 border-l-[8px] border-l-[#8B7355] active:scale-[0.98] transition-all cursor-pointer">
                             <div className="flex justify-between items-start"><p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">{order.date} | #{order.id.slice(-6)}</p><span className="text-[9px] font-black bg-[#F5E6D3] text-[#8B7355] px-2.5 py-1 rounded-full uppercase tracking-widest">{order.status}</span></div>
                             <p className="text-xs font-medium text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 line-clamp-2">{order.itemsSummary}</p>
                             <div className="flex justify-between items-center pt-1"><span className="text-[10px] font-black text-[#8B7355]/40 uppercase tracking-widest">點擊核對品項 📋</span><span className="text-xl font-black text-[#8B7355] tracking-tight">${order.total}</span></div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-10 text-stone-300 font-bold text-xs">本月無叫貨清單</p>
                      )
                   }
                </div>
              )}

              {orderSubView === 'summary' && (
                <div className="space-y-4" key="summary-view">
                   <div className="bg-white rounded-[2.5rem] border border-[#E5D3BC] overflow-hidden">
                        <div className="bg-[#FDFBF7] px-6 py-4 border-b border-[#E5D3BC] flex justify-between text-[11px] font-black text-[#8B7355]"><span>食材項目</span><span>累計總量</span></div>
                        {itemAggregation.length > 0 ? (
                          itemAggregation.map((item, idx) => (
                            <div key={idx} className="px-6 py-4 flex justify-between items-center border-b border-stone-50">
                              <span className="text-sm font-black text-[#4A3728]">{item.name}</span>
                              <span className="text-lg font-black text-[#8B7355]">{item.total}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center py-10 text-stone-300 font-bold text-xs uppercase tracking-widest">本月無品項數據</p>
                        )}
                    </div>
                </div>
              )}
           </div>
        )}

        {isShowingLedgerForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 border-[3px] border-[#8B7355] shadow-2xl">
              <h4 className="text-xl font-black text-[#8B7355]">新增{ledgerForm.type}紀錄</h4>
              <form onSubmit={handleSubmitLedger} className="space-y-4">
                <input required type="date" className="w-full px-5 py-4 bg-[#F8F8F8] rounded-2xl border-none font-bold" value={ledgerForm.date} onChange={e => setLedgerForm({...ledgerForm, date: e.target.value})} />
                <select required className="w-full px-5 py-4 bg-[#F8F8F8] rounded-2xl border-none font-bold" value={ledgerForm.category} onChange={e => setLedgerForm({...ledgerForm, category: e.target.value})}>
                  {ledgerForm.type === '收入' ? (
                    <><option value="店內收入">店內收入</option><option value="外送收入">外送收入</option><option value="其他">其他</option></>
                  ) : (
                    <><option value="其他">其他</option><option value="店租">店租</option><option value="水電費">水電費</option><option value="人事支出">人事支出</option></>
                  )}
                </select>
                <input required type="number" placeholder="金額" className="w-full px-5 py-4 bg-[#F8F8F8] rounded-2xl border-none font-bold" value={ledgerForm.amount} onChange={e => setLedgerForm({...ledgerForm, amount: e.target.value})} />
                <button disabled={isSubmitting} type="submit" className="w-full bg-[#8B7355] text-white py-5 rounded-2xl font-black text-lg active:scale-95 transition-all">{isSubmitting ? '儲存中...' : '儲存紀錄'}</button>
                <button type="button" onClick={() => setIsShowingLedgerForm(false)} className="w-full text-stone-400 font-bold text-sm">取消</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-[#FDFBF7] flex flex-col animate-in slide-in-from-bottom">
           <header className="px-6 py-8 border-b border-[#E5D3BC] bg-white flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">核對清單</p>
                <h2 className="text-xl font-black text-[#4A3728]">#{selectedOrder.id.slice(-6)}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-3 rounded-xl bg-stone-100 text-stone-400">關閉</button>
           </header>
           <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {parsedItems.map((item, idx) => (
                <div key={idx} onClick={() => {
                  const next = new Set(checkedItems);
                  if (next.has(item.name)) next.delete(item.name); else next.add(item.name);
                  setCheckedItems(next);
                }} className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${checkedItems.has(item.name) ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-[#E5D3BC] shadow-sm'}`}>
                   <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${checkedItems.has(item.name) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#E5D3BC]'}`}>
                     {checkedItems.has(item.name) && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                   </div>
                   <div><h4 className={`text-base font-black ${checkedItems.has(item.name) ? 'line-through text-stone-400' : ''}`}>{item.name}</h4><p className="text-sm font-bold text-[#8B7355]">數量：{item.qty}</p></div>
                </div>
              ))}
           </div>
           <div className="p-6 bg-white border-t border-[#E5D3BC] pb-10">
              <button onClick={() => setSelectedOrder(null)} className="w-full bg-[#8B7355] text-white py-5 rounded-2xl font-black text-lg shadow-xl">完成核對</button>
           </div>
        </div>
      )}

      <Navigation currentView={currentView} onViewChange={setCurrentView} cartCount={cartItemCount} />
    </div>
  );
};

export default App;