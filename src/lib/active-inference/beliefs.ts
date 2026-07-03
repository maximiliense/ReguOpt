/**
 * Belief state representation for discrete active inference.
 * A belief state is a categorical distribution q(s) over n discrete states.
 */

import { normalize } from '../math/discrete.js';

/** A categorical belief distribution over n states. */
export interface BeliefState {
	/** Probability vector q(s): must sum to 1, length = n_states. */
	probs: number[];
	/** Number of states. */
	n: number;
}

/**
 * Create a uniform prior belief state over n states.
 */
export function createBeliefState(n: number): BeliefState {
	return { probs: Array.from({ length: n }, () => 1 / n), n };
}

/**
 * Create a belief state from an arbitrary (unnormalized) probability vector.
 * Normalizes automatically.
 */
export function beliefFromProbs(probs: number[]): BeliefState {
	return { probs: normalize(probs), n: probs.length };
}

/**
 * Bayesian belief update given an observation likelihood vector.
 *
 * q(s | o) ∝ p(o | s) · q(s)
 *
 * @param belief     - Current belief q(s)
 * @param likelihood - p(o | s) for each state s (the column A[:, s] for observation o)
 * @returns Updated (normalized) belief state
 */
export function updateBelief(belief: BeliefState, likelihood: number[]): BeliefState {
	if (likelihood.length !== belief.n) {
		throw new Error(
			`updateBelief: likelihood length ${likelihood.length} ≠ n_states ${belief.n}`
		);
	}
	const unnorm = belief.probs.map((p, s) => p * likelihood[s]);
	return { probs: normalize(unnorm), n: belief.n };
}

/**
 * Predict the next belief state given a transition matrix column for action a.
 *
 * q(s') = Σ_s B[s'][s][a] · q(s)
 *
 * @param belief     - Current belief q(s)
 * @param B          - Transition tensor B[s'][s][a], shape n_states × n_states × n_actions
 * @param action     - Action index a
 */
export function predictBelief(belief: BeliefState, B: number[][][], action: number): BeliefState {
	const n = belief.n;
	const probs = Array.from({ length: n }, (_, sp) =>
		belief.probs.reduce((sum, qs, s) => sum + B[sp][s][action] * qs, 0)
	);
	return { probs, n };
}
