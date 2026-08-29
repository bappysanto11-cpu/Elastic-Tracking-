import { CartonRow, PackingSheetData, SummaryStats } from '../types/calculator';

export interface CartonQrPayload {
  ctn: number;
  totalCtn: number;
  ref: string;
  buyer: string;
  customer: string;
  size: string;
  color: string;
  gross: number;
  tare: number;
  net: number;
  mtr: number;
  gry: number;
  yds: number;
  unit: number;
  company: string;
}

/**
 * Builds a direct standalone preview URL for a specific carton.
 * This URL can be scanned from a phone camera or QR scanner.
 */
export function generateCartonPreviewUrl(
  carton: CartonRow,
  sheetData: PackingSheetData,
  totalCtn: number
): string {
  // Use window.location.origin + pathname if in browser, fallback safely
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://ais-pre-qyyo2rn5goexgmucfaom44-778523393809.asia-southeast1.run.app/';

  const params = new URLSearchParams();
  params.set('view', 'carton');
  params.set('ctn', String(carton.cartonNo));
  params.set('totalCtn', String(totalCtn || sheetData.cartons.length || 1));
  params.set('ref', sheetData.ref || '');
  params.set('buyer', sheetData.buyer || '');
  params.set('cust', sheetData.customer || '');
  params.set('size', sheetData.size || '');
  params.set('color', sheetData.color || '');
  params.set('gross', carton.grossWt.toFixed(2));
  params.set('tare', carton.tareWt.toFixed(2));
  params.set('net', carton.netWt.toFixed(2));
  params.set('mtr', carton.lengthMtr.toFixed(2));
  params.set('gry', carton.lengthGry.toFixed(2));
  params.set('yds', (carton.lengthYds || (carton.lengthMtr * 1.09361)).toFixed(2));
  params.set('unit', carton.wtPerUnit.toFixed(2));
  params.set('comp', sheetData.companyName || 'GOOD & FAST Pa. Co. Ltd');

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parses URL query parameters to see if a specific carton was requested via QR code scan.
 */
export function parseCartonFromUrl(): CartonQrPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const ctnStr = params.get('ctn');

    if (view !== 'carton' && !ctnStr) {
      return null;
    }

    const ctn = parseInt(ctnStr || '1', 10);
    const totalCtn = parseInt(params.get('totalCtn') || '1', 10);
    const gross = parseFloat(params.get('gross') || '0');
    const tare = parseFloat(params.get('tare') || '0');
    const net = parseFloat(params.get('net') || (gross - tare).toFixed(2));
    const mtr = parseFloat(params.get('mtr') || '0');
    const gry = parseFloat(params.get('gry') || '0');
    const yds = parseFloat(params.get('yds') || '0');
    const unit = parseFloat(params.get('unit') || '0');

    return {
      ctn: isNaN(ctn) ? 1 : ctn,
      totalCtn: isNaN(totalCtn) ? 1 : totalCtn,
      ref: params.get('ref') || '',
      buyer: params.get('buyer') || '',
      customer: params.get('cust') || '',
      size: params.get('size') || '',
      color: params.get('color') || '',
      gross: isNaN(gross) ? 0 : gross,
      tare: isNaN(tare) ? 0 : tare,
      net: isNaN(net) ? 0 : net,
      mtr: isNaN(mtr) ? 0 : mtr,
      gry: isNaN(gry) ? 0 : gry,
      yds: isNaN(yds) ? 0 : yds,
      unit: isNaN(unit) ? 0 : unit,
      company: params.get('comp') || 'GOOD & FAST Pa. Co. Ltd',
    };
  } catch (e) {
    console.error('Error parsing QR URL params', e);
    return null;
  }
}
