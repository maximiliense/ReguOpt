// Source of truth for all navigation — used by Sidebar, progress tracking, and page metadata
import { resolve } from '$app/paths';
import type { RouteId } from '$app/types';

export interface PageMeta {
	path: RouteId;
	title: string;
	part: number | null; // null for home and intro
	index: number | null;
	readonly resolvedPath: string;
}

// 1. Raw static definitions
const RAW_PAGES = [
	{ path: '/', title: 'Accueil', part: null },
	{ path: '/intro', title: 'Introduction', part: null },

	// Partie I
	{ path: '/part1/lesson1', title: 'Leçon 1', part: 1 },

	// Partie II
	{ path: '/part2/lesson1', title: 'Leçon 1', part: 2 }
] as const;

// 2. Hydrate indices and inject runtime resolved path property
export const PAGES: PageMeta[] = RAW_PAGES.map((page, idx) => ({
	...page,
	index: idx,
	get resolvedPath() {
		return (resolve as (route: string, params?: unknown) => string)(page.path);
	}
}));

export const PART_NAMES: Record<number, string> = {
	1: 'Partie I',
	2: 'Partie II'
};

export function getPageByPath(path: string): PageMeta | undefined {
	return PAGES.find((p) => p.path === path);
}

export function getNextPage(currentIndex: number): PageMeta | undefined {
	return PAGES[currentIndex + 1];
}

export function getPrevPage(currentIndex: number): PageMeta | undefined {
	return PAGES[currentIndex - 1];
}
