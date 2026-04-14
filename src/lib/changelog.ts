export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

/**
 * Add new entries at the TOP of this array.
 * The first entry is treated as the "latest" release.
 * Keep it short — 3-6 bullet points per release.
 */
export const changelog: ChangelogEntry[] = [
  {
    version: "1.6.0",
    date: "2026-04-14",
    title: "Updates & Fixes",
    changes: [
      "Link Profile page version to dynamic changelog version",
      "Fix iOS PWA update freeze: sw-build timestamp, visibilitychange polling, caching fixes",
      "Food tracker improvements",
      "Barcode scanner improvements",
      "Home screen improvements",
      "App reliability & performance",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-04-12",
    title: "Food Tracker",
    changes: [
      "Full food tracker with meal logging and macro tracking",
      "TDEE calculator for personalised calorie goals",
      "Search foods via Open Food Facts database",
      "Barcode scanner for quick food lookup",
      "Manual food entry for custom items",
      "Quick-add from recently logged foods",
      "Daily water intake tracking",
    ],
  },
];

export function getLatestChangelog(): ChangelogEntry | null {
  return changelog[0] ?? null;
}

const SEEN_KEY = "ik-changelog-seen";

export function hasSeenVersion(version: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === version;
  } catch {
    return true;
  }
}

export function markVersionSeen(version: string): void {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // storage unavailable
  }
}
