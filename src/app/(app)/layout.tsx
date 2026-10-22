import { AppFrame } from "@/components/shell/AppFrame";
import type { ShellUser } from "@/components/shell/ShellUser";
import { getCurrentAdmin } from "@/lib/auth/session";

async function loadShellUser(): Promise<ShellUser | null> {
  const user = await getCurrentAdmin();
  if (!user) return null;
  return {
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppFrame userPromise={loadShellUser()}>{children}</AppFrame>;
}
