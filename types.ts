
export type Category = '蔬菜' | '肉品、內臟' | '食材' | '包材' | '飲品' | '調味料' | '清潔用品';

export interface User {
  username: string;
  password: string;
  franchiseName: string;
}

export interface NewsItem {
  title: string;
  content: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  minUnit: number;
  category: Category;
  image: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export enum OrderStatus {
  PENDING = '待處理',
  PREPARING = '準備中',
  SHIPPING = '配送中',
  COMPLETED = '已完成',
  CANCELLED = '已取消'
}

export interface Order {
  id: string;
  date: string;
  total: number;
  items: CartItem[];
  itemsSummary?: string; // 新增：用於顯示歷史記錄的摘要
  status: OrderStatus;
  deliveryDate: string;
  franchiseName?: string; // 新增：顯示分店名稱
}

export type View = 'home' | 'catalog' | 'cart' | 'orders';
