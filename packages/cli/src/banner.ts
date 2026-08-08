// OpenHearth ASCII-art CLI banner (figlet "big" — spells OpenHearth correctly).

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Warm hearth gradient (ember → gold → soft violet).
const GRADIENT = [
  "\x1b[38;5;203m", // ember
  "\x1b[38;5;209m", // coral
  "\x1b[38;5;214m", // orange
  "\x1b[38;5;220m", // gold
  "\x1b[38;5;229m", // pale gold
  "\x1b[38;5;180m", // sand
  "\x1b[38;5;173m", // clay
  "\x1b[38;5;168m", // rose
];

/** Correct "OpenHearth" wordmark — figlet -f big (not the previous mangled mashup). */
export const ASCII_LOGO = [
  "  ____                   _    _                 _   _",
  " / __ \\                 | |  | |               | | | |",
  "| |  | |_ __   ___ _ __ | |__| | ___  __ _ _ __| |_| |__",
  "| |  | | '_ \\ / _ \\ '_ \\|  __  |/ _ \\/ _` | '__| __| '_ \\",
  "| |__| | |_) |  __/ | | | |  | |  __/ (_| | |  | |_| | | |",
  " \\____/| .__/ \\___|_| |_|_|  |_|\\___|\\__,_|_|   \\__|_| |_|",
  "       | |",
  "       |_|",
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
  const v = version ? version : "2.8.1";
  return `${BOLD}welcome to OpenHearth v${v}${RESET}  ·  ${WELCOME}`;
}

export function renderBanner(version?: string): string {
  const lines = ASCII_LOGO.map(colorLine);
  return ["", ...lines, "", bannerVersion(version), ""].join("\n");
}

/** Plain (ANSI-free) ASCII logo for docs / package README. */
export function plainBanner(): string {
  return ASCII_LOGO.join("\n");
}
