export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: string;
  badge?: boolean;
  ownerOnly?: boolean;
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

export function visibleGroups(groups: NavGroup[], isOwner: boolean): NavGroup[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => isOwner || !item.ownerOnly) }))
    .filter((group) => group.items.length > 0);
}

export function findNavItem(groups: NavGroup[], pathname: string): NavItem | undefined {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
