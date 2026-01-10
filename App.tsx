
import React, { useState, useEffect } from 'react';
import { View, Product, CartItem, Order, OrderStatus, Category, User, NewsItem } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { fetchProductsFromSheet, fetchUsersFromSheet, submitOrderToSheet, fetchNewsFromSheet } from './services/sheetService';
import Navigation from './components/Navigation';

// 安全地獲取 API URL
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
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!isAuthenticated) return;
    const loadData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingNews(true);
        const [productData, newsData] = await Promise.all([
          fetchProductsFromSheet(GOOGLE_SHEET_API_URL),
          fetchNewsFromSheet(GOOGLE_SHEET_API_URL)
        ]);

        if (productData && productData.length > 0) {
          setProducts(productData);
          const cats = Array.from(new Set(productData.map(p => p.category))) as Category[];
          setDynamicCategories(cats);
        }

        if (newsData) setNews(newsData);
      } catch (err) {
        console.error("資料載入失敗");
      } finally {
        setIsLoading(false);
        setIsLoadingNews(false);
      }
    };
    loadData();
  }, [isAuthenticated]);

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
        setOrders([newOrder, ...orders]);
        setCart([]);
        setCurrentView('orders');
        alert('訂單已成功送出！');
      } else {
        alert('訂單同步失敗');
      }
    } catch (err) {
      alert('發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepeatLastOrder = () => {
    if (orders.length === 0) {
      alert('目前尚無歷史訂單記錄。');
      return;
    }
    const lastOrder = orders[0];
    const newItems: CartItem[] = [];
    lastOrder.items.forEach(oldItem => {
      const currentProduct = products.find(p => p.id === oldItem.id);
      if (currentProduct) {
        newItems.push({ ...currentProduct, quantity: oldItem.quantity });
      }
    });

    if (newItems.length > 0) {
      setCart(newItems);
      alert('已自動填入上一筆訂單品項！');
      setCurrentView('cart');
    } else {
      alert('上一筆訂單的商品已下架。');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === '全部' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  // 輔助函式：僅保留年月日
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    // 處理 GAS 傳回的日期字串，分割掉時間部分
    return dateStr.split('T')[0].split(' ')[0];
  };

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
            <div className="w-24 h-24 bg-[#8B7355] rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-[#8B7355]/20 mx-auto mb-6">
              <span className="text-4xl font-black">🐔</span>
            </div>
            <h1 className="text-3xl font-black text-[#4A3728] tracking-tight">大葛格鹹水雞</h1>
            <p className="text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">Franchise Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#8B7355] ml-2 uppercase">Store Account</label>
              <input required type="text" className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl focus:ring-4 focus:ring-[#8B7355]/5 text-[#4A3728] font-bold outline-none transition-all" placeholder="門店帳號" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#8B7355] ml-2 uppercase">Password</label>
              <input required type="password" className="w-full px-5 py-4 bg-white border border-[#E5D3BC] rounded-2xl focus:ring-4 focus:ring-[#8B7355]/5 text-[#4A3728] font-bold outline-none transition-all" placeholder="密碼" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            {loginError && <p className="text-rose-500 text-[11px] font-bold text-center bg-rose-50 py-2 rounded-lg border border-rose-100">{loginError}</p>}
            <button disabled={isLoggingIn} type="submit" className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 ${isLoggingIn ? 'bg-stone-200 text-stone-400' : 'bg-[#8B7355] text-white shadow-xl shadow-[#8B7355]/10'}`}>{isLoggingIn ? '驗證中...' : '進入系統'}</button>
          </form>
          <p className="mt-12 text-center text-stone-300 text-[10px] font-bold uppercase tracking-widest">© 2024 Big Brother Salty Chicken</p>
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
        <div className="flex items-center gap-2 bg-[#F5E6D3] p-1 pr-3 rounded-full border border-[#E5D3BC]">
          <div className="w-7 h-7 bg-[#8B7355] text-white rounded-full flex items-center justify-center text-[10px] font-black">{currentUser?.franchiseName.slice(0, 1)}</div>
          <span className="text-[11px] text-[#4A3728] font-black">{currentUser?.franchiseName}</span>
          <button onClick={handleLogout} className="ml-1 text-[#D2B48C] hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {currentView === 'home' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-[#A68966] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span>
                  最新公告 Announcements
                </h3>
              </div>
              <div className="space-y-3">
                {isLoadingNews ? (
                  <div className="bg-white p-6 rounded-3xl border border-[#E5D3BC] flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-[#8B7355] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : news.length === 0 ? (
                  <div className="bg-white p-6 rounded-3xl border border-[#E5D3BC] text-center">
                    <p className="text-[11px] text-[#D2B48C] font-bold uppercase tracking-widest">目前暫無重要公告</p>
                  </div>
                ) : (
                  news.map((item, idx) => (
                    <div key={idx} className="bg-[#8B7355] rounded-[2rem] p-5 shadow-lg shadow-[#8B7355]/10 relative overflow-hidden text-white">
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-black leading-tight pr-4">{item.title}</h4>
                          <span className="text-[9px] font-black bg-[#A68966] px-2 py-1 rounded-full uppercase tracking-tighter shrink-0">{formatDate(item.date)}</span>
                        </div>
                        <p className="text-[13px] font-medium text-stone-100/90 leading-relaxed">{item.content}</p>
                      </div>
                      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none text-4xl">🐔</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="px-1">
               <h2 className="text-2xl font-black text-[#4A3728] tracking-tight">你好，{currentUser?.franchiseName} 👋</h2>
               <p className="text-[11px] text-[#A68966] font-bold mt-1 uppercase tracking-widest">Dashboard Overview</p>
            </div>

            <section className="bg-[#F5E6D3]/40 rounded-[2.5rem] shadow-sm overflow-hidden border border-[#E5D3BC]/60 backdrop-blur-sm">
              <div className="flex items-center justify-between p-4 px-6 border-b border-[#E5D3BC]/40">
                <h2 className="text-[10px] font-black text-[#8B7355] flex items-center gap-2 uppercase tracking-[0.2em]">🌤️ 當地氣候概況</h2>
              </div>
              <div className="relative h-[250px] w-full bg-white/30">
                <iframe src="https://indify.co/widgets/live/weather/znO94wvhhwqSGXWUXkE8" frameBorder="0" scrolling="no" className="w-full h-full mix-blend-multiply" title="Weather" />
              </div>
            </section>

            <section className="grid grid-cols-3 gap-4">
              {[
                { id: 'catalog', icon: '🍲', label: '食材訂購' },
                { id: 'catalog', icon: '🥡', label: '耗材補給' },
                { id: 'orders', icon: '📜', label: '歷史記錄' },
              ].map(item => (
                <button key={item.label} onClick={() => setCurrentView(item.id as View)} className="flex flex-col items-center gap-3 transition-transform active:scale-90">
                  <div className="w-full aspect-square bg-white rounded-[2.5rem] flex items-center justify-center text-4xl shadow-sm border border-[#E5D3BC]">{item.icon}</div>
                  <span className="text-[11px] font-black text-[#4A3728] tracking-tight">{item.label}</span>
                </button>
              ))}
            </section>
          </div>
        )}

        {currentView === 'catalog' && (
          <div className="space-y-4">
            {orders.length > 0 && (
              <button onClick={handleRepeatLastOrder} className="w-full bg-[#F5E6D3] border border-[#E5D3BC] py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all group">
                <div className="w-8 h-8 bg-[#8B7355] rounded-lg flex items-center justify-center text-white shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-black text-[#8B7355] leading-none">一鍵帶入上次叫貨</p>
                  <p className="text-[10px] text-[#A68966] font-bold mt-1 uppercase tracking-tighter">Repeat your previous order</p>
                </div>
              </button>
            )}

            <div className="relative sticky top-0 z-30 pt-1 bg-[#FDFBF7]/90 backdrop-blur-sm">
              <input type="text" placeholder="搜尋食材..." className="w-full pl-11 pr-4 py-4 bg-white border border-[#E5D3BC] rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-[#8B7355]/10 focus:border-[#8B7355] transition-all outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <svg className="absolute left-4 top-[1.3rem] w-5 h-5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            
            <div className="flex overflow-x-auto gap-2 hide-scrollbar py-2">
              <button onClick={() => setSelectedCategory('全部')} className={`px-6 py-2.5 rounded-full text-xs font-black whitespace-nowrap ${selectedCategory === '全部' ? 'bg-[#8B7355] text-white shadow-lg shadow-[#8B7355]/20' : 'bg-white border border-[#E5D3BC] text-stone-500'}`}>全部</button>
              {dynamicCategories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-full text-xs font-black whitespace-nowrap ${selectedCategory === cat ? 'bg-[#8B7355] text-white shadow-lg shadow-[#8B7355]/20' : 'bg-white border border-[#E5D3BC] text-stone-500'}`}>{cat}</button>
              ))}
            </div>

            {isLoading ? (
               <div className="py-24 text-center">
                  <div className="inline-block w-10 h-10 border-[4px] border-[#8B7355] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-stone-400 text-xs font-black uppercase tracking-widest">同步資料庫中...</p>
               </div>
            ) : (
              <div className="flex flex-col gap-3 pb-8">
                {filteredProducts.map(product => {
                  const inCart = cart.find(item => item.id === product.id);
                  return (
                    <div key={product.id} className="bg-white rounded-2xl border border-[#E5D3BC] shadow-sm flex items-center p-4 gap-4 active:bg-stone-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-[#8B7355] bg-[#F5E6D3] px-1.5 py-0.5 rounded leading-none shrink-0 uppercase tracking-tighter">
                            {product.category}
                          </span>
                          <h4 className="text-[15px] font-black text-[#4A3728] truncate leading-tight">
                            {product.name}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right whitespace-nowrap flex items-baseline gap-1">
                          <span className="text-[#8B7355] font-black text-lg">${product.price}</span>
                          <span className="text-[11px] text-stone-400 font-bold uppercase">{product.unit}</span>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-[#F5E6D3] rounded-xl p-1 border border-[#E5D3BC]">
                            <button onClick={() => updateQuantity(product.id, -product.minUnit)} className="w-8 h-8 flex items-center justify-center text-[#8B7355] text-lg font-black">-</button>
                            <span className="text-[13px] font-black min-w-[24px] text-center text-[#4A3728]">{inCart.quantity}</span>
                            <button onClick={() => updateQuantity(product.id, product.minUnit)} className="w-8 h-8 flex items-center justify-center text-[#8B7355] text-lg font-black">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)} className="bg-[#8B7355] text-white w-14 h-10 rounded-xl text-xs font-black shadow-lg shadow-[#8B7355]/10 active:bg-[#6D5A42] active:scale-95 transition-all">選購</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentView === 'cart' && (
          <div className="space-y-6">
             <h2 className="text-2xl font-black text-[#4A3728] tracking-tight px-1">購物清單</h2>
             {cart.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-[#E5D3BC] mt-4">
                   <p className="text-5xl mb-6">🛒</p>
                   <p className="text-sm font-black text-stone-400 uppercase tracking-widest">購物車還是空的</p>
                   <button onClick={() => setCurrentView('catalog')} className="mt-6 text-[#8B7355] font-black text-xs underline underline-offset-4 decoration-2">立即選購食材</button>
                </div>
             ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-3xl border border-[#E5D3BC] flex items-center gap-4 shadow-sm">
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-[#4A3728]">{item.name}</h4>
                          <p className="text-[10px] font-bold text-[#A68966] uppercase tracking-tighter">${item.price} / {item.unit}</p>
                          <div className="flex items-center justify-between mt-3">
                             <div className="flex items-center gap-3 bg-[#F5E6D3] rounded-xl p-1 border border-[#E5D3BC]">
                                <button onClick={() => updateQuantity(item.id, -item.minUnit)} className="w-7 h-7 flex items-center justify-center text-[#8B7355] transition-opacity active:opacity-50">-</button>
                                <span className="text-xs font-black w-8 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.minUnit)} className="w-7 h-7 flex items-center justify-center text-[#8B7355] transition-opacity active:opacity-50">+</button>
                             </div>
                             <span className="text-[#8B7355] font-black text-base">${Math.round(item.price * item.quantity * 100) / 100}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-[#E5D3BC] space-y-4">
                    <div className="flex justify-between items-center px-2">
                       <span className="text-[11px] font-black text-stone-400 uppercase tracking-widest">預估總金額</span>
                       <span className="text-2xl font-black text-[#8B7355]">${Math.round(cartTotal * 100) / 100}</span>
                    </div>
                    <button onClick={handleCheckout} disabled={isSubmitting} className={`w-full text-white py-5 rounded-2xl font-black text-lg shadow-2xl transition-all active:scale-95 ${isSubmitting ? 'bg-stone-300' : 'bg-[#8B7355] shadow-[#8B7355]/20'}`}>{isSubmitting ? '傳送中...' : '確認並下單'}</button>
                  </div>
                </div>
             )}
          </div>
        )}

        {currentView === 'orders' && (
           <div className="space-y-6">
              <div className="px-1 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-[#4A3728] tracking-tight">訂單記錄</h2>
                  <p className="text-[10px] text-[#A68966] font-bold uppercase tracking-widest mt-1">Transaction History</p>
                </div>
                <button onClick={() => window.location.reload()} className="text-[#8B7355] font-black text-[10px] flex items-center gap-1 transition-transform active:scale-95">🔄 刷新</button>
              </div>
              {orders.length === 0 ? (
                <div className="py-32 text-center">
                  <p className="text-6xl mb-6">📜</p>
                  <p className="text-stone-300 text-sm font-black uppercase tracking-[0.2em]">目前沒有記錄</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-[2rem] border border-[#E5D3BC] shadow-sm space-y-4 relative overflow-hidden active:bg-stone-50 transition-colors">
                       <div className="flex justify-between items-center relative z-10">
                          <span className="text-[10px] font-black text-stone-300 tracking-wider">#{order.id.split('-')[1]}</span>
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${order.status === OrderStatus.PENDING ? 'bg-[#F5E6D3] text-[#8B7355]' : 'bg-[#E5D3BC] text-[#6D5A42]'}`}>{order.status}</span>
                       </div>
                       <div className="flex justify-between items-end relative z-10">
                          <div>
                             <p className="text-[13px] font-black text-[#4A3728]">{order.date}</p>
                             <p className="text-[10px] text-stone-400 font-bold mt-1">預計配送: {order.deliveryDate}</p>
                          </div>
                          <p className="text-xl font-black text-[#8B7355] tracking-tight">${Math.round(order.total * 100) / 100}</p>
                       </div>
                    </div>
                  ))}
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
