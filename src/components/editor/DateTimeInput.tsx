"use client";

import type { ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { DatePicker } from "@/components/m3/DatePicker";
import { TimePicker } from "@/components/m3/TimePicker";
import { formatDateTime, parseDateTime, time12ToTime24, time24ToTime12 } from "@/lib/datetime";

type DateTimeInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  supportingText?: string;
  summary?: ReactNode;
};

export function DateTimeInput<T extends FieldValues>({ control, name, label, supportingText, summary }: DateTimeInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value as string) ?? "";
        const parts = parseDateTime(value);
        const date = parts?.date ?? "";
        const time = parts ? (time24ToTime12(parts.time24) ?? "") : "";
        const update = (nextDate: string, nextTime: string) => {
          const time24 = time12ToTime24(nextTime);
          if (!nextDate || !time24) return;
          field.onChange(formatDateTime(nextDate, time24, parts?.seconds, parts?.millis));
        };
        return (
          <fieldset className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <legend className="contents text-label-large text-on-surface">{label}</legend>
              {summary}
            </div>
            <div className="flex flex-col gap-1 compact:flex-row">
              <div className="compact:flex-[1.4]">
                <DatePicker
                  label="Date"
                  labelPlacement="inside"
                  shape="start"
                  value={date}
                  onChange={(next) => update(next, time || "09:00 AM")}
                  error={fieldState.error && !parts ? fieldState.error.message : undefined}
                  supportingText=""
                />
              </div>
              <div className="compact:flex-1">
                <TimePicker
                  label="Time"
                  labelPlacement="inside"
                  shape="end"
                  value={time}
                  onChange={(next) => update(date, next)}
                  supportingText=""
                />
              </div>
            </div>
            {supportingText && <p className="px-4 text-body-small text-on-surface-variant">{supportingText}</p>}
          </fieldset>
        );
      }}
    />
  );
}
