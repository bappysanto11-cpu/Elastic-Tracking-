import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { TeamMemberAccess, SecuritySettingsData } from '../types/security';

const STORAGE_KEY_TEAM = 'garment_team_access_cache';
const STORAGE_KEY_SETTINGS = 'garment_security_settings_cache';

// Load cached members from localStorage for fast load & offline resilience
function getLocalMembers(ownerUid: string): TeamMemberAccess[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_TEAM}_${ownerUid}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading local team members:', err);
  }
  return [];
}

function setLocalMembers(ownerUid: string, members: TeamMemberAccess[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY_TEAM}_${ownerUid}`, JSON.stringify(members));
  } catch (err) {
    console.error('Error saving local team members:', err);
  }
}

/**
 * Load team members with view-only or editor access levels from Firebase Firestore.
 */
export async function loadTeamMembers(ownerUid: string): Promise<TeamMemberAccess[]> {
  const local = getLocalMembers(ownerUid);
  if (!ownerUid) return local;

  try {
    const colRef = collection(db, 'users', ownerUid, 'teamAccess');
    const snapshot = await getDocs(colRef);
    const remoteMembers: TeamMemberAccess[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      remoteMembers.push({
        id: docSnap.id,
        email: data.email || '',
        displayName: data.displayName || '',
        role: data.role || 'view-only',
        department: data.department || '',
        addedAt: data.addedAt || new Date().toISOString(),
        addedByUid: data.addedByUid || ownerUid,
        addedByEmail: data.addedByEmail || '',
        status: data.status || 'active',
        allowedModules: data.allowedModules || {
          packingSheets: true,
          factorySchedules: true,
          dispatchChallans: true,
          stickerLabels: true,
          analytics: false,
        },
        notes: data.notes || '',
      });
    });

    if (remoteMembers.length > 0 || snapshot.empty) {
      setLocalMembers(ownerUid, remoteMembers);
      return remoteMembers;
    }
  } catch (err: any) {
    console.warn('Could not load team members from Firestore (using local cache):', err?.message);
  }

  return local;
}

/**
 * Save or update a team member's access level in Firestore.
 */
export async function saveTeamMember(ownerUid: string, member: TeamMemberAccess): Promise<void> {
  // Update local cache first
  const current = getLocalMembers(ownerUid);
  const index = current.findIndex(m => m.id === member.id);
  let updated: TeamMemberAccess[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = member;
  } else {
    updated = [member, ...current];
  }
  setLocalMembers(ownerUid, updated);

  if (!ownerUid) return;

  try {
    const docRef = doc(db, 'users', ownerUid, 'teamAccess', member.id);
    await setDoc(docRef, {
      ...member,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('Failed to persist team member to Firestore:', err?.message);
  }
}

/**
 * Remove a team member's access from Firestore.
 */
export async function removeTeamMember(ownerUid: string, memberId: string): Promise<void> {
  const current = getLocalMembers(ownerUid);
  const updated = current.filter(m => m.id !== memberId);
  setLocalMembers(ownerUid, updated);

  if (!ownerUid) return;

  try {
    const docRef = doc(db, 'users', ownerUid, 'teamAccess', memberId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Failed to delete team member from Firestore:', err?.message);
  }
}

/**
 * Load security settings from Firestore.
 */
export async function loadSecuritySettings(ownerUid: string): Promise<SecuritySettingsData> {
  const defaultSettings: SecuritySettingsData = {
    ownerUid,
    ownerEmail: null,
    enforceViewOnlyForGuest: true,
    allowPublicViewOnlyLink: true,
    requireAuthForViewing: false,
    updatedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_SETTINGS}_${ownerUid}`);
    if (raw) {
      Object.assign(defaultSettings, JSON.parse(raw));
    }
  } catch (err) {
    // ignore
  }

  if (!ownerUid) return defaultSettings;

  try {
    const docRef = doc(db, 'users', ownerUid, 'securitySettings', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const settings: SecuritySettingsData = {
        ownerUid,
        ownerEmail: data.ownerEmail || null,
        enforceViewOnlyForGuest: data.enforceViewOnlyForGuest ?? true,
        allowPublicViewOnlyLink: data.allowPublicViewOnlyLink ?? true,
        requireAuthForViewing: data.requireAuthForViewing ?? false,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      localStorage.setItem(`${STORAGE_KEY_SETTINGS}_${ownerUid}`, JSON.stringify(settings));
      return settings;
    }
  } catch (err: any) {
    console.warn('Could not load security settings from Firestore:', err?.message);
  }

  return defaultSettings;
}

/**
 * Save security settings to Firestore.
 */
export async function saveSecuritySettings(ownerUid: string, settings: SecuritySettingsData): Promise<void> {
  try {
    localStorage.setItem(`${STORAGE_KEY_SETTINGS}_${ownerUid}`, JSON.stringify(settings));
  } catch (err) {
    // ignore
  }

  if (!ownerUid) return;

  try {
    const docRef = doc(db, 'users', ownerUid, 'securitySettings', 'config');
    await setDoc(docRef, {
      ...settings,
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('Failed to save security settings to Firestore:', err?.message);
  }
}
