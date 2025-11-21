# Clockit – Developer-Friendly Time Tracker for VS Code

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=octech.clockit">
    <img src="https://img.shields.io/visual-studio-marketplace/v/octech.clockit?label=VS%20Code%20Marketplace&color=007acc&logo=visualstudiocode" alt="Marketplace Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=octech.clockit">
    <img src="https://img.shields.io/visual-studio-marketplace/i/octech.clockit?label=Installs&color=brightgreen&logo=visualstudiocode" alt="Installs">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=octech.clockit">
    <img src="https://img.shields.io/visual-studio-marketplace/r/octech.clockit?label=Rating&color=ffb300&logo=starship&logoColor=white" alt="Rating">
  </a>
  <br />
  <a href="https://github.com/RookiePlayers/clockit/actions/workflows/production.yml">
    <img src="https://github.com/RookiePlayers/clockit/actions/workflows/production.yml/badge.svg" alt="Build Status">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License">
  </a>
  <a href="https://github.com/RookiePlayers/clockit">
    <img src="https://img.shields.io/github/stars/RookiePlayers/clockit?style=social" alt="GitHub stars">
  </a>
</p>

**Clockit** helps developers log coding sessions automatically, add session comments, and export tracked time to **CSV**, **Jira**, or **Notion** — all within VS Code (tested on VS Code 1.80+).

---

https://github.com/user-attachments/assets/4a6f36cf-c224-47b1-bd08-fb2f39038b11



## ✨ Features

- **Automatic time tracking** when you start coding  
- **Idle detection & trimming** for accurate duration  
- **Idle seconds recorded** for visibility per session  
- **Per-file and per-language focus time** captured automatically  
- **Line changes counted** (added/deleted) for lightweight effort signals  
- **Session comments** on stop (defaults to latest git commit subject if empty)  
- **Multi-sink export** — CSV, Jira, Notion  
- **Guided credential prompts** (stored securely)  
- **Edit or clear credentials anytime**  
- **Sink selection each session**  
- **CSV menu** in the status bar for quick access  

---

## About
### Session Tracking

Automatically records time spent on projects.
  • Start Session
Command: clockit: Start Time Tracking
→ Starts a timer linked to your current workspace.
  • Pause / Resume
Command: clockit: Pause or clockit: Resume.
  • Stop Session
Command: clockit: Stop
→ Prompts for a short comment (e.g. “Refactored API routes”).

What gets tracked:
  • Start and end time (ISO)
  • Duration (seconds)
  • Workspace name
  • Git repository path and branch
  • Associated issue (from Jira or branch name)
  • Comment

You’ll see the current timer and controls in the status bar (bottom-left).

---
## Exporting Worklogs

**You can export completed sessions to external systems.**

### Jira Export

### Automatically logs your work as a Jira worklog entry

1. Configure Jira Credentials
   - Run: clockit: Configure Jira
   - Enter:
     - jira.domain: e.g. yourteam.atlassian.net
     - jira.email: your Atlassian account
     - jira.apiToken: create from id.atlassian.com/manage/api-tokens
2. Select Issue
   - When exporting, a prompt appears: “Search issues by key or summary.”
   - Type part of a key (TP-12) or summary (login bug) to find matching issues.
3. Automatic Issue Detection
   - If your branch or commit comment includes a key (TP-123), clockit detects it automatically.
4. View Results
   - Success → Jira → TP-123 in the output channel.
   - Errors show helpful messages (e.g. auth expired, issue not visible)
---
### Notion Export

Logs each session as a new row in a Notion database.
1. Configure Notion
  • Run: clockit: Configure Notion
  • Enter:
  • notion.apiToken: internal integration token from Notion.
  • notion.database: select your target database.
2. Database Requirements
  • Must include a Title property (e.g. “Name”).
  • Recommended columns:
  • Name (Title) – required
  • Duration (Number)
  • Started (Date)
  • Ended (Date)
  • Comment (Rich Text)
  • Branch / Issue (Text)
3. Export
  • clockit automatically creates a page under that database after each completed session.

---
### CSV Exports

Every completed session is appended to a CSV file for local analysis or backup.
  • CSV file location:
~/Documents/clockit/ (default)
or whatever you set in
clockit_logger.csv.outputDirectory.
  • Each entry includes:
```bash
startedIso, endedIso, durationSeconds, idleSeconds, linesAdded, linesDeleted, perFileSeconds, perLanguageSeconds, authorName, authorEmail, machine, workspace, repoPath, branch, issueKey, comment
```

*You can open it in Excel, Numbers, or Google Sheets for timesheet analysis.*

---
## 🧩 Usage

### Start tracking

- Click the **⏱️ timer** in the status bar or run:

  ```
  Clockit: Start Tracking
  ```

### Stop tracking

- Click the timer again or run:

  ```
  Clockit: Stop Tracking
  ```

