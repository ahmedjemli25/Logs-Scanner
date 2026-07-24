# VulnTrack — Security Log Analysis & Response

A security dashboard that parses server log files (Nginx, Apache, auth.log), detects threats (SQL injection, path traversal, XSS, brute force), and lets you investigate alerts, block IPs, and track remediation actions.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL database, already provisioned)

## Prerequisites

1. **Node.js 18+** — Download from https://nodejs.org
2. **VS Code** — Download from https://code.visualstudio.com
3. **Git** — Download from https://git-scm.com

## Running the App in VS Code

### 1. Open the project

1. Unzip the downloaded file to a folder on your computer.
2. Open VS Code.
3. Go to **File > Open Folder** and select the unzipped project folder.

### 2. Install dependencies

Open the VS Code terminal (**Terminal > New Terminal**) and run:

```bash
npm install
```

### 3. Set up environment variables

The project connects to a Supabase database. The credentials are already included in the `.env` file. If you want to use your own Supabase project instead, replace the values in `.env`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the development server

In the terminal, run:

```bash
npm run dev
```

The app will open at `http://localhost:5173`. It reloads automatically when you edit files.

### 5. Build for production

To create an optimized production build:

```bash
npm run build
```

The output goes to the `dist/` folder. Preview it with:

```bash
npm run preview
```

## Troubleshooting

If you run into any problem while setting up or running this project — such as a build error, missing dependency, TypeScript issue, or runtime problem — open the relevant file in VS Code and ask VS Code Copilot to diagnose and fix it.

A simple prompt you can use:

```text
Please inspect this Vite + React + TypeScript project, find the root cause of the error, explain it clearly, and suggest the smallest safe fix. After that, verify the result by running the appropriate build or dev command.
```

## Pushing to GitHub

### 1. Create a new repository on GitHub

1. Go to https://github.com and sign in.
2. Click the **+** icon in the top-right corner and select **New repository**.
3. Name it (e.g., `vulntrack`), choose Public or Private, and click **Create repository**.
4. Copy the repository URL (looks like `https://github.com/your-username/vulntrack.git`).

### 2. Initialize Git in your project

In the VS Code terminal:

```bash
git init
git add .
git commit -m "Initial commit — VulnTrack security dashboard"
```

### 3. Push to GitHub

Replace the URL below with your repository URL:

```bash
git branch -M main
git remote add origin https://github.com/your-username/vulntrack.git
git push -u origin main
```

If you cloned the repo instead of creating a new one, skip to `git add .` above.

## Using the App

1. **Upload logs** — Click "Upload Log" to upload a `.log` or `.txt` file, or click "Load Sample" to try it with a built-in sample.
2. **View the dashboard** — See metrics, threat breakdown by type and severity, and a timeline of threat activity.
3. **Investigate alerts** — Click "Investigate" on any alert to open the investigation drawer with three tabs:
   - **Overview:** Alert details, linked raw log entry, other alerts from the same IP, investigation notes
   - **IP History:** All requests from that IP, with flagged requests highlighted
   - **Actions:** Take remediation actions (block IP, security update, fix vulnerability, false positive, monitor)
4. **Manage blocked IPs** — Go to the "Blocked IPs" tab to view and unblock IPs.
5. **View remediation history** — Go to the "Remediation" tab for a full audit trail of all actions taken.

## Using VS Code Copilot to Fix Problems

If you run into a build error, TypeScript error, runtime issue, or confusing import problem while working on this project, you can use VS Code Copilot directly in the editor to troubleshoot it.

### Example prompt

```text
Please diagnose and fix the issue in this Vite + React + TypeScript project.

Context:
- This project is a Vite SPA.
- The app should run via `npm run dev` and build via `npm run build`.
- I am working in the workspace folder for this repository.

Please:
1. Read the relevant files and identify the root cause.
2. Explain what is breaking and why.
3. Make the smallest safe fix.
4. Verify the result by running the proper build or runtime check.
5. Summarize the change and any follow-up recommendations.
```

When Copilot gives you a proposed fix, review the change carefully, then test it with the appropriate command in the terminal.

## Project Structure

```
vulntrack/
├── src/
│   ├── components/          # UI components
│   │   ├── ActionPanel.tsx          # Remediation action buttons
│   │   ├── AlertsTable.tsx          # Alerts table with filtering
│   │   ├── BlockedIpsView.tsx       # Blocked IPs management
│   │   ├── HighRiskIpsPanel.tsx     # High-risk IPs sidebar
│   │   ├── InvestigationDrawer.tsx  # Investigation drawer (3 tabs)
│   │   ├── MetricsRow.tsx           # Dashboard metric cards
│   │   ├── RemediationHistoryView.tsx
│   │   ├── ThreatBreakdownPanel.tsx
│   │   ├── TimelineChart.tsx
│   │   └── UploadModal.tsx
│   ├── lib/
│   │   ├── api.ts           # All Supabase data operations
│   │   ├── encoding.ts      # Base64 encoding for WAF bypass
│   │   ├── log-parser.ts    # Log file parser (Nginx/Apache/auth)
│   │   ├── supabase.ts      # Supabase client
│   │   └── threat-detection.ts  # Threat detection engine
│   ├── types/
│   │   ├── database.ts      # Database row types
│   │   └── dashboard.ts     # Dashboard types and constants
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles + Tailwind
├── supabase/
│   └── migrations/          # Database schema migrations
├── public/
│   └── shield.svg           # Favicon
├── .env                     # Supabase credentials
├── index.html               # HTML entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── netlify.toml             # Deployment config
```
