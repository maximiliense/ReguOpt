import { describe, it, expect } from 'vitest';
import { newtonStep, taylorApproximation2, dampedNewtonStep, runNewton } from '../math/newton.js';
import { paraboloid, rosenbrock, ellipse } from '../math/test-functions.js';

const hessToFlat = (m: [[number, number], [number, number]]): [number, number, number, number] => [
	m[0][0],
	m[0][1],
	m[1][0],
	m[1][1]
];

describe('newtonStep', () => {
	it('converges to paraboloid minimum in one step from any point', () => {
		const hess = hessToFlat(paraboloid.hess(5, -3)); // [[2,0],[0,8]] — constant for paraboloid
		const result = newtonStep(5, -3, paraboloid.grad, hess);

		expect(Math.abs(result.x)).toBeLessThan(1e-10);
		expect(Math.abs(result.y)).toBeLessThan(1e-10);
	});

	it('converges to ellipse minimum in one step', () => {
		const hess = hessToFlat(ellipse.hess(-4, 3)); // [[0.5,0],[0,2]] — constant for ellipse
		const result = newtonStep(-4, 3, ellipse.grad, hess);

		expect(Math.abs(result.x)).toBeLessThan(1e-10);
		expect(Math.abs(result.y)).toBeLessThan(1e-10);
	});

	it('falls back to damped gradient step when Hessian is singular', () => {
		const hess: [number, number, number, number] = [1e-20, 0, 0, 1e-20];
		const result = newtonStep(1, 1, paraboloid.grad, hess);

		expect(result.x).toBeCloseTo(1 - 0.1 * 2); // fallback: x -= 0.1 * gx
		expect(result.y).toBeCloseTo(1 - 0.1 * 8);
	});

	it('Newton step direction is a descent direction for positive definite Hessian', () => {
		const hess = hessToFlat(paraboloid.hess(2, 3));
		const result = newtonStep(2, 3, paraboloid.grad, hess);

		expect(paraboloid.f(result.x, result.y)).toBeLessThan(paraboloid.f(2, 3));
	});
});

describe('taylorApproximation2', () => {
	it('is exact for quadratic functions (paraboloid)', () => {
		const f0 = paraboloid.f(1, 2);
		const gradF0 = paraboloid.grad(1, 2);
		const hess0 = hessToFlat(paraboloid.hess(1, 2));

		const approx = taylorApproximation2(f0, gradF0, hess0, 0.3, -0.5);
		const exact = paraboloid.f(1 + 0.3, 2 - 0.5);

		expect(approx).toBeCloseTo(exact, 12); // Taylor is exact for quadratics
	});

	it('is also exact for the ellipse (quadratic)', () => {
		const f0 = ellipse.f(1, 1);
		const gradF0 = ellipse.grad(1, 1);
		const hess0 = hessToFlat(ellipse.hess(1, 1));

		const approx = taylorApproximation2(f0, gradF0, hess0, -0.5, 0.7);
		const exact = ellipse.f(1 - 0.5, 1 + 0.7);

		expect(approx).toBeCloseTo(exact, 12);
	});

	it('returns f(x0) when displacement is zero', () => {
		const f0 = paraboloid.f(3, 4);
		const gradF0 = paraboloid.grad(3, 4);
		const hess0 = hessToFlat(paraboloid.hess(3, 4));

		expect(taylorApproximation2(f0, gradF0, hess0, 0, 0)).toBeCloseTo(f0, 15);
	});

	it('second-order Taylor is more accurate than first-order near x0', () => {
		const f0 = ellipse.f(1, 1);
		const gradF0 = ellipse.grad(1, 1);
		const hess0 = hessToFlat(ellipse.hess(1, 1));

		const approx2 = taylorApproximation2(f0, gradF0, hess0, 0.05, -0.03);
		const approx1 = f0 + gradF0[0] * 0.05 + gradF0[1] * -0.03;
		const exact = ellipse.f(1 + 0.05, 1 - 0.03);

		expect(Math.abs(approx2 - exact)).toBeLessThan(Math.abs(approx1 - exact));
	});

	it('Taylor approximates Rosenbrock well for small displacement', () => {
		const x0 = 0.5,
			y0 = 0.4;
		const f0 = rosenbrock.f(x0, y0);
		const gradF0 = rosenbrock.grad(x0, y0);
		const hess0 = hessToFlat(rosenbrock.hess(x0, y0));

		const approx = taylorApproximation2(f0, gradF0, hess0, 0.01, -0.01);
		const exact = rosenbrock.f(x0 + 0.01, y0 - 0.01);

		expect(Math.abs(approx - exact)).toBeLessThan(0.001); // Good approximation for small step
	});
});

