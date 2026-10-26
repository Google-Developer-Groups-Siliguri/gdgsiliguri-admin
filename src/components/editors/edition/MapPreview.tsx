import { Icon } from "@/components/m3/Icon";
import { MAPS_EMBED_PATTERN } from "@/lib/schema/v2";

export function MapPreview({ url }: { url: string }) {
  if (MAPS_EMBED_PATTERN.test(url)) {
    return (
      <iframe
        title="Venue map preview"
        src={url}
        className="aspect-[4/3] w-full rounded-[28px] border-0 bg-surface-container"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2.5 rounded-[28px] bg-[repeating-linear-gradient(135deg,var(--md-sys-color-surface-container-high)_0_12px,var(--md-sys-color-surface-container)_12px_24px)] px-6 text-center text-on-surface-variant">
      <span className="shape-cookie6 grid size-11 place-items-center bg-primary text-on-primary">
        <Icon name="location_on" size={20} />
      </span>
      <span className="text-body-small">
        {url ? "The preview appears for Google Maps embed links." : "Add a map embed to see a live preview."}
      </span>
    </div>
  );
}
