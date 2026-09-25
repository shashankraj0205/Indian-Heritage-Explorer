import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function chatApiPlugin(): Plugin {
  return {
    name: 'chat-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const userMessage = data.message || '';
            const history = Array.isArray(data.history) ? data.history : [];

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ reply: null, fallback: true }));
              return;
            }

            const ai = new GoogleGenAI();
            const systemInstruction = `You are "Virasat AI", an expert, culturally rich Indian Heritage Guide and architectural historian for the "India Heritage Explorer" web application.
Your mission is to share vivid historical stories, architectural brilliance, dynasty chronicles (Mughal, Chola, Rajput, Vijayanagara, Maurya, Gupta, Chalukya, Chandela), spiritual traditions, and practical travel insights across India's sacred and monumental heritage.
Guidelines:
1. Always be welcoming, warm, culturally respectful, and historically accurate.
2. Structure your answers with engaging paragraphs, bullet points for key facts, and clear takeaways.
3. Whenever you refer to famous heritage sites in India (e.g. Hawa Mahal, Taj Mahal, Hampi Ruins, Meenakshi Amman Temple, Ajanta Caves, Mattancherry Palace, Mehrangarh Fort, Konark Sun Temple, Khajuraho Temples, Harmandir Sahib / Golden Temple, Madhubani Art, Durga Puja, Qutub Minar, Amer Fort, Brihadisvara Temple, Sun Temple Modhera), highlight their names clearly so the user can easily find them on the interactive Google Map.
4. If asked for travel itineraries, provide practical seasonal recommendations, cultural etiquette, and architectural highlights.`;

            const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
            for (const turn of history.slice(-6)) {
              if (turn && turn.role && turn.content) {
                contents.push({
                  role: turn.role === 'user' ? 'user' : 'model',
                  parts: [{ text: turn.content }],
                });
              }
            }
            contents.push({
              role: 'user',
              parts: [{ text: userMessage }],
            });

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
              },
            });

            const replyText = response.text || '';
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ reply: replyText }));
          } catch (err: any) {
            console.error('Chat API Error:', err);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ reply: null, fallback: true, error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), chatApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

