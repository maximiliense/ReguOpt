import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface ProgressState {
	visited: Set<string>;
	interacted: Set<string>;
	unlockedAt: Record<string, number>;
}

const STORAGE_KEY = 'fep_progress';

function serializeState(state: ProgressState) {
	return JSON.stringify({
		visited: [...state.visited],
		interacted: [...state.interacted],
		unlockedAt: state.unlockedAt
	});
}

function deserializeState(json: string): ProgressState {
	try {
		const raw = JSON.parse(json);
		return {
			visited: new Set(Array.isArray(raw.visited) ? raw.visited : []),
			interacted: new Set(Array.isArray(raw.interacted) ? raw.interacted : []),
			unlockedAt: raw.unlockedAt && typeof raw.unlockedAt === 'object' ? raw.unlockedAt : {}
		};
	} catch {
		return { visited: new Set(), interacted: new Set(), unlockedAt: {} };
	}
}

function loadProgress(): ProgressState {
	if (!browser) return { visited: new Set(), interacted: new Set(), unlockedAt: {} };
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return { visited: new Set(), interacted: new Set(), unlockedAt: {} };
	return deserializeState(stored);
}

function createProgressStore() {
	const { subscribe, update, set } = writable<ProgressState>(loadProgress());

	if (browser) {
		// Persist on changes
		subscribe((state) => {
			localStorage.setItem(STORAGE_KEY, serializeState(state));
		});
	}

	return {
		subscribe,
		markVisited(path: string) {
			update((state) => {
				if (!state.visited.has(path)) {
					state.visited.add(path);
					state.unlockedAt[path] = Date.now();
					return { ...state, visited: new Set(state.visited), unlockedAt: { ...state.unlockedAt } };
				}
				return state;
			});
		},
		markInteracted(path: string) {
			update((state) => {
				if (!state.interacted.has(path)) {
					state.interacted.add(path);
					return { ...state, interacted: new Set(state.interacted) };
				}
				return state;
			});
		},
		reset() {
			const fresh: ProgressState = { visited: new Set(), interacted: new Set(), unlockedAt: {} };
			set(fresh);
		}
	};
}

export const progress = createProgressStore();
