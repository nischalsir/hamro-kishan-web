// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES, TYPES, AND CONSTANTS FOR FARMER PAGES
// ═══════════════════════════════════════════════════════════════════════════

import { nepalLocations } from '@/data/mock';

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  high: number;
  low: number;
  precipitation: number;
  pressure: number;
  sunrise: string;
  sunset: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  date: string;
  isNepali?: boolean;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

export const provincesList = Object.keys(nepalLocations);

export const agriKeywords = [
  // English
  'agriculture', 'farming', 'crop', 'farmer', 'harvest', 'fertilizer', 'seed',
  'pesticide', 'irrigation', 'livestock', 'dairy', 'poultry', 'rice', 'wheat',
  'maize', 'vegetable', 'fruit', 'soil', 'organic', 'sustainable', 'agritech',
  'food security', 'climate', 'drought', 'monsoon', 'export', 'subsidy',
  // Nepali
  'कृषि', 'खेती', 'बाली', 'किसान', 'फसल', 'मल', 'बीउ', 'सिंचाई', 'पशुपालन',
  'धान', 'गहुँ', 'मकै', 'तरकारी', 'फलफूल'
];

// ---------------------------------------------------------------------------
// GLOBAL CACHE UTILITIES
// ---------------------------------------------------------------------------

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
};

export let globalWeatherCache: WeatherData | null = safeParse('hk_weather_cache', null);
export let globalNewsCache: NewsItem[] = safeParse('hk_news_cache', []);
export let globalPricesCache: Record<string, { month: string; price: number }[]> | null =
  safeParse('hk_prices_cache', null);

export const setGlobalWeatherCache = (data: WeatherData) => {
  globalWeatherCache = data;
  localStorage.setItem('hk_weather_cache', JSON.stringify(data));
};

export const setGlobalNewsCache = (data: NewsItem[]) => {
  globalNewsCache = data;
  localStorage.setItem('hk_news_cache', JSON.stringify(data));
};

export const setGlobalPricesCache = (data: Record<string, { month: string; price: number }[]>) => {
  globalPricesCache = data;
  localStorage.setItem('hk_prices_cache', JSON.stringify(data));
};

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

export const compressImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        const MAX = 1024;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) {
            height = Math.round(height * MAX / width);
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width = Math.round(width * MAX / height);
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
              : reject(new Error('Compression failed')),
          'image/jpeg',
          0.75
        );
      };
    };
  });