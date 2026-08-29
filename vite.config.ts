import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-server',
    configureServer(server) {
      server.middlewares.use('/api/scan-sheet', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { imageBase64, mimeType = 'image/jpeg', prompt = '' } = parsed;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server' }));
              return;
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const parts: any[] = [];
            if (imageBase64) {
              const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
              parts.push({
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              });
            }

            const systemInstruction = `You are an expert Garment Packing List and Textile Trim Data Extraction specialist.
Analyze the provided image of a carton packing sheet, sticker label layout, weight scale list, or calculation document.
Extract all order header fields (Company Name, REF/PO, Customer/Cust, Buyer, Size/Width, Color) and carton details (Gross Weight in Kg, Net Weight in Kg, Unit Weight / Wt/unit in grams, Length in Meters, Length in Gross Yards Gry).
If certain values are blank/0.00, capture the actual populated cartons. Return strict JSON matching the schema.`;

            parts.push({
              text: prompt || 'Extract all garment packing list details, company name, buyer, size, color, unit weight, and all carton weights and lengths from this image accurately.',
            });

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: { parts },
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    companyName: { type: Type.STRING },
                    ref: { type: Type.STRING },
                    customer: { type: Type.STRING },
                    buyer: { type: Type.STRING },
                    size: { type: Type.STRING },
                    color: { type: Type.STRING },
                    defaultTare: { type: Type.NUMBER },
                    defaultWtPerUnit: { type: Type.NUMBER },
                    cartons: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          cartonNo: { type: Type.INTEGER },
                          grossWt: { type: Type.NUMBER },
                          netWt: { type: Type.NUMBER },
                          wtPerUnit: { type: Type.NUMBER },
                          lengthMtr: { type: Type.NUMBER },
                          lengthGry: { type: Type.NUMBER },
                          notes: { type: Type.STRING },
                        },
                      },
                    },
                    notes: { type: Type.STRING },
                  },
                },
              },
            });

            const text = response.text || '{}';
            const data = JSON.parse(text);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data }));
          } catch (err: any) {
            console.error('Error in scan-sheet API:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Failed to analyze image' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
