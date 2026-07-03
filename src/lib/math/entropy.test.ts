import { describe, it, expect } from 'vitest';
import { entropyDiscrete, entropyGaussian, conditionalEntropy } from '../math/entropy.js';

describe('entropyDiscrete', () => {
	it('is zero for a deterministic distribution', () => {
		expect(entropyDiscrete([1, 0, 0])).toBeCloseTo(0, 12);
		expect(entropyDiscrete([0, 0, 1])).toBeCloseTo(0, 12);
	});

	it('equals log(n) for a uniform distribution over n states', () => {
		const n = 4;
		const uniform = Array.from({ length: n }, () => 1 / n);
		expect(entropyDiscrete(uniform)).toBeCloseTo(Math.log(n), 10);
	});

	it('uniform entropy increases with n', () => {
		const h2 = entropyDiscrete([0.5, 0.5]);
		const h4 = entropyDiscrete([0.25, 0.25, 0.25, 0.25]);
		expect(h4).toBeGreaterThan(h2);
	});

	it('is non-negative', () => {
		expect(entropyDiscrete([0.3, 0.7])).toBeGreaterThanOrEqual(0);
		expect(entropyDiscrete([0.1, 0.2, 0.7])).toBeGreaterThanOrEqual(0);
	});

	it('handles near-zero probabilities without NaN (0·log(0) = 0)', () => {
		const result = entropyDiscrete([1e-300, 1 - 1e-300]);
		expect(isNaN(result)).toBe(false);
		expect(isFinite(result)).toBe(true);
	});

	it('matches analytic formula for binary distribution', () => {
		const p = 0.3;
		const expected = -(p * Math.log(p) + (1 - p) * Math.log(1 - p));
		expect(entropyDiscrete([p, 1 - p])).toBeCloseTo(expected, 12);
	});
});

describe('entropyGaussian', () => {
	it('matches analytic formula H = 0.5*(1 + ln(2πσ²))', () => {
		const g = { mu: 0, sigma2: 2 };
		const expected = 0.5 * (1 + Math.log(2 * Math.PI * g.sigma2));
		expect(entropyGaussian(g)).toBeCloseTo(expected, 12);
	});

	it('is independent of mu', () => {
		const g1 = { mu: 0, sigma2: 1 };
		const g2 = { mu: 42, sigma2: 1 };
		expect(entropyGaussian(g1)).toBeCloseTo(entropyGaussian(g2), 12);
	});

	it('increases with variance', () => {
		const g1 = { mu: 0, sigma2: 1 };
		const g2 = { mu: 0, sigma2: 10 };
		expect(entropyGaussian(g2)).toBeGreaterThan(entropyGaussian(g1));
	});
});

describe('conditionalEntropy', () => {
	it('H(X|Y) = 0 when Y fully determines X (identity channel)', () => {
		// joint: X=Y always — joint[i][j] = 0.5 * δ_{ij}
		const joint = [
			[0.5, 0],
			[0, 0.5]
		];
		expect(conditionalEntropy(joint)).toBeCloseTo(0, 10);
	});

	it('H(X|Y) = H(X) when X and Y are independent', () => {
		// p(X) = [0.5, 0.5], p(Y) = [0.5, 0.5], independent → joint[i][j] = 0.25
		const joint = [
			[0.25, 0.25],
			[0.25, 0.25]
		];
		// H(X|Y) = H(X) = log(2)
		expect(conditionalEntropy(joint)).toBeCloseTo(Math.log(2), 10);
	});

	it('is non-negative', () => {
		const joint = [
			[0.1, 0.2],
			[0.3, 0.4]
		];
		expect(conditionalEntropy(joint)).toBeGreaterThanOrEqual(0);
	});

	it('satisfies H(X,Y) = H(Y) + H(X|Y)', () => {
		const joint = [
			[0.2, 0.3],
			[0.1, 0.4]
		];
		// H(X,Y) = -sum p log p
		const h_xy = -joint.flat().reduce((acc, p) => (p > 0 ? acc + p * Math.log(p) : acc), 0);
		// marginal Y: p(Y=j) = sum_i joint[i][j]
		const n_y = joint[0].length;
		const marginalY = Array.from({ length: n_y }, (_, j) =>
			joint.reduce((sum, row) => sum + row[j], 0)
		);
		const h_y = -marginalY.reduce((acc, p) => (p > 0 ? acc + p * Math.log(p) : acc), 0);
		const h_xy_cond = conditionalEntropy(joint);
		expect(h_xy_cond).toBeCloseTo(h_xy - h_y, 10);
	});
});
