import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => undefined, error: console.error });
