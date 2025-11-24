"use client";

import Link from "next/link";

interface LoginProps {
  variant?: "hero" | "nav";
}

export default function Login({ variant = "hero" }: LoginProps) {
  if (variant === "nav") {
    return (
      <Link href="/auth" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        href="/auth"
        className="px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
      >
        Get Started for Free
      </Link>
    </div>
  );
}
