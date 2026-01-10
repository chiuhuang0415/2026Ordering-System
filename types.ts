
export type Category = '食材' | '包材' | '飲品' | '調味料' | '清潔用品';

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: Category;
  image: string;
  stock: number;
  minOrder: number;
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
  status: OrderStatus;
  deliveryDate: string;
}

export type View = 'home' | 'catalog' | 'cart' | 'orders';
