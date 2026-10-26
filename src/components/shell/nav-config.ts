import type { NavGroup } from "@/components/m3/navigation";
import type { RegistryInput } from "@/lib/sections/registry";

export const EDITION_PAGES = [
  { route: "event", label: "Event", icon: "event" },
  { route: "schedule", label: "Schedule", icon: "schedule" },
  { route: "speakers", label: "Speakers", icon: "record_voice_over" },
  { route: "sponsors", label: "Sponsors", icon: "handshake" },
  { route: "partners", label: "Partners", icon: "diversity_3" },
  { route: "faq", label: "FAQ", icon: "quiz" },
] as const;

export function editionFromPath(pathname: string): number | null {
  const match = /^\/devfest\/(\d{4})(?:\/|$)/.exec(pathname);
  return match ? Number(match[1]) : null;
}

export function navGroups(registry: RegistryInput, pathname: string): NavGroup[] {
  const year = editionFromPath(pathname) ?? registry.activeEdition;
  return [
    {
      label: "Overview",
      icon: "dashboard",
      items: [{ href: "/", label: "Dashboard", icon: "dashboard" }],
    },
    {
      label: `DevFest ${year}`,
      icon: "festival",
      items: [
        ...EDITION_PAGES.map((page) => ({
          href: `/devfest/${year}/${page.route}`,
          label: page.label,
          icon: page.icon,
        })),
        { href: "/devfest", label: "All editions", shortLabel: "Editions", icon: "event_repeat" },
      ],
    },
    {
      label: "Community",
      icon: "groups",
      items: [
        { href: "/community/team", label: "Team", icon: "groups" },
        { href: "/community/events", label: "Events", icon: "calendar_month" },
        { href: "/community/reviews", label: "Reviews", icon: "reviews" },
        { href: "/community/faq", label: "FAQ", icon: "help" },
      ],
    },
    {
      label: "Settings",
      icon: "settings",
      items: [
        { href: "/settings/site", label: "Site", icon: "tune" },
        { href: "/settings/admins", label: "Admins", icon: "admin_panel_settings", ownerOnly: true },
        { href: "/settings/activity", label: "Activity log", shortLabel: "Activity", icon: "history" },
      ],
    },
  ];
}
