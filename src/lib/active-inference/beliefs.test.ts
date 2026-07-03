import { describe, it, expect } from 'vitest';
import {
	createBeliefState,
	beliefFromProbs,
	updateBelief,
	predictBelief
} from '../active-inference/beliefs.js';

/** 2-state identity observation model: A[o][s] = δ_{o,s} */
const I2: number[][] = [
	[1, 0],
	[0, 1]
];

describe('createBeliefState', () => {
	it('creates uniform beliefs over n states', () => {
		const b = createBeliefState(4);
		expect(b.n).toBe(4);
		b.probs.forEach((p) => expect(p).toBeCloseTo(0.25, 12));
	});

	it('sums to 1', () => {
		const b = createBeliefState(5);
		expect(b.probs.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 10);
	});
});

describe('beliefFromProbs', () => {
	it('normalizes input', () => {
		const b = beliefFromProbs([1, 3]);
		expect(b.probs[0]).toBeCloseTo(0.25, 12);
		expect(b.probs[1]).toBeCloseTo(0.75, 12);
	});

	it('throws on all-zero input', () => {
		expect(() => beliefFromProbs([0, 0])).toThrow();
	});
});

describe('updateBelief', () => {
	it('concentrates belief toward the observed state (identity A)', () => {
		const prior = createBeliefState(2); // uniform [0.5, 0.5]
		// Likelihood for observation 0: A[0] = [1, 0]
		const likelihood = I2[0]; // [1, 0]
		const post = updateBelief(prior, likelihood);
		expect(post.probs[0]).toBeCloseTo(1, 10);
		expect(post.probs[1]).toBeCloseTo(0, 10);
	});

	it('result sums to 1', () => {
		const prior = createBeliefState(3);
		const likelihood = [0.1, 0.6, 0.3];
		const post = updateBelief(prior, likelihood);
		expect(post.probs.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 10);
	});

	it('is Bayesian: q(s|o) ∝ p(o|s)·q(s)', () => {
		const prior = beliefFromProbs([3, 1]); // [0.75, 0.25]
		const likelihood = [0.8, 0.2];
		const post = updateBelief(prior, likelihood);
		// unnorm: [0.75*0.8, 0.25*0.2] = [0.6, 0.05], sum = 0.65
		expect(post.probs[0]).toBeCloseTo(0.6 / 0.65, 10);
		expect(post.probs[1]).toBeCloseTo(0.05 / 0.65, 10);
	});

	it('throws on length mismatch', () => {
		const b = createBeliefState(2);
		expect(() => updateBelief(b, [1, 2, 3])).toThrow();
	});
});

describe('predictBelief', () => {
	it('applies identity transition correctly', () => {
		// B[s'][s][a] layout:
		// B[0][0][0]=1, B[0][1][0]=0, B[1][0][0]=0, B[1][1][0]=1
		const B_identity: number[][][] = [
			[[1], [0]], // B[s'=0][s=0..1][a=0]
			[[0], [1]] // B[s'=1][s=0..1][a=0]
		];
		const belief = beliefFromProbs([0.3, 0.7]);
		const next = predictBelief(belief, B_identity, 0);
		expect(next.probs[0]).toBeCloseTo(0.3, 10);
		expect(next.probs[1]).toBeCloseTo(0.7, 10);
	});

	it('applies deterministic transition: always go to state 0', () => {
		// B[s'=0][s][a=0] = 1 for all s, B[s'=1][s][a=0] = 0 for all s
		const B_to0: number[][][] = [
			[[1], [1]], // P(s'=0 | s, a)
			[[0], [0]] // P(s'=1 | s, a)
		];
		const belief = beliefFromProbs([0.4, 0.6]);
		const next = predictBelief(belief, B_to0, 0);
		expect(next.probs[0]).toBeCloseTo(1, 10);
		expect(next.probs[1]).toBeCloseTo(0, 10);
	});
});
