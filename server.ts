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

  // Helper to format AI errors into human-friendly messages
  function formatAiError(err: any): string {
    if (!err) return 'An unexpected error occurred during AI processing.';
    const rawMsg = err?.message || String(err);
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        if (parsed.error.code === 400 && parsed.error.message.includes('Unable to process input image')) {
          return 'The uploaded image could not be processed by AI vision. Please ensure the image is a clear, standard JPG/PNG photo of cartons.';
        }
        if (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED') {
          return 'AI service is temporarily busy (rate limit). Please retry in a few seconds.';
        }
        if (parsed.error.code === 503) {
          return 'AI vision model is temporarily unavailable. Please retry shortly.';
        }
        return parsed.error.message;
      }
    } catch {
      // raw string is not JSON
    }
    return rawMsg;
  }

  // Security & CORS Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Disable Express fingerprinting
    res.removeHeader('X-Powered-By');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Helper for resilient Gemini model calling with automatic fallback
  async function generateContentWithFallback(ai: any, payload: any) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          ...payload,
          model: modelName,
        });
        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed or unavailable: ${err?.message || err}. Trying next fallback...`);
      }
    }

    throw lastError || new Error('All vision AI models are currently unavailable. Please try again.');
  }

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

      const response = await generateContentWithFallback(ai, {
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
      return res.status(500).json({ error: formatAiError(err) });
    }
  });

  // Dedicated Batch Label Scanner Endpoint:
  // Detects and parses up to 20 individual carton labels from a single photo
  // and returns fully structured CartonRow objects ready to populate the table.
  const YARD_TO_METER = 0.9144;
  const GROSS_UNITS = 144;

  function buildServerCartonRow(c: any, index: number, sheetContext: any) {
    const defaultTare = typeof sheetContext?.defaultTare === 'number' ? sheetContext.defaultTare : 0.50;
    const defaultWtPerUnit = typeof sheetContext?.defaultWtPerUnit === 'number' && sheetContext.defaultWtPerUnit > 0 ? sheetContext.defaultWtPerUnit : 30.0;
    const deliveryUnit = sheetContext?.deliveryUnit || 'mtr';
    const weightUnit = sheetContext?.weightUnit || 'kg';
    const defaultColor = sheetContext?.color || '';
    const defaultSize = sheetContext?.size || '';

    let grossWt = typeof c.grossWt === 'number' && !isNaN(c.grossWt) ? Math.max(0, c.grossWt) : 0;
    let netWt = typeof c.netWt === 'number' && !isNaN(c.netWt) && c.netWt > 0 ? c.netWt : 0;
    let tareWt = typeof c.tareWt === 'number' && !isNaN(c.tareWt) && c.tareWt > 0 ? c.tareWt : defaultTare;

    // If both grossWt and netWt were detected, compute exact tare if not already explicit
    if (grossWt > 0 && netWt > 0 && (!c.tareWt || c.tareWt <= 0)) {
      const deducedTare = Number((grossWt - netWt).toFixed(3));
      if (deducedTare > 0 && deducedTare < grossWt) {
        tareWt = deducedTare;
      }
    } else if (grossWt > 0 && netWt <= 0) {
      netWt = Number((grossWt - tareWt).toFixed(3));
    } else if (netWt > 0 && grossWt <= 0) {
      grossWt = Number((netWt + tareWt).toFixed(3));
    }

    const wtPerUnit = defaultWtPerUnit;
    const netWtKg = weightUnit === 'gm' ? netWt / 1000 : netWt;

    const lengthMtr = netWt > 0 && wtPerUnit > 0 ? Number(((netWtKg * 1000) / wtPerUnit).toFixed(2)) : 0;
    const lengthGry = lengthMtr > 0 ? Number(((lengthMtr / YARD_TO_METER) / GROSS_UNITS).toFixed(2)) : 0;
    const lengthYds = lengthMtr > 0 ? Number((lengthMtr / YARD_TO_METER).toFixed(2)) : 0;

    let qtyPcs: number | undefined = undefined;
    if (typeof c.qtyPcs === 'number' && c.qtyPcs > 0) {
      qtyPcs = c.qtyPcs;
    } else if (deliveryUnit === 'pcs' && netWt > 0 && wtPerUnit > 0) {
      qtyPcs = Math.round((netWtKg * 1000) / wtPerUnit);
    }

    const cartonNo = typeof c.cartonNo === 'number' && c.cartonNo > 0 ? c.cartonNo : (index + 1);

    return {
      id: `ctn-batch-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      cartonNo,
      grossWt,
      tareWt,
      netWt,
      wtPerUnit,
      lengthMtr,
      lengthGry,
      lengthYds,
      qtyPcs,
      pkts: typeof c.pkts === 'number' && c.pkts > 0 ? c.pkts : undefined,
      color: (c.color && typeof c.color === 'string' && c.color.trim()) ? c.color.trim() : (defaultColor || undefined),
      size: (c.size && typeof c.size === 'string' && c.size.trim()) ? c.size.trim() : (defaultSize || undefined),
      notes: c.rawDetectedText ? `AI Label ${c.boxLocation ? `(${c.boxLocation})` : ''}: ${c.rawDetectedText}` : undefined,
    };
  }

  app.post(['/api/scan-carton-labels-batch', '/api/scan-carton-batch'], rateLimitMiddleware, async (req, res) => {
    try {
      const { 
        imageBase64, 
        mimeType = 'image/jpeg', 
        startCartonNo = 1, 
        maxCartons = 30,
        sheetContext = {}
      } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'No image data provided for batch scanning.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const ai = getGeminiClient();

      const systemInstruction = `You are a world-class Garment Factory Quality Control, Packaging & Warehouse AI Vision Scanner.
Your mission is to perform high-precision BATCH DETECTION of carton shipping labels, carton boxes on pallets or warehouse floors, and weight markings from ONE SINGLE PHOTO.

INSTRUCTIONS:
1. Extract ORDER HEADER INFORMATION if printed on the shipping marks/labels:
   - companyName: Company/Factory name (e.g. "GOOD & FAST Pa. Co. Ltd", "Sumi", etc.)
   - buyer: Buyer / Customer name (e.g. "Lamour", "H&M", "Target", "Zara", etc.)
   - ref: Reference / Customer PO / REFF No (e.g. "26070347")
   - jobNo: Job No / Order No (e.g. "4046")
   - color: Garment or item color (e.g. "Black", "White", "Navy")
   - size: Size / width specification (e.g. "25MM", "M", "L")
   - defaultTare: Tare weight if printed or derived (Gross Wt - Net Wt, e.g. 8.18 - 7.68 = 0.50 kg)
   - defaultWtPerUnit: Unit weight in grams if present

2. Detect EVERY INDIVIDUAL CARTON BOX (up to ${maxCartons}):
   - cartonNo: Number on box (e.g. 1, 2, 3, or markers like J-4, J-6, C/1, Box #5). If sequential, number from ${startCartonNo}.
   - grossWt: Gross Weight in KG (e.g. 8.18, 7.85, 24.50). Look for 'Gross wt', 'G.W', 'GW', 'KG'.
   - netWt: Net Weight in KG (e.g. 7.68, 7.35, 24.00). Look for 'Net wt', 'N.W', 'NW'.
   - tareWt: Tare weight in KG (or Gross - Net).
   - color: Color if specified per carton.
   - size: Size if specified per carton.
   - qtyPcs: Quantity in pcs/mtr if printed.
   - pkts: Bundle / packet count.
   - boxLocation: Position in image (e.g. "Top Left (J-4)", "Center Box (J-6)", "Bottom Right").
   - rawDetectedText: Exact snippet of key text seen (e.g. "REFF: 26070347, Gross wt: 8.18 Kg, Net wt: 7.68 Kg").
   - confidence: 'high' | 'medium' | 'low'.

3. Order detected cartons sequentially by carton number (or top-left to bottom-right). Return complete detectedCartons array.`;

      const response = await generateContentWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Perform batch carton label detection on this photo. Detect and isolate all carton boxes (up to ${maxCartons}). Base starting carton number is ${startCartonNo}. Extract order header info (Buyer, REFF No, Job No, Color, Company) and for each carton extract Gross Weight, Net Weight, Tare Weight, and Carton Number.`,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedHeader: {
                type: Type.OBJECT,
                properties: {
                  companyName: { type: Type.STRING },
                  buyer: { type: Type.STRING },
                  ref: { type: Type.STRING },
                  jobNo: { type: Type.STRING },
                  color: { type: Type.STRING },
                  size: { type: Type.STRING },
                  defaultTare: { type: Type.NUMBER },
                  defaultWtPerUnit: { type: Type.NUMBER },
                },
              },
              detectedCartons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cartonNo: { type: Type.INTEGER },
                    grossWt: { type: Type.NUMBER },
                    tareWt: { type: Type.NUMBER },
                    netWt: { type: Type.NUMBER },
                    color: { type: Type.STRING },
                    size: { type: Type.STRING },
                    qtyPcs: { type: Type.NUMBER },
                    pkts: { type: Type.NUMBER },
                    rawDetectedText: { type: Type.STRING },
                    boxLocation: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['detectedCartons'],
          },
        },
      });

      const resText = response.text || '{"detectedCartons":[]}';
      const parsed = JSON.parse(resText);
      const rawList = parsed.detectedCartons || [];
      const detectedHeader = parsed.detectedHeader || {};

      // Merge detected header context into sheet context
      const mergedContext = {
        ...sheetContext,
        color: detectedHeader.color || sheetContext.color,
        size: detectedHeader.size || sheetContext.size,
        defaultTare: typeof detectedHeader.defaultTare === 'number' && detectedHeader.defaultTare > 0 ? detectedHeader.defaultTare : sheetContext.defaultTare,
        defaultWtPerUnit: typeof detectedHeader.defaultWtPerUnit === 'number' && detectedHeader.defaultWtPerUnit > 0 ? detectedHeader.defaultWtPerUnit : sheetContext.defaultWtPerUnit,
      };

      // Construct full CartonRow objects ready to populate the table
      const cartonRows = rawList.map((c: any, idx: number) => {
        return buildServerCartonRow(c, idx, mergedContext);
      });

      // Calculate batch statistics
      const totalGross = cartonRows.reduce((acc: number, row: any) => acc + (row.grossWt || 0), 0);
      const totalNet = cartonRows.reduce((acc: number, row: any) => acc + (row.netWt || 0), 0);

      return res.status(200).json({
        success: true,
        detectedCount: cartonRows.length,
        detectedHeader,
        cartonRows,
        detectedCartons: rawList,
        summary: {
          totalGrossWt: Number(totalGross.toFixed(2)),
          totalNetWt: Number(totalNet.toFixed(2)),
          avgGrossWt: cartonRows.length > 0 ? Number((totalGross / cartonRows.length).toFixed(2)) : 0,
        },
      });
    } catch (err: any) {
      console.error('Error in scan-carton-labels-batch API:', err);
      return res.status(500).json({ error: formatAiError(err) });
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

          const response = await generateContentWithFallback(ai, {
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
      return res.status(500).json({ error: formatAiError(err) });
    }
  });

  // Fallback for unmatched /api routes to prevent HTML 404
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
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
