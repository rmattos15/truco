export const DEFAULT_MATCH_CONFIG = Object.freeze({
  names: ['Você', 'Robô A', 'Parceiro', 'Robô B'],
  difficulty: 'normal',
  format: 'quick',
  highContrast: false,
  handOfEleven: false,
});

export function normalizeMatchConfig(value = {}) {
  const names = DEFAULT_MATCH_CONFIG.names.map((fallback, index) => {
    const name = String(value.names?.[index] ?? fallback).trim();
    return name.slice(0, 24) || fallback;
  });
  return {
    names,
    difficulty: ['easy', 'normal', 'competitive'].includes(value.difficulty) ? value.difficulty : 'normal',
    format: value.format === 'series' ? 'series' : 'quick',
    highContrast: Boolean(value.highContrast),
    handOfEleven: Boolean(value.handOfEleven),
  };
}
