import { StickerCustomizationSettings, DEFAULT_STICKER_SETTINGS, STICKER_THEME_PRESETS, StickerThemePreset } from '../types/stickerSettings';

const STORAGE_KEY = 'garment_sticker_settings_v2';

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
