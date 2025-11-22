"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import Login from "@/components/Login";
import UploadCSV from "@/components/UploadCSV";
import Stats from "@/components/Stats";
import { Parallax } from "react-parallax";
import ReadDocsButton from "@/components/ReadDocsButton";
import InstallButton from "@/components/InstallButton";
import { IconCode } from "@tabler/icons-react";
import Image from "next/image";

export default function Home() {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error: {error.message}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col font-sans text-gray-900">
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/icon.png" alt="Clockit Icon" className="w-6 h-6 rounded-full"  width={24} height={24} />
              <span className="font-bold text-xl tracking-tight text-gray-900">Clockit</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="/docs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Docs</a>
              <Login variant="nav" />
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <Parallax strength={200}>
          <main className="flex-grow pt-32 pb-20 px-6 relative overflow-hidden">
            <div className="max-w-5xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-blue-100">
                <IconCode />
                IDE Extension
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 leading-tight">
                Track time <br />
                <span className="text-gray-500">automatically as you code</span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                Clockit helps developers log coding sessions automatically, with idle detection, and export to CSV, Jira, or Notion — all within Your IDE.
              </p>
              
              <div className="flex justify-center gap-4">
                <ReadDocsButton variant="hero" />
                <InstallButton variant="hero" />
              </div>
            </div>


          </main>
        </Parallax>

        <Parallax strength={100}>
        <section id="features" className="px-6 py-24 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful time tracking for developers</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Track your coding sessions automatically with smart features designed for modern development workflows.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="card-clean p-8 hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Automatic Tracking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Start tracking time automatically when you begin coding. Pause and resume with a single click from the VS Code status bar.
                </p>
              </div>

              <div className="card-clean p-8 hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Idle Detection</h3>
                <p className="text-gray-600 leading-relaxed">
                  Smart idle detection automatically trims inactive time for accurate duration tracking. Configure idle timeout to match your workflow.
                </p>
              </div>

              <div className="card-clean p-8 hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Multi-Sink Export</h3>
                <p className="text-gray-600 leading-relaxed">
                  Export your time logs to CSV for analysis, Jira for work tracking, or Notion for project management — all from VS Code.
                </p>
              </div>

              <div className="card-clean p-8 hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 text-orange-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Per-File Tracking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automatic per-file and per-language focus time tracking. See where you spend the most time and optimize your workflow.
                </p>
              </div>

              <div className="card-clean p-8 hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-6 text-pink-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Git Integration</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automatically detect git repository, branch, and issue keys from commit messages for seamless project tracking.
                </p>
              </div>

              <div className="card-clean p-8 hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Session Comments</h3>
                <p className="text-gray-600 leading-relaxed">
                  Add comments when stopping sessions to document your work. Defaults to latest git commit message for convenience.
                </p>
              </div>
            </div>
          </div>
        </section>
        </Parallax>

        <footer className="py-12 bg-gray-50 text-center text-gray-500 text-sm border-t border-gray-200">
          <p>&copy; {new Date().getFullYear()} Clockit Inc. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <span className="font-bold text-lg text-gray-900">Clockit</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.displayName}</span>
            <button onClick={() => auth.signOut()} className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <section className="lg:col-span-2 space-y-6">
            <div className="card-clean p-8 bg-white">
              <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <span className="text-blue-500">●</span> Recent Activity
              </h2>
              <Stats uid={user.uid} />
            </div>
          </section>

          <section className="space-y-6">
            <div className="card-clean p-8 bg-white">
              <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                <span className="text-green-500">●</span> Upload Data
              </h2>
              <UploadCSV uid={user.uid} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
