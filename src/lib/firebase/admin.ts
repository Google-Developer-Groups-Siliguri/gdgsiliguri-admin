import "server-only";

import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

import { adminApp } from "./admin-app";

export const adminAuth = () => getAuth(adminApp());
export const adminFirestore = () => getFirestore(adminApp());
export const adminDatabase = () => getDatabase(adminApp());
