"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { cn } from "@/lib/cn";
import { countdown, formatDateTime } from "@/lib/time";

type EventCountdownProps = {
  eventAt: number | null;
  registrationClosesAt: number | null;
  venue: string;
  ticketUrl: string;
};

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 1000);
  return () => window.clearInterval(timer);
}

function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-14 flex-col items-center rounded-md bg-surface/60 px-2 py-2">
      <span className="text-headline-medium tabular-nums text-on-primary-container">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-label-small text-on-primary-container/80">{label}</span>
    </div>
  );
}

export function EventCountdown({ eventAt, registrationClosesAt, venue, ticketUrl }: EventCountdownProps) {
  const now = useNow();
  const remaining = eventAt !== null && now !== null ? countdown(eventAt, now) : null;
  const registrationOpen =
    registrationClosesAt !== null && now !== null ? now < registrationClosesAt : null;

  return (
    <Card variant="tinted" className="flex flex-col gap-4 bg-primary-container p-5 text-on-primary-container">
      <div className="flex items-start gap-3">
        <Icon name="festival" className="mt-0.5" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-title-large">DevFest Siliguri</span>
          <span className="text-body-medium text-on-primary-container/80">
            {eventAt ? formatDateTime(new Date(eventAt).toISOString()) : "No date set"}
            {venue ? ` · ${venue}` : ""}
          </span>
        </div>
      </div>

      {now === null ? (
        <div className="h-[68px]" aria-hidden />
      ) : remaining ? (
        <div className="flex flex-wrap gap-2" aria-label="Time until DevFest" role="timer">
          <Unit value={remaining.days} label="days" />
          <Unit value={remaining.hours} label="hours" />
          <Unit value={remaining.minutes} label="min" />
          <Unit value={remaining.seconds} label="sec" />
        </div>
      ) : (
        <p className="text-title-medium">{eventAt ? "This DevFest has happened." : "Set the event date in Event details."}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {registrationOpen !== null && (
          <span
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-sm ps-2 pe-3 text-label-large",
              registrationOpen ? "bg-gdg-green/15 text-on-primary-container" : "bg-error-container text-on-error-container",
            )}
          >
            <Icon name={registrationOpen ? "how_to_reg" : "event_busy"} size={18} />
            {registrationOpen
              ? `Registration open until ${formatDateTime(new Date(registrationClosesAt!).toISOString())}`
              : "Registration closed"}
          </span>
        )}
        <span className="flex-1" />
        {ticketUrl && (
          <Button variant="text" trailingIcon="open_in_new" asChild className="text-on-primary-container">
            <a href={ticketUrl} target="_blank" rel="noreferrer">
              Tickets
            </a>
          </Button>
        )}
        <Button variant="tonal" asChild>
          <Link href="/devfest/event-details">Edit details</Link>
        </Button>
      </div>
    </Card>
  );
}
