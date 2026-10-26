import type { CollectionReference, DocumentReference, Firestore } from "firebase-admin/firestore";

export type CmsSectionDoc = {
  kind: "singleton" | "list";
  scope: Record<string, unknown>;
  draft: Record<string, unknown>;
  published: Record<string, unknown>;
  version: number;
  draftVersion: number;
  draftUpdatedAt?: FirebaseFirestore.Timestamp;
  draftUpdatedBy?: string;
  publishedAt?: FirebaseFirestore.Timestamp;
  publishedBy?: string;
  publishLock?: { id: string; by: string; expiresAt: FirebaseFirestore.Timestamp };
};

export const cmsRoot = (db: Firestore) => db.doc("cms/root");
export const sectionsRef = (db: Firestore) => cmsRoot(db).collection("sections") as CollectionReference<CmsSectionDoc>;
export const sectionRef = (db: Firestore, id: string) => sectionsRef(db).doc(id) as DocumentReference<CmsSectionDoc>;
export const revisionsRef = (db: Firestore, id: string) => sectionRef(db, id).collection("revisions");
export const auditRef = (db: Firestore) => cmsRoot(db).collection("auditLog");
export const adminsRef = (db: Firestore) => cmsRoot(db).collection("admins");
export const settingsRef = (db: Firestore, name: "site" | "blogs" | "showcase") =>
  cmsRoot(db).collection("settings").doc(name);
export const legacySyncRef = (db: Firestore) => cmsRoot(db).collection("sync").doc("legacyRtdb");
export const driftRef = (db: Firestore) => legacySyncRef(db).collection("drift");
export const previewsRef = (db: Firestore) => cmsRoot(db).collection("previews");
export const submissionsRef = (db: Firestore) => cmsRoot(db).collection("showcaseSubmissions");

export const PUBLIC_COLLECTIONS = [
  "site",
  "editions",
  "team",
  "events",
  "testimonials",
  "faqs",
  "blogs",
  "showcase",
  "modules",
  "moduleItems",
  "bundles",
] as const;
