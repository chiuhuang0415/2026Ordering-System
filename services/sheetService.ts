
import { Product, Category, User, Order, NewsItem, OrderStatus, LedgerEntry } from "../types";

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

const safeJsonParse = (text: string) => {
  try {
    if (!text || text.trim() === "") return null;
    const trimmedText = text.trim();
    if (trimmedText === "Invalid Action" || trimmedText === "Error") return null;
    if (trimmedText.startsWith('<')) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

export const fetchNewsFromSheet = async (apiUrl: string): Promise<NewsItem[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getNews`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result) return [];
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
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getProducts`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result) return [];
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
    const result = safeJsonParse(text);
    if (!result) return [];
    const data = Array.isArray(result) ? result : (result.data || []);
    return data.map((u: any) => ({
      username: (getValueByKeys(u, ['username', '帳號']) || "").toString().trim(),
      password: (getValueByKeys(u, ['password', '密碼']) || "").toString().trim(),
      franchiseName: (getValueByKeys(u, ['franchiseName', '店名', '店家名稱']) || "未知加盟商").toString().trim()
    }));
  } catch (error) {
    return [];
  }
};

export const fetchOrderHistoryFromSheet = async (apiUrl: string, franchiseName: string): Promise<Order[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}?action=getHistory`);
    const text = await response.text();
    const result = safeJsonParse(text);
    if (!result) return [];
    const data = Array.isArray(result) ? result : (result.data || []);
    return data
      .filter((item: any) => {
        const name = getValueByKeys(item, ['franchiseName', '分店名稱', '店名']);
        return name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => {
        let rawDate = getValueByKeys(item, ['date', '日期']) || "";
        let formattedDate = rawDate.toString();
        if (rawDate instanceof Date || !isNaN(Date.parse(rawDate))) {
           const d = new Date(rawDate);
           formattedDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        }
        return {
          id: (getValueByKeys(item, ['order', '訂單編號', '編號']) || "").toString(),
          date: formattedDate,
          total: Number(getValueByKeys(item, ['total', '金額', '總金額'])) || 0,
          itemsSummary: getValueByKeys(item, ['items', '品項摘要', '內容']) || "",
          franchiseName: franchiseName,
          status: (getValueByKeys(item, ['status', '狀態']) as OrderStatus) || OrderStatus.COMPLETED,
          items: [], 
          deliveryDate: ""
        };
      });
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
    if (!result) return [];
    const data = Array.isArray(result) ? result : (result.data || []);
    return data
      .filter((item: any) => {
        const name = getValueByKeys(item, ['franchiseName', '分店名稱', '店名']);
        return name && name.toString().trim() === franchiseName.trim();
      })
      .map((item: any) => ({
        id: (getValueByKeys(item, ['id', '編號']) || "").toString(),
        date: (getValueByKeys(item, ['date', '日期']) || "").toString(),
        franchiseName: franchiseName,
        type: getValueByKeys(item, ['type', '類型']) || '支出',
        category: getValueByKeys(item, ['category', '項目']) || "",
        amount: Number(getValueByKeys(item, ['amount', '金額'])) || 0,
        note: getValueByKeys(item, ['note', '備註']) || ""
      }));
  } catch (error) {
    return [];
  }
};

export const submitOrderToSheet = async (apiUrl: string, order: Order, franchiseName: string): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    const payload = {
      action: 'submitOrder',
      order: order.id,
      date: new Date().toLocaleDateString('zh-TW'),
      franchiseName: franchiseName,
      items: order.items.map(i => `${i.name}*${i.quantity}`).join(', '),
      status: order.status,
      total: order.total
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

export const submitLedgerToSheet = async (apiUrl: string, entry: LedgerEntry): Promise<boolean> => {
  if (!apiUrl) return false;
  try {
    const payload = {
      action: 'submitLedger',
      ...entry
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

/**
 * 💡 請直接複製下方內容，替換掉 Google Apps Script 中的所有程式碼
 * ------------------------------------------------------------------
 * 
 * function doGet(e) {
 *   var action = e.parameter.action;
 *   var ss = SpreadsheetApp.getActiveSpreadsheet();
 *   
 *   if (action === 'getProducts' || !action) return getSheetData(ss, 'Products'); 
 *   if (action === 'getUsers') return getSheetData(ss, 'Users'); 
 *   if (action === 'getNews') return getSheetData(ss, 'News'); 
 *   if (action === 'getHistory') return getSheetData(ss, 'Shipped_History'); 
 *   if (action === 'getLedger') return getSheetData(ss, 'Ledger'); 
 *   
 *   return ContentService.createTextOutput("Invalid Action").setMimeType(ContentService.MimeType.TEXT);
 * }
 * 
 * function doPost(e) {
 *   var ss = SpreadsheetApp.getActiveSpreadsheet();
 *   var data;
 *   try {
 *     data = JSON.parse(e.postData.contents);
 *   } catch(err) {
 *     return createJsonResponse({status: "Error", message: "JSON 解析錯誤"});
 *   }
 *   
 *   var action = data.action;
 *   
 *   try {
 *     // 處理：新增收支紀錄
 *     if (action === 'submitLedger') {
 *       var sheet = ss.getSheetByName('Ledger') || ss.insertSheet('Ledger');
 *       if (sheet.getLastRow() === 0) {
 *         sheet.appendRow(['id', 'date', 'franchiseName', 'type', 'category', 'amount', 'note']);
 *         sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#F5E6D3");
 *       }
 *       sheet.appendRow([data.id, data.date, data.franchiseName, data.type, data.category, data.amount, data.note]);
 *       return createJsonResponse({status: "Success"});
 *     }
 * 
 *     // 處理：新增叫貨訂單
 *     if (action === 'submitOrder') {
 *       var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
 *       if (sheet.getLastRow() === 0) {
 *         sheet.appendRow(['order', 'date', 'franchiseName', 'items', 'status', 'total']);
 *       }
 *       sheet.appendRow([data.order, data.date, data.franchiseName, data.items, data.status, data.total]);
 *       return createJsonResponse({status: "Success"});
 *     }
 *     
 *     return createJsonResponse({status: "Error", message: "找不到動作"});
 *   } catch(err) {
 *     return createJsonResponse({status: "Error", message: err.message});
 *   }
 * }
 * 
 * function getSheetData(ss, sheetName) {
 *   var sheet = ss.getSheetByName(sheetName);
 *   if (!sheet) return createJsonResponse([]);
 *   
 *   var data = sheet.getDataRange().getValues();
 *   if (data.length <= 1) return createJsonResponse([]);
 *   
 *   var headers = data[0];
 *   var rows = data.slice(1);
 *   
 *   var result = rows.map(function(row) {
 *     var obj = {};
 *     headers.forEach(function(header, i) {
 *       obj[header.toString().trim()] = row[i];
 *     });
 *     return obj;
 *   });
 *   return createJsonResponse(result);
 * }
 * 
 * function createJsonResponse(data) {
 *   return ContentService.createTextOutput(JSON.stringify(data))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 */
