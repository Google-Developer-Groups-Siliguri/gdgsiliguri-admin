import { LoadingIndicator } from "@/components/m3/Progress";

export function EditorFallback() {
  return (
    <div className="flex flex-col gap-4 pt-2" aria-busy>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-surface-container-high" />
        <div className="h-11 w-56 animate-pulse rounded-full bg-surface-container-high" />
      </div>
      <div className="grid h-96 place-items-center rounded-[32px] bg-surface-container">
        <LoadingIndicator label="Loading editor" size={56} contained />
      </div>
    </div>
  );
}
