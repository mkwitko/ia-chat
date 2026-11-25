import { useSyncExternalStore } from 'react';

// Light, dark or follow the device. index.html applies the stored choice before paint with the
// same key and attribute; keep both in step.

export const ThemeChoice = { system: 'system', light: 'light', dark: 'dark' } as const;
export type ThemeChoice = (typeof ThemeChoice)[keyof typeof ThemeChoice];

const STORAGE_KEY = 'ca-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const CHANGE = 'change';
const CHOICES = new Set<string>(Object.values(ThemeChoice));

const isChoice = (value: string | null): value is ThemeChoice =>
  value !== null && CHOICES.has(value);

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isChoice(stored) ? stored : ThemeChoice.system;
  } catch {
    return ThemeChoice.system;
  }
}

function storeThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === ThemeChoice.system) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private window or blocked storage: the choice lasts until the tab closes.
  }
}

function applyTheme(choice: ThemeChoice) {
  const systemDark = matchMedia(DARK_QUERY).matches;
  const dark = choice === ThemeChoice.dark || (choice === ThemeChoice.system && systemDark);
  document.documentElement.dataset.theme = dark ? ThemeChoice.dark : ThemeChoice.light;
}

let current: ThemeChoice = readThemeChoice();
const listeners = new Set<() => void>();

/** Called once from main.tsx: follows the device while the choice is "system". */
export function watchSystemTheme() {
  applyTheme(current);
  matchMedia(DARK_QUERY).addEventListener(CHANGE, () => {
    if (current === ThemeChoice.system) applyTheme(current);
  });
}

function setThemeChoice(next: ThemeChoice) {
  current = next;
  storeThemeChoice(next);
  applyTheme(next);
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The appearance choice, shared by every toggle on screen. */
export function useThemeChoice() {
  const choice = useSyncExternalStore(subscribe, () => current);
  return { choice, choose: setThemeChoice };
}
