import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface SettingsState {
  expertMode: boolean;
  animationSpeed: 0.5 | 1 | 2;
  reducedMotion: boolean;
}

const STORAGE_KEY = 'fep_settings';

function loadSettings(): SettingsState {
  const defaults: SettingsState = {
    expertMode: false,
    animationSpeed: 1,
    reducedMotion: false
  };

  if (!browser) return defaults;

  // Respect system prefers-reduced-motion
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaults, reducedMotion: systemReduced };
    const parsed = JSON.parse(stored);
    // Validate and merge — always reset reducedMotion from system preference
    return {
      expertMode: typeof parsed.expertMode === 'boolean' ? parsed.expertMode : defaults.expertMode,
      animationSpeed: [0.5, 1, 2].includes(parsed.animationSpeed)
        ? parsed.animationSpeed
        : defaults.animationSpeed,
      reducedMotion: systemReduced
    };
  } catch {
    return { ...defaults, reducedMotion: systemReduced };
  }
}

function createSettingsStore() {
  const { subscribe, update, set } = writable<SettingsState>(loadSettings());

  if (browser) {
    subscribe((state) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  return {
    subscribe,
    update,
    set,
    toggleExpertMode() {
      update((s) => ({ ...s, expertMode: !s.expertMode }));
    },
    setAnimationSpeed(speed: 0.5 | 1 | 2) {
      update((s) => ({ ...s, animationSpeed: speed }));
    }
  };
}

export const settings = createSettingsStore();
