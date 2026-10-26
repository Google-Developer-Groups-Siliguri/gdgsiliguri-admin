import { loadEnvConfig } from "@next/env";

import { EMULATOR_PROJECT } from "./emulator";

export function assertEmulatorTarget(): void {
  loadEnvConfig(process.cwd(), true, { info: () => undefined, error: console.error });
  if (process.env.NEXT_PUBLIC_USE_EMULATORS !== "true" || !EMULATOR_PROJECT.startsWith("demo-")) {
    throw new Error(
      "E2E tests only run against the Firebase emulators. Set NEXT_PUBLIC_USE_EMULATORS=true " +
        `(project ${EMULATOR_PROJECT}) and start them with npm run emulators.`,
    );
  }
}
