import { LinearProgress } from "@/components/m3/Progress";

export function EditorFallback() {
  return (
    <div className="flex flex-col gap-4 pt-2" aria-busy>
      <div className="h-9 w-48 animate-pulse rounded-sm bg-surface-container-high" />
      <LinearProgress label="Loading editor" />
      <div className="h-96 animate-pulse rounded-md bg-surface-container-low" />
    </div>
  );
}
