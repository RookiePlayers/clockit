"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { auth, db } from "@/lib/firebase";
import { collection, deleteDoc, doc, DocumentData, limit, orderBy, query } from "firebase/firestore";
import { useSnackbar } from "notistack";
import NavBar from "@/components/NavBar";

type UploadRow = {
  id: string;
  filename: string;
  uploadedAt?: Date | null;
  count: number;
  source: "manual" | "auto";
};

export default function RecentActivityPage() {
  const [user, loadingUser, authError] = useAuthState(auth);
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "auto">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const uploadsQuery = useMemo(() => {
    if (!user) {return null;}
    return query(collection(db, "Uploads", user.uid, "CSV"), orderBy("uploadedAt", "desc"), limit(200));
  }, [user]);

  const [snapshot, loadingUploads, uploadsError] = useCollection(uploadsQuery);

  if (loadingUser || loadingUploads) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-600 gap-3">
        <p>Auth error: {authError.message}</p>
        <Link href="/auth" className="text-blue-600 hover:underline">Go to sign in</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-800">
        <p className="text-lg font-semibold">You need to sign in to view recent activity!</p>
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

  const rows: UploadRow[] = (snapshot?.docs ?? []).map((doc) => {
    const data = doc.data() as DocumentData;
    const uploadedAt = data.uploadedAt?.toDate?.() ?? null;
    const filename = data.filename || doc.id;
    const count = Array.isArray(data.data) ? data.data.length : 0;
    const source: UploadRow["source"] = data.filename ? "manual" : "auto";
    return { id: doc.id, filename, uploadedAt, count, source };
  });

  const filteredRows = rows.filter((row) => sourceFilter === "all" || row.source === sourceFilter);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <NavBar
        userName={user.displayName || user.email || undefined}
        onSignOut={() => auth.signOut()}
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/advanced-stats", label: "Advanced Stats" },
          { href: "/docs", label: "Docs" },
          { href: "/profile", label: "Profile" },
          { href: "/recent-activity", label: "Recent Activity", active: true },
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-sm text-blue-600 font-semibold">Recent activity</p>
            <h1 className="text-3xl font-bold text-gray-900">Full uploads table</h1>
            <p className="text-sm text-gray-600 mt-1">Shows your latest uploads ordered by most recent.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:border-blue-200 hover:text-blue-700 transition-colors">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">Uploads</h2>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-2 text-xs">
                <label className="text-gray-600 font-medium">Source:</label>
                {(["all", "manual", "auto"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSourceFilter(opt);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      sourceFilter === opt
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-700"
                    }`}
                  >
                    {opt === "all" ? "All sources" : opt === "manual" ? "Manual" : "Auto"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredRows.length)} of {filteredRows.length}
              </span>
            </div>
          </div>
          {uploadsError && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
              Failed to load uploads: {uploadsError.message}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-sm text-gray-800">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Filename</th>
                  <th className="text-left px-4 py-2 font-semibold whitespace-nowrap">Uploaded at</th>
                  <th className="text-left px-4 py-2 font-semibold">Entries</th>
                  <th className="text-left px-4 py-2 font-semibold">Source</th>
                  <th className="text-left px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {rows.length === 0
                        ? "No uploads yet. Upload a CSV from the dashboard to see activity here."
                        : "No uploads match this source filter."}
                    </td>
                  </tr>
                )}
                {paginatedRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 break-all">{row.filename}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {row.uploadedAt ? row.uploadedAt.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.count.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.source === "manual" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {row.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/recent-activity/${row.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors mr-2"
                      >
                        View rows
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user) {return;}
                          const confirmed = window.confirm("Delete this upload? This cannot be undone.");
                          if (!confirmed) {return;}
                          setDeletingId(row.id);
                          try {
                            await deleteDoc(doc(db, "Uploads", user.uid, "CSV", row.id));
                            enqueueSnackbar("Upload deleted.", { variant: "success" });
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : "Failed to delete upload.";
                            enqueueSnackbar(msg, { variant: "error" });
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingId === row.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3 text-xs text-gray-600">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
