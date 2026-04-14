/**
 * generate-changelog.mjs
 *
 * Runs as a GitHub Action on every push to main.
 * Reads recent git commits, filters noise, and upserts a daily changelog
 * entry into src/lib/changelog.ts.
 *
 * Behaviour:
 *   • If there is already an entry for TODAY → replace it with a fresh one
 *     that includes ALL commits since the previous day's entry.
 *   • If there is no entry for today → create a new one and bump the version.
 *   • Generic / noisy commits are filtered out automatically.
 *   • Falls back to file-change descriptions when commits are too vague.
 */

import { execSync }                          from "child_process";
import { readFileSync, writeFileSync }        from "fs";
import { dirname, join }                     from "path";
import { fileURLToPath }                     from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG = join(__dirname, "../src/lib/changelog.ts");
const today     = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

// ── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd) {
  try { return execSync(cmd, { encoding: "utf8" }).trim(); }
  catch { return ""; }
}

/** Bump minor version: "1.6.0" → "1.7.0" */
function bumpMinor(version) {
  const parts = version.split(".").map(Number);
  parts[1] += 1;
  parts[2]  = 0;
  return parts.join(".");
}

/** Bump patch version: "1.6.0" → "1.6.1" */
function bumpPatch(version) {
  const parts = version.split(".").map(Number);
  parts[2] += 1;
  return parts.join(".");
}

// Commit messages we always ignore (technical / meta / too vague)
const NOISE_RE = /^(work in progress|wip|changes?$|misc|temp|auto-update changelog|bumped? version|applied |switch(ed)? to|hard.?code|reverted?|updated?\s*$|added?\s*$|fix\s*$|test\s*$|restored?|fix pwa|pwa |service worker|sw |auto-update|skip waiting|controllerchange|networkfirst|cache|hash poll|ik-up|fix stale|deadlock|dual.?strat|registration|deployed?|rollback)/i;

// Also drop messages that are clearly infrastructure / dev-only
const INFRA_RE = /\b(sw\.js|vite\.config|github action|workbox|service.?worker|localstorage|flag|cache-buster|supabase|schema|migration|typescript|tsx|eslint|linting|npm|bun\.lock|package\.json)\b/i;

