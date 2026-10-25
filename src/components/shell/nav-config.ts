import type { NavGroup } from "@/components/m3/navigation";
import { SECTIONS, type SectionKey } from "@/lib/content/sections";

const SHORT_LABELS: Partial<Record<SectionKey, string>> = {
  eventDetails: "Event",
  communityPartners: "Partners",
  devfestFaqs: "FAQ",
  gdgFaqs: "Home FAQ",
};

function sectionItems(keys: SectionKey[]) {
  return keys.map((key) => ({
    href: SECTIONS[key].href,
    label: SECTIONS[key].label,
    shortLabel: SHORT_LABELS[key],
    icon: SECTIONS[key].icon,
  }));
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    icon: "dashboard",
    items: [{ href: "/", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "DevFest",
    icon: "festival",
    items: sectionItems([
      "eventDetails",
      "schedule",
      "speakers",
      "sponsors",
      "communityPartners",
      "devfestFaqs",
    ]),
  },
  {
    label: "Community",
    icon: "groups",
    items: sectionItems(["events", "teams", "gdgFaqs", "feedbacks"]),
  },
  {
    label: "Settings",
    icon: "settings",
    items: [
      { href: "/settings/admins", label: "Admins", icon: "admin_panel_settings", ownerOnly: true },
      { href: "/settings/activity", label: "Activity log", shortLabel: "Activity", icon: "history" },
    ],
  },
];
