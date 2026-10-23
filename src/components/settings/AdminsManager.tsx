"use client";

import { useState, useTransition } from "react";

import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { ConfirmDialog, Dialog } from "@/components/m3/Dialog";
import { IconButton } from "@/components/m3/IconButton";
import { SegmentedButton } from "@/components/m3/SegmentedButton";
import { Select } from "@/components/m3/Select";
import { useSnackbar } from "@/components/m3/Snackbar";
import { TextField } from "@/components/m3/TextField";
import { Avatar } from "@/components/shell/AccountMenu";
import type { AdminSummary } from "@/lib/admins/repository";
import type { Role } from "@/lib/auth/roles";
import { addAdminAction, changeRoleAction, removeAdminAction, type SimpleResult } from "@/lib/site-actions";
import { formatDateTime } from "@/lib/time";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
];

const ROLE_HELP: Record<Role, string> = {
  owner: "Can edit and publish everything, and manage admins.",
  editor: "Can edit, publish and turn sections on or off, and rebuild the site.",
};

export function AdminsManager({ admins, currentEmail }: { admins: AdminSummary[]; currentEmail: string }) {
  const showSnackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AdminSummary | null>(null);

  function run(action: () => Promise<SimpleResult>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        after?.();
        showSnackbar({ message: success });
      } else {
        showSnackbar({ message: result.message, tone: "error" });
      }
    });
  }

  function invite() {
    startTransition(async () => {
      const result = await addAdminAction(email, role);
      if (!result.ok) {
        setInviteError(result.message);
        return;
      }
      showSnackbar({ message: `${email.trim().toLowerCase()} can now sign in.` });
      setInviteOpen(false);
      setEmail("");
      setRole("editor");
      setInviteError(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-medium text-on-surface-variant">
          Anyone listed here can sign in with that Google account. Added people can sign in right away.
        </p>
        <Button icon="person_add" onClick={() => setInviteOpen(true)}>
          Add admin
        </Button>
      </div>

      <Card variant="outlined" className="overflow-hidden">
        <ul className="divide-y divide-outline-variant" aria-label="Admins">
          {admins.map((admin) => {
            const isYou = admin.email === currentEmail;
            return (
              <li key={admin.email} className="flex flex-col gap-3 p-4 compact:flex-row compact:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    user={{ email: admin.email, role: admin.role, displayName: admin.displayName, photoURL: admin.photoURL }}
                    size={40}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 truncate text-body-large text-on-surface">
                      <span className="truncate">{admin.displayName ?? admin.email}</span>
                      {isYou && (
                        <span className="rounded-xs bg-secondary-container px-1.5 text-label-small text-on-secondary-container">
                          You
                        </span>
                      )}
                    </span>
                    {admin.displayName && (
                      <span className="truncate text-body-medium text-on-surface-variant">{admin.email}</span>
                    )}
                    <span className="text-body-small text-on-surface-variant" title={formatDateTime(admin.lastLoginAt)}>
                      Last sign-in <RelativeTime iso={admin.lastLoginAt} /> · added by {admin.addedBy || "unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <Select
                      label="Role"
                      variant="outlined"
                      value={admin.role}
                      options={ROLE_OPTIONS}
                      disabled={pending}
                      onValueChange={(value) =>
                        run(() => changeRoleAction(admin.email, value as Role), `${admin.email} is now ${value === "owner" ? "an owner" : "an editor"}.`)
                      }
                    />
                  </div>
                  <IconButton
                    icon="person_remove"
                    label={`Remove ${admin.email}`}
                    disabled={isYou || pending}
                    onClick={() => setRemoving(admin)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteError(null);
        }}
        title="Add admin"
        fullScreenOnMobile
        confirmLabel={pending ? "Adding…" : "Add"}
        confirmDisabled={pending || !email.trim()}
        onConfirm={invite}
      >
        <form
          className="flex flex-col gap-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            invite();
          }}
        >
          <TextField
            label="Google account email"
            type="email"
            autoComplete="off"
            autoFocus
            required
            value={email}
            error={inviteError ?? undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <SegmentedButton
              label="Role"
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              segments={ROLE_OPTIONS}
              className="w-full"
            />
            <p className="px-4 text-body-small text-on-surface-variant">{ROLE_HELP[role]}</p>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        icon="person_remove"
        destructive
        title={`Remove ${removing?.email ?? ""}?`}
        description="They are signed out everywhere and can no longer sign in. Their past activity stays in the log."
        confirmLabel="Remove"
        busy={pending}
        onConfirm={() => {
          const target = removing;
          if (!target) return;
          run(() => removeAdminAction(target.email), `${target.email} was removed.`, () => setRemoving(null));
        }}
      />
    </div>
  );
}
