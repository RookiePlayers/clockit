"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0b1021] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0b1021]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Clockit</Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/docs" className="hover:text-white">Docs</Link>
            <Link href="/auth" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200/70">Privacy Policy</p>
          <h1 className="text-3xl font-bold leading-tight">How Clockit handles your data</h1>
          <p className="text-white/70 text-sm">Last updated: January 2025</p>
          <p className="text-white/80">
            Clockit is built to track coding time with minimal data collection. This policy explains what we collect,
            how we use it, and the choices you have.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What we collect</h2>
          <ul className="space-y-2 text-white/80 list-disc list-inside">
            <li>Coding session metadata (start/end times, duration, idle time).</li>
            <li>Per-file and per-language focus durations for analytics and exports.</li>
            <li>Optional context you add, such as issue keys or comments.</li>
            <li>Account identifiers when you sign in to sync data to your dashboard.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How we use data</h2>
          <ul className="space-y-2 text-white/80 list-disc list-inside">
            <li>To show dashboards, summaries, and productivity stats you request.</li>
            <li>To export sessions to sinks you enable (CSV, Jira, Notion, cloud backup).</li>
            <li>To improve reliability and detect issues (minimal diagnostic logs).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Where data lives</h2>
          <ul className="space-y-2 text-white/80 list-disc list-inside">
            <li>Locally: CSV exports stay on your machine unless you move them.</li>
            <li>Cloud: If you enable cloud backup or sign in, session data is stored in your Clockit account.</li>
            <li>Third parties: Only when you connect a sink (e.g., Jira, Notion) and trigger an export.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Sharing and selling</h2>
          <p className="text-white/80">We do not sell your data. We share data only to services you explicitly connect and authorize.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Retention</h2>
          <p className="text-white/80">
            Data remains until you delete it or request removal. Local CSVs remain on your device. Cloud data can be
            cleared by deleting uploads/aggregates or contacting support.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your choices</h2>
          <ul className="space-y-2 text-white/80 list-disc list-inside">
            <li>Disable sinks or cloud backup at any time.</li>
            <li>Delete CSVs locally and remove uploads from your account.</li>
            <li>Request account or data deletion by contacting support.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-white/80">
            Questions or data requests? Reach out through the contact details in our docs or your support channel.
          </p>
        </section>
      </main>
    </div>
  );
}
