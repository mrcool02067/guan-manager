import {
  GENERAL_DEFAULT_VALUES,
  PROXY_DEFAULT_VALUES,
} from '../components/form/default.ts';
import { createSync } from './base/crossWindowSync.ts';
import type { ConfigItem } from './types/ConfigItem.ts';

export const useConfigSync = createSync<ConfigItem>('guanConfig', {
  ...GENERAL_DEFAULT_VALUES,
  ...PROXY_DEFAULT_VALUES,
});
