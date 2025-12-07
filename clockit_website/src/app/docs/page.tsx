"use client";

import Link from "next/link";
import Image from "next/image";
import {
  IconActivity,
  IconBrandGithub,
  IconClock,
  IconFileCode,
  IconFileDiff,
  IconKey,
  IconMenu2,
  IconMessageCircle,
  IconShare2,
  IconTable,
  IconTimeDuration15,
  IconTargetArrow,
  IconX,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

type SectionId =
  | "introduction"
  | "features"
  | "installation"
  | "session-tracking"
  | "goals"
  | "credential-management"
  | "export-jira"
  | "export-notion"
  | "export-csv"
  | "cloud-backup"
  | "configuration"
  | "commands"
  | "faq"
  | "troubleshooting";

type SectionMeta = {
  id: SectionId;
  title: string;
  keywords: string[];
};

type NavGroup = {
  title: string;
  ids: SectionId[];
};

type SidebarLinkProps = {
  id: SectionId;
  label: string;
  onClick: (id: SectionId) => void;
  active: boolean;
};

type FeatureItem = {
  text: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
};

type DocVersion = {
  id: string;
  label: string;
  description?: string;
  features: FeatureItem[];
  configurationOptions: typeof baseConfigurationOptions;
  commands: typeof baseCommands;
};

type TopNavProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  versions: DocVersion[];
  selectedVersionId: string;
  onChangeVersion: (id: string) => void;
};

type SideNavigationProps = {
  isSidebarOpen: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  groups: NavGroup[];
  onSectionClick: (id: SectionId) => void;
  activeId: SectionId;
};

const sectionMeta: Record<SectionId, SectionMeta> = {
  introduction: { id: "introduction", title: "Introduction", keywords: ["overview", "docs", "about", "clockit"] },
  features: { id: "features", title: "Features", keywords: ["auto track", "idle detection", "export", "csv", "jira", "notion"] },
  installation: { id: "installation", title: "Installation", keywords: ["install", "marketplace", "vsix"] },
  "session-tracking": { id: "session-tracking", title: "Session Tracking", keywords: ["start", "pause", "resume", "stop", "idle", "data", "focus timer"] },
  goals: { id: "goals", title: "Goals", keywords: ["goals", "jira subtasks", "focus", "checklist"] },
  "credential-management": { id: "credential-management", title: "Credentials", keywords: ["storage", "security", "jira", "notion", "csv"] },
  "export-jira": { id: "export-jira", title: "Jira Export", keywords: ["worklog", "api token", "issue", "atlassian"] },
  "export-notion": { id: "export-notion", title: "Notion Export", keywords: ["integration token", "database", "page", "columns"] },
  "export-csv": { id: "export-csv", title: "CSV Export", keywords: ["file", "analysis", "website", "stats"] },
  "cloud-backup": { id: "cloud-backup", title: "IDE Cloud sync", keywords: ["cloud", "token", "ingest", "api"] },
  configuration: { id: "configuration", title: "Configuration", keywords: ["settings", "options", "defaults"] },
  commands: { id: "commands", title: "Command Summary", keywords: ["command palette", "actions"] },
  faq: { id: "faq", title: "FAQ", keywords: ["faq", "privacy", "goals", "focus", "csv"] },
  troubleshooting: { id: "troubleshooting", title: "Troubleshooting", keywords: ["errors", "jira", "notion"] },
};

const navGroups: NavGroup[] = [
  { title: "Getting Started", ids: ["introduction", "features", "installation"] },
  { title: "Core Concepts", ids: ["session-tracking", "goals", "credential-management"] },
  { title: "Cloud", ids: ["cloud-backup"] },
  { title: "Exporting", ids: ["export-jira", "export-notion", "export-csv"] },
  { title: "Reference", ids: ["configuration", "commands", "faq", "troubleshooting"] },
];

