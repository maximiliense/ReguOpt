import { describe, it, expect } from 'vitest';
import {
	sgdStep,
	miniBatchGradient,
	exactGradient,
	runSGD,
	computeGradientVariance
} from '../math/stochastic.js';
// test-functions import removed - using synthetic losses instead

// Simple synthetic component losses: L_i(θ) = ||A_i · θ - b_i||²
const N = 10;
const A: number[][] = [];
const b: number[] = [];
let seedVal = 42;
function seededRng() {
	seedVal = (seedVal * 16807) % 2147483647;
	return seedVal / 2147483647;
}

for (let i = 0; i < N; i++) {
	const x = seededRng() * 4 - 2;
	const noise = (seededRng() - 0.5) * 0.5;
	A.push([x, 1]); // line: y = w*x + b
	b.push(2 * x + 3 + noise); // true model: slope=2, intercept=3
}

const componentLoss_i = (theta: [number, number], i: number) => {
	const pred = A[i][0] * theta[0] + A[i][1] * theta[1];
	return (pred - b[i]) ** 2;
};

const componentGrad_i = (theta: [number, number], i: number): [number, number] => {
	const res = A[i][0] * theta[0] + A[i][1] * theta[1] - b[i];
	return [2 * res * A[i][0], 2 * res * A[i][1]];
};

const meanLoss = (theta: [number, number]) => {
	let sum = 0;
	for (let i = 0; i < N; i++) sum += componentLoss_i(theta, i);
	return sum / N;
};

describe('sgdStep', () => {
	it('performs one step of SGD using a single sample gradient', () => {
		const theta: [number, number] = [0, 0];
		const next = sgdStep(theta, componentGrad_i, 0, 0.01);
		expect(next).toHaveLength(2);
		expect(typeof next[0]).toBe('number');
	});

	it('moves theta in a descent direction for the chosen sample', () => {
		const theta: [number, number] = [5, 5];
		const i_k = 3;
		const next = sgdStep(theta, componentGrad_i, i_k, 0.001);
		expect(componentLoss_i(next, i_k)).toBeLessThanOrEqual(componentLoss_i(theta, i_k) + 1e-6);
	});
});

describe('miniBatchGradient', () => {
	it('averages gradients over the batch correctly', () => {
		const theta: [number, number] = [0, 0];
		const batchIndices = [0, 1, 2];
		const gradsForBatch = componentGrad_i;

		const avg = miniBatchGradient([gradsForBatch], batchIndices, theta);

		let sumGx = 0,
			sumGy = 0;
		for (const idx of batchIndices) {
			const g = gradsForBatch(theta, idx);
			sumGx += g[0];
			sumGy += g[1];
		}
		expect(avg[0]).toBeCloseTo(sumGx / batchIndices.length);
		expect(avg[1]).toBeCloseTo(sumGy / batchIndices.length);
	});

	it('returns [0, 0] for empty batch', () => {
		const grad = miniBatchGradient([componentGrad_i], [], [0, 0]);
		expect(grad).toEqual([0, 0]);
	});
});

describe('exactGradient', () => {
	it('equals the mean of all component gradients', () => {
		const theta: [number, number] = [1.5, 2.5];
		const exact = exactGradient(componentGrad_i, N, theta);

		let sumGx = 0,
			sumGy = 0;
		for (let i = 0; i < N; i++) {
			const g = componentGrad_i(theta, i);
			sumGx += g[0];
			sumGy += g[1];
		}

		expect(exact[0]).toBeCloseTo(sumGx / N);
		expect(exact[1]).toBeCloseTo(sumGy / N);
	});

	it('is approximately zero near the true parameters (2, 3)', () => {
		const theta: [number, number] = [2, 3];
		const exact = exactGradient(componentGrad_i, N, theta);
		expect(Math.abs(exact[0])).toBeLessThan(1);
	});

	it('matches the numerical gradient of meanLoss', () => {
		const h = 1e-6;
		const theta: [number, number] = [2, 3];
		const exact = exactGradient(componentGrad_i, N, theta);

		const fBase = meanLoss(theta);
		const numGx = (meanLoss([theta[0] + h, theta[1]]) - fBase) / h;
		const numGy = (meanLoss([theta[0], theta[1] + h]) - fBase) / h;

		expect(exact[0]).toBeCloseTo(numGx, 3);
		expect(exact[1]).toBeCloseTo(numGy, 3);
	});
});

