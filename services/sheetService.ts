import { Product, Category, User, Order, NewsItem, OrderStatus, LedgerEntry } from "../types";

// ----------------------------------------------------
// 高強度工具函式
// ----------------------------------------------------
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
    if (trimmed.startsWith('<')) return null;
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
};

/**
 * 強健日期解析：支援各種格式並回傳 Timestamp
 */
const getTimestamp = (dateStr: any): number => {
  if (!dateStr) return 0;
  const normalized = dateStr.toString().replace(/-/g, '/');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? 0 : date.getTime();
};

const sortByDateDesc = (a: any, b: any) => getTimestamp(b.date) - getTimestamp(a.date);

// ----------------------------------------------------
// 嚴格判定邏輯 (解決資料混雜的核心)
// ----------------------------------------------------

/**
 * 判定是否為「純訂單」資料
 */
const isStrictOrder = (item: any): boolean => {
  const hasOrderIndicator = !!(getValueByKeys(item, ['orderNumber', '訂單編號', 'id', 'order']));
  const hasItems = !!(getValueByKeys(item, ['summary', '品項摘要', 'items', 'content']));
  const hasLedgerType = !!(getValueByKeys(item, ['類型', 'type']));
  // 訂單必須有編號或內容，且絕對不能有「收支類型」標籤
  return (hasOrderIndicator || hasItems) && !hasLedgerType;
};

/**
 * 判定是否為「純收支紀錄」資料
 */
const isStrictLedger = (item: any): boolean => {
  const type = (getValueByKeys(item, ['類型', 'type']) || "").toString().trim();
  const hasItems = !!(getValueByKeys(item, ['summary', '品項摘要', 'items']));
  // 收支必須明確標記為 收入/支出，且不能有訂單的「品項摘要」
  return (type === '收入' || type === '支出') && !hasItems;
};

// ----------------------------------------------------
// API 函式區
// ----------------------------------------------------

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
    })).sort(sortByDateDesc);
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
 * 讀取歷史訂單 (Shipped_History)
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
        return isStrictOrder(item) && name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['orderNumber', '訂單編號', 'id', 'order']) || "").toString(),
        date: (getValueByKeys(item, ['date', '日期']) || "").toString(),
        total: parseRobustNumber(getValueByKeys(item, ['金額', 'amount', 'total'])),
        itemsSummary: getValueByKeys(item, ['summary', '品項摘要', 'items']) || "",
        franchiseName: franchiseName,
        status: (getValueByKeys(item, ['status', '狀態']) as OrderStatus) || OrderStatus.COMPLETED,
        items: [], 
        deliveryDate: ""
      }))
      .sort(sortByDateDesc);
  } catch (error) {
    return [];
  }
};

/**
 * 讀取待處理訂單 (Orders)
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
        return isStrictOrder(item) && name && name.toString().trim() === franchiseName.trim();
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
      .sort(sortByDateDesc);
  } catch (error) {
    return [];
  }
};

/**
 * 讀取收支紀錄 (Ledger)
 */
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
        return isStrictLedger(item) && name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['id', '編號', 'sn']) || `L-${Math.random().toString(36).substr(2, 9)}`).toString(),
        date: (getValueByKeys(item, ['日期', 'date']) || "").toString(),
        franchiseName: franchiseName,
        type: getValueByKeys(item, ['類型', 'type']).toString().trim() as '收入' | '支出',
        category: getValueByKeys(item, ['項目', 'category']) || "其他",
        amount: parseRobustNumber(getValueByKeys(item, ['金額', 'amount'])),
        note: getValueByKeys(item, ['備註', 'note']) || ""
      }))
      .filter(entry => entry.amount > 0)
      .sort(sortByDateDesc);
  } catch (error) {
    return [];
  }
};

export const submitOrderToSheet = async (apiUrl: string, order: Order, franchiseName: string): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    const payload: any = {
      action: 'submitOrder',
      id: order.id,
      date: new Date().toLocaleString('zh-TW', { hour12: true }),
      franchiseName: franchiseName,
      items: order.items.map(i => `${i.id}*${i.quantity}`).join(', '),
      status: order.status,
      total: order.total || ""
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