export interface RealmUpdateData {
  displayName?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export interface RealmStats {
  users: number;
  agents: number;
  projects: number;
  adapters: number;
}

export interface RealmMember {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'active' | 'suspended' | 'left';
  joinedAt: string;
}

export interface RealmAdapter {
  adapterId: string;
  name: string;
  provider: string;
  model: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
}
