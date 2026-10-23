import { formatDateTime, timeAgo } from "@/lib/time";

export function RelativeTime({ iso }: { iso: string | null }) {
  if (!iso) return <>never</>;
  return (
    <time dateTime={iso} title={formatDateTime(iso)} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}