const baseFeatures: FeatureItem[] = [
  { text: "Automatic time tracking when you start coding", Icon: IconClock },
  { text: "Idle detection and trimming for accurate duration", Icon: IconActivity },
  { text: "Per-file and per-language focus time captured automatically", Icon: IconFileCode },
  { text: "Line changes counted (added and deleted)", Icon: IconFileDiff },
  { text: "Pause/resume and a focus timer with countdown in the status bar", Icon: IconTimeDuration15 },
  { text: "Optional session comments on stop", Icon: IconMessageCircle },
  { text: "Goals side panel to add/complete/delete goals; completed goals attach to sessions", Icon: IconTargetArrow },
  { text: "Multi-sink export to CSV, Jira, and Notion", Icon: IconShare2 },
  { text: "Guided credential prompts stored securely", Icon: IconKey },
  { text: "CSV menu in the status bar for quick access", Icon: IconTable },
  { text: "Quick link to Clockit Cloud from the CSV menu", Icon: IconBrandGithub },
];

const baseConfigurationOptions = [
  { name: "clockit.enabledSinks", defaultValue: '["csv"]', desc: "Select which sinks to use for exporting sessions." },
  { name: "clockit.askSinksEachTime", defaultValue: "true", desc: "Always prompt which sinks to use before exporting." },
  { name: "clockit.enableJira", defaultValue: "false", desc: "Enable Jira integration for time tracking." },
  { name: "clockit.jira.apiToken", defaultValue: '""', desc: "Jira API token for authentication." },
  { name: "clockit.jira.email", defaultValue: '""', desc: "Email associated with your Jira account." },
  { name: "clockit.jira.domain", defaultValue: '""', desc: "Your Jira domain (for example, your-team.atlassian.net)." },
  { name: "clockit.csv.outputDirectory", defaultValue: '""', desc: "Directory to save CSV time logs. Leave empty to use the current working directory." },
  { name: "clockit.csv.filename", defaultValue: '"time_log.csv"', desc: "Filename for the CSV time log." },
  { name: "clockit.csv.addHeaderIfMissing", defaultValue: "true", desc: "Add header row to CSV file if it is missing." },
  { name: "clockit.csv.ensureDirectory", defaultValue: "true", desc: "Automatically create the output directory if it does not exist." },
  { name: "clockit.author.name", defaultValue: '""', desc: "Your name to include in CSV and backup logs. Falls back to git config user.name." },
  { name: "clockit.author.email", defaultValue: '""', desc: "Your email to include in CSV and backup logs. Falls back to git config user.email." },
  { name: "clockit.machineName", defaultValue: '""', desc: "Machine identifier to include in logs. Defaults to the OS hostname." },
  { name: "clockit.autoStartOnLaunch", defaultValue: "true", desc: "Automatically start time tracking when VS Code launches." },
  { name: "clockit.idleTimeoutMinutes", defaultValue: "5", desc: "Number of idle minutes before pausing time tracking." },
  { name: "clockit.showNotifications", defaultValue: "true", desc: "Show notifications for time tracking events." },
  { name: "clockit.notion.enableNotion", defaultValue: "false", desc: "Enable Notion integration for time tracking." },
  { name: "clockit.notion.pageId", defaultValue: '""', desc: "Notion Page ID where time logs will be recorded." },
  { name: "clockit.notion.apiToken", defaultValue: '""', desc: "Notion API token for authentication." },
  { name: "clockit.notion.databaseId", defaultValue: '""', desc: "Notion Database ID for logging time entries." },
  { name: "clockit.backup.enabled", defaultValue: "true", desc: "Periodically checkpoint the active session to a backup CSV and flush on shutdown or errors." },
  { name: "clockit.backup.intervalSeconds", defaultValue: "0", desc: "How often to checkpoint the in-progress session. 0 disables checkpoints." },
  { name: "clockit.backup.directory", defaultValue: '""', desc: "Directory for backups. If empty, uses this directory or the workspace root." },
  { name: "clockit.backup.filenamePrefix", defaultValue: '"clockit_backup_"', desc: "Prefix for backup CSV files. Final name is prefix + YYYYMMDD + .csv." },
];

