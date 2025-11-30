import { GoogleGenAI } from "@google/genai";
import { OrderDetails } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey });

const getDayOfWeek = (dateString: string): string => {
  if (!dateString) return '';
  // Create date object using local time components to avoid UTC shifts
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

export const generateOrderSummary = async (order: OrderDetails): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key is missing. Returning fallback summary.");
    return fallbackSummary(order);
  }

  const dayOfWeek = getDayOfWeek(order.deadlineDate);

  const prompt = `
    You are a logistics assistant. Create a professional WhatsApp message summary for a bulk order or reminder.
    The message must be visually clear and use emojis to structure the content.
    
    Order Details:
    Type: ${order.orderId}
    Client: ${order.clientName}
    DATE: ${dayOfWeek}, ${order.deadlineDate} at ${order.deadlineTime} (Convert time to 12-hour AM/PM format)
    Outlet: ${order.location}
    Priority: ${order.priority}
    Notes: ${order.notes}
    
    Items:
    ${order.items.map(item => `- ${item.name}: ${item.quantity} ${item.unit} (${item.notes || 'No notes'})`).join('\n')}
    
    Format requirements:
    - START with a bold header line using emojis (e.g., *📦 BULK ORDER*, *🚨 URGENT*, *📝 REMINDER*).
    - Use clear labels with bold text (e.g., *Client:*, *Outlet:*, *DATE:*).
    - Use bullet points for the item list.
    - Keep the "Notes" section brief.
    - Ensure the message is compact enough to be read easily on a mobile screen.
    - Do NOT include any URLs.
    - Do NOT use markdown code blocks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return fallbackSummary(order);
  }
};

const fallbackSummary = (order: OrderDetails): string => {
  const dayOfWeek = getDayOfWeek(order.deadlineDate);
  return `📦 *${order.orderId}*
  
👤 *Client:* ${order.clientName}
🗓️ *DATE:* ${dayOfWeek}, ${order.deadlineDate} @ ${order.deadlineTime}
📍 *Outlet:* ${order.location}
🚨 *Priority:* ${order.priority}

📝 *Items:*
${order.items.map(i => `- ${i.quantity} ${i.unit} x ${i.name}`).join('\n')}

ℹ️ *Notes:* ${order.notes || 'N/A'}`;
};