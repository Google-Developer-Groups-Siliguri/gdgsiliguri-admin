# Project showcase form

Attendees submit projects with a Google Form. An Apps Script on the form's response sheet sends
each response to the admin, where it waits in **Community → Showcase** until someone approves it.

## Set up

1. Create the form with these questions (titles must match): Project name, Short description,
   Longer write-up, Email address, Team members, Repository link, Live demo link, Video link,
   Tech used, Screenshots, Consent to publish.
2. Make **Consent to publish** required. Its text must say that the project, team names and links
   will be shown publicly, and that **the email address is used only to contact the team and is
   never published**.
3. Link the form to a sheet, open Extensions → Apps Script and paste `Code.gs`.
4. In Project settings → Script properties add:
   - `INGEST_URL`: `https://<admin host>/api/showcase/ingest`
   - `INGEST_SECRET`: from Settings → Showcase form in the admin (shown once)
   - `EDITION`: the DevFest year, for example `2026`
5. Triggers → Add trigger → `onFormSubmit`, event source "From spreadsheet", type "On form submit".
6. Turn on **Accepting submissions** in the admin.

Screenshots should be Google Drive links shared with "Anyone with the link". Reviewers copy them to
ImageKit from the submission; if that fails, upload them by hand.

Contact details are deleted 60 days after the edition ends (`npm run retention`).