const baseCommands = [
  { command: "clockit.startTimeTracking", title: "Clockit: Start Time" },
  { command: "clockit.stopTimeTracking", title: "Clockit: Stop Time" },
  { command: "clockit.pauseTimeTracking", title: "Clockit: Pause Time Tracking" },
  { command: "clockit.resumeTimeTracking", title: "Clockit: Resume Time Tracking" },
  { command: "clockit.setFocusTimer", title: "Clockit: Set Focus Timer" },
  { command: "clockit.goals.openView", title: "Clockit: Open Goals" },
  { command: "clockit.goals.add", title: "Clockit: Add Goal" },
  { command: "clockit.goals.toggle", title: "Clockit: Toggle Goal" },
  { command: "clockit.goals.delete", title: "Clockit: Delete Goal" },
  { command: "clockit.showTimeLog", title: "Clockit: Show Time Log" },
  { command: "clockit.clearTimeLog", title: "Clockit: Clear Time Log" },
  { command: "clockit.toggle", title: "Clockit: Toggle Time Tracking" },
  { command: "clockit.openCsv", title: "Clockit: Open CSV Log" },
  { command: "clockit.chooseCsvFolder", title: "Clockit: Choose CSV Output Folder" },
  { command: "clockit.chooseSinks", title: "Clockit: Choose Sinks" },
  { command: "clockit.editCredentials", title: "Clockit: Edit Credentials" },
  { command: "clockit.clearCredentials", title: "Clockit: Clear Credentials" },
  { command: "clockit.signIn.jira", title: "Clockit: Sign in to Jira (Coming Soon)" },
  { command: "clockit.signIn.notion", title: "Clockit: Sign in to Notion (Coming Soon)" },
];

const docVersions: DocVersion[] = [
  {
    id: "v1",
    label: "v1.x (current)",
    description: "Stable docs for the current extension line.",
    features: baseFeatures,
    configurationOptions: baseConfigurationOptions,
    commands: baseCommands,
  },
];

function matchesSearch(meta: SectionMeta, term: string) {
  if (!term.trim()) {
    return true;
  }
  const haystack = `${meta.title} ${meta.id} ${meta.keywords.join(" ")}`.toLowerCase();
  return haystack.includes(term.trim().toLowerCase());
}

function SidebarLink({ id, label, onClick, active }: SidebarLinkProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`block w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 border border-blue-100"
          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
      }`}
    >
      {label}
    </button>
  );
}

function TopNav({ isSidebarOpen, onToggleSidebar, versions, selectedVersionId, onChangeVersion }: TopNavProps) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 text-gray-600"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
          >
            {isSidebarOpen ? <IconX /> : <IconMenu2 />}
          </button>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/icon.png" alt="Clockit Icon" width={24} height={24} className="rounded-full" />
            <span className="font-bold text-xl tracking-tight">Clockit Docs</span>
          </Link>
        </div>
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="doc-version">Select docs version</label>
            <select
              id="doc-version"
              className="hidden sm:block border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              value={selectedVersionId}
              onChange={(e) => onChangeVersion(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
              Dashboard
            </Link>
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
              Home
            </Link>
          <a
            href="https://github.com/RookiePlayers/clockit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Clockit GitHub repository"
          >
            <IconBrandGithub size={24} />
          </a>
        </div>
      </div>
    </nav>
  );
}

