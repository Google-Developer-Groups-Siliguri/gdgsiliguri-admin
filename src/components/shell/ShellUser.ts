import type { Role } from "@/lib/auth/roles";

export type ShellUser = {
  email: string;
  role: Role;
  displayName: string | null;
  photoURL: string | null;
};
