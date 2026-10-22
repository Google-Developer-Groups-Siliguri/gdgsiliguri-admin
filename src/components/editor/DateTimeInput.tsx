"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { DatePicker } from "@/components/m3/DatePicker";
import { TimePicker } from "@/components/m3/TimePicker";
import { formatDateTime, parseDateTime, time12ToTime24, time24ToTime12 } from "@/lib/datetime";

type DateTimeInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  supportingText?: string;
};

export function DateTimeInput<T extends FieldValues>({ control, name, label, supportingText }: DateTimeInputProps<T>) {
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
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 text-label-large text-on-surface-variant">{label}</legend>
            <div className="grid grid-cols-1 gap-4 compact:grid-cols-2">
              <DatePicker
                label="Date"
                value={date}
                onChange={(next) => update(next, time || "09:00 AM")}
                error={fieldState.error && !parts ? fieldState.error.message : undefined}
                supportingText="YYYY-MM-DD"
              />
              <TimePicker
                label="Time"
                value={time}
                onChange={(next) => update(date, next)}
                supportingText="Indian Standard Time"
              />
            </div>
            {supportingText && <p className="px-4 text-body-small text-on-surface-variant">{supportingText}</p>}
          </fieldset>
        );
      }}
    />
  );
}
