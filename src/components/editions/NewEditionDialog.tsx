"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/m3/Button";
import { DatePicker } from "@/components/m3/DatePicker";
import { Dialog } from "@/components/m3/Dialog";
import { Select } from "@/components/m3/Select";
import { useSnackbar } from "@/components/m3/Snackbar";
import { Switch } from "@/components/m3/Switch";
import { TextField } from "@/components/m3/TextField";
import { createEditionAction } from "@/lib/cms/actions";

type NewEditionDialogProps = { years: number[] };

export function NewEditionDialog({ years }: NewEditionDialogProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const latest = years[0] ?? new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(latest + 1));
  const [from, setFrom] = useState(String(latest));
  const [date, setDate] = useState("");
  const [copyPartners, setCopyPartners] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const valid = /^\d{4}$/.test(year) && date.startsWith(year) && years.length > 0;

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createEditionAction({ year: Number(year), from: Number(from), date, copyPartners });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      showSnackbar({ message: `DevFest ${year} created as a draft. Nothing is public until you publish it.` });
      router.push(`/devfest/${year}/event`);
    });
  }

  return (
    <>
      <Button icon="add" size="large" onClick={() => setOpen(true)} disabled={years.length === 0}>
        New edition…
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New DevFest edition"
        description="It starts as a draft copied from an earlier edition. Registration is cleared and every section is off."
        confirmLabel={pending ? "Creating…" : "Create"}
        confirmDisabled={!valid || pending}
        onConfirm={create}
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Year"
            value={year}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setYear(event.target.value)}
          />
          <Select
            label="Copy from"
            value={from}
            options={years.map((value) => ({ value: String(value), label: `DevFest ${value}` }))}
            onValueChange={setFrom}
          />
          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
            supportingText={`Pick the day in ${year}; the times are copied.`}
          />
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4">
            <span className="text-body-large text-on-surface">Copy the community partners</span>
            <Switch checked={copyPartners} onCheckedChange={setCopyPartners} aria-label="Copy the community partners" />
          </label>
          {error && <p className="text-body-medium text-error">{error}</p>}
        </div>
      </Dialog>
    </>
  );
}
