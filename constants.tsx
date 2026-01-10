
import React from 'react';
import { Product, Category } from './types';

export const CATEGORIES: Category[] = ['食材', '包材', '飲品', '調味料', '清潔用品'];

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: '特級茉莉綠茶葉', price: 450, unit: 'kg', category: '食材', image: 'https://picsum.photos/seed/tea/400/400', stock: 100, minOrder: 5 },
  { id: '2', name: '紐西蘭全脂鮮乳', price: 85, unit: '瓶', category: '食材', image: 'https://picsum.photos/seed/milk/400/400', stock: 500, minOrder: 12 },
  { id: '3', name: '環保紙杯 (500ml)', price: 2.5, unit: '個', category: '包材', image: 'https://picsum.photos/seed/cup/400/400', stock: 10000, minOrder: 100 },
  { id: '4', name: '蔗糖液 (25kg)', price: 1200, unit: '桶', category: '調味料', image: 'https://picsum.photos/seed/sugar/400/400', stock: 50, minOrder: 1 },
  { id: '5', name: '密封吸管', price: 0.8, unit: '支', category: '包材', image: 'https://picsum.photos/seed/straw/400/400', stock: 5000, minOrder: 200 },
  { id: '6', name: '專用清潔劑', price: 350, unit: '公升', category: '清潔用品', image: 'https://picsum.photos/seed/clean/400/400', stock: 80, minOrder: 2 },
  { id: '7', name: '鮮萃百香果原汁', price: 680, unit: 'kg', category: '食材', image: 'https://picsum.photos/seed/fruit/400/400', stock: 120, minOrder: 2 },
  { id: '8', name: '焦糖風味糖漿', price: 220, unit: '瓶', category: '飲品', image: 'https://picsum.photos/seed/syrup/400/400', stock: 200, minOrder: 6 },
];
