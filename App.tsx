import React, { useState } from 'react';
import { View, Product, CartItem, Order, OrderStatus, Category } from './types';
import { MOCK_PRODUCTS, CATEGORIES } from './constants';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | '全部'>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart Functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: product.minOrder }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      total: cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
      items: [...cart],
      status: OrderStatus.PENDING,
      deliveryDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString(),
    };
    setOrders([newOrder, ...orders]);
    setCart([]);
    setCurrentView('orders');
    alert('訂單已成功送出！');
  };

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchCategory = selectedCategory === '全部' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
          </svg>
          Franchise Pro
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold uppercase tracking-tight">大安旗艦店</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        {currentView === 'home' && (
          <div className="space-y-6">
            {/* Welcome Dashboard */}
            <section className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200/50 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-1">您好，加盟夥伴！</h2>
                <p className="text-emerald-100 text-sm mb-6">歡迎回到管理後台，今日運作正常。</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <p className="text-[10px] text-emerald-200 font-bold mb-1 uppercase">待出貨訂單</p>
                    <p className="text-2xl font-bold">2 筆</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <p className="text-[10px] text-emerald-200 font-bold mb-1 uppercase">配送中商品</p>
                    <p className="text-2xl font-bold">1 筆</p>
                  </div>
                </div>
              </div>
              {/* Decorative graphic */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </section>

            <section>
              <h3 className="text-slate-800 font-bold mb-3 flex items-center justify-between">
                快捷功能
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'catalog', icon: '🍵', label: '食材訂購' },
                  { id: 'catalog', icon: '📦', label: '耗材補給' },
                  { id: 'orders', icon: '📋', label: '訂單記錄' },
                ].map(item => (
                  <button 
                    key={item.label}
                    onClick={() => setCurrentView(item.id as View)}
                    className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                  >
                    <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-slate-800 font-bold">最新公告</h3>
                <button className="text-xs text-emerald-600 font-bold">查看更多</button>
              </div>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 shadow-sm items-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex-shrink-0 flex items-center justify-center text-emerald-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800">228 連假物流調整通知</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">連假期間訂單截止時間提前至 2/25 18:00...</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </section>
          </div>
        )}

        {currentView === 'catalog' && (
          <div className="space-y-4">
            <div className="relative sticky top-0 z-30 pt-1 bg-slate-50">
              <input 
                type="text" 
                placeholder="搜尋商品名稱..." 
                className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="absolute left-3.5 top-5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex overflow-x-auto gap-2 hide-scrollbar py-1">
              <button 
                onClick={() => setSelectedCategory('全部')}
                className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === '全部' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                全部
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4">
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.id === product.id);
                return (
                  <div key={product.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm flex flex-col group active:scale-[0.98] transition-transform">
                    <div className="relative">
                      <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/80 backdrop-blur rounded-lg text-[8px] font-bold text-slate-600 uppercase tracking-wider border border-white/20">
                        {product.category}
                      </div>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 h-10 mb-1 leading-tight">{product.name}</h4>
                      <div className="mt-auto flex items-end justify-between">
                        <div>
                          <p className="text-emerald-600 font-bold text-lg leading-none">${product.price}</p>
                          <p className="text-[10px] text-slate-400 font-medium">/{product.unit}</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-1 border border-emerald-100">
                            <button onClick={() => updateQuantity(product.id, -1)} className="w-7 h-7 flex items-center justify-center text-emerald-600 text-lg font-bold">-</button>
                            <span className="text-xs font-bold w-4 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateQuantity(product.id, 1)} className="w-7 h-7 flex items-center justify-center text-emerald-600 text-lg font-bold">+</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(product)}
                            className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-100 active:bg-emerald-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentView === 'cart' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 px-1">您的購物車 ({cart.length})</h2>
            {cart.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm mt-4">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-50">🛒</div>
                <h3 className="text-slate-800 font-bold text-lg">購物車目前是空的</h3>
                <p className="text-slate-400 text-sm mt-2 px-6">快去選購門市所需的食材與包材吧！</p>
                <button 
                  onClick={() => setCurrentView('catalog')}
                  className="mt-8 bg-emerald-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-transform"
                >
                  立即選購商品
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{item.category} | ${item.price}/{item.unit}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-200">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded-lg transition-colors">-</button>
                            <span className="text-sm font-bold text-slate-700 w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded-lg transition-colors">+</button>
                          </div>
                          <span className="text-emerald-600 font-bold">${item.price * item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4 shadow-sm sticky bottom-2">
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                    <span className="font-medium">小計 (共 {cartItemCount} 件)</span>
                    <span className="font-bold text-slate-700">${cartTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                    <span className="font-medium">總店配送費</span>
                    <span className="text-emerald-500 font-bold">免運</span>
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xl tracking-tight">應付金額</span>
                    <span className="font-bold text-emerald-600 text-3xl tracking-tighter">${cartTotal}</span>
                  </div>
                  <div className="pt-2">
                    <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        <span className="font-bold text-slate-600">配送須知：</span>
                        本筆訂單預計將於 <span className="text-emerald-600 font-bold">1-2 個工作天內</span> 配送至指定門市，請確保收貨人員在場。
                      </p>
                    </div>
                    <button 
                      onClick={handleCheckout}
                      className="w-full bg-emerald-600 text-white py-4.5 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 active:scale-95 active:bg-emerald-700 transition-all"
                    >
                      送出訂單
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentView === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 px-1">訂單歷史紀錄</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center border border-slate-100 opacity-60 shadow-sm">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-slate-800 font-bold">目前暫無任何訂單紀錄</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">訂單號碼</p>
                        <p className="text-sm font-bold text-slate-700">{order.id}</p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm ${
                        order.status === OrderStatus.PENDING ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">訂購日期</span>
                        <span className="text-slate-700 font-bold">{order.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">商品品項</span>
                        <span className="text-slate-700 font-bold">{order.items.length} 樣商品</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">預計送達日期</span>
                        <span className="text-emerald-600 font-extrabold">{order.deliveryDate}</span>
                      </div>
                      <div className="h-px bg-slate-50 my-3" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">付款總金額</span>
                        <span className="font-bold text-emerald-600 text-xl tracking-tight">${order.total}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <button className="py-3 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold active:bg-slate-50 transition-colors">
                          下載發票
                        </button>
                        <button className="py-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold active:bg-emerald-100 transition-colors">
                          查看詳情
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        cartCount={cartItemCount} 
      />
    </div>
  );
};

export default App;