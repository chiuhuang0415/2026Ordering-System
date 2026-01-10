
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
    alert('訂單已送出！');
  };

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchCategory = selectedCategory === '全部' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
          </svg>
          Franchise Pro
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">大安旗艦店</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {currentView === 'home' && (
          <div className="space-y-6">
            {/* Simple Welcome Banner */}
            <section className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200/50">
              <h2 className="text-lg font-bold mb-1">早安，加盟主！</h2>
              <p className="text-emerald-100 text-sm mb-4">今天有 2 筆配送預計抵達</p>
              <button 
                onClick={() => setCurrentView('catalog')}
                className="bg-white text-emerald-600 px-6 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform"
              >
                立即補貨
              </button>
            </section>

            <section>
              <h3 className="text-slate-800 font-bold mb-3">快捷功能</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'catalog', icon: '🍵', label: '食材訂購' },
                  { id: 'catalog', icon: '📦', label: '耗材補給' },
                  { id: 'orders', icon: '📋', label: '訂單記錄' },
                ].map(item => (
                  <button 
                    key={item.label}
                    onClick={() => setCurrentView(item.id as View)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-full aspect-square bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-slate-800 font-bold">最新公告</h3>
                <button className="text-xs text-emerald-600">查看更多</button>
              </div>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 shadow-sm">
                  <div className="w-12 h-12 bg-rose-50 rounded-lg flex-shrink-0 flex items-center justify-center text-rose-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">228 連假物流調整通知</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">連假期間訂單截止時間提前至 2/25 18:00...</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {currentView === 'catalog' && (
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="搜尋商品名稱..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex overflow-x-auto gap-2 hide-scrollbar py-2">
              <button 
                onClick={() => setSelectedCategory('全部')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === '全部' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                全部
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4">
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.id === product.id);
                return (
                  <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col">
                    <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
                    <div className="p-3 flex flex-col flex-1">
                      <span className="text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">{product.category}</span>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 h-10">{product.name}</h4>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-emerald-600 font-bold text-lg">${product.price}</p>
                          <p className="text-[10px] text-slate-400">/{product.unit}</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-1 border border-emerald-100">
                            <button onClick={() => updateQuantity(product.id, -1)} className="w-6 h-6 flex items-center justify-center text-emerald-600 text-lg font-bold">-</button>
                            <span className="text-xs font-bold w-4 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateQuantity(product.id, 1)} className="w-6 h-6 flex items-center justify-center text-emerald-600 text-lg font-bold">+</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(product)}
                            className="bg-emerald-600 text-white p-2 rounded-lg shadow-md shadow-emerald-200 active:scale-90 transition-transform"
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
          <div className="space-y-4 pb-24">
            <h2 className="text-lg font-bold text-slate-800 px-1">購物車 ({cart.length})</h2>
            {cart.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center border border-slate-100">
                <div className="text-6xl mb-4 opacity-20">🛒</div>
                <h3 className="text-slate-800 font-bold">購物車是空的</h3>
                <p className="text-slate-400 text-sm mt-2">快去選購需要的食材與包材吧！</p>
                <button 
                  onClick={() => setCurrentView('catalog')}
                  className="mt-6 bg-emerald-600 text-white px-8 py-2.5 rounded-full font-bold shadow-lg"
                >
                  前往選購
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">單價: ${item.price}/{item.unit}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded-md transition-colors">-</button>
                            <span className="text-sm font-bold text-slate-700 w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 font-bold hover:bg-white rounded-md transition-colors">+</button>
                          </div>
                          <span className="text-emerald-600 font-bold">${item.price * item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                    <span>商品小計</span>
                    <span>${cart.reduce((acc, i) => acc + i.price * i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                    <span>預估運費</span>
                    <span className="text-emerald-500">免運</span>
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-lg">總計</span>
                    <span className="font-bold text-emerald-600 text-2xl">${cart.reduce((acc, i) => acc + i.price * i.quantity, 0)}</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-[10px] text-slate-400 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      🚚 預計配送時間：
                      <span className="text-slate-600 font-medium"> 1-2 個工作天內抵達加盟店。</span>
                    </p>
                    <button 
                      onClick={handleCheckout}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 active:scale-95 transition-transform"
                    >
                      確認下單
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentView === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 px-1">我的訂單</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center border border-slate-100 opacity-60">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-slate-800 font-bold">目前沒有訂單紀錄</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">訂單編號</p>
                        <p className="text-sm font-bold text-slate-700">{order.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        order.status === OrderStatus.PENDING ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">訂購日期</span>
                        <span className="text-slate-700 font-medium">{order.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">品項數</span>
                        <span className="text-slate-700 font-medium">{order.items.length} 樣商品</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">預計送達</span>
                        <span className="text-emerald-600 font-bold">{order.deliveryDate}</span>
                      </div>
                      <div className="h-px bg-slate-50 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">總金額</span>
                        <span className="font-bold text-emerald-600 text-lg">${order.total}</span>
                      </div>
                      <button className="w-full mt-2 py-2.5 rounded-xl border border-emerald-600 text-emerald-600 text-sm font-bold active:bg-emerald-50 transition-colors">
                        查看詳情
                      </button>
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
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} 
      />
    </div>
  );
};

export default App;
