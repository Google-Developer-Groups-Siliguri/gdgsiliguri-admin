import "server-only";

import { adminAuthFor, adminDatabaseFor, adminFirestoreFor } from "./admin-app";

export const adminAuth = () => adminAuthFor();
export const adminFirestore = () => adminFirestoreFor();
export const adminDatabase = () => adminDatabaseFor();