// Map of changed-file patterns → human-readable descriptions
const FILE_MAP = [
  [/FoodTracker|food\//i,          "Food tracker improvements"],
  [/BarcodeScanner/i,              "Barcode scanner improvements"],
  [/NutritionSettings|TDEE/i,      "Nutrition settings updates"],
  [/WaterIntake/i,                 "Water tracking improvements"],
  [/WorkoutSession/i,              "Workout session improvements"],
  [/workout-data/i,                "Workout library updates"],
  [/ExerciseLibrary/i,             "Exercise library updates"],
  [/History/i,                     "Workout history improvements"],
  [/Progress/i,                    "Progress tracking improvements"],
  [/Profile/i,                     "Profile page updates"],
  [/Onboarding/i,                  "Onboarding flow improvements"],
  [/BodyMeasurements/i,            "Body measurements updates"],
  [/RecoveryTips|DailyStretch/i,   "Recovery & stretching updates"],
  [/StatsBar|WeekStrip/i,          "Home screen improvements"],
  [/CoachDashboard/i,              "Coach dashboard updates"],
  [/sw\.js|main\.tsx|vite\.config/,"App reliability & performance"],
  [/training-splits/i,             "Training programme updates"],
  [/user-preferences/i,            "User preferences improvements"],
];

// ── Read changelog ─────────────────────────────────────────────────────────────

let content = readFileSync(CHANGELOG, "utf8");

// Extract the latest version in the file
const latestVersionMatch = content.match(/version:\s*"(\d+\.\d+\.\d+)"/);
const latestVersion = latestVersionMatch ? latestVersionMatch[1] : "1.6.0";

// ── Figure out the "since" commit ─────────────────────────────────────────────
// Find the last commit that touched changelog.ts but was NOT our bot.
// That gives us the baseline — we include everything committed after it.

const changelogHistory = run(
  `git log --oneline --follow -- src/lib/changelog.ts`
).split("\n").filter(Boolean);

let sinceHash = "";
for (const line of changelogHistory) {
  const [hash, ...msgParts] = line.split(" ");
  const msg = msgParts.join(" ");
  if (!msg.startsWith("Auto-update changelog")) {
    // The NEXT entry in the log would be what came before this commit
    const idx = changelogHistory.indexOf(line);
    sinceHash = hash; // start from right after this commit
    break;
  }
}

// ── Collect commits ────────────────────────────────────────────────────────────

const gitLogCmd = sinceHash
  ? `git log --oneline --no-merges ${sinceHash}..HEAD`
  : `git log --oneline --no-merges -30`;

const rawCommits = run(gitLogCmd)
  .split("\n")
  .filter(Boolean)
  .map(line => line.replace(/^[a-f0-9]+ /, "").trim());

// Filter: keep meaningful messages, discard noise
const meaningful = rawCommits
  .filter(msg => !NOISE_RE.test(msg))
  .filter(msg => !INFRA_RE.test(msg))
  .filter(msg => msg.length >= 15 && msg.length <= 90) // not too short or too long
  // Capitalise first letter
  .map(msg => msg.charAt(0).toUpperCase() + msg.slice(1))
  // Deduplicate (case-insensitive)
  .filter((msg, i, arr) => arr.findIndex(m => m.toLowerCase() === msg.toLowerCase()) === i);

// ── File-based fallback descriptions ──────────────────────────────────────────

const changedFiles = sinceHash
  ? run(`git diff --name-only ${sinceHash} HEAD`).split("\n")
  : [];

const fileDescriptions = [];
for (const [pattern, description] of FILE_MAP) {
  if (changedFiles.some(f => pattern.test(f)) && !fileDescriptions.includes(description)) {
    fileDescriptions.push(description);
  }
}

// Combine: meaningful commits first, then file-based (only if not already covered)
const changes = [...meaningful];
for (const desc of fileDescriptions) {
  if (changes.length >= 8) break;
  // Only add if nothing similar already exists
  const covered = changes.some(c => c.toLowerCase().includes(desc.split(" ")[0].toLowerCase()));
  if (!covered) changes.push(desc);
}

if (changes.length === 0) {
  console.log("No meaningful changes found — skipping changelog update.");
  process.exit(0);
}

const bulletList = changes.slice(0, 8)
  .map(c => `      "${c.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
  .join(",\n");

// ── Determine version for the new entry ───────────────────────────────────────

const todayInFile = content.includes(`date: "${today}"`);
let newVersion;

if (todayInFile) {
  // Replacing today's entry — keep the same version
  newVersion = latestVersion;
} else {
  // New day → bump patch (or minor for significant releases)
  newVersion = bumpPatch(latestVersion);
}

// ── Build the new changelog entry ─────────────────────────────────────────────

// Entry body without leading indent — used in the REPLACE path
// because content.slice(0, start) already ends with the 2-space indent
const entryBody = `{
    version: "${newVersion}",
    date: "${today}",
    title: "Updates & Fixes",
    changes: [
${bulletList},
    ],
  },`;

// Entry with leading indent — used in the INSERT path (after "[\n")
const entryWithIndent = `  ${entryBody}`;

// ── Write back to changelog.ts ─────────────────────────────────────────────────

if (todayInFile) {
  // Replace the existing today block. Find the object that contains today's date.
  // We locate it by finding `date: "YYYY-MM-DD"` and then expanding outward
  // to capture the full `{ ... },` object.
  const dateStr = `date: "${today}"`;
  const dateIdx = content.indexOf(dateStr);
  if (dateIdx === -1) {
    console.log("Could not locate today's entry — skipping.");
    process.exit(0);
  }

  // Walk backward to find the opening `{`
  let start = dateIdx;
  while (start > 0 && content[start] !== "{") start--;

  // Walk forward from `{` to find the matching `}`
  let depth = 0;
  let end = start;
  while (end < content.length) {
    if (content[end] === "{") depth++;
    if (content[end] === "}") { depth--; if (depth === 0) { end++; break; } }
    end++;
  }
  // Consume optional trailing comma
  if (content[end] === ",") end++;

  content = content.slice(0, start) + entryBody + content.slice(end);
  console.log(`♻️  Replaced today's (${today}) changelog entry — v${newVersion}, ${changes.length} changes`);
} else {
  // Insert after the opening `[` of the changelog array
  content = content.replace(
    /export const changelog: ChangelogEntry\[\]\s*=\s*\[/,
    `export const changelog: ChangelogEntry[] = [\n${entryWithIndent}`
  );
  console.log(`✅ Added new changelog entry — v${newVersion}, ${changes.length} changes`);
}

writeFileSync(CHANGELOG, content, "utf8");
