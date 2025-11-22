"use client";

import { useState } from "react";

interface InstallButtonProps {
  variant?: "hero" | "nav";
}

export default function InstallButton({ variant = "hero" }: InstallButtonProps) {
  const [error, setError] = useState<string | null>(null);
  // Initialize with an empty string to allow the "Download Clockit" placeholder to be selected
  // The selectedEditor state will now always revert to "" after an action to keep the placeholder visible.
  const [selectedEditor, setSelectedEditor] = useState<string>("");

  const editorOptions = [
    { label: "VS Code", value: "vscode", url: "https://marketplace.visualstudio.com/items?itemName=octech.clockit" },
    // NOTE: URLs for Cursor and Antigravity VSIX downloads are placeholders.
    // Replace these with actual download links or marketplace URLs for a functional solution.
    { label: "Cursor", value: "cursor", url: "https://example.com/download/cursor-clockit.vsix" },
    { label: "Antigravity", value: "antigravity", url: "https://example.com/download/antigravity-clockit.vsix" },
  ];

  const handleEditorSelectionAndInstall = (newValue: string) => {
    setError(null);
    // Do not proceed if the placeholder option is selected
    if (!newValue) {
      // Ensure the dropdown value is reset to the placeholder if it was somehow set to a real value
      // and the user then selected the placeholder again.
      setSelectedEditor("");
      return;
    }

    const selectedOption = editorOptions.find(option => option.value === newValue);

    if (!selectedOption) {
      setError("Please select a valid editor.");
      setSelectedEditor(""); // Reset dropdown to placeholder
      return;
    }

    try {
      window.open(selectedOption.url, "_blank");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during download.");
      }
      console.error("InstallButton error:", err);
    } finally {
      // Always reset the selectedEditor to the placeholder after an attempt to open a link
      // so the dropdown text doesn't change and always shows "Download Clockit".
      setSelectedEditor("");
    }
  };

  const commonSelectClasses = `
    appearance-none pr-2 cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-blue-500
    transition-all
  `;

  const navSelectClasses = `
    px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm
  `;

  const heroSelectClasses = `
    px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5
  `;

  return (
    <div className="flex flex-col items-center">
      <select
        value={selectedEditor}
        onChange={(e) => handleEditorSelectionAndInstall(e.target.value)}
        className={`${commonSelectClasses} ${variant === "nav" ? navSelectClasses : heroSelectClasses}`}
      >
        <option value="" disabled>Download Clockit</option>
        {editorOptions.map((option) => (
          <option key={option.value} value={option.value}>
            Install for {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
