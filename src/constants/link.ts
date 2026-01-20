import { DebugConst } from '../debugConst.ts';

export const SOFT_HOST = DebugConst.IS_DEV
  ? 'http://localhost:8000'
  : 'https://softsoft.pro';

export const SOFT_URL = `${SOFT_HOST}/softs/guan-manager`;

export const issuesLink = `${SOFT_URL}?tab=issues`;
export const wikiLink = `${SOFT_URL}?tab=wiki`;
