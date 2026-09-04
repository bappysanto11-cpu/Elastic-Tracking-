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
