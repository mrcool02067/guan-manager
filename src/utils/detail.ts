import type { DetailView, RawKV, ShowDetail } from '../types/winget';

/**
 * 构建用于展示的详情视图
 * 说明：融合结构化字段与从原始文本解析出的键值
 */
export function buildDetailView(sd: ShowDetail, kv: RawKV): DetailView {
  /** 合并数组：优先使用已有非空数组 */
  function mergeArr(a?: string[] | null, b?: string[]) {
    return a?.length ? a : b?.length ? b : null;
  }
  const download =
    sd.download_url ?? kv.download_url ?? kv.installer_url ?? null;
  const installerUrl =
    kv.installer_url && kv.installer_url !== download ? kv.installer_url : null;
  function deriveReleaseNotes(): string | null {
    if (sd.release_notes) return sd.release_notes;
    const parts: string[] = [];
    if (kv.release_notes_intro) parts.push(kv.release_notes_intro);
    if (kv.release_sections?.length) {
      for (const sec of kv.release_sections) {
        if (sec.title) parts.push(sec.title);
        if (sec.items?.length) {
          for (const it of sec.items) parts.push(`- ${it}`);
        }
        parts.push('');
      }
    }
    const s = parts.join('\n').trim();
    return s ? s : null;
  }
  return {
    id: sd.id ?? kv.id ?? null,
    name: sd.name ?? null,
    version: sd.version ?? kv.version ?? null,
    installed_version: sd.installed_version ?? null,
    available_version: sd.available_version ?? null,
    source: sd.source ?? kv.source ?? null,
    publisher: sd.publisher ?? kv.publisher ?? null,
    author: sd.author ?? kv.author ?? null,
    homepage: sd.homepage ?? kv.homepage ?? null,
    manifest: sd.manifest ?? kv.manifest ?? null,
    license: sd.license ?? kv.license ?? null,
    license_url: kv.license_url ?? null,
    privacy_url: kv.privacy_url ?? null,
    copyright: kv.copyright ?? null,
    copyright_url: kv.copyright_url ?? null,
    moniker: sd.moniker ?? kv.moniker ?? null,
    tags: mergeArr(sd.tags ?? null, kv.tags),
    dependencies: mergeArr(sd.dependencies ?? null, kv.dependencies),
    installer_type: sd.installer_type ?? kv.installer_type ?? null,
    installer_locale: sd.installer_locale ?? null,
    architecture: sd.architecture ?? null,
    size: sd.size ?? null,
    download_url: download,
    installer_url: installerUrl,
    sha256: sd.sha256 ?? kv.sha256 ?? null,
    release_notes: deriveReleaseNotes(),
    release_notes_url: sd.release_notes_url ?? kv.release_notes_url ?? null,
    release_notes_intro: kv.release_notes_intro ?? null,
    release_sections: kv.release_sections?.length ? kv.release_sections : null,
    docs: kv.docs?.length ? kv.docs : null,
    description: sd.description ?? kv.description ?? null,
    server_url: kv.server_url ?? null,
    server_support_url: kv.server_support_url ?? null,
    purchase_url: kv.purchase_url ?? null,
    release_date: kv.release_date ?? null,
    offline: kv.offline ?? null,
  };
}

/**
 * 解析 `raw_details` 文本为键值对象
 */
