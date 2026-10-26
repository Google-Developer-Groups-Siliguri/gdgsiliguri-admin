"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Icon } from "@/components/m3/Icon";
import { cn } from "@/lib/cn";
import { countdown, eventDateParts, formatDateTime } from "@/lib/time";

type EventCountdownProps = {
  eventAt: number | null;
  registrationClosesAt: number | null;
  venue: string;
  ticketUrl: string;
  editHref: string;
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

const TILE_RADII = ["28px 8px 8px 28px", "8px", "8px", "8px 28px 28px 8px"];

function Tiles({ values }: { values: [number, string][] }) {
  return (
    <div className="grid grid-cols-4 gap-1" aria-label="Time until DevFest" role="timer">
      {values.map(([value, label], index) => (
        <div
          key={label}
          className="flex flex-col items-center overflow-hidden bg-surface-container-lowest py-4 text-on-surface"
          style={{ borderRadius: TILE_RADII[index] }}
        >
          <b key={value} className="text-[clamp(28px,3.2vw,40px)] leading-none font-black tabular-nums animate-digit">
            {String(value).padStart(2, "0")}
          </b>
          <span className="text-label-medium font-semibold text-on-surface-variant">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function EventCountdown({ eventAt, registrationClosesAt, venue, ticketUrl, editHref }: EventCountdownProps) {
  const now = useNow();
  const remaining = eventAt !== null && now !== null ? countdown(eventAt, now) : null;
  const registrationOpen =
    registrationClosesAt !== null && now !== null ? now < registrationClosesAt : null;
  const date = eventAt !== null ? eventDateParts(eventAt) : null;

  return (
    <section
      aria-label="DevFest Siliguri"
      className="relative flex h-full flex-col gap-6 overflow-hidden rounded-[clamp(32px,4vw,48px)] bg-primary-container p-[clamp(24px,3.5vw,40px)] text-on-primary-container"
    >
      <div className="shape-cookie9 pointer-events-none absolute -end-28 -top-28 size-80 bg-primary opacity-20" aria-hidden />

      <div className="relative flex flex-col gap-3">
        <span className="flex items-center gap-2 text-eyebrow">
          {remaining && <span className="size-2 rounded-full bg-current animate-pulse-dot" aria-hidden />}
          {date ? `DevFest · ${date.weekday} ${date.day} ${date.month} ${date.year}` : "DevFest · No date set"}
        </span>
        <h2 className="font-display text-[clamp(40px,5vw,72px)] leading-[0.88] font-extralight tracking-[-0.05em]">
          Dev<b className="font-black">Fest</b> Siliguri{date && <> <b className="font-black">{date.year}</b></>}
        </h2>
        {venue && (
          <span className="flex items-start gap-1.5 text-body-large">
            <Icon name="location_on" size={20} className="mt-0.5" />
            {venue}
          </span>
        )}
      </div>

      <div className="relative flex flex-col gap-3">
        {now === null ? (
          <div className="h-[84px]" aria-hidden />
        ) : remaining ? (
          <Tiles
            values={[
              [remaining.days, "days"],
              [remaining.hours, "hours"],
              [remaining.minutes, "min"],
              [remaining.seconds, "sec"],
            ]}
          />
        ) : (
          <div className="flex flex-col gap-1 rounded-[28px] bg-surface-container-lowest px-6 py-5 text-on-surface">
            <span className="text-eyebrow text-on-surface-variant">{eventAt ? "That's a wrap" : "Not scheduled"}</span>
            <b className="font-display text-[20px] font-extrabold">
              {eventAt ? "This DevFest has happened." : "Set the event date in Event details."}
            </b>
          </div>
        )}

        {registrationOpen !== null && (
          <span
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 self-start rounded-full ps-3 pe-4 text-label-large",
              registrationOpen ? "bg-primary text-on-primary" : "bg-error-container text-on-error-container",
            )}
          >
            <Icon name={registrationOpen ? "how_to_reg" : "event_busy"} size={18} />
            {registrationOpen
              ? `Registration open until ${formatDateTime(new Date(registrationClosesAt!).toISOString())}`
              : "Registration closed"}
          </span>
        )}

        <div className="flex flex-wrap gap-1 max-compact:flex-col">
          <Link
            href={editHref}
            className={cn(
              "focus-ring press flex h-14 flex-[1_1_200px] items-center max-compact:flex-none justify-center gap-2 bg-primary px-6 font-display text-[17px] font-extrabold text-on-primary hover:rounded-[28px]",
              ticketUrl ? "rounded-[28px_10px_10px_28px] max-compact:rounded-[28px_28px_10px_10px]" : "rounded-[28px]",
            )}
          >
            <Icon name="edit" size={20} />
            Edit details
          </Link>
          {ticketUrl && (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring press flex h-14 flex-[1_1_160px] items-center max-compact:flex-none justify-center gap-2 rounded-[10px_28px_28px_10px] bg-surface-container-lowest px-6 font-display text-[17px] font-extrabold text-on-surface hover:rounded-[28px] max-compact:rounded-[10px_10px_28px_28px]"
            >
              <Icon name="confirmation_number" size={20} />
              Tickets
              <Icon name="open_in_new" size={18} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
