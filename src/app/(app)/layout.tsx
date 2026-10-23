import { AppFrame, type ShellData } from "@/components/shell/AppFrame";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getPendingRebuild } from "@/lib/settings";

async function loadShell(): Promise<ShellData> {
  const user = await getCurrentAdmin();
  if (!user) return { user: null, pendingRebuild: [] };
  const pending = await getPendingRebuild().catch(() => ({ sections: [] }));
  return {
    user: {
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
    pendingRebuild: pending.sections,
  };
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppFrame shellPromise={loadShell()}>{children}</AppFrame>;
}
