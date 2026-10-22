import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";

import {
  EMULATOR_HOST,
  EMULATOR_PORTS,
  EMULATOR_PROJECT_ID,
  emulatorDatabaseUrl,
  useEmulators,
} from "./config";

const APP_NAME = "gdg-siliguri-admin";

function pointAdminSdkAtEmulators() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`;
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${EMULATOR_PORTS.firestore}`;
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `${EMULATOR_HOST}:${EMULATOR_PORTS.database}`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run npm run check:env.`);
  return value;
}

function createApp(): App {
  if (useEmulators) {
    pointAdminSdkAtEmulators();
    return initializeApp(
      { projectId: EMULATOR_PROJECT_ID, databaseURL: emulatorDatabaseUrl() },
      APP_NAME,
    );
  }
  const projectId = requiredEnv("FIREBASE_ADMIN_PROJECT_ID");
  return initializeApp(
    {
      projectId,
      databaseURL: requiredEnv("NEXT_PUBLIC_FIREBASE_DATABASE_URL"),
      credential: cert({
        projectId,
        clientEmail: requiredEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
        privateKey: requiredEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    },
    APP_NAME,
  );
}

export function adminApp(): App {
  return getApps().some((app) => app.name === APP_NAME) ? getApp(APP_NAME) : createApp();
}

export function adminTarget(): string {
  return useEmulators
    ? `emulators (${EMULATOR_PROJECT_ID})`
    : `PRODUCTION (${process.env.FIREBASE_ADMIN_PROJECT_ID})`;
}
