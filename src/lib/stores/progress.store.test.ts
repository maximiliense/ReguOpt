import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock $app/environment
vi.mock('$app/environment', () => ({ browser: false }));

describe('progress store', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('starts empty when no localStorage', async () => {
		const { progress } = await import('./progress.store.js');
		const state = get(progress);
		expect(state.visited.size).toBe(0);
		expect(state.interacted.size).toBe(0);
	});

	it('marks pages as visited', async () => {
		const { progress } = await import('./progress.store.js');
		progress.markVisited('/part1/bayes');
		const state = get(progress);
		expect(state.visited.has('/part1/bayes')).toBe(true);
	});

	it('marks pages as interacted', async () => {
		const { progress } = await import('./progress.store.js');
		progress.markInteracted('/part1/bayes');
		const state = get(progress);
		expect(state.interacted.has('/part1/bayes')).toBe(true);
	});

	it('resets to empty state', async () => {
		const { progress } = await import('./progress.store.js');
		progress.markVisited('/some-page');
		progress.reset();
		const state = get(progress);
		expect(state.visited.size).toBe(0);
	});
});
