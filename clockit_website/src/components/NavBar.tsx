"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

type Props = {
  userName?: string;
  userPhoto?: string | null;
  links: Array<{ href: string; label: string; active?: boolean }>;
  onSignOut?: () => void;
};

export default function NavBar({ userName, userPhoto, links, onSignOut }: Props) {
  const [open, setOpen] = useState(false);

  // Filter out "Profile" link as it's now accessible via avatar
  const filteredLinks = links.filter(link => link.label.toLowerCase() !== 'profile');

  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-[var(--card)]/90 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Clockit Icon" width={28} height={28} className="rounded-full" />
            <span className="font-bold text-lg text-[var(--text)]">Clockit</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="md:hidden" />
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border)] text-[var(--text)]"
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
        </div>
        <div className={`flex-col md:flex-row md:flex items-start md:items-center gap-3 text-sm ${open ? "flex" : "hidden md:flex"}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg ${
                  link.active
                    ? "font-semibold text-[var(--text)] bg-[var(--pill)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <ThemeToggle className="hidden md:inline-flex" />
            {userName && (
              <Link
                href="/profile"
                className="group relative"
                title={userName}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-[var(--primary)]/40 transition-all">
                  {userPhoto ? (
                    <Image
                      src={userPhoto}
                      alt={userName}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs font-bold text-[var(--primary-contrast)]">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  {userName}
                  <div className="absolute bottom-full right-2 w-2 h-2 bg-[var(--card)] border-l border-t border-[var(--border)] transform rotate-45 -mb-1"></div>
                </div>
              </Link>
            )}
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