export function parseKeyValues(text: string): RawKV {
  const lines = text.split(/\r?\n/);
  const kv: RawKV = {};
  /** 按键名赋值（若未设置） */
  function assignKV(k: string, v: string) {
    if (!v) return;
    switch (k) {
      case 'id':
        if (!kv.id) kv.id = v;
        break;
      case 'version':
        if (!kv.version) kv.version = v;
        break;
      case 'source':
        if (!kv.source) kv.source = v;
        break;
      case 'publisher':
        if (!kv.publisher) kv.publisher = v;
        break;
      case 'author':
        if (!kv.author) kv.author = v;
        break;
      case 'homepage':
        if (!kv.homepage) kv.homepage = v;
        break;
      case 'manifest':
        if (!kv.manifest) kv.manifest = v;
        break;
      case 'license':
        if (!kv.license) kv.license = v;
        break;
      case 'license_url':
        if (!kv.license_url) kv.license_url = v;
        break;
      case 'privacy_url':
        if (!kv.privacy_url) kv.privacy_url = v;
        break;
      case 'moniker':
        if (!kv.moniker) kv.moniker = v;
        break;
      case 'installer_type':
        if (!kv.installer_type) kv.installer_type = v;
        break;
      case 'installer_locale':
        if (!kv.installer_locale) kv.installer_locale = v;
        break;
      case 'architecture':
        if (!kv.architecture) kv.architecture = v;
        break;
      case 'size':
        if (!kv.size) kv.size = v;
        break;
      case 'download_url':
        if (!kv.download_url) kv.download_url = v;
        break;
      case 'sha256':
        if (!kv.sha256) kv.sha256 = v;
        break;
      case 'release_notes_url':
        if (!kv.release_notes_url) kv.release_notes_url = v;
        break;
      case 'server_url':
        if (!kv.server_url) kv.server_url = v;
        break;
      case 'server_support_url':
        if (!kv.server_support_url) kv.server_support_url = v;
        break;
      case 'purchase_url':
        if (!kv.purchase_url) kv.purchase_url = v;
        break;
      case 'copyright':
        if (!kv.copyright) kv.copyright = v;
        break;
      case 'copyright_url':
        if (!kv.copyright_url) kv.copyright_url = v;
        break;
      case 'description':
        if (!kv.description) kv.description = v;
        break;
      case 'release_date':
        if (!kv.release_date) kv.release_date = v;
        break;
    }
  }
  /** 尝试把逗号分隔值解析为列表 */
  function tryList(v: string) {
    return v
      .split(/[,;，；]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  kv.release_sections = [];
  kv.docs = [];
  let section: 'release' | 'tags' | 'install' | 'docs' | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^(Windows |版权所有|Copyright|使用情况|Usage)/.test(line))
      continue;
    if (/^(发行说明)[:：]?$/i.test(line)) {
      section = 'release';
      continue;
    }
    if (/^(标记|标签)[:：]?$/i.test(line)) {
      section = 'tags';
      continue;
    }
    if (/^(安装)[:：]?$/i.test(line)) {
      section = 'install';
      continue;
    }
    if (/^(文档)[:：]?$/i.test(line)) {
      section = 'docs';
      continue;
    }

    if (section === 'release') {
      if (/^本次功能主要更新如下/.test(line)) {
        kv.release_notes_intro = line;
        continue;
      }
      const grp = line.match(/^【(.+?)】$/);
      if (grp) {
        const sections: { title: string; items: string[] }[] =
          kv.release_sections ?? [];
        kv.release_sections = sections;
        sections.push({ title: grp[1], items: [] });
        continue;
      }
      const bullet = line.match(/^[-•]\s*(.+)$/);
      if (bullet && (kv.release_sections?.length ?? 0) > 0) {
        const sections = kv.release_sections as {
          title: string;
          items: string[];
        }[];
        sections[sections.length - 1].items.push(bullet[1]);
        continue;
      }
      const m2 = line.match(/^([^:：]+)[:：]\s*(.+)$/);
      if (m2) {
        const key = m2[1].trim();
        const val = m2[2].trim().replace(/^`|`$/g, '');
        if (/^(发行说明网址|Release\s*Notes\s*Url)$/i.test(key))
          assignKV('release_notes_url', val);
        else if (/^(购买\s*URL|购买|Purchase)$/i.test(key))
          assignKV('purchase_url', val);
        else {
          /* ignore other kv within release */
        }
        section = null;
      }
      continue;
    }
    if (section === 'tags') {
      if (/^([^:：]+)[:：]/.test(line)) {
        section = null; /* fallthrough to kv */
      } else {
        if (line) {
          if (!kv.tags) kv.tags = [];
          kv.tags.push(line);
        }
        continue;
      }
    }
    if (section === 'install') {
      const m3 = line.match(/^([^:：]+)[:：]\s*(.+)$/);
      if (m3) {
        const key = m3[1].trim();
        const val = m3[2].trim().replace(/^`|`$/g, '');
        if (/^(安装程序类型|Installer\s*Type)$/i.test(key))
          assignKV('installer_type', val);
        else if (/^(安装程序\s*URL|安装程序|Installer\s*Url)$/i.test(key))
          assignKV('installer_url', val);
        else if (/^(安装程序\s*SHA256|SHA256|SHA-256|Sha256)$/i.test(key))
          assignKV('sha256', val);
        else if (/^(发布日期|Release\s*Date)$/i.test(key))
          assignKV('release_date', val);
        else if (/^(支持脱机分发|Offline)$/i.test(key))
          kv.offline = /true|是|支持/i.test(val);
        continue;
      } else {
        section = null;
      }
    }
    if (section === 'docs') {
      const m4 = line.match(/^([^:：]+)[:：]\s*(.+)$/);
      if (m4) {
        const title = m4[1].trim();
        const url = m4[2].trim().replace(/^`|`$/g, '');
        const docs: { title: string; url: string }[] = kv.docs ?? [];
        kv.docs = docs;
        docs.push({ title, url });
        continue;
      } else {
        section = null;
      }
    }
    const m = line.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^`|`$/g, '');
    if (/^(ID|Id|PackageIdentifier)$/i.test(key)) assignKV('id', val);
    else if (/^(版本|Version)$/i.test(key)) assignKV('version', val);
    else if (/^(源|Source)$/i.test(key)) assignKV('source', val);
    else if (/^(发布者|Publisher)$/i.test(key)) assignKV('publisher', val);
    else if (/^(作者|Author)$/i.test(key)) assignKV('author', val);
    else if (/^(主页|Homepage|Home\s*Page|Website)$/i.test(key))
      assignKV('homepage', val);
    else if (/^(清单|Manifest)$/i.test(key)) assignKV('manifest', val);
    else if (/^(许可|许可证|License)$/i.test(key)) assignKV('license', val);
    else if (/^(许可证\s*URL|License\s*Url)$/i.test(key))
      assignKV('license_url', val);
    else if (/^(隐私\s*URL|Privacy\s*Url)$/i.test(key))
      assignKV('privacy_url', val);
    else if (/^(版权所有|Copyright)$/i.test(key)) assignKV('copyright', val);
    else if (/^(版权\s*URL|Copyright\s*Url)$/i.test(key))
      assignKV('copyright_url', val);
    else if (/^(别名|绰号|Moniker)$/i.test(key)) assignKV('moniker', val);
    else if (/^(安装程序类型|Installer\s*Type)$/i.test(key))
      assignKV('installer_type', val);
    else if (/^(安装程序语言|Installer\s*Locale)$/i.test(key))
      assignKV('installer_locale', val);
    else if (/^(架构|Architecture)$/i.test(key)) assignKV('architecture', val);
    else if (/^(大小|Size)$/i.test(key)) assignKV('size', val);
    else if (/^(下载地址|Download\s*Url|Url)$/i.test(key))
      assignKV('download_url', val);
    else if (/^(SHA256|SHA-256|Sha256|哈希)$/i.test(key))
      assignKV('sha256', val);
    else if (/^(依赖项|依赖关系|Dependencies)$/i.test(key))
      kv.dependencies = tryList(val);
    else if (/^(标签|标记|Tags)$/i.test(key)) kv.tags = tryList(val);
    else if (/^(发布说明网址|Release\s*Notes\s*Url)$/i.test(key))
      assignKV('release_notes_url', val);
    else if (/^(发布服务器\s*URL)$/i.test(key)) assignKV('server_url', val);
    else if (/^(发布服务器支持\s*URL)$/i.test(key))
      assignKV('server_support_url', val);
    else if (/^(购买\s*URL|购买|Purchase)$/i.test(key))
      assignKV('purchase_url', val);
    else if (/^(发行说明)$/i.test(key)) {
      section = 'release';
    } else if (/^(文档)$/i.test(key)) {
      section = 'docs';
    } else if (/^(标记|标签)$/i.test(key)) {
      section = 'tags';
    } else if (/^(安装)$/i.test(key)) {
      section = 'install';
    } else if (/^(描述|Description)$/i.test(key)) assignKV('description', val);
  }
  return kv;
}
