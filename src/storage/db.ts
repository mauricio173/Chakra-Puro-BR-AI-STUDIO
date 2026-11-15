import {
  CharacterProfile,
  PerformanceRecord,
  Project,
  PromptTemplate,
} from '../types/studio';

const DB_NAME = 'chakra_puro_studio_db';
const DB_VERSION = 1;

export interface StoredAsset {
  id: string;
  projectId?: string;
  mimeType: string;
  base64: string;
  label: string;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('prompts')) {
        db.createObjectStore('prompts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('performance')) {
        db.createObjectStore('performance', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const dbService = {
  getProjects: () => getAllFromStore<Project>('projects'),
  saveProject: (project: Project) => putInStore('projects', project),
  deleteProject: (id: string) => deleteFromStore('projects', id),

  getCharacters: () => getAllFromStore<CharacterProfile>('characters'),
  saveCharacter: (char: CharacterProfile) => putInStore('characters', char),
  deleteCharacter: (id: string) => deleteFromStore('characters', id),

  getPrompts: () => getAllFromStore<PromptTemplate>('prompts'),
  savePrompt: (tpl: PromptTemplate) => putInStore('prompts', tpl),
  deletePrompt: (id: string) => deleteFromStore('prompts', id),

  getAssets: () => getAllFromStore<StoredAsset>('assets'),
  saveAsset: (asset: StoredAsset) => putInStore('assets', asset),
  deleteAsset: (id: string) => deleteFromStore('assets', id),

  getPerformance: () => getAllFromStore<PerformanceRecord>('performance'),
  savePerformance: (rec: PerformanceRecord) => putInStore('performance', rec),
  deletePerformance: (id: string) => deleteFromStore('performance', id),

  clearAllData: async () => {
    await clearStore('projects');
    await clearStore('characters');
    await clearStore('prompts');
    await clearStore('assets');
    await clearStore('performance');
  },
};
