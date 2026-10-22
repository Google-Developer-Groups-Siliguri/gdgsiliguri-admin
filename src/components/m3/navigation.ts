export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: string;
  badge?: boolean;
};

export type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
};

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
