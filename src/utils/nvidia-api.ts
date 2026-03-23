// src/utils/nvidia-api.ts
// NVIDIA NIM API Integration - TEXT ONLY (CORS Bypassed & Language Fixed)

const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY;
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const chatWithAI = async (
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<string> => {
  try {
    // 🚀 THE FIX: A much stronger system prompt that forces Nepali over Hindi
    const systemContext = `You are an expert agricultural and livestock advisor for farmers in Nepal. Provide practical, actionable advice about crops, livestock (like goats, cows, poultry), disease prevention, fertilizers, and market prices in Nepal. Be concise and practical.

CRITICAL LANGUAGE INSTRUCTIONS:
1. If the user asks in English, reply in English.
2. If the user asks in Nepali (Devanagari script), reply in Nepali (Devanagari).
3. If the user asks in Roman Nepali (e.g., "bakhra lai khasi kasari banaune", "k k garnu parcha"), you MUST understand it as Nepali, NOT Hindi. 
4. NEVER use Hindi words or Roman Hindi. If they use Roman Nepali, reply in beautiful Nepali (Devanagari script) or Roman Nepali.

Farmer says: `;
    
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: conversationHistory.length === 0 ? systemContext + userMessage : userMessage
      }
    ];

    const response = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct', 
        messages: messages,
        temperature: 0.2, // Low temperature keeps it focused and less likely to hallucinate languages
        top_p: 0.7,
        max_tokens: 1024,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error('Chat failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('AI Chat Error:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
};

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; 

export const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
};