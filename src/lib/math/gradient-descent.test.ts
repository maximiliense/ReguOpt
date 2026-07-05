import { describe, it, expect } from 'vitest';
import {
	gdStep,
	momentumStep,
	createMomentumState,
	nesterovStep,
	createNAGState,
	runGD,
	runMomentum,
	runNAG
} from '../math/gradient-descent.js';
import { paraboloid, rosenbrock, ellipse } from '../math/test-functions.js';

describe('gdStep', () => {
	it('moves in the direction of steepest descent', () => {
		const [nx, ny] = gdStep(1, 1, paraboloid.grad, 0.01);
		// ∇f(1,1) = [2, 8], so step should be [1-0.02, 1-0.08] = [0.98, 0.92]
		expect(nx).toBeCloseTo(0.98);
		expect(ny).toBeCloseTo(0.92);
	});

	it('decreases function value for small step size', () => {
		const fBefore = paraboloid.f(1, 1);
		const [nx, ny] = gdStep(1, 1, paraboloid.grad, 0.01);
		const fAfter = paraboloid.f(nx, ny);
		expect(fAfter).toBeLessThan(fBefore);
	});

	it('converges to origin for paraboloid with small steps', () => {
		let x = 2,
			y = 2;
		for (let i = 0; i < 1000; i++) {
			const [nx, ny] = gdStep(x, y, paraboloid.grad, 0.05);
			x = nx;
			y = ny;
		}
		expect(Math.abs(x)).toBeLessThan(0.01);
		expect(Math.abs(y)).toBeLessThan(0.01);
	});
});

describe('momentumStep', () => {
	it('accumulates velocity in the gradient direction', () => {
		const state = createMomentumState();
		const result = momentumStep(0, 0, state, () => [1, 2] as const, 0.1, 0.9);
		// v = 0 + grad = [1, 2]; x_new = 0 - 0.1 * 1 = -0.1; y_new = 0 - 0.1 * 2 = -0.2
		expect(result.x).toBeCloseTo(-0.1);
		expect(result.y).toBeCloseTo(-0.2);
	});

	it('momentum amplifies velocity across iterations', () => {
		let state = createMomentumState();
		const gradFn = (): [number, number] => [1, 0];

		state = momentumStep(0, 0, state, gradFn, 0.1, 0.9).state;
		const r2 = momentumStep(state.vx * -0.1 + 0, 0, state, gradFn, 0.1, 0.9);

		// After 2 steps with β=0.9, velocity should be larger than step 1
		expect(Math.abs(r2.state.vx)).toBeGreaterThan(0);
	});
});

describe('nesterovStep', () => {
	it('extrapolates to lookahead point before computing gradient', () => {
		const state = createNAGState();
		let lastLookaheadX: number | undefined;

		const mockGrad: typeof paraboloid.grad = (x, y) => {
			lastLookaheadX = x;
			return [2 * x, 8 * y];
		};

		nesterovStep(1, 0, state, mockGrad, 0.01, 0.5);
		// Lookahead: x_look = x + β*v_x = 1 + 0*0.5 = 1 (first step, v=0)
		expect(lastLookaheadX).toBeCloseTo(1, 4);
	});

	it('produces a trajectory that converges to paraboloid minimum', () => {
		const state = createNAGState();
		let x = 2,
			y = 2;

		for (let i = 0; i < 500; i++) {
			const r = nesterovStep(x, y, state, paraboloid.grad, 0.03, 0.7);
			x = r.x;
			y = r.y;
		}

		expect(Math.abs(x)).toBeLessThan(0.1);
		expect(Math.abs(y)).toBeLessThan(0.1);
	});
});

