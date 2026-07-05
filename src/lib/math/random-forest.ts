/**
 * Random Forest utilities: stumps, impurity measures, feature importance.
 */

// ─── Decision Stump Builder ────────────────────────────────

export interface DecisionStump {
	featureIdx: number;
	threshold: number;
	leftValue: number; // prediction when x[feature] <= threshold
	rightValue: number; // prediction when x[feature] > threshold
}

export function buildDecisionStump(
	X: number[][],
	y: number[],
	featureSubset?: number[],
	isClassification = false
): DecisionStump {
	const n = X.length,
		d = X[0].length;
	const features = featureSubset ?? Array.from({ length: d }, (_, i) => i);

	let bestCost = Infinity;
	let bestStump: DecisionStump | null = null;

	for (const f of features) {
		// Collect unique sorted values for candidate thresholds
		const vals = new Set<number>();
		for (let i = 0; i < n; i++) vals.add(X[i][f]);
		const sorted = [...vals].sort((a, b) => a - b);

		// Try midpoints between consecutive unique values as thresholds
		for (let t = 0; t < sorted.length - 1; t++) {
			const threshold = (sorted[t] + sorted[t + 1]) / 2;

			let leftSum = 0,
				leftCount = 0,
				rightSum = 0,
				rightCount = 0;

			for (let i = 0; i < n; i++) {
				if (X[i][f] <= threshold) {
					leftSum += y[i];
					leftCount++;
				} else {
					rightSum += y[i];
					rightCount++;
				}
			}

			const leftValue = leftCount > 0 ? leftSum / leftCount : 0;
			const rightValue = rightCount > 0 ? rightSum / rightCount : 0;

			// Compute cost (MSE for regression, Gini for classification)
			let cost = 0;
			if (isClassification) {
				cost =
					giniImpurity(y.slice(0).filter((_, i) => X[i][f] <= threshold)) * leftCount +
					giniImpurity(y.slice(0).filter((_, i) => X[i][f] > threshold)) * rightCount;
			} else {
				for (let i = 0; i < n; i++) {
					const pred = X[i][f] <= threshold ? leftValue : rightValue;
					cost += (y[i] - pred) ** 2;
				}
			}

			if (cost < bestCost) {
				bestCost = cost;
				bestStump = { featureIdx: f, threshold, leftValue, rightValue };
			}
		}
	}

	return (
		bestStump ?? {
			featureIdx: 0,
			threshold: 0,
			leftValue: y.reduce((a, b) => a + b, 0) / n,
			rightValue: y.reduce((a, b) => a + b, 0) / n
		}
	);
}

// ─── Impurity Measures ────────────────────────────────

/** Gini impurity for binary classification labels (0 or 1) */
export function giniImpurity(labels: number[]): number {
	if (labels.length === 0) return 0;
	const p = labels.reduce((s, l) => s + l, 0) / labels.length; // proportion of class 1
	return 2 * p * (1 - p);
}

/** Information gain from splitting */
export function informationGain(
	parentLabels: number[],
	leftLabels: number[],
	rightLabels: number[]
): number {
	const n = parentLabels.length;
	if (n === 0) return 0;

	const parentEntropy = entropy(parentLabels);
	const leftWeight = leftLabels.length / n;
	const rightWeight = rightLabels.length / n;
	const childEntropy = leftWeight * entropy(leftLabels) + rightWeight * entropy(rightLabels);

	return Math.max(0, parentEntropy - childEntropy);
}

// ─── Feature Importance ────────────────────────────────

/** Permutation importance: decrease in model performance when feature is permuted */
export function permutationImportance(
	predictModel: (X: number[][]) => number[],
	X: number[][],
	y: number[],
	numPermutations = 10,
	seed = 42
): number[] {
	const d = X[0].length;

	const basePredictions = predictModel(X);
	let baseScore = 0; // R²-like score (1 - MSE/VAR)
	for (let i = 0; i < y.length; i++) baseScore += (y[i] - basePredictions[i]) ** 2;
	baseScore = -baseScore; // negative MSE

	const rng = makeRng(seed);

	return Array.from({ length: d }, (_, j) => {
		let totalDegradation = 0;

		for (let p = 0; p < numPermutations; p++) {
			// Permute column j
			const XPermuted = X.map((row) => [...row]);
			const indices = Array.from({ length: X.length }, (_, k) => k);
			shuffle(indices, rng);
			for (let i = 0; i < X.length; i++) {
				XPermuted[i][j] = X[indices[i]][j];
			}

			const permPredictions = predictModel(XPermuted);
			let permScore = 0;
			for (let i = 0; i < y.length; i++) permScore += (y[i] - permPredictions[i]) ** 2;
			permScore = -permScore;

			totalDegradation += baseScore - permScore; // positive if performance degraded
		}

		return totalDegradation / numPermutations;
	});
}

// ─── Helpers ────────────────────────────────────────

function entropy(labels: number[]): number {
	if (labels.length === 0) return 0;
	const counts = new Map<number, number>();
	for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);

	let ent = 0;
	for (const [, c] of counts) {
		const p = c / labels.length;
		if (p > 0 && p < 1) ent -= p * Math.log2(p);
	}
	return ent;
}

function makeRng(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return s / 2147483647;
	};
}

function shuffle(arr: number[], rng: () => number): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}
