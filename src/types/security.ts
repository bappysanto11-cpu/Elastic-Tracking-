export type TeamAccessRole = 'view-only' | 'editor' | 'admin';

export interface TeamMemberAccess {
  id: string;
  email: string;
  displayName: string;
  role: TeamAccessRole;
  department?: string;
  addedAt: string;
  addedByUid: string;
  addedByEmail?: string;
  status: 'active' | 'suspended';
  allowedModules: {
    packingSheets: boolean;
    factorySchedules: boolean;
    dispatchChallans: boolean;
    stickerLabels: boolean;
    analytics: boolean;
  };
  notes?: string;
}

export interface SecuritySettingsData {
  ownerUid: string;
  ownerEmail: string | null;
  enforceViewOnlyForGuest: boolean;
  allowPublicViewOnlyLink: boolean;
  requireAuthForViewing: boolean;
  updatedAt: string;
}
