export type ProfileResponse = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  jobTitle: string;
  timezone: string;
  language: string;
  twoFactorEnabled: boolean;
  mfaFactorId: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
};

export type ProfileSummary = Pick<ProfileResponse, "name" | "email" | "phone" | "twoFactorEnabled">;
