// OpenHearth ASCII-art CLI banner.

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Rainbow gradient palette, warm "hearth" tones toward the tail.
const GRADIENT = [
  "\x1b[38;5;205m", // pink
  "\x1b[38;5;209m", // coral
  "\x1b[38;5;214m", // orange
  "\x1b[38;5;220m", // gold
  "\x1b[38;5;227m", // yellow
  "\x1b[38;5;114m", // green
  "\x1b[38;5;45m",  // cyan
  "\x1b[38;5;39m",  // blue
  "\x1b[38;5;99m",  // violet
];

export const ASCII_LOGO = [
  "   ____                    _____                _   _",
  "  / __ \\                  |  __ \\              | | | |",
  " | |  | |_ __   ___ _ __  | |__) |___ _ __ ___ | |_| |",
  " | |  | | '_ \\ / _ \\ '_ \\ |  ___/ _ \\ '__/ _ \\| __| |",
  " | |__| | |_) |  __/ | | || |  |  __/ | | (_) | |_| |",
  "  \\____/| .__/ \\___|_| |_||_|   \\___|_|  \\___/ \\__|_|",
  "        | |",
  "        |_|",
];

const WELCOME =
  "🔥 Audit the contributions GitHub hides — PRs, issues & reviews beyond the feed.";

function colorLine(line: string): string {
  let out = "";
  let colorIndex = 0;
  for (const ch of line) {
    if (ch === " ") {
      out += " ";
      continue;
    }
    out += GRADIENT[colorIndex % GRADIENT.length] + ch + RESET;
    colorIndex++;
  }
  return out;
}

export function bannerVersion(version?: string): string {
  const v = version ? version : "2.8.x";
  return `${BOLD}welcome to OpenHearth v${v}${RESET}  ·  ${WELCOME}`;
}

export function renderBanner(version?: string): string {
  const lines = ASCII_LOGO.map(colorLine);
  return ["", ...lines, "", bannerVersion(version), ""].join("\n");
}

/** Plain (ANSI-free) ASCII logo for docs / README. */
export function plainBanner(): string {
  return ASCII_LOGO.join("\n");
}
