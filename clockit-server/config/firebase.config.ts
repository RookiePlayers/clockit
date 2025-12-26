import admin from "firebase-admin";

const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

const getServiceAccount = () => {
  if (!serviceAccountB64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is not set");
  }
  try {
    const decoded = Buffer.from(serviceAccountB64, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    throw new Error("Failed to decode FIREBASE_SERVICE_ACCOUNT_B64");
  }
};

let app: admin.app.App;

export const getAdminApp = () => {
  if (!app) {
    const serviceAccount = getServiceAccount();
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
  return app;
};

export const adminAuth = () => getAdminApp().auth();
