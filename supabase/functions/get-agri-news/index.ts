import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const today = new Date().toISOString().split('T')[0];

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You are a news curator for farmers. Return ONLY a JSON array of 5 recent agriculture news items. Include a mix of Nepal-specific and international agriculture news. Each item should have: title (string), summary (string, 1-2 sentences), source (string), date (string). Make the news realistic, current, and helpful for farmers. Return ONLY the JSON array, no markdown.'
          },
          {
            role: 'user',
            content: `Generate 5 agriculture news headlines as of ${today}. Include 2-3 Nepal-specific items and 2-3 international items. Cover topics like crop prices, government subsidies, weather impact on farming, new farming techniques, market trends, global commodity prices, and agricultural technology.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      throw new Error(`AI Gateway error [${aiRes.status}]: ${errBody}`);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse JSON from the response, handling potential markdown wrapping
    let news;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      news = JSON.parse(cleaned);
    } catch {
      news = [];
    }

    return new Response(JSON.stringify({ news }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('News error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch news', news: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
