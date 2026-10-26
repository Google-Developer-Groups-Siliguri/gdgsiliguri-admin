import type { LinkKey, SponsorTier, TeamRole } from "@/lib/schema/v2";

export { formatLegacyDate, formatLegacyDateTime, formatLegacyTime } from "@/lib/time/tz";

export const LEGACY_TIME_ZONE_LABEL = "IST";

export const LEGACY_SOCIAL: { key: LinkKey; name: string; image: string }[] = [
  {
    key: "x",
    name: "Twitter",
    image: "https://ik.imagekit.io/gdgsiliguri1/social%20media/x_light.svg?updatedAt=1730918497365",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    image: "https://ik.imagekit.io/gdgsiliguri1/social%20media/linkedin_light.svg?updatedAt=1730918497550",
  },
  {
    key: "instagram",
    name: "Instagram",
    image: "https://ik.imagekit.io/gdgsiliguri1/social%20media/instagram_light.svg?updatedAt=1730918497495",
  },
  {
    key: "facebook",
    name: "Facebook",
    image: "https://ik.imagekit.io/gdgsiliguri1/social%20media/facebook_light.svg?updatedAt=1730918497583",
  },
  {
    key: "github",
    name: "GitHub",
    image: "https://ik.imagekit.io/gdgsiliguri1/social%20media/github_light.svg?updatedAt=1730918497302",
  },
];

export const LEGACY_TRACK_LABELS = ["AI", "App", "Cloud", "Web"] as const;

export const LEGACY_SPONSOR_TIERS = ["platinum", "gold", "silver"] as const satisfies readonly SponsorTier[];

export const LEGACY_TEAM_ROLES: Partial<Record<TeamRole, string>> = {
  organizer: "Organizer",
  volunteer: "Volunteer",
};
