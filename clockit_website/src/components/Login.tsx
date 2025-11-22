"use client";

import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState } from "react";

interface LoginProps {
  variant?: "hero" | "nav";
}

export default function Login({ variant = "hero" }: LoginProps) {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      console.error("Login error:", err);
    }
  };

  if (variant === "nav") {
    return (
      <button 
        onClick={handleLogin}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button 
        onClick={handleLogin} 
        className="px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
      >
        Get Started for Free
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
