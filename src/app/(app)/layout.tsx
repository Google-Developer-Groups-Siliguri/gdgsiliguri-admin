import { AppFrame, type ShellData } from "@/components/shell/AppFrame";
import { getCurrentAdmin } from "@/lib/auth/session";

async function loadShell(): Promise<ShellData> {
  const user = await getCurrentAdmin();
  if (!user) return { user: null };
  return {
    user: {
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
  };
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppFrame shellPromise={loadShell()}>{children}</AppFrame>;
}