describe('dampedNewtonStep', () => {
	it('decreases function value on the paraboloid', () => {
		const hess = hessToFlat(paraboloid.hess(5, -3));
		const result = dampedNewtonStep(5, -3, paraboloid.f, paraboloid.grad, hess);

		expect(paraboloid.f(result.x, result.y)).toBeLessThan(paraboloid.f(5, -3));
	});

	it('converges to minimum in one step for quadratic with no damping needed', () => {
		const hess = hessToFlat(paraboloid.hess(2, 1));
		const result = dampedNewtonStep(2, 1, paraboloid.f, paraboloid.grad, hess);

		expect(Math.abs(result.x)).toBeLessThan(1e-6);
		expect(Math.abs(result.y)).toBeLessThan(1e-6);
	});

	it('returns alpha = 1 when no backtracking is needed for a quadratic', () => {
		const hess = hessToFlat(paraboloid.hess(2, 3));
		const result = dampedNewtonStep(2, 3, paraboloid.f, paraboloid.grad, hess);

		expect(result.alpha).toBeCloseTo(1.0); // Newton step satisfies Armijo for quadratics with exact Hessian
	});

	it('converges to ellipse minimum with damping', () => {
		const hess = hessToFlat(ellipse.hess(-3, 5));
		const result = dampedNewtonStep(-3, 5, ellipse.f, ellipse.grad, hess);

		expect(Math.abs(result.x)).toBeLessThan(1e-6);
		expect(Math.abs(result.y)).toBeLessThan(1e-6);
	});

	it('Armijo condition is satisfied after backtracking', () => {
		const c1 = 1e-4;
		const hess = hessToFlat(paraboloid.hess(5, -3));
		const fVal = paraboloid.f(5, -3);
		const [gx, gy] = paraboloid.grad(5, -3);

		const result = dampedNewtonStep(5, -3, paraboloid.f, paraboloid.grad, hess);
		const dx = result.x - 5;
		const dy = result.y - -3;
		const newF = paraboloid.f(result.x, result.y);

		expect(newF).toBeLessThanOrEqual(fVal + c1 * result.alpha * (gx * dx + gy * dy) + 1e-10);
	});
});

describe('runNewton', () => {
	it('converges to paraboloid minimum in one iteration', () => {
		const getHess = (x: number, y: number) => hessToFlat(paraboloid.hess(x, y));
		const traj = runNewton(5, -3, paraboloid.f, paraboloid.grad, getHess);

		expect(traj.length).toBeLessThanOrEqual(2); // One step to minimum + early termination check at new point
		const last = traj[traj.length - 1];
		expect(Math.abs(last.x)).toBeLessThan(1e-6);
		expect(Math.abs(last.y)).toBeLessThan(1e-6);
	});

	it('converges to Rosenbrock minimum from a far start', () => {
		const getHess = (x: number, y: number) => hessToFlat(rosenbrock.hess(x, y));
		const traj = runNewton(-1.5, 2, rosenbrock.f, rosenbrock.grad, getHess, 50);

		const last = traj[traj.length - 1];
		expect(Math.abs(last.x - 1)).toBeLessThan(0.01);
		expect(Math.abs(last.y - 1)).toBeLessThan(0.01);
	});

	it('converges to ellipse minimum quickly', () => {
		const getHess = (x: number, y: number) => hessToFlat(ellipse.hess(x, y));
		const traj = runNewton(-4, 3, ellipse.f, ellipse.grad, getHess);

		expect(traj.length).toBeLessThanOrEqual(2); // One step for a quadratic
	});

	it('records gradient norm that decreases along trajectory', () => {
		const getHess = (x: number, y: number) => hessToFlat(paraboloid.hess(x, y));
		const traj = runNewton(5, 3, paraboloid.f, paraboloid.grad, getHess);

		if (traj.length > 1) {
			expect(traj[0].gradNorm).toBeGreaterThan(traj[traj.length - 1].gradNorm ?? 0);
		}
	});

	it('stops early when gradient norm is below tolerance', () => {
		const getHess = (x: number, y: number) => hessToFlat(paraboloid.hess(x, y));
		const traj = runNewton(0, 0, paraboloid.f, paraboloid.grad, getHess);

		expect(traj.length).toBeLessThanOrEqual(1); // Already at minimum — stops immediately
	});

	it('records step size when damped mode is enabled', () => {
		const getHess = (x: number, y: number) => hessToFlat(paraboloid.hess(x, y));
		const traj = runNewton(2, 3, paraboloid.f, paraboloid.grad, getHess, 10, 1e-10, true);

		for (const pt of traj) {
			expect(typeof pt.stepSize).toBe('number');
		}
	});

	it('damped Newton converges to Rosenbrock minimum', () => {
		const getHess = (x: number, y: number) => hessToFlat(rosenbrock.hess(x, y));
		const traj = runNewton(-2, 0, rosenbrock.f, rosenbrock.grad, getHess, 50, 1e-8, true);

		const last = traj[traj.length - 1];
		expect(Math.abs(last.x - 1)).toBeLessThan(0.01);
		expect(Math.abs(last.y - 1)).toBeLessThan(0.01);
	});

	it('non-damped Newton converges for the paraboloid', () => {
		const getHess = (x: number, y: number) => hessToFlat(paraboloid.hess(x, y));
		const traj = runNewton(3, -2, paraboloid.f, paraboloid.grad, getHess, 10, 1e-10, false);

		expect(traj.length).toBeLessThanOrEqual(2); // Quadratic converges in one step without damping
	});

	it('trajectory function values decrease for damped Newton', () => {
		const getHess = (x: number, y: number) => hessToFlat(paraboloid.hess(x, y));
		const traj = runNewton(2, 3, paraboloid.f, paraboloid.grad, getHess);

		if (traj.length > 1 && traj[0].fVal !== undefined && traj[1].fVal !== undefined) {
			expect(traj[1].fVal).toBeLessThan(traj[0].fVal);
		}
	});
});
