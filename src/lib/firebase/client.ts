"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

import { clientFirebaseConfig, EMULATOR_HOST, EMULATOR_PORTS, useEmulators } from "./config";

let auth: Auth | undefined;

function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(clientFirebaseConfig());
}

export function clientAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(firebaseApp());
  if (useEmulators) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
  }
  return auth;
}
