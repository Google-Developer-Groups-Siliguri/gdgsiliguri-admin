"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { Dialog } from "@/components/m3/Dialog";
import { useSnackbar } from "@/components/m3/Snackbar";
import { Tab, TabList, Tabs } from "@/components/m3/Tabs";
import { TextField } from "@/components/m3/TextField";
import type { Submission, SubmissionStatus } from "@/lib/cms/showcase";
import {
  approveSubmissionAction,
  copyImagesAction,
  featureShowcaseAction,
  hideSubmissionAction,
  rejectSubmissionAction,
  saveSubmissionAction,
  type ShowcaseActionResult,
} from "@/lib/cms/showcase-actions";

const TABS: { value: SubmissionStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "hidden", label: "Hidden" },
];

type ShowcaseQueueProps = { status: SubmissionStatus; submissions: Submission[]; featured: Record<string, boolean> };

function Detail({ submission, featured, onClose }: { submission: Submission; featured: boolean; onClose: () => void }) {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [payload, setPayload] = useState(submission.payload);
  const [note, setNote] = useState("");

  function act<T>(task: () => Promise<ShowcaseActionResult<T>>, success: string, close = true) {
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        showSnackbar({ message: result.message, tone: "error" });
        return;
      }
      showSnackbar({ message: success });
      if (close) onClose();
    });
  }

  const set = (key: keyof Submission["payload"], value: string) =>
    setPayload((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={submission.payload.title} wide fullScreenOnMobile>
      <div className="flex flex-col gap-4">
        <p className="text-body-small text-on-surface-variant">
          {submission.consent ? "The team agreed to publishing." : "No consent to publish."} Contact details stay
          private and are never published.
        </p>
        <TextField
          label="Title"
          value={payload.title}
          maxLength={80}
          onChange={(event) => set("title", event.target.value)}
        />
        <TextField
          label="Summary"
          value={payload.summary}
          maxLength={280}
          multiline
          rows={3}
          onChange={(event) => set("summary", event.target.value)}
        />
        <TextField
          label="Write-up"
          value={payload.body ?? ""}
          multiline
          rows={5}
          onChange={(event) => set("body", event.target.value)}
        />
        <p className="text-body-medium text-on-surface">Team: {payload.team.map((member) => member.name).join(", ")}</p>
        {(payload.images ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(payload.images ?? []).map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image.url} src={image.url} alt={image.alt} className="h-24 rounded-md object-cover" />
            ))}
          </div>
        )}
        {submission.rawImageLinks.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-body-small text-on-surface-variant">
              {submission.rawImageLinks.length} screenshot link(s) from the form.
            </p>
            <div>
              <Button
                variant="tonal"
                icon="cloud_download"
                disabled={pending}
                onClick={() => act(() => copyImagesAction(submission.id), "Images copied to ImageKit.", false)}
              >
                Copy images to ImageKit
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon="save"
            disabled={pending}
            onClick={() => act(() => saveSubmissionAction(submission.id, payload), "Changes saved.", false)}
          >
            Save changes
          </Button>
          {submission.status !== "approved" && (
            <Button
              icon="check"
              disabled={pending || !submission.consent}
              onClick={() => act(() => approveSubmissionAction(submission.id), "Approved and published.")}
            >
              Approve
            </Button>
          )}
          {submission.status === "approved" && submission.publishedId && (
            <Button
              variant="tonal"
              icon="star"
              disabled={pending}
              onClick={() =>
                act(
                  () => featureShowcaseAction(submission.publishedId!, !featured),
                  featured ? "No longer featured." : "Featured.",
                )
              }
            >
              {featured ? "Unfeature" : "Feature"}
            </Button>
          )}
          {submission.status === "approved" && (
            <Button
              variant="text"
              icon="visibility_off"
              disabled={pending}
              onClick={() => act(() => hideSubmissionAction(submission.id), "Hidden from the website and the app.")}
            >
              Hide
            </Button>
          )}
        </div>
        {submission.status === "pending" && (
          <div className="flex flex-col gap-2">
            <TextField label="Reason for rejecting" value={note} onChange={(event) => setNote(event.target.value)} />
            <div>
              <Button
                variant="text"
                icon="block"
                disabled={pending || !note.trim()}
                onClick={() => act(() => rejectSubmissionAction(submission.id, note), "Rejected.")}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function ShowcaseQueue({ status, submissions, featured }: ShowcaseQueueProps) {
  const router = useRouter();
  const [open, setOpen] = useState<Submission | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Tabs value={status} onValueChange={(value) => router.push(`/community/showcase?status=${value}`)}>
        <TabList aria-label="Submission status">
          {TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tab>
          ))}
        </TabList>
      </Tabs>
      {submissions.length === 0 ? (
        <p className="rounded-lg bg-surface-container px-5 py-6 text-body-medium text-on-surface-variant">
          Nothing here.
        </p>
      ) : (
        <ol className="segmented-list" aria-label="Submissions">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <button
                type="button"
                onClick={() => setOpen(submission)}
                className="focus-ring flex w-full cursor-pointer flex-col items-start gap-0.5 px-4 py-3 text-start"
              >
                <span className="font-display text-[17px] font-bold text-on-surface">
                  {submission.payload.title}
                  {submission.publishedId && featured[submission.publishedId] ? " · Featured" : ""}
                </span>
                <span className="text-body-small text-on-surface-variant">
                  {submission.payload.team.map((member) => member.name).join(", ")}
                  {submission.payload.edition ? ` · DevFest ${submission.payload.edition}` : ""} ·{" "}
                  <RelativeTime iso={submission.submittedAt} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {open && (
        <Detail
          submission={open}
          featured={Boolean(open.publishedId && featured[open.publishedId])}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
