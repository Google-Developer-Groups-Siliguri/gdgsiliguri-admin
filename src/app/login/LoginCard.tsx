"use client";

import { FirebaseError } from "firebase/app";
import {
  browserSessionPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Icon } from "@/components/m3/Icon";
import { LinearProgress } from "@/components/m3/Progress";
import { safeNextPath } from "@/lib/auth/next-path";
import { clientAuth } from "@/lib/firebase/client";
import { useEmulators } from "@/lib/firebase/config";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "not_admin"; email: string | null }
  | { kind: "error"; message: string };

const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
]);
const SILENT_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export function LoginCard() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const handledRedirect = useRef(false);

  async function exchange(user: User) {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    await signOut(clientAuth());
    if (response.ok) {
      window.location.replace(nextPath);
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (body.error === "not_admin") {
      setStatus({ kind: "not_admin", email: user.email });
    } else {
      setStatus({ kind: "error", message: body.message ?? "Sign-in failed. Try again." });
    }
  }

  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;
    getRedirectResult(clientAuth())
      .then((result) => {
        if (result?.user) {
          setStatus({ kind: "working" });
          return exchange(result.user);
        }
      })
      .catch(() => setStatus({ kind: "error", message: "Sign-in failed. Try again." }));
  });

  async function signIn() {
    setStatus({ kind: "working" });
    const auth = clientAuth();
    try {
      await setPersistence(auth, browserSessionPersistence);
      const result = await signInWithPopup(auth, googleProvider());
      await exchange(result.user);
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "";
      if (POPUP_FALLBACK_CODES.has(code)) {
        await signInWithRedirect(auth, googleProvider());
        return;
      }
      if (SILENT_CODES.has(code)) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({ kind: "error", message: "Sign-in failed. Check your connection and try again." });
    }
  }

  const working = status.kind === "working";

  return (
    <Card variant="tinted" className="relative w-full max-w-md overflow-hidden bg-surface-container-low">
      {working && <LinearProgress className="absolute inset-x-0 top-0 rounded-none" label="Signing in" />}
      <div className="flex flex-col items-center gap-6 px-6 py-10 compact:px-10">
        <BrandMark size={48} />
        {status.kind === "not_admin" ? (
          <div className="flex flex-col items-center gap-4 text-center" role="alert">
            <Icon name="lock_person" size={40} className="text-error" />
            <h1 className="text-headline-small text-on-surface">You are not an admin</h1>
            <p className="text-body-medium text-on-surface-variant">
              {status.email ? (
                <>
                  <span className="text-on-surface">{status.email}</span> doesn&apos;t have access.{" "}
                </>
              ) : null}
              Ask an organizer to add you, then sign in again.
            </p>
            <Button variant="tonal" icon="switch_account" onClick={signIn}>
              Use another account
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-headline-small text-on-surface">Sign in</h1>
              <p className="text-body-medium text-on-surface-variant">
                Manage gdgsiliguri.com with your organizer Google account.
              </p>
            </div>
            <Button icon="login" onClick={signIn} disabled={working} className="w-full max-w-72">
              Sign in with Google
            </Button>
            {status.kind === "error" && (
              <p role="alert" className="text-center text-body-medium text-error">
                {status.message}
              </p>
            )}
          </>
        )}
        {useEmulators && (
          <p className="rounded-sm bg-tertiary-container px-3 py-1 text-label-medium text-on-tertiary-container">
            Using local Firebase emulators
          </p>
        )}
      </div>
    </Card>
  );
}
