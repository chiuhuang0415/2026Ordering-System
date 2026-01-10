
import React from 'react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
  cartCount: number;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange, cartCount }) => {
  const navItems = [
    { id: 'home', label: '首頁', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'catalog', label: '訂貨', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { id: 'cart', label: '購物車', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'orders', label: '記錄', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5D3BC] px-6 pb-safe z-50 shadow-[0_-4px_20px_rgba(139,115,85,0.05)]">
      <div className="flex justify-between items-center h-20">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className="flex flex-col items-center justify-center relative group"
          >
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 mb-1
              ${currentView === item.id 
                ? 'bg-[#8B7355] text-white shadow-lg shadow-[#8B7355]/20 scale-110' 
                : 'text-[#D2B48C] group-active:scale-90'}
            `}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentView === item.id ? 2.5 : 2} d={item.icon} />
              </svg>
              
              {item.id === 'cart' && cartCount > 0 && (
                <span className={`
                  absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white
                  ${currentView === 'cart' ? 'bg-[#F5E6D3] text-[#8B7355]' : 'bg-[#8B7355] text-white'}
                `}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className={`
              text-[10px] font-black tracking-tight transition-colors duration-300
              ${currentView === item.id ? 'text-[#8B7355]' : 'text-[#D2B48C]'}
            `}>
              {item.label}
            </span>
            
            {currentView === item.id && (
              <span className="absolute -bottom-2 w-1 h-1 bg-[#8B7355] rounded-full"></span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
