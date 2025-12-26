/* eslint-disable no-console */
/**
 * Seed feature flags for all users.
 * Requires:
 *  - FIREBASE_SERVICE_ACCOUNT_B64: base64-encoded service account JSON
 *  - (optional) FLAGS env as comma list of key=true/false, otherwise defaults are used.
 *
 * Run: node scripts/seedFeatureFlags.js
 */

require("dotenv").config({ path: ".env.local" });
const admin = require("firebase-admin");

const decodeServiceAccount = () => {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is required");
  }
  const json = Buffer.from(b64, "base64").toString("utf-8");
  return JSON.parse(json);
};

const DEFAULT_FLAGS = {
  "clockit-online": true,
  "clockit-goals": true,
};

const parseFlags = () => {
  const raw = process.env.FLAGS;
  if (!raw) {return DEFAULT_FLAGS;}
  return raw.split(",").reduce((acc, pair) => {
    const [k, v] = pair.split("=");
    if (k) {
      acc[k.trim()] = v === "false" ? false : true;
    }
    return acc;
  }, {});
};

const initAdmin = () => {
  if (admin.apps.length) {return;}
  const sa = decodeServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
  });
};

const listAllUsers = async () => {
  const users = [];
  let nextPageToken;
  do {
    const res = await admin.auth().listUsers(1000, nextPageToken);
    users.push(...res.users);
    nextPageToken = res.pageToken;
  } while (nextPageToken);
  return users;
};

const main = async () => {
  initAdmin();
  const flags = parseFlags();
  console.log("[seed] flags to apply", flags);
  const firestore = admin.firestore();
  const users = await listAllUsers();
  console.log(`[seed] found ${users.length} users`);

  const batchSize = 400; // keep batches manageable
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = firestore.batch();
    users.slice(i, i + batchSize).forEach((user) => {
      const ref = firestore.collection("FeatureFlags").doc(user.uid);
      batch.set(ref, flags, { merge: true });
    });
    await batch.commit();
    console.log(`[seed] wrote flags for users ${i + 1} - ${Math.min(i + batchSize, users.length)}`);
  }
  console.log("[seed] done");
};

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
