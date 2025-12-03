"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Props = {
  userName?: string;
  links: Array<{ href: string; label: string; active?: boolean }>;
  onSignOut?: () => void;
};

export default function NavBar({ userName, links, onSignOut }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Clockit Icon" width={28} height={28} className="rounded-full" />
            <span className="font-bold text-lg text-gray-900">Clockit</span>
          </Link>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-700"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
        <div className={`flex-col md:flex-row md:flex items-start md:items-center gap-3 text-sm ${open ? "flex" : "hidden md:flex"}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg ${
                  link.active
                    ? "font-semibold text-gray-900 bg-gray-100"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {userName && <span className="text-sm text-gray-600 hidden md:inline">Hi, {userName}</span>}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors w-full md:w-auto text-center"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
