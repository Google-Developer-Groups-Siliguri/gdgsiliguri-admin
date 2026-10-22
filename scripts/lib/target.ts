import { adminTarget } from "../../src/lib/firebase/admin-app";
import { useEmulators } from "../../src/lib/firebase/config";

export function assertTargetAllowed(args: Map<string, string | true>): void {
  const wantsProduction = args.get("production") === true;
  if (useEmulators && wantsProduction) {
    fail("--production was passed but NEXT_PUBLIC_USE_EMULATORS=true. Set it to false first.");
  }
  if (!useEmulators && !wantsProduction) {
    fail(
      "NEXT_PUBLIC_USE_EMULATORS is not true, so this would write to production. " +
        "Pass --production to confirm, or set NEXT_PUBLIC_USE_EMULATORS=true.",
    );
  }
  console.log(`Target: ${adminTarget()}`);
}

export function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}