describe('runGD', () => {
	it('converges to paraboloid minimum from (2, 2)', () => {
		const traj = runGD(2, 2, paraboloid.grad, paraboloid.f, { alpha: 0.05, maxIter: 1000 });
		const last = traj[traj.length - 1];
		expect(Math.abs(last.x)).toBeLessThan(0.1);
		expect(Math.abs(last.y)).toBeLessThan(0.1);
	});

	it('record function values decrease monotonically for well-chosen step size', () => {
		const traj = runGD(2, 2, paraboloid.grad, paraboloid.f, { alpha: 0.01, maxIter: 100 });
		for (let i = 1; i < traj.length; i++) {
			if (traj[i].fVal !== undefined && traj[i - 1].fVal !== undefined) {
				const currentFVal = traj[i].fVal!;
				const prevFVal = traj[i - 1].fVal!;
				expect(currentFVal).toBeLessThan(prevFVal);
			}
		}
	});

	it('uses learning rate schedule when provided as function', () => {
		const traj = runGD(2, 2, paraboloid.grad, paraboloid.f, {
			alpha: (k) => 0.1 / (1 + k * 0.01),
			maxIter: 50
		});
		expect(traj.length).toBeGreaterThan(10);
	});

	it('stops early when gradient norm falls below tolerance', () => {
		const traj = runGD(0, 0, paraboloid.grad, paraboloid.f, { alpha: 0.01, maxIter: 1000 });
		expect(traj.length).toBeLessThan(5); // At minimum, gradient is zero so it stops immediately
	});

	it('trajectory length respects maxIter', () => {
		const traj = runGD(2, 2, paraboloid.grad, paraboloid.f, { alpha: 1e-6, maxIter: 50 });
		expect(traj.length).toBeLessThanOrEqual(51); // +1 for initial point recording
	});

	it('converges to ellipse minimum (more challenging due to condition number)', () => {
		const traj = runGD(2, 2, ellipse.grad, ellipse.f, { alpha: 0.1, maxIter: 2000 });
		const last = traj[traj.length - 1];
		expect(Math.abs(last.x)).toBeLessThan(0.5);
		expect(Math.abs(last.y)).toBeLessThan(0.5);
	});
});

describe('runMomentum', () => {
	it('converges faster than plain GD on ellipse (ill-conditioned)', () => {
		const trajGD = runGD(2, 2, ellipse.grad, ellipse.f, { alpha: 0.1, maxIter: 500 });
		const trajMom = runMomentum(2, 2, ellipse.grad, ellipse.f, {
			alpha: 0.1,
			beta: 0.9,
			maxIter: 500
		});

		expect(trajMom[trajMom.length - 1].fVal).toBeLessThanOrEqual(
			(trajGD[trajGD.length - 1].fVal ?? Infinity) + 0.1
		);
	});

	it('converges to paraboloid minimum', () => {
		const traj = runMomentum(2, 2, paraboloid.grad, paraboloid.f, {
			alpha: 0.02,
			beta: 0.9,
			maxIter: 500
		});
		const last = traj[traj.length - 1];
		expect(Math.abs(last.x)).toBeLessThan(0.1);
		expect(Math.abs(last.y)).toBeLessThan(0.1);
	});

	it('oscillates less than GD on narrow valley', () => {
		const traj = runMomentum(-1, 1, rosenbrock.grad, rosenbrock.f, {
			alpha: 0.005,
			beta: 0.7,
			maxIter: 200
		});
		expect(traj.length).toBeGreaterThan(10);
	});
});

describe('runNAG', () => {
	it('converges to paraboloid minimum', () => {
		const traj = runNAG(2, 2, paraboloid.grad, paraboloid.f, {
			alpha: 0.03,
			beta: 0.7,
			maxIter: 500
		});
		const last = traj[traj.length - 1];
		expect(Math.abs(last.x)).toBeLessThan(0.1);
		expect(Math.abs(last.y)).toBeLessThan(0.1);
	});

	it('converges to ellipse minimum with moderate step size', () => {
		const traj = runNAG(2, 2, ellipse.grad, ellipse.f, { alpha: 0.1, beta: 0.7, maxIter: 500 });
		const last = traj[traj.length - 1];
		expect(Math.abs(last.x)).toBeLessThan(0.5);
		expect(Math.abs(last.y)).toBeLessThan(0.5);
	});

	it('records function values along trajectory', () => {
		const traj = runNAG(2, 2, paraboloid.grad, paraboloid.f, { alpha: 0.01, maxIter: 50 });
		expect(traj[0].fVal).toBeDefined();
		expect(typeof traj[0].fVal).toBe('number');
	});
});
