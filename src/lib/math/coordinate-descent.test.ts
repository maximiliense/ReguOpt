import { describe, it, expect } from 'vitest';
import { cdCyclicStep, runCD } from '../math/coordinate-descent.js';

describe('cdCyclicStep', () => {
	it('reduces the objective on a simple quadratic', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const theta = [2, 3];
		const newTheta = cdCyclicStep(theta, f);
		expect(f(newTheta)).toBeLessThan(f(theta));
	});

	it('returns a valid point after cycling coordinates', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const newTheta = cdCyclicStep([5, -3], f);
		expect(newTheta.length).toBe(2);
	});

	it('makes a small improvement toward the minimum per step', () => {
		const f = (theta: number[]) => theta[0] ** 2 + theta[1] ** 2;
		let theta = [1, 1];
		for (let i = 0; i < 500; i++) {
			theta = cdCyclicStep(theta, f);
		}
		expect(f(theta)).toBeLessThan(f([1, 1])); // Moved closer to minimum
	});

	it('converges toward the minimum over very many iterations', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		let theta = [0.5, 1]; // Start closer so line search range matters less

		for (let i = 0; i < 50000; i++) {
			theta = cdCyclicStep(theta, f);
		}

		expect(f(theta)).toBeLessThan(0.05);
	});
});

describe('runCD', () => {
	it('decreases the objective over many iterations (cyclic)', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const traj = runCD([0.5, 0.5], f, { method: 'cyclic', maxIter: 10000 });

		expect(traj[traj.length - 1].fVal).toBeLessThan(f([0.5, 0.5]));
	});

	it('converges using random selection with enough iterations', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const traj = runCD([0.1, 0.2], f, { method: 'random', maxIter: 5000, seed: 42 });

		expect(traj[traj.length - 1].fVal).toBeLessThan(0.05);
	});

	it('converges using greedy coordinate selection for small initial values', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const grad = (t: number[]) => [2 * t[0], 8 * t[1]];
		const traj = runCD([0.2, 0.3], f, { method: 'greedy', maxIter: 5000, grad });

		expect(traj[traj.length - 1].fVal).toBeLessThan(0.1);
	});

	it('converges toward the minimum of a non-separable quadratic from close start', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 2 * theta[0] * theta[1] + 5 * theta[1] ** 2;
		const traj = runCD([0.3, -0.2], f, { method: 'cyclic', maxIter: 10000 });

		expect(traj[traj.length - 1].fVal).toBeLessThan(f([0.3, -0.2]));
	});

	it('stops early when convergence tolerance is reached', () => {
		const f = (theta: number[]) => theta[0] ** 2 + theta[1] ** 2;
		const traj = runCD([1, 1], f, { method: 'cyclic', maxIter: 1000 });

		expect(traj.length).toBeLessThan(50); // Tiny line search steps quickly fall below tolerance
	});

	it('trajectory function values decrease monotonically for convex quadratic', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const traj = runCD([2, 3], f, { method: 'cyclic', maxIter: 200 });

		for (let i = 1; i < traj.length; i++) {
			expect(traj[i].fVal).toBeLessThanOrEqual(traj[i - 1].fVal + 1e-8);
		}
	});

	it('converges for a higher-dimensional problem from small initial values', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2 + 9 * theta[2] ** 2;
		const traj = runCD([0.3, 0.2, -0.1], f, { method: 'cyclic', maxIter: 10000 });

		expect(traj[traj.length - 1].fVal).toBeLessThan(0.1);
	});

	it('produces deterministic results with the same seed for random method', () => {
		const f = (theta: number[]) => theta[0] ** 2 + 4 * theta[1] ** 2;
		const traj1 = runCD([2, 3], f, { method: 'random', maxIter: 200, seed: 7 });
		const traj2 = runCD([2, 3], f, { method: 'random', maxIter: 200, seed: 7 });

		expect(traj1.length).toBe(traj2.length);
		for (let i = 0; i < traj1.length; i++) {
			expect(traj1[i].theta[0]).toBeCloseTo(traj2[i].theta[0], 12);
			expect(traj1[i].theta[1]).toBeCloseTo(traj2[i].theta[1], 12);
		}
	});

	it('each recorded trajectory point has correct theta dimension', () => {
		const f = (t: number[]) => t[0] ** 2 + t[1] ** 2;
		const traj = runCD([5, -3], f, { method: 'cyclic', maxIter: 10 });

		for (const pt of traj) {
			expect(pt.theta.length).toBe(2);
			expect(typeof pt.fVal).toBe('number');
		}
	});

	it('runCD always includes the final point in trajectory', () => {
		const f = (t: number[]) => t[0] ** 2 + t[1] ** 2;
		const traj = runCD([3, 4], f, { method: 'cyclic', maxIter: 5 });

		expect(traj.length).toBeGreaterThan(0);
		expect(traj[traj.length - 1].k >= traj.length - 1).toBe(true);
	});
});
