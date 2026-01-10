
import { Product, Category, User, Order, NewsItem, OrderStatus } from "../types";

const getValueByKeys = (obj: any, keys: string[]) => {
  if (!obj) return undefined;
  const objKeys = Object.keys(obj);
  for (const targetKey of keys) {
    if (obj[targetKey] !== undefined) return obj[targetKey];
    const normalizedTarget = targetKey.toLowerCase().trim();
    const foundKey = objKeys.find(k => k.toLowerCase().trim() === normalizedTarget);
    if (foundKey) return obj[foundKey];
  }
  return undefined;
};

export const fetchNewsFromSheet = async (apiUrl: string): Promise<NewsItem[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getNews`);
    const text = await response.text();
    if (text.trim().startsWith('<')) return [];
    const result = JSON.parse(text);
    const data = Array.isArray(result) ? result : (result.data || []);
    return data.map((item: any) => ({
      title: getValueByKeys(item, ['title', '標題']) || "無標題公告",
      content: getValueByKeys(item, ['content', '內容']) || "",
      date: getValueByKeys(item, ['date', '日期']) || ""
    }));
  } catch (error) {
    return [];
  }
};

export const fetchProductsFromSheet = async (apiUrl: string): Promise<Product[]> => {
  if (!apiUrl || apiUrl.includes("YOUR_DEPLOYMENT_ID")) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getProducts`);
    const text = await response.text();
    if (text.trim().startsWith('<')) return [];
    const result = JSON.parse(text);
    const data = Array.isArray(result) ? result : (result.data || []);
    return data.map((item: any, index: number) => ({
      id: (getValueByKeys(item, ['id', '商品編號', '編號']) || `P-${index}`).toString(),
      name: getValueByKeys(item, ['name', '品名', '商品名稱']) || "未命名商品",
      price: Number(getValueByKeys(item, ['price', '單價', '價格'])) || 0,
      minUnit: Number(getValueByKeys(item, ['minUnit', '最小單位', '起訂量'])) || 1,
      unit: getValueByKeys(item, ['unit', '單位']) || "個",
      category: (getValueByKeys(item, ['category', '分類']) as Category) || "食材",
      image: `https://loremflickr.com/400/400/food?lock=${index}`
    }));
  } catch (error) {
    return [];
  }
};

export const fetchUsersFromSheet = async (apiUrl: string): Promise<User[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getUsers`);
    const text = await response.text();
    if (text.trim().startsWith('<')) return [];
    const result = JSON.parse(text);
    const data = Array.isArray(result) ? result : (result.data || []);
    return data.map((u: any) => ({
      username: (getValueByKeys(u, ['username', '帳號', '用戶名']) || "").toString().trim(),
      password: (getValueByKeys(u, ['password', '密碼']) || "").toString().trim(),
      franchiseName: (getValueByKeys(u, ['franchiseName', '店家名稱', '店名']) || "未知加盟商").toString().trim()
    }));
  } catch (error) {
    return [];
  }
};

// 新增：抓取 Shipped_History
export const fetchOrderHistoryFromSheet = async (apiUrl: string, franchiseName: string): Promise<Order[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getHistory`);
    const text = await response.text();
    if (text.trim().startsWith('<')) return [];
    const result = JSON.parse(text);
    const data = Array.isArray(result) ? result : (result.data || []);
    
    // 過濾出屬於該門店的歷史訂單
    return data
      .filter((item: any) => {
        const name = getValueByKeys(item, ['franchiseName', '分店名稱', '店名', '店家名稱']);
        return name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['order', '訂單編號', '編號']) || "").toString(),
        date: getValueByKeys(item, ['date', '日期']) || "",
        total: Number(getValueByKeys(item, ['total', '金額', '總金額'])) || 0,
        itemsSummary: getValueByKeys(item, ['items', '品項摘要', '內容']) || "",
        franchiseName: getValueByKeys(item, ['franchiseName', '分店名稱']) || franchiseName,
        status: (getValueByKeys(item, ['status', '狀態']) as OrderStatus) || OrderStatus.COMPLETED,
        items: [], // 歷史記錄通常只拿摘要，不需完整物件
        deliveryDate: ""
      }));
  } catch (error) {
    console.error("抓取歷史紀錄失敗:", error);
    return [];
  }
};

export const submitOrderToSheet = async (apiUrl: string, order: Order, franchiseName: string): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    const itemsSummary = order.items.map(i => `${i.id}*${i.quantity}`).join(', ');
    const payload = {
      action: 'submitOrder',
      order: order.id,
      date: new Date().toLocaleString('zh-TW'),
      franchiseName: franchiseName,
      items: itemsSummary,
      status: order.status,
      total: order.total // 確保總金額也傳過去
    };
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    return false;
  }
};
