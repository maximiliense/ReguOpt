/**
 * Prediction sets — Top-K accuracy and optimal-K search.
 */

/** Return indices of the K classes with highest probability, sorted descending by proba. */
export function topK(probas: number[], k: number): number[] {
	const n = probas.length;
	// Build [index] array, sort by probability descending (tie-break: lower index first)
	const indices: number[] = Array.from({ length: n }, (_, i) => i);
	indices.sort((a, b) => probas[b] - probas[a] || a - b);
	return indices.slice(0, Math.min(k, n));
}

/**
 * Accuracy@K for classification.
 * For each sample checks whether the true label appears in the top-K predicted classes.
 */
export function accuracyAtK(y_true: number[], y_proba: number[][], k: number): number {
	const m = y_true.length;
	if (m === 0) return 0;

	let correct = 0;
	for (let s = 0; s < m; s++) {
		const topk = topK(y_proba[s], k);
		if (topk.includes(y_true[s])) correct++;
	}
	return correct / m;
}

/**
 * Find the smallest K that achieves at least `targetAccuracy`.
 * Returns the chosen K and an array of accuracies for K = 1 .. num_classes.
 */
export function findOptimalK(
	y_true: number[],
	y_proba: number[][],
	targetAccuracy: number
): { k: number; accuracies: number[] } {
	const numClasses = y_proba[0]?.length ?? 0;

	const accuracies: number[] = [];
	for (let k = 1; k <= numClasses; k++) {
		accuracies.push(accuracyAtK(y_true, y_proba, k));
	}

	let bestK = 1;
	for (let k = 1; k <= numClasses; k++) {
		if (accuracies[k - 1] >= targetAccuracy) {
			bestK = k;
			break;
		}
	}

	return { k: bestK, accuracies };
}
