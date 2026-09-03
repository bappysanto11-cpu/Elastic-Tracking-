import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.post('/api/scan-sheet', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', prompt = '' } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      const ai = getGeminiClient();

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

      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error('Error in scan-sheet API:', err);
      return res.status(500).json({ error: err?.message || 'Failed to analyze image' });
    }
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
