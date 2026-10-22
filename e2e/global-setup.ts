import { deleteAdmin, FIRESTORE, putAdmin, TEST_USERS } from "./support/emulator";

export default async function globalSetup() {
  const reachable = await fetch(FIRESTORE).then(
    () => true,
    () => false,
  );
  if (!reachable) {
    throw new Error("Firebase emulators are not running. Start them with `npm run emulators`.");
  }
  await putAdmin(TEST_USERS.owner.email, "owner");
  await putAdmin(TEST_USERS.editor.email, "editor");
  await deleteAdmin(TEST_USERS.outsider.email);
}
