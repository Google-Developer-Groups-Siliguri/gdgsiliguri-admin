import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => undefined, error: console.error });

type Check = { name: string; required: boolean; validate?: (value: string) => string | null };

const pattern = (regex: RegExp, hint: string) => (value: string) => (regex.test(value) ? null : hint);

const CHECKS: Check[] = [
  {
    name: "NEXT_PUBLIC_USE_EMULATORS",
    required: false,
    validate: pattern(/^(true|false)$/, "should be true or false"),
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_API_KEY",
    required: true,
    validate: pattern(/^AIza[\w-]{35}$/, "does not look like a Firebase web API key"),
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    required: true,
    validate: pattern(
      /^[\w-]+\.(firebaseapp\.com|web\.app)$|^[\w.-]+\.[a-z]{2,}$/,
      "should be a bare domain such as <project>.firebaseapp.com",
    ),
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    required: true,
    validate: pattern(/^[a-z][a-z0-9-]{4,29}$/, "does not look like a project id"),
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
    required: true,
    validate: pattern(
      /^https:\/\/[\w-]+\.(firebaseio\.com|[\w-]+\.firebasedatabase\.app)\/?$/,
      "should be https://<db>.firebaseio.com or https://<db>.<region>.firebasedatabase.app",
    ),
  },
  { name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", required: false },
  { name: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", required: false, validate: pattern(/^\d+$/, "should be digits") },
  {
    name: "NEXT_PUBLIC_FIREBASE_APP_ID",
    required: true,
    validate: pattern(/^1:\d+:web:[0-9a-f]+$/, "should look like 1:<digits>:web:<hex>"),
  },
  {
    name: "FIREBASE_ADMIN_PROJECT_ID",
    required: true,
    validate: pattern(/^[a-z][a-z0-9-]{4,29}$/, "does not look like a project id"),
  },
  {
    name: "FIREBASE_ADMIN_CLIENT_EMAIL",
    required: true,
    validate: pattern(
      /^[\w-]+@[\w-]+\.iam\.gserviceaccount\.com$/,
      "should be a service account email ending in .iam.gserviceaccount.com",
    ),
  },
  {
    name: "FIREBASE_ADMIN_PRIVATE_KEY",
    required: true,
    validate: (value) => {
      const key = value.replace(/\\n/g, "\n");
      if (value.trimStart().startsWith("{")) {
        return "contains the whole service-account JSON; use only its private_key value";
      }
      if (/^["']/.test(value)) {
        return "still has a quote character at the start; check the quoting in the file";
      }
      if (/^\s/.test(value)) return "starts with whitespace";
      if (value.includes("BEGIN RSA PRIVATE KEY")) {
        return "is an RSA-format key; use the private_key from a Firebase service-account JSON";
      }
      if (!value.includes("BEGIN PRIVATE KEY")) {
        return `has no BEGIN PRIVATE KEY marker at all (length ${value.length}); it may be cut off at a line break, so put the key on one line with \\n sequences, wrapped in double quotes`;
      }
      if (!key.startsWith("-----BEGIN PRIVATE KEY-----")) {
        return `has ${value.indexOf("-----BEGIN")} unexpected characters before -----BEGIN PRIVATE KEY-----`;
      }
      if (!key.trimEnd().endsWith("-----END PRIVATE KEY-----"))
        return "should end with -----END PRIVATE KEY----- (is it truncated?)";
      if (!key.includes("\n")) return "has no line breaks; keep the \\n sequences from the JSON file";
      return null;
    },
  },
  {
    name: "IMAGEKIT_URL_ENDPOINT",
    required: false,
    validate: pattern(/^https:\/\/ik\.imagekit\.io\/[\w-]+\/?$/, "should be https://ik.imagekit.io/<id>"),
  },
  { name: "IMAGEKIT_PUBLIC_KEY", required: false, validate: pattern(/^public_/, "should start with public_") },
  { name: "IMAGEKIT_PRIVATE_KEY", required: false, validate: pattern(/^private_/, "should start with private_") },
];

let problems = 0;
for (const check of CHECKS) {
  const value = process.env[check.name];
  if (!value) {
    console.log(`${check.required ? "✗ MISSING " : "– not set "} ${check.name}`);
    if (check.required) problems += 1;
    continue;
  }
  const multiline = check.name === "FIREBASE_ADMIN_PRIVATE_KEY";
  const issue =
    check.validate?.(value) ?? (!multiline && value !== value.trim() ? "has leading or trailing spaces" : null);
  console.log(issue ? `✗ INVALID  ${check.name}: ${issue}` : `✓ ok       ${check.name}`);
  if (issue) problems += 1;
}

const clientProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const adminProject = process.env.FIREBASE_ADMIN_PROJECT_ID;
if (clientProject && adminProject && clientProject !== adminProject) {
  console.log("✗ MISMATCH NEXT_PUBLIC_FIREBASE_PROJECT_ID and FIREBASE_ADMIN_PROJECT_ID differ");
  problems += 1;
}
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
if (adminProject && clientEmail && !clientEmail.endsWith(`@${adminProject}.iam.gserviceaccount.com`)) {
  console.log("! note     FIREBASE_ADMIN_CLIENT_EMAIL belongs to a different project than FIREBASE_ADMIN_PROJECT_ID");
}

async function verifyServiceAccount(): Promise<boolean> {
  const { cert } = await import("firebase-admin/app");
  try {
    const credential = cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    });
    await credential.getAccessToken();
    console.log("✓ live     Google accepted the service-account credentials");
    return true;
  } catch (error) {
    console.log(`✗ live     Google rejected the service-account credentials: ${(error as Error).message}`);
    return false;
  }
}

async function finish() {
  if (problems === 0 && process.argv.includes("--live") && !(await verifyServiceAccount())) {
    problems += 1;
  }
  console.log(problems === 0 ? "\nAll required settings look valid." : `\n${problems} problem(s) found.`);
  process.exitCode = problems === 0 ? 0 : 1;
}

void finish();
