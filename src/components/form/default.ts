import { ProxyEnum } from '../../enums/proxyEnum.ts';
import { ThemeEnum } from '../../enums/ThemeEnum.ts';

export const GENERAL_DEFAULT_VALUES = {
  themeMode: ThemeEnum.AUTO.value,
  tableMode: 'simplified',
  hideUpdateList: [],
  ignoreHash: false,
};

export const PROXY_DEFAULT_VALUES = {
  useProxy: false,
  proxy: ProxyEnum.SYSTEM.value,
  proxyHost: '127.0.0.1',
  proxyPort: 7890,
};
