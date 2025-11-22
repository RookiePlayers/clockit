"use client";

import { useState } from "react";

interface ReadDocsButtonProps {
  variant?: "hero" | "nav";
}

export default function ReadDocsButton({ variant = "hero" }: ReadDocsButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const handleReadDocs = async () => {
    try {
      window.location.href = "/docs";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      console.error("ReadDocsButton error:", err);
    }
  };

  if (variant === "nav") {
    return (
      <button 
        onClick={handleReadDocs}
        className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition-colors shadow-sm"
      >
        Read Docs
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button 
        onClick={handleReadDocs} 
        className="px-8 py-4 rounded-xl bg-gray-600 text-white font-semibold text-lg shadow-lg hover:bg-gray-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
      >
        Read Docs
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
