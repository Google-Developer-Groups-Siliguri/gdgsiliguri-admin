import { Icon } from "@/components/m3/Icon";
import type { Change } from "@/lib/cms/changes";

const KIND: Record<Change["kind"], { icon: string; verb: string; tone: string }> = {
  added: { icon: "add_circle", verb: "Added", tone: "text-primary" },
  removed: { icon: "remove_circle", verb: "Removed", tone: "text-error" },
  changed: { icon: "edit", verb: "Changed", tone: "text-on-surface-variant" },
};

export function ChangesList({ changes }: { changes: Change[] }) {
  if (changes.length === 0) {
    return (
      <p className="text-body-medium text-on-surface-variant">
        The draft matches what is published. Discarding it changes nothing.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="Changes">
      {changes.map((change, index) => (
        <li key={`${change.kind}-${change.label}-${index}`} className="flex items-start gap-3">
          <Icon name={KIND[change.kind].icon} size={20} className={`mt-0.5 shrink-0 ${KIND[change.kind].tone}`} />
          <div className="flex min-w-0 flex-col">
            <span className="text-body-large text-on-surface">
              {KIND[change.kind].verb} <span className="font-semibold">{change.label}</span>
            </span>
            {change.fields && change.fields.length > 0 && (
              <span className="text-body-small text-on-surface-variant">{change.fields.join(", ")}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