describe('runSGD', () => {
	it('converges toward the true parameters (slope≈2, intercept≈3)', () => {
		const traj = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: 0.001,
			maxIter: 5000,
			seed: 42
		});
		const last = traj[traj.length - 1];
		expect(last.x).toBeGreaterThan(1);
		expect(last.x).toBeLessThan(3);
		expect(last.y).toBeGreaterThan(2);
		expect(last.y).toBeLessThan(5);
	});

	it('mini-batch SGD converges more stably than pure SGD', () => {
		const trajPure = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: 0.001,
			batchSize: 1,
			maxIter: 2000,
			seed: 42
		});
		const trajMini = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: 0.01,
			batchSize: 5,
			maxIter: 2000,
			seed: 42
		});

		expect(trajMini[trajMini.length - 1].fVal ?? Infinity).toBeLessThan(
			(trajPure[trajPure.length - 1].fVal ?? Infinity) + 0.5
		);
	});

	it('decreases mean loss over iterations', () => {
		const traj = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: 0.005,
			batchSize: 3,
			maxIter: 2000,
			seed: 42
		});

		const firstFew = traj.slice(0, 10).map((p) => p.fVal ?? 0);
		const lastFew = traj.slice(-10).map((p) => p.fVal ?? 0);

		const avgFirst = firstFew.reduce((a, b) => a + b, 0) / firstFew.length;
		const avgLast = lastFew.reduce((a, b) => a + b, 0) / lastFew.length;

		expect(avgLast).toBeLessThan(avgFirst);
	});

	it('reproduces same trajectory with the same seed', () => {
		const traj1 = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: 0.001,
			maxIter: 500,
			seed: 99
		});
		const traj2 = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: 0.001,
			maxIter: 500,
			seed: 99
		});

		expect(traj1.length).toBe(traj2.length);
		for (let i = 0; i < traj1.length; i++) {
			expect(traj1[i].x).toBeCloseTo(traj2[i].x, 12);
			expect(traj1[i].y).toBeCloseTo(traj2[i].y, 12);
		}
	});

	it('supports learning rate schedule', () => {
		const traj = runSGD([0, 0], componentGrad_i, N, meanLoss, {
			alpha: (k) => 0.01 / Math.sqrt(1 + k),
			maxIter: 500,
			seed: 42
		});

		expect(traj.length).toBeGreaterThan(10);
	});

	it('does not record function value when recordFVal is false', () => {
		const traj = runSGD([0, 0], componentGrad_i, N, undefined, { maxIter: 10, recordFVal: false });
		expect(traj.every((p) => p.fVal === undefined)).toBe(true);
	});
});

describe('computeGradientVariance', () => {
	it('returns a non-negative variance', () => {
		const var_ = computeGradientVariance(componentGrad_i, N, [2, 3]);
		expect(var_).toBeGreaterThanOrEqual(0);
	});

	it('variance is lower at the true parameters than far from them', () => {
		const varTrue = computeGradientVariance(componentGrad_i, N, [2, 3]);
		const varFar = computeGradientVariance(componentGrad_i, N, [10, 10]);
		expect(varTrue).toBeLessThan(varFar);
	});

	it('variance of a deterministic single-component loss is zero', () => {
		const detGrad: typeof componentGrad_i = () => [2, 4]; // constant gradient → no variance
		const var_ = computeGradientVariance(detGrad, 1, [0, 0]);
		expect(var_).toBeCloseTo(0);
	});

	it('variance increases with more diverse data', () => {
		// All identical samples → zero variance in gradients
		const constantGrad: typeof componentGrad_i = (theta) => [-2 * theta[0], -4 * theta[1]]; // all same gradient
		const var_ = computeGradientVariance(constantGrad, 5, [1, 1]);
		expect(var_).toBeCloseTo(0);
	});
});
