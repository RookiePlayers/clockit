import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FeatureFlags = Record<string, boolean>;

export const getUserFeatureFlags = async (uid: string | null | undefined): Promise<FeatureFlags> => {
  if (!uid) { return {}; }
  try {
    const snap = await getDoc(doc(db, "FeatureFlags", uid));
    if (!snap.exists()) { return {}; }
    return (snap.data() as FeatureFlags) ?? {};
  } catch {
    return {};
  }
};

export const setUserFeatureFlag = async (uid: string | null | undefined, flag: string, value: boolean) => {
  if (!uid) { return; }
  try {
    await setDoc(doc(db, "FeatureFlags", uid), { [flag]: value }, { merge: true });
  } catch {
    // ignore write errors for now; caller can surface if needed
  }
};