function SideNavigation({ isSidebarOpen, searchTerm, onSearchChange, groups, onSectionClick, activeId }: SideNavigationProps) {
  return (
    <aside
      className={`
        fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto z-40 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      <div className="p-6 space-y-4">
        <div className="px-2">
          <label className="sr-only" htmlFor="doc-search">Search docs</label>
          <input
            id="doc-search"
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search docs..."
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
            {group.ids.map((id) => (
              <SidebarLink key={id} id={id} label={sectionMeta[id].title} onClick={onSectionClick} active={activeId === id} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function DocsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("introduction");
  const [selectedVersionId, setSelectedVersionId] = useState(docVersions[0]?.id || "v1");

  const filteredNavGroups = useMemo(() => {
    return navGroups
      .map((group) => {
        const ids = group.ids.filter((id) => matchesSearch(sectionMeta[id], searchTerm));
        return { ...group, ids: ids.length === 0 && searchTerm.trim() === "" ? group.ids : ids };
      })
      .filter((group) => group.ids.length > 0);
  }, [searchTerm]);

  const visibleSectionIds = useMemo(() => {
    const ids = filteredNavGroups.flatMap((g) => g.ids);
    return new Set<SectionId>(ids);
  }, [filteredNavGroups]);

  const currentVersion = useMemo(
    () => docVersions.find((v) => v.id === selectedVersionId) || docVersions[0],
    [selectedVersionId]
  );
  const currentFeatures = currentVersion?.features ?? baseFeatures;
  const currentConfiguration = currentVersion?.configurationOptions ?? baseConfigurationOptions;
  const currentCommands = currentVersion?.commands ?? baseCommands;

  const scrollToSection = (id: SectionId) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsSidebarOpen(false);
      setActiveSectionId(id);
    }
  };

  useEffect(() => {
    const handler = () => {
      const headings = Object.keys(sectionMeta) as SectionId[];
      let current: SectionId | null = null;
      for (const id of headings) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            current = id;
            break;
          }
        }
      }
      if (current) {
        setActiveSectionId(current);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <TopNav
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        versions={docVersions}
        selectedVersionId={selectedVersionId}
        onChangeVersion={setSelectedVersionId}
      />

      <div className="max-w-7xl mx-auto pt-16 flex">
        <SideNavigation
          isSidebarOpen={isSidebarOpen}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          groups={filteredNavGroups}
          onSectionClick={scrollToSection}
          activeId={activeSectionId}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-12">
          <div className="prose prose-blue max-w-4xl mx-auto">
            {visibleSectionIds.size === 0 ? (
              <p className="text-gray-600 text-sm">No sections match your search. Clear the search to see all documentation.</p>
            ) : (
              <>
                {/* Introduction */}
                {visibleSectionIds.has("introduction") && (
                  <section id="introduction" className="mb-16">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-6">Clockit Documentation</h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 border border-blue-100">
                    {currentVersion?.label || "Current"}
                  </span>
                  {currentVersion?.description && (
                    <span className="text-sm text-gray-600">{currentVersion.description}</span>
                  )}
                </div>
                <p className="text-md text-gray-600 leading-relaxed">
                  Clockit helps developers log coding sessions automatically, add session comments, and export tracked time to CSV, Jira, or Notion, all within VS Code.
                </p>
              </section>
            )}

                {/* Features */}
                {visibleSectionIds.has("features") && (
                  <section id="features" className="mb-16 scroll-mt-24">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentFeatures.map(({ text, Icon }) => (
                        <li key={text} className="flex items-start gap-2 text-gray-700">
                          <Icon size={18} className="text-blue-500 mt-0.5 shrink-0" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Installation */}
                {visibleSectionIds.has("installation") && (
                  <section id="installation" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Installation</h2>
                    <div className="space-y-4 text-gray-700">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Open VS Code and go to the Extensions view.</li>
                        <li>Search for <strong>Clockit</strong> or use the marketplace link below.</li>
                        <li>Install the extension and reload VS Code when prompted.</li>
                      </ol>
                      <p>
                        Marketplace:{" "}
                        <a className="text-blue-600 hover:underline" href="https://marketplace.visualstudio.com/items?itemName=octech.clockit" target="_blank" rel="noreferrer">
                          octech.clockit
                        </a>
                      </p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="font-semibold text-gray-900 mb-2">Offline install</p>
                        <p className="text-sm text-gray-600">Use a bundled VSIX if you are offline.</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 mt-2">
                          <li>Download <code>clockit-x.y.z.vsix</code> from your release bundle.</li>
                          <li>Run <code className="bg-white px-1 py-0.5 border border-gray-200 rounded">code --install-extension clockit-x.y.z.vsix</code>.</li>
                          <li>Reload VS Code and open the command palette to start tracking.</li>
                        </ol>
                      </div>
                    </div>
                  </section>
                )}

                {visibleSectionIds.has("session-tracking") && (
                  <section id="session-tracking" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Tracking</h2>
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Start a session</h3>
                        <code className="bg-white px-2 py-1 rounded border border-gray-200 text-sm font-mono text-blue-600">Clockit: Start Time Tracking</code>
                        <p className="text-gray-600 mt-1 text-sm">Starts a timer linked to your current workspace. You can also enable auto-start on launch in settings.</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Pause and resume</h3>
                        <div className="space-x-2">
                          <code className="bg-white px-2 py-1 rounded border border-gray-200 text-sm font-mono text-blue-600">Clockit: Pause</code>
                          <code className="bg-white px-2 py-1 rounded border border-gray-200 text-sm font-mono text-blue-600">Clockit: Resume</code>
                        </div>
                        <p className="text-gray-600 mt-1 text-sm">Idle detection trims time automatically after the configured idle timeout.</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">Stop and comment</h3>
                        <code className="bg-white px-2 py-1 rounded border border-gray-200 text-sm font-mono text-blue-600">Clockit: Stop</code>
                        <p className="text-gray-600 mt-1 text-sm">When you stop, add an optional comment (for example, &quot;Refactored API routes&quot;).</p>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="font-bold text-gray-900 mb-4">What gets tracked</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {[
                          "Start and end time",
                          "Duration after idle trimming",
                          "Workspace name and machine",
                          "Git repository and branch",
                          "Per file and per language focus time",
                          "Lines added and deleted",
                          "Optional comment and Jira issue key",
                        ].map((item) => (
                          <div key={item} className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg font-medium text-center">
                            {item}
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm mt-3">
                        Clockit keeps this data local until you choose an export sink. If you only export to CSV, nothing leaves your machine.
                      </p>
                    </div>
                  </section>
                )}

                {visibleSectionIds.has("goals") && (
                  <section id="goals" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Goals</h2>
                    <p className="text-gray-700 mb-3">
                      Manage goals from the Clockit Goals side panel: add, complete, delete, or import from Jira. Completed goals attach to your next session and clear after a successful CSV write.
                    </p>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><span className="font-semibold">Add goals</span>: Use “Add goal…” in the Goals panel. Enter a title or choose “Import from Jira issue” to search issues and pull subtasks as goals.</p>
                      <p><span className="font-semibold">Jira integration</span>: Searches use your Jira credentials; subtasks become goals with their summaries as titles. When imported from an issue, the issue key is remembered so you do not have to type a session comment again.</p>
                      <p><span className="font-semibold">Completion</span>: Mark goals done in the panel; completion time is captured. On session stop, completed goals populate the session comment automatically (“Complete goals set”) and are flushed after a successful CSV write.</p>
                    </div>
                  </section>
                )}

                {/* Credentials */}
                {visibleSectionIds.has("credential-management") && (
                  <section id="credential-management" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Credentials and Storage</h2>
                    <p className="text-gray-700 mb-4">
                      Clockit stores secrets in VS Code Secret Storage (encrypted by your OS keychain). Settings that are not secrets stay in your workspace settings.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Jira</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Stored: domain, email, API token (token is secret).</li>
                          <li>Usage: used only when you export a session to Jira.</li>
                          <li>Retention: stays until you run <strong>Clockit: Clear Credentials</strong> or uninstall.</li>
                        </ul>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Notion</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Stored: internal integration token (secret) and destination (database or page).</li>
                          <li>Usage: lets you browse pages shared with the token and creates database columns automatically.</li>
                          <li>Retention: remains in Secret Storage until you clear credentials.</li>
                        </ul>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">CSV</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Stored: export folder and filename (no secrets required).</li>
                          <li>Usage: writes a local CSV that the Clockit website can read to visualize your stats.</li>
                        </ul>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Clearing and editing</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          <li>Use <strong>Clockit: Edit Credentials</strong> to update values.</li>
                          <li>Use <strong>Clockit: Clear Credentials</strong> to remove one sink or all stored secrets.</li>
                        </ul>
                      </div>
                </div>
              </section>
            )}

            {visibleSectionIds.has("cloud-backup") && (
              <section id="cloud-backup" className="mb-16 scroll-mt-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">IDE Cloud sync</h2>
                <p className="text-gray-700 mb-4">
                  Turn on automatic backups from the Clockit VS Code plugin to your account using an API token. Local CSV exports remain unchanged.
                </p>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Sign in at <a className="text-blue-600 hover:underline" href="https://clockit.octech.dev/dashboard" target="_blank" rel="noreferrer">clockit.octech.dev/dashboard</a> and open <strong>Profile → API Tokens</strong>.</li>
                  <li>Create a token (optional expiry) and copy it once.</li>
                  <li>In VS Code settings, set:
                    <ul className="list-disc list-inside ml-5 text-sm text-gray-700 space-y-1">
                      <li><code className="bg-gray-100 px-1 py-0.5 rounded">clockit.cloud.enabled</code>: <code className="bg-gray-100 px-1 py-0.5 rounded">true</code></li>
                      <li><code className="bg-gray-100 px-1 py-0.5 rounded">clockit.cloud.apiUrl</code>: defaults from <code>CLOCKIT_INGEST_URL</code> (built-in); override only if you host your own ingest</li>
                      <li><code className="bg-gray-100 px-1 py-0.5 rounded">clockit.cloud.apiToken</code>: the token you created (stored as a secret)</li>
                    </ul>
                  </li>
                  <li>Stop a session: Clockit writes CSV locally and also uploads to your account for aggregated stats.</li>
                  <li><strong>Custom ingest:</strong> If you deploy your own ingest function, set <code>CLOCKIT_INGEST_URL</code> in your environment and update <code>clockit.cloud.apiUrl</code> if needed.</li>
                  <li><strong>Rate limits:</strong> Ingest enforces per-token limits (defaults: minute limit 60, day limit 5000). If exceeded, the endpoint returns 429; local CSV is still written.</li>
                </ol>
              </section>
            )}

            {/* Exports */}
                {visibleSectionIds.has("export-jira") && (
                  <section id="export-jira" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Jira Export</h2>
                    <p className="text-gray-600 mb-4">Automatically logs your work as a Jira worklog entry.</p>
                    
                    <ol className="space-y-4 list-decimal list-inside text-gray-700">
                      <li className="pl-2">
                        <span className="font-semibold">Configure Jira credentials</span>
                        <ul className="pl-6 mt-2 space-y-1 text-sm text-gray-600 list-disc">
                          <li>Run <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">Clockit: Configure Jira</code>.</li>
                          <li>Domain: <span className="font-mono">your-team.atlassian.net</span> (no protocol).</li>
                          <li>Email: your Atlassian account email.</li>
                          <li>
                            API token:
                            <ol className="list-decimal list-inside ml-5 space-y-1 mt-1">
                              <li>Visit <a href="https://id.atlassian.com/manage/api-tokens" className="text-blue-600 hover:underline">id.atlassian.com/manage/api-tokens</a>.</li>
                              <li>Click <strong>Create API token</strong>, name it &quot;Clockit&quot;, and create.</li>
                              <li>Copy the token and paste it when prompted.</li>
                            </ol>
                          </li>
                        </ul>
                      </li>
                      <li className="pl-2">
                        <span className="font-semibold">Pick the issue</span>
                        <p className="text-sm text-gray-600 mt-1">When exporting, search by key (TP-12) or summary. Clockit caches search results briefly for faster picks.</p>
                      </li>
                      <li className="pl-2">
                        <span className="font-semibold">Auto-detection</span>
                        <p className="text-sm text-gray-600 mt-1">If your branch or comment includes a key (for example, TP-123), Clockit detects it automatically.</p>
                      </li>
                    </ol>
                  </section>
                )}

                {visibleSectionIds.has("export-notion") && (
                  <section id="export-notion" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Notion Export</h2>
                    <p className="text-gray-600 mb-4">Logs each session as a new row in a Notion database or appends to a page.</p>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        Clockit inspects your database and creates missing properties (Duration, Started, Workspace, IssueKey, and more) before writing entries.
                      </p>
                    </div>
                    <div className="space-y-3 text-gray-700">
                      <p className="text-sm font-semibold text-gray-900">How to get the token and database</p>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Go to <a href="https://www.notion.so/my-integrations" className="text-blue-600 hover:underline">Notion integrations</a> and create a new internal integration. Copy the token (starts with <code>ntn_</code>).</li>
                        <li>Share the target page or database with the integration so it has access.</li>
                        <li>
                          Grab the database ID:
                          <ul className="list-disc list-inside ml-5 space-y-1 text-sm text-gray-600">
                            <li>Open the database in a browser; the ID is the 32-character part of the URL.</li>
                            <li>Clockit also lets you search and pick a database or page directly from the prompt.</li>
                          </ul>
                        </li>
                        <li>Run <code className="text-sm bg-gray-100 px-1 py-0.5 rounded">Clockit: Configure Notion</code> and paste the token and database.</li>
                      </ol>
                      <p className="text-sm text-gray-700">
                        Once connected, Clockit lets you browse pages shared with the token. For databases, it creates or updates columns such as Duration, Started, Repo, Branch, IssueKey, and Author so entries stay structured.
                      </p>
                    </div>
                  </section>
                )}

                {visibleSectionIds.has("export-csv") && (
                  <section id="export-csv" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">CSV Export</h2>
                    <p className="text-gray-600 mb-4">Every completed session is appended to a CSV file for local analysis.</p>
                    <div className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      startedIso, endedIso, durationSeconds, idleSeconds, linesAdded, linesDeleted, perFileSeconds, perLanguageSeconds, authorName, authorEmail, machine, ideName, workspace, repoPath, branch, issueKey, comment, goals
                    </div>
                    <p className="text-gray-600 mt-3 text-sm">
                      The CSV stays on disk and can be opened through the status bar menu (which also links to Clockit Cloud). The Clockit website can read this CSV to show charts of your focus time, repos, branches, IDE, and issues without sharing data externally.
                    </p>
                  </section>
                )}

                {/* Configuration */}
                {visibleSectionIds.has("configuration") && (
                  <section id="configuration" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration Options</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                          <tr>
                            <th scope="col" className="px-6 py-4">Setting</th>
                            <th scope="col" className="px-6 py-4">Default</th>
                            <th scope="col" className="px-6 py-4">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {currentConfiguration.map((row) => (
                            <tr key={row.name} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-mono text-blue-600">{row.name}</td>
                              <td className="px-6 py-4 font-mono text-gray-500">{row.defaultValue}</td>
                              <td className="px-6 py-4 text-gray-700">{row.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Commands */}
                {visibleSectionIds.has("commands") && (
                  <section id="commands" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Command Summary</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                          <tr>
                            <th scope="col" className="px-6 py-4">Command</th>
                            <th scope="col" className="px-6 py-4">Title</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {currentCommands.map((row) => (
                            <tr key={row.command} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-mono text-blue-600">{row.command}</td>
                              <td className="px-6 py-4 text-gray-700">{row.title}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {visibleSectionIds.has("faq") && (
                  <section id="faq" className="mb-16 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">FAQ</h2>
                    <div className="space-y-4 text-sm text-gray-700">
                      <div>
                        <h4 className="font-semibold text-gray-900">Does Clockit send my data anywhere?</h4>
                        <p>CSV is written locally. Cloud backup only runs if you enable it and set an API token. Goals stay local and clear after export.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">How do goals work?</h4>
                        <p>Add goals in the Goals side panel; import subtasks from Jira issues if connected. Completed goals attach to the next session comment and are cleared after a successful CSV write.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">What about the focus timer?</h4>
                        <p>Run “Clockit: Set Focus Timer” with <code className="bg-gray-100 px-1 py-0.5 rounded">mm:ss</code> or minutes. The status bar shows the countdown, and you get a notification when it ends.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Can I disable CSV export?</h4>
                        <p>CSV is always enabled (default sink) to keep a local record. You can add Jira/Notion alongside it.</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Troubleshooting */}
                {visibleSectionIds.has("troubleshooting") && (
                  <section id="troubleshooting" className="mb-24 scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Troubleshooting</h2>
                    <div className="space-y-4">
                      <div className="border border-red-100 bg-red-50 rounded-lg p-4">
                        <h4 className="font-bold text-red-800">Jira 400 or 401 error</h4>
                        <p className="text-sm text-red-700 mt-1">Invalid token or domain. Refresh the API token at id.atlassian.com and re-run Configure Jira.</p>
                      </div>
                      <div className="border border-orange-100 bg-orange-50 rounded-lg p-4">
                        <h4 className="font-bold text-orange-800">Notion 400 Bad Request</h4>
                        <p className="text-sm text-orange-700 mt-1">Missing title field or wrong property type. Ensure your database has a title property and the integration is shared to it.</p>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
