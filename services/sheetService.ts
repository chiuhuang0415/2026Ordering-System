
import { Product, Category, User, Order, NewsItem } from "../types";

// 輔助函式：從物件中尋找可能的鍵值 (支援不分大小寫、中文、或是包含空白的情況)
const getValueByKeys = (obj: any, keys: string[]) => {
  if (!obj) return undefined;
  const objKeys = Object.keys(obj);
  for (const targetKey of keys) {
    // 1. 直接匹配
    if (obj[targetKey] !== undefined) return obj[targetKey];
    
    // 2. 模糊匹配 (不分大小寫, 去除前後空白)
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
    console.error("抓取公告失敗:", error);
    return [];
  }
};

export const fetchProductsFromSheet = async (apiUrl: string): Promise<Product[]> => {
  if (!apiUrl || apiUrl.includes("YOUR_DEPLOYMENT_ID")) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getProducts`);
    const text = await response.text();
    
    if (text.trim().startsWith('<')) {
      console.error("後端 API 回傳錯誤網頁，請檢查 GAS 是否正確部署並開啟權限。");
      return [];
    }
    
    const result = JSON.parse(text);
    const data = Array.isArray(result) ? result : (result.data || []);

    return data.map((item: any, index: number) => ({
      id: (getValueByKeys(item, ['id', '商品編號', '編號', 'username']) || `P-${index}`).toString(),
      name: getValueByKeys(item, ['name', '品名', '商品名稱']) || "未命名商品",
      price: Number(getValueByKeys(item, ['price', '單價', '價格'])) || 0,
      minUnit: Number(getValueByKeys(item, ['minUnit', '最小單位', '起訂量'])) || 1,
      unit: getValueByKeys(item, ['unit', '單位']) || "個",
      category: (getValueByKeys(item, ['category', '分類']) as Category) || "食材",
      image: `https://loremflickr.com/400/400/food,food?lock=${index}`
    }));
  } catch (error) {
    console.error("抓取商品失敗:", error);
    return [];
  }
};

export const fetchUsersFromSheet = async (apiUrl: string): Promise<User[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getUsers`);
    const text = await response.text();

    if (text.trim().startsWith('<')) {
      console.error("無法讀取用戶資料庫，請確認 GAS 權限設定為「所有人 (Anyone)」。");
      return [];
    }

    const result = JSON.parse(text);
    const data = Array.isArray(result) ? result : (result.data || []);
    
    console.log("門店資料讀取成功，共", data.length, "家門店");

    return data.map((u: any) => ({
      username: (getValueByKeys(u, ['username', '帳號', '用戶名']) || "").toString().trim(),
      password: (getValueByKeys(u, ['password', '密碼']) || "").toString().trim(),
      franchiseName: (getValueByKeys(u, ['franchiseName', '店家名稱', '店名']) || "未知加盟商").toString().trim()
    }));
  } catch (error) {
    console.error("門店系統連線失敗:", error);
    return [];
  }
};

export const submitOrderToSheet = async (apiUrl: string, order: Order, franchiseName: string): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    // 根據用戶要求：僅輸出 ID 與數量，不含品名與單位
    const itemsSummary = order.items.map(i => `${i.id}*${i.quantity}`).join(', ');
    
    const payload = {
      action: 'submitOrder',
      order: order.id, // 關鍵修正：將 orderId 改為 order 以對應試算表表頭
      date: new Date().toLocaleString('zh-TW'),
      franchiseName: franchiseName,
      items: itemsSummary,
      status: order.status
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
    console.error("下單失敗，請聯絡總部:", error);
    return false;
  }
};
