import { 
  StickerCustomizationSettings, 
  DEFAULT_STICKER_SETTINGS, 
  STICKER_THEME_PRESETS, 
  StickerThemePreset,
  StickerBulkConfig,
  DEFAULT_BULK_CONFIG 
} from '../types/stickerSettings';

const STORAGE_KEY = 'garment_sticker_settings_v2';
const BULK_CONFIG_KEY = 'garment_sticker_bulk_config_v1';

export function loadStickerSettings(): StickerCustomizationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STICKER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STICKER_SETTINGS,
      ...parsed,
    };
  } catch (err) {
    console.error('Failed to load sticker settings', err);
    return DEFAULT_STICKER_SETTINGS;
  }
}

export function saveStickerSettings(settings: StickerCustomizationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save sticker settings', err);
  }
}

export function loadBulkConfig(): StickerBulkConfig {
  try {
    const raw = localStorage.getItem(BULK_CONFIG_KEY);
    if (!raw) return DEFAULT_BULK_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BULK_CONFIG,
      ...parsed,
    };
  } catch (err) {
    console.error('Failed to load bulk config', err);
    return DEFAULT_BULK_CONFIG;
  }
}

export function saveBulkConfig(config: StickerBulkConfig): void {
  try {
    localStorage.setItem(BULK_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save bulk config', err);
  }
}

export function applyThemePreset(
  current: StickerCustomizationSettings,
  themePreset: StickerThemePreset
): StickerCustomizationSettings {
  const presetValues = STICKER_THEME_PRESETS[themePreset] || {};
  return {
    ...current,
    ...presetValues,
    themePreset,
  };
}

