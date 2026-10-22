import type { SectionValues } from "./schemas";
import { SPONSOR_TIERS } from "./schemas";
import type { SectionKey } from "./sections";

export type ItemSummary = {
  primary: string;
  secondary?: string;
  image?: string;
  group?: string;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function summarizeItems<K extends SectionKey>(key: K, value: SectionValues[K]): ItemSummary[] {
  switch (key) {
    case "teams":
    case "speakers":
      return (value as SectionValues["teams"]).data.map((member) => ({
        primary: member.name,
        secondary: [member.designation, member.description].filter(Boolean).join(" · "),
        image: member.profilePictureURL,
      }));
    case "schedule":
      return (value as SectionValues["schedule"]).data.map((slot) => ({
        primary: slot.title,
        secondary: [`${slot.startTime} – ${slot.endTime}`, slot.subTitle].filter(Boolean).join(" · "),
        image: slot.image,
      }));
    case "sponsors": {
      const sponsors = value as SectionValues["sponsors"];
      return SPONSOR_TIERS.flatMap((tier) =>
        sponsors[tier].map((sponsor) => ({
          primary: sponsor.sponsorName,
          secondary: capitalize(tier),
          image: sponsor.icon,
          group: capitalize(tier),
        })),
      );
    }
    case "communityPartners":
      return (value as SectionValues["communityPartners"]).data.map((partner) => ({
        primary: partner.communityName,
        secondary: partner.socialMediaLink,
        image: partner.icon,
      }));
    case "devfestFaqs":
    case "gdgFaqs":
      return (value as SectionValues["gdgFaqs"]).data.map((faq) => ({
        primary: faq.question,
        secondary: faq.answer,
      }));
    case "feedbacks":
      return (value as SectionValues["feedbacks"]).data.map((review) => ({
        primary: review.feedbackTitle,
        secondary: `${review.name} ${review.eventAttended}`.trim(),
      }));
    case "events":
      return (value as SectionValues["events"]).data.map((event) => ({
        primary: event.name,
        secondary: [event.eventDate, event.tagline].filter(Boolean).join(" · "),
        image: event.thumbnail,
      }));
    default:
      return [];
  }
}
