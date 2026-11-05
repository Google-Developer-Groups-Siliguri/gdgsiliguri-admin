import { Icon } from "@/components/m3/Icon";

type PreviewProps = { title: string; body: string };

const APP_NAME = "GDG Siliguri";

function placeholder(value: string, fallback: string) {
  return value.trim() ? value.trim() : fallback;
}

function AndroidCard({ title, body }: PreviewProps) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label-medium text-on-surface-variant">Android</figcaption>
      <div className="flex gap-3 rounded-[20px] bg-surface-container-highest p-4 text-on-surface">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
          <Icon name="campaign" size={18} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label-small text-on-surface-variant">{APP_NAME} · now</span>
          <span className="truncate text-title-small font-semibold">{placeholder(title, "Title")}</span>
          <span className="line-clamp-2 text-body-medium text-on-surface-variant">
            {placeholder(body, "Your message appears here.")}
          </span>
        </div>
      </div>
    </figure>
  );
}

function IosCard({ title, body }: PreviewProps) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label-medium text-on-surface-variant">iPhone</figcaption>
      <div className="flex gap-3 rounded-[22px] bg-surface-container-high/90 p-3.5 text-on-surface backdrop-blur">
        <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-primary text-on-primary">
          <Icon name="campaign" size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-label-large font-semibold">{placeholder(title, "Title")}</span>
            <span className="shrink-0 text-label-small text-on-surface-variant">now</span>
          </div>
          <span className="line-clamp-4 text-body-medium">{placeholder(body, "Your message appears here.")}</span>
        </div>
      </div>
    </figure>
  );
}

export function NotificationPreview(props: PreviewProps) {
  return (
    <section aria-label="Preview" className="flex flex-col gap-4">
      <AndroidCard {...props} />
      <IosCard {...props} />
      <p className="text-body-small text-on-surface-variant">
        An approximate preview. The phone may shorten long text.
      </p>
    </section>
  );
}
