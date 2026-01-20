export interface ConfigItem extends ProxyItem {
  themeMode: string;
  tableMode: string;
  hideUpdateList: { id: string; name: string }[];
  ignoreHash: boolean;
}

interface ProxyItem {
  useProxy: boolean;
  proxy: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  no_proxy?: string;
}
