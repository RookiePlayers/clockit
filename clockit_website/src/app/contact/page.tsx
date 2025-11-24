"use client";

import Link from "next/link";

const faqs = [
  { q: "How do I install Clockit?", a: "Use the Download button on the homepage to grab the VS Code extension from the marketplace." },
  { q: "Do I need an account to export?", a: "No. CSV exports stay local by default. Sign in only when you want dashboards or cloud backup." },
  { q: "What data is collected?", a: "Session metadata (start/end, duration, idle) and optional context you add. See the Privacy Policy for details." },
  { q: "Can I disable cloud backup?", a: "Yes. Leave cloud backup off in settings or disable connected sinks at any time." },
  { q: "How do I delete my data?", a: "Delete your uploads/aggregates from your account or contact support to request removal." },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0b1021] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-[#0b1021]/80 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Clockit</Link>
          <nav className="flex items-center gap-4 text-sm text-white/80">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/docs" className="hover:text-white">Docs</Link>
            <Link href="/auth" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <section className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-blue-200/70">Contact</p>
          <h1 className="text-3xl font-bold leading-tight">Talk to the Clockit team</h1>
          <p className="text-white/80">
            Need help, have a feature request, or want your data removed? We’re here to help.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <a
              href="mailto:support@octech.dev"
              className="px-4 py-2 rounded-lg bg-white text-[#0b1021] text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm"
            >
              Email support@octech.dev
            </a>
            <Link
              href="/privacy"
              className="px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:text-white hover:border-white/30 text-sm transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">FAQs</h2>
          <div className="space-y-3">
            {faqs.map((item) => (
              <div key={item.q} className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-sm font-semibold text-white">{item.q}</p>
                <p className="text-sm text-white/75 mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
