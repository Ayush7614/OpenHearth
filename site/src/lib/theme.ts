export type Theme = "dark" | "light";

const STORAGE_KEY = "openhearth_theme";

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

export function toggleTheme(): Theme {
  const next: Theme = getStoredTheme() === "dark" ? "light" : "dark";
  setStoredTheme(next);
  applyTheme(next);
  return next;
}

export function themeLabel(theme: Theme): string {
  return theme === "dark" ? "Dark" : "Light";
}

export function themeToggleHint(theme: Theme): string {
  return theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
}
