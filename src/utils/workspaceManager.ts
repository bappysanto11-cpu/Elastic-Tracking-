import { PackingSheetData } from '../types/calculator';

export interface Workspace {
  id: string;
  name: string;
  updatedAt: number;
}

const INDEX_KEY = 'garment_workspaces_index_v1';
const WORKSPACE_PREFIX = 'garment_workspace_data_';
export const DEFAULT_WORKSPACE_ID = 'default';

export function getWorkspaces(): Workspace[] {
  try {
    const data = localStorage.getItem(INDEX_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load workspaces index', e);
  }
  // Initialize with default
  const defaultWs: Workspace = { id: DEFAULT_WORKSPACE_ID, name: 'Main Sheet', updatedAt: Date.now() };
  saveWorkspaces([defaultWs]);
  return [defaultWs];
}

export function saveWorkspaces(workspaces: Workspace[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(workspaces));
}

export function createWorkspace(name: string): Workspace {
  const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ws: Workspace = { id, name, updatedAt: Date.now() };
  const workspaces = getWorkspaces();
  workspaces.push(ws);
  saveWorkspaces(workspaces);
  return ws;
}

export function deleteWorkspace(id: string) {
  if (id === DEFAULT_WORKSPACE_ID) return; // Prevent deleting default
  
  const workspaces = getWorkspaces().filter(ws => ws.id !== id);
  saveWorkspaces(workspaces);
  localStorage.removeItem(`${WORKSPACE_PREFIX}${id}`);
}

export function loadWorkspaceData(id: string): PackingSheetData | null {
  // Backwards compatibility with the very first version
  if (id === DEFAULT_WORKSPACE_ID) {
    const legacy = localStorage.getItem('garment_elastic_calculator_v1');
    if (legacy) {
      // Migrate it if it doesn't exist in new key
      const newKeyData = localStorage.getItem(`${WORKSPACE_PREFIX}${id}`);
      if (!newKeyData) {
        localStorage.setItem(`${WORKSPACE_PREFIX}${id}`, legacy);
        // Optionally remove old key, but keep it just in case
      }
    }
  }

  try {
    const data = localStorage.getItem(`${WORKSPACE_PREFIX}${id}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Failed to load workspace data for ${id}`, e);
  }
  return null;
}

export function saveWorkspaceData(id: string, data: PackingSheetData) {
  localStorage.setItem(`${WORKSPACE_PREFIX}${id}`, JSON.stringify(data));
  
  // Update timestamp in index
  const workspaces = getWorkspaces();
  const ws = workspaces.find(w => w.id === id);
  if (ws) {
    ws.updatedAt = Date.now();
    saveWorkspaces(workspaces);
  }
}
