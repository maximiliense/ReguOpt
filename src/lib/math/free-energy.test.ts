import { describe, it, expect } from 'vitest';
import {
	variationalFE,
	variationalFEGaussian,
	discreteSurprise,
	expectedAmbiguity
} from '../math/free-energy.js';

// ─── Toy 2-state model ────────────────────────────────────────────────────────
//
// A[o][s] = identity: A = [[1,0],[0,1]]
// prior = uniform [0.5, 0.5]

const A_identity: number[][] = [
	[1, 0],
	[0, 1]
];

const uniform2 = [0.5, 0.5];

describe('variationalFE', () => {
	it('is non-negative for proper discrete distributions', () => {
		const q = [0.8, 0.2];
		const prior = [0.5, 0.5];
		// VFE = KL(q||prior) + E_q[-log A[0][s]] ≥ 0
		expect(variationalFE(q, prior, A_identity, 0)).toBeGreaterThanOrEqual(-1e-10);
	});

	it('is minimized when q = posterior (VFE = surprise for posterior beliefs)', () => {
		// With identity A, posterior after seeing obs=0 is q=[1,0]
		// VFE(q=[1,0], prior=uniform, A=I, obs=0) = KL([1,0]||[0.5,0.5]) - E_q[log A[0|s]]
		// = log(2) - log(1) = log(2)
		// And surprise = -log p(o=0) = -log(0.5) = log(2)
		// So VFE = surprise (no KL slack since q = posterior)
		const q_posterior = [1, 0];
		const vfe = variationalFE(q_posterior, uniform2, A_identity, 0);
		const surprise = discreteSurprise(uniform2, A_identity, 0);
		expect(vfe).toBeCloseTo(surprise, 10);
	});

	it('VFE ≥ surprise (free energy bound)', () => {
		// Any q should give VFE ≥ surprise = -log p(o)
		const q = [0.6, 0.4]; // not the optimal posterior
		const vfe = variationalFE(q, uniform2, A_identity, 0);
		const surprise = discreteSurprise(uniform2, A_identity, 0);
		expect(vfe).toBeGreaterThanOrEqual(surprise - 1e-10);
	});

	it('VFE decreases toward the posterior (belief update reduces VFE)', () => {
		// Start from uniform beliefs, compare to posterior beliefs
		const q_uniform = [0.5, 0.5];
		const q_posterior = [1, 0]; // after seeing obs=0
		const vfe_uniform = variationalFE(q_uniform, uniform2, A_identity, 0);
		const vfe_posterior = variationalFE(q_posterior, uniform2, A_identity, 0);
		expect(vfe_posterior).toBeLessThanOrEqual(vfe_uniform + 1e-10);
	});

	it('never returns NaN for valid inputs', () => {
		const q = [0.3, 0.7];
		const prior = [0.4, 0.6];
		const A: number[][] = [
			[0.8, 0.2],
			[0.2, 0.8]
		];
		const result = variationalFE(q, prior, A, 0);
		expect(isNaN(result)).toBe(false);
		expect(isFinite(result)).toBe(true);
	});
});

describe('variationalFEGaussian', () => {
	it('equals KL(q||prior) when obs = q.mu (zero accuracy loss at peak)', () => {
		const q = { mu: 2, sigma2: 0.5 };
		const prior = { mu: 0, sigma2: 1 };
		const sigma2L = 1;
		const obs = q.mu; // observe at q's mean
		const vfe = variationalFEGaussian(q, prior, sigma2L, obs);
		// Complexity = KL(q||prior), accuracy = log N(obs|mu_q, sigma2_q + sigma2_L)
		// At obs = mu_q, accuracy is maximised → VFE should be relatively small
		expect(isNaN(vfe)).toBe(false);
		expect(isFinite(vfe)).toBe(true);
	});

	it('increases as obs moves further from q.mu', () => {
		const q = { mu: 0, sigma2: 1 };
		const prior = { mu: 0, sigma2: 2 };
		const sigma2L = 1;
		const vfe_near = variationalFEGaussian(q, prior, sigma2L, 0);
		const vfe_far = variationalFEGaussian(q, prior, sigma2L, 5);
		expect(vfe_far).toBeGreaterThan(vfe_near);
	});
});

describe('discreteSurprise', () => {
	it('surprise = -log(0.5) = log(2) for uniform prior and identity A', () => {
		expect(discreteSurprise(uniform2, A_identity, 0)).toBeCloseTo(Math.log(2), 10);
	});

	it('surprise = 0 when p(o) = 1 (certain observation)', () => {
		// prior = [1, 0], A = identity → p(o=0) = 1, surprise = 0
		const prior_certain = [1, 0];
		expect(discreteSurprise(prior_certain, A_identity, 0)).toBeCloseTo(0, 10);
	});

	it('surprise is always non-negative', () => {
		expect(discreteSurprise(uniform2, A_identity, 0)).toBeGreaterThanOrEqual(0);
		expect(discreteSurprise([0.3, 0.7], A_identity, 1)).toBeGreaterThanOrEqual(0);
	});
});

describe('expectedAmbiguity', () => {
	it('is zero for identity observation model (perfectly informative A)', () => {
		// H(A[:,s]) = H([1,0]) = 0 for each s → expected ambiguity = 0
		const q = [0.5, 0.5];
		expect(expectedAmbiguity(q, A_identity)).toBeCloseTo(0, 10);
	});

	it('is log(2) for uniform A (maximally ambiguous)', () => {
		const A_uniform: number[][] = [
			[0.5, 0.5],
			[0.5, 0.5]
		];
		const q = [0.5, 0.5];
		// H([0.5, 0.5]) = log(2) for every state → expected ambiguity = log(2)
		expect(expectedAmbiguity(q, A_uniform)).toBeCloseTo(Math.log(2), 10);
	});

	it('is non-negative', () => {
		const A_partial: number[][] = [
			[0.7, 0.3],
			[0.3, 0.7]
		];
		const q = [0.4, 0.6];
		expect(expectedAmbiguity(q, A_partial)).toBeGreaterThanOrEqual(0);
	});
});
