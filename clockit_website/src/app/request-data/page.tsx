"use client";

import Link from "next/link";

export default function RequestDataPage() {
  return (
    <div className="min-h-screen bg-[#0b1021] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0b1021]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Clockit</Link>
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/auth" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200/70">Data access</p>
          <h1 className="text-3xl font-bold leading-tight">Request your Clockit data</h1>
          <p className="text-white/80">
            You can request a copy of the data linked to your Clockit account. We’ll prepare a machine-readable export and send it securely.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How to request</h2>
          <ol className="list-decimal list-inside space-y-2 text-white/80">
            <li>Email <a href="mailto:support@octech.dev" className="text-blue-200 hover:text-white underline">support@octech.dev</a> from the address tied to your account.</li>
            <li>Include a note that you are requesting a data export and any specific date ranges if desired.</li>
            <li>We’ll confirm receipt and deliver a CSV/JSON export of your sessions and aggregates.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What’s included</h2>
          <ul className="list-disc list-inside space-y-2 text-white/80">
            <li>Uploaded session rows (start/end, duration, idle time, language breakdowns).</li>
            <li>Materialized aggregates (weekly, monthly, yearly, all-time summaries).</li>
            <li>Any synced metadata you’ve provided (issue keys, comments).</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
