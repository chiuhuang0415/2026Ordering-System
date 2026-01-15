import { Product, Category, User, Order, NewsItem, OrderStatus, LedgerEntry } from "../types";

/**
 * 欄位值抓取工具：不論大小寫、前後空白或中英標題都能抓到
 */
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

/**
 * 強健的數字轉換：移除 $、, 等非數字符號
 */
const parseRobustNumber = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

const safeJsonParse = (text: string) => {
  try {
    if (!text || text.trim() === "") return null;
    const trimmed = text.trim();
    if (trimmed.startsWith('<')) return null; // 避免抓到 HTML 錯誤頁面
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
};

/**
 * 登入驗證：對應 GAS 的 action: login
 */
export const loginToSheet = async (apiUrl: string, id: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', id, password }),
      redirect: 'follow'
    });
    const text = await response.text();
    const result = safeJsonParse(text);
    if (result && result.status === "Success" && result.user) {
      return {
        success: true,
        user: {
          username: (result.user.username || "").toString(),
          franchiseName: result.user.franchiseName || "加盟商"
        }
      };
    }
    return { success: false, message: result?.message || "登入失敗" };
  } catch (error) {
    return { success: false, message: "連線異常" };
  }
};

export const fetchNewsFromSheet = async (apiUrl: string): Promise<NewsItem[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getNews`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result || !Array.isArray(result)) return [];
    return result.map((item: any) => ({
      title: getValueByKeys(item, ['title', '標題']) || "公告",
      content: getValueByKeys(item, ['content', '內容']) || "",
      date: getValueByKeys(item, ['date', '日期']) || ""
    }));
  } catch (error) {
    return [];
  }
};

export const fetchProductsFromSheet = async (apiUrl: string): Promise<Product[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getProducts`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result || !Array.isArray(result)) return [];
    return result.map((item: any, index: number) => ({
      id: (getValueByKeys(item, ['id', '商品編號', '編號']) || `P-${index}`).toString(),
      name: getValueByKeys(item, ['name', '品名', '商品名稱']) || "未命名商品",
      price: parseRobustNumber(getValueByKeys(item, ['price', '單價', '價格'])),
      minUnit: parseRobustNumber(getValueByKeys(item, ['minUnit', '最小單位', '起訂量'])) || 1,
      unit: getValueByKeys(item, ['unit', '單位']) || "個",
      category: (getValueByKeys(item, ['category', '分類']) as Category) || "食材",
      image: `https://loremflickr.com/400/400/food?lock=${index}`
    }));
  } catch (error) {
    return [];
  }
};

/**
 * 讀取歷史：呼叫 action=getHistory (Shipped_History 表)
 */
export const fetchOrderHistoryFromSheet = async (apiUrl: string, franchiseName: string): Promise<Order[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getHistory`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result || !Array.isArray(result)) return [];
    
    return result
      .filter((item: any) => {
        const name = getValueByKeys(item, ['franchiseName', '分店名稱', '店名']);
        return name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['order', '訂單編號', 'id']) || "").toString(),
        date: (getValueByKeys(item, ['date', '日期']) || "").toString(),
        total: parseRobustNumber(getValueByKeys(item, ['金額', 'amount', 'total'])),
        itemsSummary: getValueByKeys(item, ['items', '品項摘要', 'summary']) || "",
        franchiseName: franchiseName,
        status: (getValueByKeys(item, ['status', '狀態']) as OrderStatus) || OrderStatus.COMPLETED,
        items: [], 
        deliveryDate: ""
      })).reverse();
  } catch (error) {
    return [];
  }
};

/**
 * 讀取待處理訂單：呼叫 action=getOrders (Orders 表)
 */
export const fetchActiveOrdersFromSheet = async (apiUrl: string, franchiseName: string): Promise<Order[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getOrders`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result || !Array.isArray(result)) return [];
    
    return result
      .filter((item: any) => {
        const name = getValueByKeys(item, ['franchiseName', '分店名稱', '店名']);
        return name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['order', '訂單編號', 'id']) || "").toString(),
        date: (getValueByKeys(item, ['date', '日期']) || "").toString(),
        total: parseRobustNumber(getValueByKeys(item, ['金額', 'amount', 'total'])),
        itemsSummary: getValueByKeys(item, ['items', '品項摘要', 'summary']) || "",
        franchiseName: franchiseName,
        status: (getValueByKeys(item, ['status', '狀態']) as OrderStatus) || OrderStatus.PENDING,
        items: [], 
        deliveryDate: ""
      }))
      .filter((order: Order) => order.status === OrderStatus.PENDING)
      .reverse();
  } catch (error) {
    return [];
  }
};

export const fetchLedgerFromSheet = async (apiUrl: string, franchiseName: string): Promise<LedgerEntry[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getLedger`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result || !Array.isArray(result)) return [];
    return result
      .filter((item: any) => {
        const name = getValueByKeys(item, ['分店名稱', '店名', 'franchiseName']);
        return name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['id', '編號']) || "").toString(),
        date: (getValueByKeys(item, ['日期', 'date']) || "").toString(),
        franchiseName: franchiseName,
        type: getValueByKeys(item, ['類型', 'type']) || '支出',
        category: getValueByKeys(item, ['項目', 'category']) || "",
        amount: parseRobustNumber(getValueByKeys(item, ['金額', 'amount'])),
        note: getValueByKeys(item, ['備註', 'note']) || ""
      }));
  } catch (error) {
    return [];
  }
};

/**
 * 提交叫貨單
 */
export const submitOrderToSheet = async (apiUrl: string, order: Order, franchiseName: string): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    const payload = {
      action: 'submitOrder',
      id: order.id,
      date: new Date().toLocaleString('zh-TW', { hour12: true }),
      franchiseName: franchiseName,
      items: order.items.map(i => `${i.id}*${i.quantity}`).join(', '),
      status: order.status
    };
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    
    const text = await res.text();
    const result = safeJsonParse(text);
    return result?.status === "Success";
  } catch (error) {
    return false;
  }
};

export const submitLedgerToSheet = async (apiUrl: string, entry: LedgerEntry): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    const payload = {
      action: 'submitLedger',
      ...entry
    };
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const text = await res.text();
    const result = safeJsonParse(text);
    return result?.status === "Success";
  } catch (error) {
    return false;
  }
};