# Seed data

| File | What it is |
|------|------------|
| `rtdb-export.uncleaned.json` | Production RTDB export from 2026-10-26, unchanged. It still has the E2E test rows and the known content bugs, so the data-health warnings and the clean-up scripts are tested against it |
| `rtdb-export.json` | The same export after `npm run fix:content -- --apply` and `npm run cleanup:e2e -- --apply` on the emulators. Unit tests check that running both scripts on the uncleaned file reproduces it exactly |

What the clean-up changed:

- Removed the six E2E rows (a perk, a point to note, a review, a home FAQ, a team member and the
  only community event, which also turns `events` off).
- Schedule: the 12:10 AM panel is now 12:10 PM, the second panel lasts 30 minutes, and "Nitin
  Praksh" is "Nitin Prakash". He was added to `speakers` with the schedule photo and an empty
  headline for organisers to fill in.
- Swapped the JGEC and AOT partner links.
- DevFest FAQs give the 14 Nov 2026 date and ITC Fortune Select Siliguri as the venue. The three
  Royal Sarovar questions (location, directions, parking) were removed.
- Event details: trimmed the venue name, kept only the maps embed URL, cleared the 2025 ticket
  link, fixed "technogies", "givaways" and "voluneers", and changed "DevFest 2025" to
  "DevFest 2026" in the points to note.
- Removed the malformed `?updatedAt=17631744463642` from one team photo.

When production has been cleaned, replace `rtdb-export.json` with a fresh production export and
update the date above.
