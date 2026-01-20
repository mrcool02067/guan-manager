import type { OptionType } from '../types/form.ts';

export const ThemeEnum = {
  AUTO: { value: 'auto', label: '自动' },
  LIGHT: { value: 'light', label: '亮色' },
  DARK: { value: 'dark', label: '暗色' },
} as const satisfies Record<string, OptionType>;
