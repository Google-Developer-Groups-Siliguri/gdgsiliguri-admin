import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import {
  EMULATOR_HOST,
  EMULATOR_PORTS,
  EMULATOR_PROJECT_ID,
  emulatorDatabaseUrl,
  emulatorFirestoreDatabaseId,
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

const CONFIGURED_KEY = Symbol.for("gdg-siliguri-admin.configured-firestores");

function configuredFirestores(): WeakSet<Firestore> {
  const registry = globalThis as typeof globalThis & { [CONFIGURED_KEY]?: WeakSet<Firestore> };
  registry[CONFIGURED_KEY] ??= new WeakSet();
  return registry[CONFIGURED_KEY];
}

export function adminFirestoreFor(app: App = adminApp()): Firestore {
  const firestore = useEmulators ? getFirestore(app, emulatorFirestoreDatabaseId()) : getFirestore(app);
  const configured = configuredFirestores();
  if (!configured.has(firestore)) {
    firestore.settings({ ignoreUndefinedProperties: true });
    configured.add(firestore);
  }
  return firestore;
}

export function adminDatabaseFor(app: App = adminApp()): Database {
  return getDatabase(app);
}

export function adminAuthFor(app: App = adminApp()): Auth {
  return getAuth(app);
}
