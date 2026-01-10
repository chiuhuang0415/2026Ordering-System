
import { GoogleGenAI, Type } from "@google/genai";
import { MOCK_PRODUCTS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIInventoryAdvice = async (userInput: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `身為餐飲總部的 AI 顧問，請根據加盟商的描述提供補貨建議。
      目前的商品清單：${JSON.stringify(MOCK_PRODUCTS.map(p => ({ id: p.id, name: p.name, unit: p.unit })))}
      加盟商狀況：${userInput}
      請回傳建議下單的項目 ID、原因以及建議數量。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  suggestedQty: { type: Type.NUMBER }
                },
                required: ["productId", "reason", "suggestedQty"]
              }
            }
          },
          required: ["advice", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Advice Error:", error);
    return { advice: "暫時無法連接 AI 顧問，請稍後再試。", recommendations: [] };
  }
};
