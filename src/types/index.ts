// Item type definition
export interface Item {
  id: string;
  name: string;
  code: string;
  category: 'electronics' | 'clothing' | 'food' | 'cosmetics' | 'furniture' | 'other';
  price: string;
  quantity: number;
  description?: string;
  imageUrl?: string;
  createdAt?: Date;
}

// Sticker Template type
export interface StickerTemplate {
  category: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  icon: string;
  fontFamily: string;
}

// Sticker Size options
export interface StickerSize {
  name: string;
  width: number;  // in mm
  height: number; // in mm
  gridColumns: number; // columns per A4 page
}

// QR Code config
export interface QRConfig {
  enabled: boolean;
  size: number;
  position: 'top' | 'bottom' | 'center';
}

// Sticker generation options
export interface StickerOptions {
  size: StickerSize;
  qrCode: QRConfig;
  showCategory: boolean;
  showQuantity: boolean;
  customColors?: Partial<StickerTemplate>;
}
