/**
 * Utility for persisting and managing autocomplete history in browser localStorage & IndexedDB
 */
import { getAllIndexedDbBackups } from './indexedDbBackup';

export interface AutocompleteStorageMap {
  buyers: string[];
  customers: string[];
  companies: string[];
  sizes: string[];
  colors: string[];
  refs: string[];
}

export interface SuggestionItem {
  value: string;
  source: 'indexeddb' | 'saved' | 'default';
  lastUsedDate?: string;
  occurrences?: number;
}

export const DEFAULT_SUGGESTIONS: AutocompleteStorageMap = {
  buyers: [
    'Sports Direct',
    'H&M',
    'Zara',
    'Marks & Spencer (M&S)',
    'Next',
    'Decathlon',
    'Primark',
    'Target',
    'Tesco',
    'GAP',
    'C&A',
    'Nike',
    'Adidas',
    'Puma',
    'Uniqlo',
    'Lidl',
  ],
  customers: [
    'Liz',
    'Good & Fast',
    'Pacific Garments',
    'Apex Holdings',
    'Euro Style Garments',
    'Tex Design Int.',
    'Square Apparels',
    'Ananta Garments',
    'Ha-Meem Group',
    'Standard Group',
  ],
  companies: [
    'GOOD & FAST Pa. Co. Ltd',
    'FAST ELASTIC & TRIMS LTD',
    'MODERN ELASTIC INDUSTRIES LTD',
    'ASIAN TEXTILE & ACCESSORIES',
  ],
  sizes: [
    '61 MM',
    '50 MM',
    '38 MM',
    '32 MM',
    '25 MM',
    '20 MM',
    '15 MM',
    '12 MM',
    '10 MM',
    '8 MM',
    '6 MM',
    '1.5 INCH',
    '2 INCH',
    '1 INCH',
  ],
  colors: [
    'WHITE',
    'BLACK',
    'NAVY',
    'GREY MELANGE',
    'HEATHER GREY',
    'CHARCOAL',
    'OPTIC WHITE',
    'RAW WHITE',
    'RED',
    'ROYAL BLUE',
    'BOTTLE GREEN',
    'MAROON',
    'BEIGE',
    'OLIVE',
    'YELLOW',
  ],
  refs: [
    'LIZ-LO-ELS-26080193',
    'GF-ORD-2026-08',
    'SD-ELAS-44912',
    'HM-TRIM-88210',
  ],
};

const STORAGE_PREFIX = 'garment_calc_ac_';

export function getStoredHistory(category: keyof AutocompleteStorageMap): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Failed to read autocomplete for ${category}`, err);
  }
  return DEFAULT_SUGGESTIONS[category] || [];
}

/**
 * Fetch and extract historical suggestions from IndexedDB records
 */
export async function getIndexedDbSuggestions(
  category: keyof AutocompleteStorageMap
): Promise<SuggestionItem[]> {
  const result: SuggestionItem[] = [];
  const seenMap = new Map<string, { count: number; latestTimestamp: number; dateFormatted: string }>();

  try {
    const backups = await getAllIndexedDbBackups();

    for (const record of backups) {
      let val = '';
      if (category === 'buyers') {
        val = record.buyer || record.sheetData?.buyer || '';
      } else if (category === 'refs') {
        val = record.ref || record.sheetData?.ref || '';
      } else if (category === 'customers') {
        val = record.sheetData?.customer || '';
      } else if (category === 'companies') {
        val = record.companyName || record.sheetData?.companyName || '';
      } else if (category === 'sizes') {
        val = record.size || record.sheetData?.size || '';
      } else if (category === 'colors') {
        val = record.color || record.sheetData?.color || '';
      }

      val = val.trim();
      if (val && val !== 'N/A' && val !== 'Untitled') {
        const lower = val.toLowerCase();
        const existing = seenMap.get(lower);
        if (existing) {
          existing.count += 1;
          if (record.timestamp > existing.latestTimestamp) {
            existing.latestTimestamp = record.timestamp;
            existing.dateFormatted = record.dateFormatted;
          }
        } else {
          seenMap.set(lower, {
            count: 1,
            latestTimestamp: record.timestamp,
            dateFormatted: record.dateFormatted,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load suggestions from IndexedDB', err);
  }

  // Convert map to SuggestionItems
  const idbItems: SuggestionItem[] = [];
  seenMap.forEach((meta, lower) => {
    // Find proper casing
    idbItems.push({
      value: lower, // we'll format properly below
      source: 'indexeddb',
      occurrences: meta.count,
      lastUsedDate: meta.dateFormatted,
    });
  });

  // Also include LocalStorage saved items
  const localSaved = getStoredHistory(category);
  const defaults = DEFAULT_SUGGESTIONS[category] || [];

  const finalMap = new Map<string, SuggestionItem>();

  // Add IndexedDB items first (highest priority)
  idbItems.forEach(item => {
    // Look up original casing in localSaved or defaults if present
    const original = localSaved.find(s => s.toLowerCase() === item.value) ||
                     defaults.find(s => s.toLowerCase() === item.value) ||
                     item.value.toUpperCase();
    finalMap.set(item.value, {
      ...item,
      value: original,
    });
  });

  // Add LocalStorage saved items
  localSaved.forEach(item => {
    const lower = item.toLowerCase();
    if (!finalMap.has(lower)) {
      finalMap.set(lower, {
        value: item,
        source: 'saved',
      });
    }
  });

  // Add Default suggestions
  defaults.forEach(item => {
    const lower = item.toLowerCase();
    if (!finalMap.has(lower)) {
      finalMap.set(lower, {
        value: item,
        source: 'default',
      });
    }
  });

  return Array.from(finalMap.values());
}

export function saveHistoryEntry(category: keyof AutocompleteStorageMap, value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 1) {
    return getStoredHistory(category);
  }

  const current = getStoredHistory(category);
  // Remove duplicate case-insensitively, then prepend new value
  const filtered = current.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, 35); // Keep top 35 items

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(updated));
  } catch (err) {
    console.warn(`Failed to save autocomplete for ${category}`, err);
  }

  return updated;
}

export function removeHistoryEntry(category: keyof AutocompleteStorageMap, valueToRemove: string): string[] {
  const current = getStoredHistory(category);
  const updated = current.filter(item => item.toLowerCase() !== valueToRemove.toLowerCase());

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(updated));
  } catch (err) {
    console.warn(`Failed to remove autocomplete entry for ${category}`, err);
  }

  return updated;
}

export function clearCategoryHistory(category: keyof AutocompleteStorageMap): string[] {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${category}`);
  } catch (err) {
    console.warn(`Failed to clear autocomplete for ${category}`, err);
  }
  return DEFAULT_SUGGESTIONS[category] || [];
}
