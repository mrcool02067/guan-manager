import type { OptionType } from '../types/form.ts';

export const ProxyEnum = {
  SYSTEM: { value: 'system', label: '系统' },
  HTTP: { value: 'http', label: 'HTTP' },
} as const satisfies Record<string, OptionType>;
