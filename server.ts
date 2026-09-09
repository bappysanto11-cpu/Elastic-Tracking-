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

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=*');
    // Disable Express fingerprinting
    res.removeHeader('X-Powered-By');
    next();
  });

  // Simple in-memory rate limiter for AI scan operations (prevents abuse and quota exhaustion)
  const ipRateMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 20;

  const rateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRecord = ipRateMap.get(ip);

    if (!clientRecord || now > clientRecord.resetTime) {
      ipRateMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    if (clientRecord.count >= MAX_REQUESTS_PER_WINDOW) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before scanning again for security.',
      });
    }

    clientRecord.count++;
    next();
  };

  // Middleware for body parsing with bounded limits
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', secure: true, time: new Date().toISOString() });
  });

  app.post('/api/scan-sheet', rateLimitMiddleware, async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', prompt = '' } = req.body || {};

      // Input Validation & Sanitization
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Valid base64 image data is required.' });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: 'Unsupported image format. Allowed: JPEG, PNG, WEBP, GIF.' });
      }

      // Check base64 payload size constraint (under ~20MB of actual image data)
      if (imageBase64.length > 28 * 1024 * 1024) {
        return res.status(413).json({ error: 'Image payload is too large.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      const ai = getGeminiClient();

      const parts: any[] = [];
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });

      const systemInstruction = `You are an expert Garment Packing List and Textile Trim Data Extraction specialist.
Analyze the provided image of a carton packing sheet, sticker label layout, weight scale list, or calculation document.
Extract all order header fields (Company Name, REF/PO, Customer/Cust, Buyer, Size/Width, Color) and carton details (Gross Weight in Kg, Net Weight in Kg, Unit Weight / Wt/unit in grams, Length in Meters, Length in Gross Yards Gry).
If certain values are blank/0.00, capture the actual populated cartons. Return strict JSON matching the schema.`;

      // Sanitize user prompt to prevent prompt injection attacks
      const sanitizedPrompt = typeof prompt === 'string' && prompt.trim().length > 0
        ? prompt.substring(0, 500).replace(/[^\w\s.,;:?!\-–—()/#]/g, '')
        : 'Extract all garment packing list details, company name, buyer, size, color, unit weight, and all carton weights and lengths from this image accurately.';

      parts.push({
        text: sanitizedPrompt,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

  // Dedicated AI Photo Weight Scanner Endpoint
  // Supports single carton photo, multi-carton pallet shots (e.g. 10-25 cartons in 1 photo), or batch photos
  app.post('/api/scan-carton-weights', rateLimitMiddleware, async (req, res) => {
    try {
      const { images, imageBase64, mimeType = 'image/jpeg', expectedCartonNo = 1 } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      const imageList: Array<{ id: string; base64: string; mimeType: string; expectedNo: number }> = [];

      if (Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img && typeof img.imageBase64 === 'string') {
            const clean = img.imageBase64.replace(/^data:[^;]+;base64,/, '');
            imageList.push({
              id: img.id || `img-${i + 1}`,
              base64: clean,
              mimeType: img.mimeType || 'image/jpeg',
              expectedNo: img.expectedCartonNo || (i + 1),
            });
          }
        }
      } else if (typeof imageBase64 === 'string') {
        const clean = imageBase64.replace(/^data:[^;]+;base64,/, '');
        imageList.push({
          id: 'single-img-1',
          base64: clean,
          mimeType,
          expectedNo: expectedCartonNo || 1,
        });
      }

      if (imageList.length === 0) {
        return res.status(400).json({ error: 'No valid image data provided for scanning.' });
      }

      const ai = getGeminiClient();

      const systemInstruction = `You are an elite Garment Quality Control & Warehouse AI Vision Scanner.
Your job is to read photos of carton boxes, warehouse pallets, stacks of cartons, and weighing scale markings.

CRITICAL INSTRUCTION FOR MULTI-CARTON PHOTOS:
- A single photo may contain 1, 5, 10, 20, or even 30 carton boxes stacked on a pallet or warehouse floor.
- You MUST thoroughly scan the ENTIRE image from top-to-bottom and left-to-right, detecting EVERY SINGLE visible carton that has a handwritten or printed Gross Weight (G.W, GW, Gross Wt, kg, or clear numbers) or carton label.
- Do NOT stop after finding 1 carton. If there are 20 cartons in the photo, return all 20 detected carton items in the 'detectedCartons' array!
- If a carton has a written carton number (like C/1, C/No 2, Box #3, or simply numbers 1, 2, 3), use that cartonNo. If no carton number is written on a box, assign sequential carton numbers starting from the requested start index.
- Gross weight (grossWt) should be the decimal number in KG (e.g., 24.5, 21.8, 19.0). If written with comma like 24,5 kg, convert to 24.5.
- If Tare Wt (T.W) or Net Wt (N.W) are visible, extract them as numbers, otherwise null.
- rawDetectedText: State what exact text was seen on this carton (e.g., "C/No: 5, G.W: 23.40 KG" or "Carton top right: 21.5 kg").
- confidence: 'high' | 'medium' | 'low'.`;

      const scannedResults: any[] = [];

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        try {
          const parts: any[] = [
            {
              inlineData: {
                mimeType: item.mimeType,
                data: item.base64,
              },
            },
            {
              text: `Thoroughly scan and extract ALL cartons in this photo. If there are multiple cartons (e.g. 5, 10, 20 boxes stacked together), list EACH AND EVERY carton separately with its carton number and Gross Weight (KG). Base starting carton index is ${item.expectedNo}.`,
            },
          ];

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  detectedCartons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        cartonNo: { type: Type.INTEGER },
                        grossWt: { type: Type.NUMBER },
                        tareWt: { type: Type.NUMBER },
                        netWt: { type: Type.NUMBER },
                        rawDetectedText: { type: Type.STRING },
                        boxLocation: { type: Type.STRING },
                        confidence: { type: Type.STRING },
                        notes: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
            },
          });

          const resText = response.text || '{"detectedCartons":[]}';
          const parsed = JSON.parse(resText);
          const detectedList = parsed.detectedCartons || [];

          if (detectedList.length > 0) {
            detectedList.forEach((c: any, subIdx: number) => {
              scannedResults.push({
                imageId: item.id,
                cartonNo: c.cartonNo || (item.expectedNo + subIdx),
                grossWt: typeof c.grossWt === 'number' ? c.grossWt : 0,
                tareWt: typeof c.tareWt === 'number' ? c.tareWt : null,
                netWt: typeof c.netWt === 'number' ? c.netWt : null,
                rawDetectedText: c.rawDetectedText || '',
                boxLocation: c.boxLocation || '',
                confidence: c.confidence || 'high',
                notes: c.notes || '',
                subIndex: subIdx,
              });
            });
          } else {
            scannedResults.push({
              imageId: item.id,
              cartonNo: item.expectedNo,
              grossWt: 0,
              tareWt: null,
              netWt: null,
              rawDetectedText: 'No cartons/weights detected',
              confidence: 'low',
              notes: 'No numeric gross weights identified in this photo',
              subIndex: 0,
            });
          }
        } catch (itemErr: any) {
          console.error(`Error scanning image ${item.id}:`, itemErr);
          scannedResults.push({
            imageId: item.id,
            cartonNo: item.expectedNo,
            grossWt: 0,
            tareWt: null,
            netWt: null,
            rawDetectedText: 'Scan error',
            confidence: 'low',
            notes: itemErr?.message || 'Failed to scan image',
            subIndex: 0,
          });
        }
      }

      return res.status(200).json({
        success: true,
        count: scannedResults.length,
        results: scannedResults,
      });
    } catch (err: any) {
      console.error('Error in scan-carton-weights API:', err);
      return res.status(500).json({ error: err?.message || 'Failed to process carton images' });
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
