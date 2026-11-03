"use client";

import { useId, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, themeNames } from "./theme";

const SYSTEM = "system";

const label = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

// The chosen theme lives on the root's data-theme attribute, set by the head script or by the selector.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const currentChoice = () => document.documentElement.dataset.theme ?? SYSTEM;
// The server cannot read the stored choice; the client takes over right after hydration.
const serverChoice = () => SYSTEM;

function choose(next: string) {
  try {
    if (next === SYSTEM) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable; the choice still applies to this page.
  }
  if (next === SYSTEM) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
}

// Lets the user pick System or any shared theme; the choice applies at once and survives a reload.
export function ThemeSelector() {
  const id = useId();
  const choice = useSyncExternalStore(subscribe, currentChoice, serverChoice);
  return (
    <div className="flex items-center gap-(--space-sm) text-(length:--font-size-label)">
      <label htmlFor={id} className="text-(--color-text)">
        Theme
      </label>
      <select
        id={id}
        value={choice}
        onChange={(event) => choose(event.target.value)}
        className="forest-focusable rounded-(--radius-md) border border-solid border-(--color-border) bg-(--color-background) px-(--space-sm) py-(--space-xs) text-(--color-text)"
      >
        <option value={SYSTEM}>System</option>
        {themeNames.map((name) => (
          <option key={name} value={name}>
            {label(name)}
          </option>
        ))}
      </select>
    </div>
  );
}
