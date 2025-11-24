"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

export default function ProfilePage() {
  const [user, loading, error] = useAuthState(auth);
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tokens, setTokens] = useState<Array<{
    id: string;
    name?: string;
    lastFour?: string;
    createdAt?: Timestamp;
    expiresAt?: Timestamp | null;
    lastUsedAt?: Timestamp | null;
  }>>([]);
  const [tokenName, setTokenName] = useState("");
  const [tokenDays, setTokenDays] = useState<number | "">("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  useEffect(() => {
    if (!user) {return;}
    const loadTokens = async () => {
      const q = query(
        collection(db, "ApiTokens"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setTokens(rows);
    };
    void loadTokens();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600 gap-3">
        <p>Auth error: {error.message}</p>
        <Link href="/auth" className="text-blue-600 hover:underline">Go to sign in</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-800">
        <p className="text-lg font-semibold">You need to sign in to manage your profile.</p>
        <div className="flex gap-3">
          <Link href="/auth" className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
            Sign in
          </Link>
          <Link href="/auth?mode=signup" className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() || undefined });
      setSaveMessage("Profile updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setSaveMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const safeName = file.name.replace(/\s+/g, "-");
      const fileRef = ref(storage, `profile-pictures/${user!.uid}/${Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateProfile(user!, { photoURL: url });
      setPhotoMessage("Profile photo updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo.";
      setPhotoMessage(msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handlePhotoUpload(file);
    }
  };

  const hashToken = async (token: string) => {
    const data = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleCreateToken = async () => {
    if (!user) {return;}
    setTokenMessage(null);
    setNewToken(null);
    const raw = `clockit_${crypto.randomUUID()}_${Math.random().toString(36).slice(2, 8)}`;
    const tokenHash = await hashToken(raw);
    const expiresAt = typeof tokenDays === "number" && tokenDays > 0
      ? Timestamp.fromDate(new Date(Date.now() + tokenDays * 24 * 60 * 60 * 1000))
      : null;
    await addDoc(collection(db, "ApiTokens"), {
      uid: user.uid,
      name: tokenName || "API Token",
      tokenHash,
      lastFour: raw.slice(-4),
      createdAt: serverTimestamp(),
      expiresAt,
      lastUsedAt: null,
    });
    setTokenMessage("Token created. Copy and store it securely.");
    setNewToken(raw);
    setTokenName("");
    setTokenDays("");
    const q = query(
      collection(db, "ApiTokens"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    setTokens(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
  };

  const handleRevokeToken = async (id: string) => {
    await deleteDoc(doc(db, "ApiTokens", id));
    setTokens(tokens.filter(t => t.id !== id));
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await auth.signOut();
    setSigningOut(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Clockit Icon" width={28} height={28} className="rounded-full" />
            <span className="font-bold text-lg text-gray-900">Clockit</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/advanced-stats" className="text-sm text-gray-600 hover:text-gray-900">Advanced Stats</Link>
            <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">Docs</Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <header className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg overflow-hidden">
              {user.photoURL ? (
                <Image src={user.photoURL} alt="Profile" width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                <span className="text-xl">{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-white border border-gray-200 rounded-full px-2 py-1 text-[11px] font-semibold text-blue-600 shadow-sm hover:border-blue-300 hover:text-blue-700 transition-colors"
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? "..." : "Edit"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm text-blue-600 font-semibold">Profile</p>
            <h1 className="text-2xl font-bold text-gray-900">{user.displayName || user.email}</h1>
            {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
          </div>
        </header>

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Display name
              <input
                type="text"
                value={displayName || user.displayName || ""}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder={user.displayName || "Your name"}
              />
            </label>
            <div className="text-sm text-gray-700">
              <p><strong>Email:</strong> {user.email || "Not set"}</p>
              <p><strong>Provider:</strong> {user.providerData.map((p) => p.providerId).join(", ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saveMessage && <p className="text-sm text-gray-600">{saveMessage}</p>}
            {photoMessage && <p className="text-sm text-gray-600">{photoMessage}</p>}
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4 mt-6">
          <h2 className="text-lg font-semibold text-gray-900">API Tokens</h2>
          <p className="text-sm text-gray-600">
            Use these tokens to connect the VS Code plugin and back up CSV data automatically. Tokens are shown only once on creation.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-gray-700 col-span-2">
              Token name
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder="VS Code Backup"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Expiry (days, optional)
              <input
                type="number"
                min="1"
                value={tokenDays}
                onChange={(e) => setTokenDays(e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder="e.g. 90"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateToken}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Create token
            </button>
            {tokenMessage && <p className="text-sm text-gray-600">{tokenMessage}</p>}
          </div>
          {newToken && (
            <div className="border border-blue-200 bg-blue-50 text-blue-800 rounded-lg p-3 text-sm">
              <p className="font-semibold mb-1">Copy your token now:</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs break-all">{newToken}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(newToken)}
                  className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {tokens.length === 0 ? (
              <p className="text-sm text-gray-500 px-4 py-3">No tokens yet.</p>
            ) : (
              tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name || "Token"}</p>
                    <p className="text-xs text-gray-500">
                      Last 4: {t.lastFour || "—"} · Created: {formatDate(t.createdAt)} {t.expiresAt ? `· Expires: ${formatDate(t.expiresAt)}` : "· No expiry"}
                    </p>
                    {t.lastUsedAt && (
                      <p className="text-xs text-gray-500">Last used: {formatDate(t.lastUsedAt)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => void handleRevokeToken(t.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4 mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Data control</h2>
          <p className="text-sm text-gray-600">
            You own your data. Manage deletion requests or request a data export from here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/delete-data"
              className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-50 text-red-700 font-semibold border border-red-100 hover:bg-red-100 transition-colors"
            >
              Delete my data
            </Link>
            <Link
              href="/request-data"
              className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              Request my data
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            Need help? Email support@octech.dev from your account email and we’ll assist.
          </p>
        </section>
      </main>
    </div>
  );
}

function formatDate(ts?: Timestamp | null) {
  if (!ts?.toDate) {return "—";}
  return ts.toDate().toLocaleDateString();
}
