"use client";

import Link from "next/link";

export default function DeleteDataPage() {
  return (
    <div className="min-h-screen bg-[#0b1021] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0b1021]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Clockit</Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/auth" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200/70">Data deletion</p>
          <h1 className="text-3xl font-bold leading-tight">Delete your Clockit data</h1>
          <p className="text-white/80">You are in control of your data. Follow the steps below or contact us for help.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Self-service steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-white/80">
            <li>Delete local CSVs you no longer want to keep.</li>
            <li>In your account, remove uploaded CSV entries and materialized aggregates.</li>
            <li>Turn off cloud backup and any connected sinks (Jira/Notion) to prevent future uploads.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Request deletion</h2>
          <p className="text-white/80">
            If you want us to delete account-associated data on your behalf, email{" "}
            <a href="mailto:support@octech.dev" className="text-blue-200 hover:text-white underline">support@octech.dev</a>{" "}
            with the email tied to your Clockit account. We’ll confirm and process the removal.
          </p>
        </section>
      </main>
    </div>
  );
}
