import { describe, it, expect } from 'vitest';
import { klGaussian, klDiscrete, klSymmetric, jensenShannon } from '../math/kl.js';

describe('klGaussian', () => {
	it('KL(p, p) = 0 for any Gaussian', () => {
		const p = { mu: 2, sigma2: 3 };
		expect(klGaussian(p, p)).toBeCloseTo(0, 12);
	});

	it('is always non-negative', () => {
		const cases = [
			[{ mu: 0, sigma2: 1 }, { mu: 1, sigma2: 2 }],
			[{ mu: -1, sigma2: 0.5 }, { mu: 1, sigma2: 5 }],
			[{ mu: 5, sigma2: 10 }, { mu: 0, sigma2: 1 }]
		];
		for (const [p, q] of cases) {
			expect(klGaussian(p, q)).toBeGreaterThanOrEqual(0);
		}
	});

	it('is asymmetric in general', () => {
		const p = { mu: 0, sigma2: 1 };
		const q = { mu: 1, sigma2: 2 };
		expect(klGaussian(p, q)).not.toBeCloseTo(klGaussian(q, p), 5);
	});

	it('increases as means diverge', () => {
		const p = { mu: 0, sigma2: 1 };
		const q1 = { mu: 1, sigma2: 1 };
		const q2 = { mu: 5, sigma2: 1 };
		expect(klGaussian(p, q2)).toBeGreaterThan(klGaussian(p, q1));
	});

	it('increases as variance ratio grows', () => {
		// KL(N(0,1) || N(0, σ²)) increases for very large σ²
		const p = { mu: 0, sigma2: 1 };
		const q1 = { mu: 0, sigma2: 2 };
		const q2 = { mu: 0, sigma2: 10 };
		// For equal means, as σ²_q grows: 0.5*(log(σ²_q) - 1 + 1/σ²_q)
		// At σ²_q=2: 0.5*(log2 - 1 + 0.5) ≈ 0.5*(0.693 - 0.5) = 0.5*0.193 ≈ 0.097
		// At σ²_q=10: 0.5*(log10 - 1 + 0.1) ≈ 0.5*(2.303 - 0.9) ≈ 0.70
		expect(klGaussian(p, q2)).toBeGreaterThan(klGaussian(p, q1));
	});

	it('matches known analytic value for N(0,1) vs N(0,2)', () => {
		const p = { mu: 0, sigma2: 1 };
		const q = { mu: 0, sigma2: 2 };
		// KL = 0.5 * (log(2/1) - 1 + 1/2 + 0) = 0.5 * (ln2 - 0.5)
		const expected = 0.5 * (Math.log(2) - 0.5);
		expect(klGaussian(p, q)).toBeCloseTo(expected, 10);
	});
});

describe('klDiscrete', () => {
	it('KL(p, p) = 0', () => {
		const p = [0.2, 0.5, 0.3];
		expect(klDiscrete(p, p)).toBeCloseTo(0, 12);
	});

	it('is always non-negative', () => {
		const cases = [
			[[0.5, 0.5], [0.3, 0.7]],
			[[0.1, 0.9], [0.9, 0.1]],
			[[0.25, 0.25, 0.5], [1 / 3, 1 / 3, 1 / 3]]
		];
		for (const [p, q] of cases) {
			expect(klDiscrete(p, q)).toBeGreaterThanOrEqual(0);
		}
	});

	it('is asymmetric: KL(p,q) ≠ KL(q,p) in general', () => {
		const p = [0.9, 0.1];
		const q = [0.5, 0.5];
		expect(Math.abs(klDiscrete(p, q) - klDiscrete(q, p))).toBeGreaterThan(0.01);
	});

	it('handles 0 in p gracefully (0·log(0/q) = 0)', () => {
		const p = [0, 1];
		const q = [0.5, 0.5];
		const result = klDiscrete(p, q);
		expect(isNaN(result)).toBe(false);
		expect(isFinite(result)).toBe(true);
		expect(result).toBeCloseTo(Math.log(2), 10); // 1*log(1/0.5)
	});

	it('handles 0 in q gracefully (finite penalty via ε)', () => {
		const p = [0.5, 0.5];
		const q = [0, 1];
		const result = klDiscrete(p, q);
		expect(isNaN(result)).toBe(false);
		expect(isFinite(result)).toBe(true);
		expect(result).toBeGreaterThan(0);
	});

	it('throws on length mismatch', () => {
		expect(() => klDiscrete([0.5, 0.5], [1 / 3, 1 / 3, 1 / 3])).toThrow();
	});

	it('equals 0 for identical uniform distributions', () => {
		const p = [0.25, 0.25, 0.25, 0.25];
		expect(klDiscrete(p, p)).toBeCloseTo(0, 12);
	});
});

describe('klSymmetric', () => {
	it('is symmetric: klSymmetric(p,q) === klSymmetric(q,p)', () => {
		const p = [0.3, 0.7];
		const q = [0.6, 0.4];
		expect(klSymmetric(p, q)).toBeCloseTo(klSymmetric(q, p), 12);
	});

	it('is non-negative', () => {
		expect(klSymmetric([0.5, 0.5], [0.8, 0.2])).toBeGreaterThanOrEqual(0);
	});

	it('equals 0 when p === q', () => {
		const p = [0.4, 0.6];
		expect(klSymmetric(p, p)).toBeCloseTo(0, 12);
	});
});

describe('jensenShannon', () => {
	it('is symmetric', () => {
		const p = [0.3, 0.7];
		const q = [0.6, 0.4];
		expect(jensenShannon(p, q)).toBeCloseTo(jensenShannon(q, p), 12);
	});

	it('is bounded in [0, log 2]', () => {
		const p = [0, 1];
		const q = [1, 0];
		const jsd = jensenShannon(p, q);
		expect(jsd).toBeGreaterThanOrEqual(0);
		expect(jsd).toBeLessThanOrEqual(Math.log(2) + 1e-10);
	});

	it('equals 0 when p === q', () => {
		const p = [0.5, 0.5];
		expect(jensenShannon(p, p)).toBeCloseTo(0, 12);
	});

	it('equals log(2) for maximally different distributions', () => {
		// p = [1, 0], q = [0, 1] → JSD = log(2)
		const p = [1, 0];
		const q = [0, 1];
		expect(jensenShannon(p, q)).toBeCloseTo(Math.log(2), 10);
	});
});
