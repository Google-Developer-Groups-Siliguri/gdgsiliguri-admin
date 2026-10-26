import { durationInMins } from "@/lib/datetime";

import type { Change, PatchResult } from "./cleanup";
import type { SectionValues } from "./schemas";

const NITIN = "Nitin Prakash";
const EMBED_URL = /^https:\/\/www\.google\.com\/maps\/embed\?pb=[^"\s]+/;
const STALE_VENUE_QUESTIONS = [/where is the royal sarovar/i, /get to the royal sarovar/i, /parking .*royal sarovar/i];

const SPELLING_FIXES: [RegExp, string][] = [
  [/\btechnogies\b/g, "technologies"],
  [/\bgivaways\b/g, "giveaways"],
  [/\bvoluneers\b/g, "volunteers"],
];
const YEAR_FIX: [RegExp, string] = [/DevFest 2025/g, "DevFest 2026"];

function fixText(value: string, fixes: [RegExp, string][] = SPELLING_FIXES): string {
  return fixes.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function fixSchedule(schedule: SectionValues["schedule"], changes: Change[]): SectionValues["schedule"] {
  const data = schedule.data.map((slot, index) => {
    const next = { ...slot };
    const path = `schedule.data[${index}]`;
    if (/^12:\d\d AM$/.test(next.startTime) && index > 0) {
      const endPm = next.endTime.replace(/^(12:\d\d) AM$/, "$1 PM");
      changes.push({
        section: "schedule",
        path,
        description: `"${next.title}" ${next.startTime}–${next.endTime} → ${next.startTime.replace("AM", "PM")}–${endPm}`,
      });
      next.startTime = next.startTime.replace("AM", "PM");
      next.endTime = endPm;
    }
    if (next.subTitle.trim() === "Nitin Praksh") {
      changes.push({ section: "schedule", path: `${path}.subTitle`, description: `"Nitin Praksh" → "${NITIN}"` });
      next.subTitle = NITIN;
    }
    const computed = durationInMins(next.startTime, next.endTime);
    if (computed !== null && computed !== next.durationInMins) {
      changes.push({
        section: "schedule",
        path: `${path}.durationInMins`,
        description: `"${next.title}" duration ${next.durationInMins} → ${computed}`,
      });
      next.durationInMins = computed;
    }
    return next;
  });
  return { ...schedule, data };
}

function addMissingSpeaker(
  speakers: SectionValues["speakers"],
  schedule: SectionValues["schedule"] | undefined,
  changes: Change[],
): SectionValues["speakers"] {
  const slot = schedule?.data.find((item) => item.subTitle === NITIN);
  if (!slot || speakers.data.some((speaker) => speaker.name.trim() === NITIN)) return speakers;
  changes.push({
    section: "speakers",
    path: `speakers.data[${speakers.data.length}]`,
    description: `Add "${NITIN}" (photo from the schedule; headline left for organisers)`,
  });
  const speaker = {
    name: NITIN,
    description: "",
    designation: "App",
    profilePictureURL: slot.image,
    githubURL: "",
    linkedInURL: "",
    twitterURL: "",
  };
  return { ...speakers, data: [...speakers.data, speaker] };
}

function fixPartners(partners: SectionValues["communityPartners"], changes: Change[]): SectionValues["communityPartners"] {
  const data = partners.data.map((partner) => ({ ...partner }));
  const jgec = data.findIndex((partner) => /jalpaiguri/i.test(partner.communityName));
  const aot = data.findIndex((partner) => /academy of technology/i.test(partner.communityName));
  if (jgec < 0 || aot < 0) return partners;
  if (!/academy-of-technology/.test(data[jgec].socialMediaLink) || !/jalpaiguri/.test(data[aot].socialMediaLink)) {
    return partners;
  }
  [data[jgec].socialMediaLink, data[aot].socialMediaLink] = [data[aot].socialMediaLink, data[jgec].socialMediaLink];
  changes.push({
    section: "communityPartners",
    path: `communityPartners.data[${jgec}]/[${aot}]`,
    description: "Swap the JGEC and AOT links",
  });
  return { ...partners, data };
}

function fixDevfestFaqs(faqs: SectionValues["devfestFaqs"], changes: Change[]): SectionValues["devfestFaqs"] {
  const data = faqs.data.flatMap((faq, index) => {
    const path = `FAQs.data[${index}]`;
    if (STALE_VENUE_QUESTIONS.some((pattern) => pattern.test(faq.question))) {
      changes.push({ section: "devfestFaqs", path, description: `Remove "${faq.question}" (old venue)` });
      return [];
    }
    let answer = faq.answer;
    if (/when is devfest/i.test(faq.question)) answer = "Devfest Siliguri will be held on November 14, 2026.";
    if (/venue for devfest/i.test(faq.question)) answer = "Devfest Siliguri will be held at ITC Fortune Select Siliguri.";
    if (answer === faq.answer) return [faq];
    changes.push({ section: "devfestFaqs", path: `${path}.answer`, description: `"${faq.answer}" → "${answer}"` });
    return [{ ...faq, answer }];
  });
  return { ...faqs, data };
}

function fixStrings(strings: string[], path: string, changes: Change[], fixes = SPELLING_FIXES): string[] {
  return strings.map((text, index) => {
    const fixed = fixText(text, fixes);
    if (fixed !== text) {
      changes.push({ section: "eventDetails", path: `${path}[${index}]`, description: `"${text}" → "${fixed}"` });
    }
    return fixed;
  });
}

function fixEventDetails(details: SectionValues["eventDetails"], changes: Change[]): SectionValues["eventDetails"] {
  const next = structuredClone(details);
  const venueName = next.eventVenue.name.trim();
  if (venueName !== next.eventVenue.name) {
    changes.push({ section: "eventDetails", path: "eventDetails.eventVenue.name", description: "Trim trailing space" });
    next.eventVenue.name = venueName;
  }
  const embed = EMBED_URL.exec(next.eventVenue.mapsURLweb)?.[0];
  if (embed && embed !== next.eventVenue.mapsURLweb) {
    changes.push({
      section: "eventDetails",
      path: "eventDetails.eventVenue.mapsURLweb",
      description: "Keep only the embed URL (drop the iframe attributes)",
    });
    next.eventVenue.mapsURLweb = embed;
  }
  if (next.eventTicketURL !== "") {
    changes.push({
      section: "eventDetails",
      path: "eventDetails.eventTicketURL",
      description: "Clear the 2025 ticket link (2026 registration is pending)",
    });
    next.eventTicketURL = "";
  }
  const summary = fixText(next.bannerDescription);
  if (summary !== next.bannerDescription) {
    changes.push({ section: "eventDetails", path: "eventDetails.bannerDescription", description: "Fix \"technogies\"" });
    next.bannerDescription = summary;
  }
  next.perks.data = fixStrings(next.perks.data, "eventDetails.perks.data", changes);
  next.pointsToNote.data = fixStrings(next.pointsToNote.data, "eventDetails.pointsToNote.data", changes, [
    ...SPELLING_FIXES,
    YEAR_FIX,
  ]);
  return next;
}

function fixTeams(teams: SectionValues["teams"], changes: Change[]): SectionValues["teams"] {
  const data = teams.data.map((member, index) => {
    const url = member.profilePictureURL.replace(/\?updatedAt=\d{14,}$/, "");
    if (url === member.profilePictureURL) return member;
    changes.push({
      section: "teams",
      path: `teams.data[${index}].profilePictureURL`,
      description: `Remove the malformed ?updatedAt from ${member.name}'s photo`,
    });
    return { ...member, profilePictureURL: url };
  });
  return { ...teams, data };
}

export function applyKnownFixes(sections: Partial<SectionValues>): PatchResult {
  const changes: Change[] = [];
  const next: Partial<SectionValues> = { ...sections };
  if (next.schedule) next.schedule = fixSchedule(next.schedule, changes);
  if (next.speakers) next.speakers = addMissingSpeaker(next.speakers, next.schedule, changes);
  if (next.communityPartners) next.communityPartners = fixPartners(next.communityPartners, changes);
  if (next.devfestFaqs) next.devfestFaqs = fixDevfestFaqs(next.devfestFaqs, changes);
  if (next.eventDetails) next.eventDetails = fixEventDetails(next.eventDetails, changes);
  if (next.teams) next.teams = fixTeams(next.teams, changes);
  return { sections: next, changes };
}
