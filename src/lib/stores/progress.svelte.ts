import type { PageMeta } from '$lib/navigation';
import { progress } from './progress.store';

export function createPageTracker(page: PageMeta) {
	// Local reactive state per page instance
	let hasInteracted = $state(false);

	function trackInteraction() {
		if (!hasInteracted) {
			hasInteracted = true;
			progress.markInteracted(page.resolvedPath);
		}
	}

	return {
		get hasInteracted() {
			return hasInteracted;
		},
		trackInteraction
	};
}
