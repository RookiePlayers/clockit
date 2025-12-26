"use client";

import { useState, ChangeEvent } from "react";
import Papa from "papaparse";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSnackbar } from "notistack";

interface UploadCSVProps {
  uid: string;
}

export default function UploadCSV({ uid }: UploadCSVProps) {
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          await addDoc(collection(db, "Uploads", uid, "CSV"), {
            filename: file.name,
            uploadedAt: serverTimestamp(),
            data: results.data,
            meta: results.meta,
          });
          setMessage({ type: 'success', text: `Successfully processed ${file.name}` });
          try {
            await fetch("https://clockit-stats-refresh.travpal.workers.dev/api/refresh-aggregation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: uid, forceMigration: false }),
            });
            enqueueSnackbar("Refresh triggered. Aggregates will update shortly.", { variant: "success" });
          } catch (refreshErr) {
            const msg = refreshErr instanceof Error ? refreshErr.message : "Failed to trigger refresh.";
            enqueueSnackbar(msg, { variant: "error" });
          }
        } catch (err: unknown) {
          console.error("Error adding document: ", err);
          if (err instanceof Error) {
             setMessage({ type: 'error', text: err.message });
          } else {
             setMessage({ type: 'error', text: "An unknown error occurred" });
          }
        } finally {
          setUploading(false);
        }
      },
      error: (err) => {
        console.error("Error parsing CSV: ", err);
        setMessage({ type: 'error', text: `Parsing error: ${err.message}` });
        setUploading(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative group cursor-pointer">
        <div className="relative bg-[var(--card)] border-2 border-dashed border-[var(--border)] rounded-xl p-10 text-center transition-all hover:border-blue-400 hover:bg-[var(--card-soft)]">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          
          <div className="flex flex-col items-center gap-4 transition-transform group-hover:scale-105 duration-300">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text)] mb-1">Click to upload CSV</p>
              <p className="text-sm text-[var(--muted)]">or drag and drop file here</p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-3 text-sm p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        } animate-fade-in`}>
          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          {message.text}
        </div>
      )}
    </div>
  );
}
