import "server-only";

import { adminAuthFor, adminDatabaseFor, adminFirestoreFor, adminMessagingFor } from "./admin-app";

export const adminAuth = () => adminAuthFor();
export const adminFirestore = () => adminFirestoreFor();
export const adminDatabase = () => adminDatabaseFor();
export const adminMessaging = () => adminMessagingFor();