- Add a session comment when prompted.

### Choose export sinks

- On stop, you’ll be asked where to export the session (CSV, Jira, Notion).  
- Only configured sinks will be active.

### CSV quick actions

Click the **📂 CSV** icon next to the timer to:

- Change the CSV output folder  
- View past logs  
- Open logs in your editor  

---

## 🔐 Credential Management

### First-time setup

When a sink (like Jira) is selected, Clockit prompts you for:

- Domain (e.g., `yourteam.atlassian.net`)
- Email
- API Token

Values are stored securely using:

- **VS Code Secret Storage** for sensitive keys  
- **Workspace Settings** for non-secret configuration

### Edit or clear credentials

| Command | Description |
|----------|-------------|
| `Clockit: Edit Credentials` | Edit existing sink credentials. |
| `Clockit: Clear Credentials` | Remove credentials for a specific sink or all. |

---

## 🧮 Configuration Options

| Setting | Type | Default | Description |
|----------|------|----------|-------------|
| `clockit.autoStartOnLaunch` | boolean | `true` | Start tracking automatically on launch. |
| `clockit.idleTimeoutMinutes` | number | `5` | Idle time threshold. |
| `clockit.showNotifications` | boolean | `true` | Show start/stop/export messages. |
| `clockit.askSinksEachTime` | boolean | `true` | Always prompt for sinks each session. |
| `clockit.enabledSinks` | string[] | `["csv"]` | Default sinks when prompting is off. |
| `clockit.csv.outputDirectory` | string | workspace root | CSV export folder (defaults to current working dir if empty). |
| `clockit.csv.filename` | string | `time_log.csv` | CSV log file name. |
| `clockit.author.name` | string | `""` | Author name used in exports (falls back to git user.name). |
| `clockit.author.email` | string | `""` | Author email used in exports (falls back to git user.email). |
| `clockit.machineName` | string | `""` | Machine identifier for exports (defaults to hostname). |
| `clockit.backup.intervalSeconds` | number | `60` | Background backup interval; set to `0` to disable periodic writes (shutdown flushes still happen). |

---

## 🧭 Supported Export Sinks

| Sink | Description | Config Keys |
|------|--------------|-------------|
| **CSV** | Writes session logs to a CSV file. | `clockit.csv.outputDirectory`, `clockit.csv.filename` |
| **Jira** | Adds worklogs to Jira issues. | `clockit.jira.domain`, `clockit.jira.email`, `clockit.jira.apiToken` |
| **Notion** | (optional) Inserts session data into a Notion database. | `clockit.notion.databaseId`, `clockit.notion.token` |

---
## Command summary 

| Description                  | Command                            |
|------------------------------|------------------------------------|
| Begin a new session          | clockit: Start Time Tracking        |
| Description                  | clockit: Pause Time Tracking        |
| Temporarily pause            | clockit: Resume Time Tracking       |
| Continue paused session      | clockit: Stop Time Tracking         |
| End session and export       | clockit: Configure Jira             |
| Set up Jira credentials      | clockit: Configure Notion           |
| Set up Notion integration    | clockit: CSV Menu                   |
| Open quick actions for CSV   | clockit: Toggle Status Bar          |
| Show/hide status widget      |                                    |


### Automatic background
| Setting                              | Meaning                | Recommended Value      |
|---------------------------------------|------------------------|-----------------------|
| `clockit_logger.backup.enabled`        | Enables background backup | ✅ (true)              |
| `clockit_logger.backup.intervalSeconds`| How often to save      | `60` (`0` disables periodic writes; shutdown flushes still run) |
| `clockit_logger.backup.directory`      | Custom backup directory | (same as CSV / CWD)   |
| `clockit_logger.backup.filenamePrefix` | Filename prefix        | `backup_`             |

---

### Troubleshooting
| Symptom                | Likely Cause                              | Fix                                              |
|------------------------|-------------------------------------------|--------------------------------------------------|
| Jira 400 / 401         | Invalid token or domain                   | Refresh API token and re-run “Configure Jira.”   |
| Notion 400 Bad Request | Missing title field or wrong property type| Add a Title column and ensure property types match.|
| CSV not appearing      | backup.directory not set or disabled      | Re-enable backups in settings.                   |
| Timer not visible      | Status bar hidden                         | Run clockit: Toggle Status Bar.                   |


---
## Tips & Best Practices

  - Add issue keys (e.g. TP-123) to your branch names — clockit auto-detects them.
  - Keep backup enabled; it protects you from VS Code crashes.
  - If Jira search doesn’t show results, make sure your API token and domain are correct.
  - Use Notion’s “Created time” and “Last edited time” for smart dashboards.
  - Combine clockit’s CSV output with your analytics tool or scripts.

---
## 📄 License

**MIT License**  
© 2025 Overly Creative Tech
