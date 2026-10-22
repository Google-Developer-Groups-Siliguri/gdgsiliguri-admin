export const ROLES = ["owner", "editor"] as const;

export type Role = (typeof ROLES)[number];

export type AdminUser = {
  uid: string;
  email: string;
  role: Role;
  displayName: string | null;
  photoURL: string | null;
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasRole(user: Pick<AdminUser, "role">, required: Role): boolean {
  return required === "editor" || user.role === "owner";
}
