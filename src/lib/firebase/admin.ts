import "server-only";

import { getAuth } from "firebase-admin/auth";

import { adminApp, adminDatabaseFor, adminFirestoreFor } from "./admin-app";

export const adminAuth = () => getAuth(adminApp());
export const adminFirestore = () => adminFirestoreFor();
export const adminDatabase = () => adminDatabaseFor();
