import type { FirebaseOptions } from "firebase/app";

export const EMULATOR_PROJECT_ID = "demo-gdg-siliguri";
export const EMULATOR_HOST = "127.0.0.1";
export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, database: 9000 } as const;

export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

export function emulatorDatabaseUrl(projectId = EMULATOR_PROJECT_ID): string {
  return `http://${EMULATOR_HOST}:${EMULATOR_PORTS.database}?ns=${projectId}-default-rtdb`;
}

export function clientFirebaseConfig(): FirebaseOptions {
  if (useEmulators) {
    return {
      apiKey: "demo-api-key",
      authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
      projectId: EMULATOR_PROJECT_ID,
    };
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}
