export interface AppUserProfile {
  uid: string;
  email: string;
  userName: string | null;
  photoURL: string | null;
  phone: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AppUserProfilePatch {
  email?: string;
  userName?: string | null;
  photoURL?: string | null;
  phone?: string | null;
}
