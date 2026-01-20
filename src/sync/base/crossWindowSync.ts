import { emit, listen } from '@tauri-apps/api/event';
import { load, type Store } from '@tauri-apps/plugin-store';
import { create } from 'zustand';

const setupMap = new Map<string, boolean>();

export function createSync<V extends object>(key: string, initialValues: V) {
  type Store = {
    data: V;
    sync: ((patch: Partial<V>) => Promise<void>) &
      ((key: string, value: unknown) => Promise<void>);
    syncAll: (next: V, persistLocal?: boolean) => Promise<void>;
    reset: () => Promise<void>;
  };

  const shouldPersist = !!key?.trim();
  const store = create<Store>((set, get) => {
    async function apply(
      payload: Partial<Store>,
      persistLocal: boolean = true,
    ): Promise<void> {
      // zustand更新
      set(payload);
      // tauri发射
      await emit(`sync:${key}`, payload);
      // tauri本地保存
      if (payload.data) {
        await saveLocal(key, shouldPersist && persistLocal, { data: payload.data });
      }
    }

    async function syncImpl(patchOrKey: Partial<V> | string, maybeValue?: unknown) {
      let next: V;
      if (typeof patchOrKey === 'object' && patchOrKey !== null) {
        next = { ...get().data, ...patchOrKey };
      } else {
        const k = String(patchOrKey);
        next = { ...get().data, [k]: maybeValue } as V;
      }
      await apply({ data: next });
    }

    return {
      data: initialValues,
      sync: syncImpl as Store['sync'],
      syncAll: async (next: V, persistLocal: boolean = true) => {
        await apply({ data: next }, persistLocal);
      },
      reset: async () => {
        await apply({ data: initialValues });
      },
    };
  });

  if (!setupMap.get(key)) {
    setupMap.set(key, true);
    void listen(`sync:${key}`, (event) => {
      const patch = event.payload as Partial<Store>;
      store.setState(patch);
    });

    if (shouldPersist) {
      void (async function initFromFile() {
        const obj = await getLocal(key);
        if (obj) {
          store.setState({ data: obj as V });
        }
      })();
    }
  }

  return store;
}

function getStore(key: string): Promise<Store> {
  return load(`${key}.json`);
}

async function saveLocal(
  key: string,
  persist: boolean,
  payload: { data: object },
) {
  if (!persist) return;
  const inst = await getStore(key);
  const v = payload.data as Record<string, unknown>;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const nk of Object.keys(v)) {
      await inst.set(nk, v[nk]);
    }
    await inst.save();
  }
}

async function getLocal(key: string): Promise<Record<string, unknown> | null> {
  const inst = await getStore(key);
  const entries = await inst.entries<unknown>();
  if (!(entries && entries.length > 0)) {
    return null;
  }
  return Object.fromEntries(entries);
}
