// OpenHearth ASCII-art CLI banner — ALL CAPS wordmark, red terminal palette.

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Red-only gradient (OpenClaude is orange; OpenHearth is red).
const GRADIENT = [
  "\x1b[38;5;196m", // bright red
  "\x1b[38;5;160m", // strong red
  "\x1b[38;5;124m", // deep red
  "\x1b[38;5;197m", // rose red
  "\x1b[38;5;203m", // light crimson
  "\x1b[38;5;167m", // soft red
  "\x1b[38;5;88m",  // dark red
  "\x1b[38;5;9m",   // classic ANSI red
];

/** ALL-CAPS "OPENHEARTH" wordmark — figlet -f big. */
export const ASCII_LOGO = [
  "  ____  _____  ______ _   _ _    _ ______          _____ _______ _    _",
  " / __ \\|  __ \\|  ____| \\ | | |  | |  ____|   /\\   |  __ \\__   __| |  | |",
  "| |  | | |__) | |__  |  \\| | |__| | |__     /  \\  | |__) | | |  | |__| |",
  "| |  | |  ___/|  __| | . ` |  __  |  __|   / /\\ \\ |  _  /  | |  |  __  |",
  "| |__| | |    | |____| |\\  | |  | | |____ / ____ \\| | \\ \\  | |  | |  | |",
  " \\____/|_|    |______|_| \\_|_|  |_|______/_/    \\_\\_|  \\_\\ |_|  |_|  |_|",
];

const WELCOME =
  "🔥 AUDIT THE CONTRIBUTIONS GITHUB HIDES — PRS, ISSUES & REVIEWS BEYOND THE FEED.";

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
  const v = version ? version : "2.8.2";
  return `${BOLD}WELCOME TO OPENHEARTH V${v.toUpperCase()}${RESET}  ·  ${WELCOME}`;
}

export function renderBanner(version?: string): string {
  const lines = ASCII_LOGO.map(colorLine);
  return ["", ...lines, "", bannerVersion(version), ""].join("\n");
}

/** Plain (ANSI-free) ASCII logo for docs / package README. */
export function plainBanner(): string {
  return ASCII_LOGO.join("\n");
}
