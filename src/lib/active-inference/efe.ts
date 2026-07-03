/**
 * Expected Free Energy (EFE) computation for discrete active inference.
 *
 * References:
 *   - Friston et al. (2017). "Active inference and epistemic value."
 *   - Parr, Pezzulo & Friston (2022). "Active Inference: The Free Energy Principle in Mind, Brain, and Behavior."
 *
 * G(a) = −epistemic_value(a) − pragmatic_value(a)
 *
 * We minimize G to select actions that simultaneously resolve uncertainty
 * (epistemic) and satisfy preferences (pragmatic).
 */

import type { Agent } from './types.js';

// ─── Core predictions ─────────────────────────────────────────────────────────

/**
 * Predict the state distribution one step ahead under action a.
 * q(s') = Σ_s B[s'][s][a] · q(s)
 */
export function predictNextState(agent: Agent, action: number): number[] {
	const { B } = agent.config;
	const q = agent.beliefs;
	return Array.from({ length: agent.n_states }, (_, sp) =>
		q.reduce((sum: number, qs, s) => sum + B[sp][s][action] * qs, 0)
	);
}

/**
 * Predict the marginal observation distribution given a predicted state distribution.
 * q(o) = Σ_s A[o][s] · q(s)
 */
export function predictObservations(A: number[][], q_state: number[]): number[] {
	return A.map((row) => row.reduce((sum: number, a, s) => sum + a * q_state[s], 0));
}

// ─── Value components ─────────────────────────────────────────────────────────

/**
 * Pragmatic value: expected log preference under predicted observations.
 *   V_pragmatic = Σ_o q(o) · C[o]
 * where C[o] = log p*(o) encodes log preferences over outcomes.
 * Higher is better (more preferred observations expected).
 */
export function pragmaticValue(q_obs: number[], C: number[]): number {
	return q_obs.reduce((sum: number, qo, o) => sum + qo * C[o], 0);
}

/**
 * Epistemic value: mutual information I(o; s) under predicted joint.
 *   V_epistemic = H(q(o)) − E_{q(s)}[H(p(o|s))]
 *              = Σ_{s,o} q(s) · A[o][s] · log(A[o][s] / q(o))
 * Always ≥ 0. High epistemic value means states are well-distinguishable by observations.
 */
export function epistemicValue(q_state: number[], A: number[][]): number {
	const q_obs = predictObservations(A, q_state);

	// H(q(o)) — entropy of predicted observations
	const H_obs = -q_obs.reduce((sum: number, qo) => {
		if (qo <= 0) return sum;
		return sum + qo * Math.log(qo);
	}, 0);

	// E_{q(s)}[H(p(o|s))] — expected ambiguity per state
	const expected_ambiguity = q_state.reduce((sum: number, qs, s) => {
		if (qs <= 0) return sum;
		const H_s = -A.reduce((h: number, row) => {
			const aos = row[s];
			if (aos <= 0) return h;
			return h + aos * Math.log(aos);
		}, 0);
		return sum + qs * H_s;
	}, 0);

	// Mutual information = H(o) − H(o|s) ≥ 0
	return H_obs - expected_ambiguity;
}

// ─── EFE (single-step) ────────────────────────────────────────────────────────

/**
 * Expected Free Energy for a single action (H=1 horizon).
 *
 * G(a) = −V_epistemic(a) − V_pragmatic(a)
 *
 * Minimizing G selects actions that are both informative and preference-satisfying.
 */
export function computeEFE(agent: Agent, action: number): number {
	const q_future = predictNextState(agent, action);
	const q_obs = predictObservations(agent.config.A, q_future);
	const epist = epistemicValue(q_future, agent.config.A);
	const pragmat = pragmaticValue(q_obs, agent.config.C);
	return -epist - pragmat;
}

/**
 * Compute EFE for every action and return the array.
 */
export function computeAllEFEs(agent: Agent): number[] {
	return Array.from({ length: agent.n_actions }, (_, a) => computeEFE(agent, a));
}

/**
 * Select the action with minimum EFE (active inference policy).
 * Ties broken by lowest index.
 */
export function selectAction(agent: Agent): number {
	const efes = computeAllEFEs(agent);
	return efes.indexOf(Math.min(...efes));
}

/**
 * Decompose EFE into its epistemic and pragmatic components (for visualisation).
 */
export function efeDecomposition(
	agent: Agent,
	action: number
): { epistemic: number; pragmatic: number; total: number } {
	const q_future = predictNextState(agent, action);
	const q_obs = predictObservations(agent.config.A, q_future);
	const epistemic = epistemicValue(q_future, agent.config.A);
	const pragmatic = pragmaticValue(q_obs, agent.config.C);
	return { epistemic, pragmatic, total: -epistemic - pragmatic };
}

// ─── Multi-step rollout planning ───────────────────────────────────────────────

/**
 * Propagate a belief distribution one step through the transition model.
 * q'(s') = Σ_s B[s'][s][a] · q(s)
 *
 * This is the same as predictNextState but operates directly on a raw belief
 * array rather than an Agent object, so it can be called inside the rollout
 * recursion without repeatedly wrapping/unwrapping the agent struct.
 */
function propagateBeliefs(q: number[], B: number[][][], action: number): number[] {
	return Array.from({ length: q.length }, (_, sp) =>
		q.reduce((sum, qs, s) => sum + B[sp][s][action] * qs, 0)
	);
}

/**
 * Compute the maximum cumulative value achievable in `d` steps from belief q.
 *
 *   V(q, 0) = 0
 *   V(q, d) = max_a [ epistemic(B_a·q) + pragmatic(A·B_a·q) + V(B_a·q, d−1) ]
 *
 * This is the "value function" of the optimal active-inference policy over
 * a finite horizon: it sums epistemic (uncertainty-reducing) and pragmatic
 * (goal-approaching) contributions across the best d-step trajectory.
 */
function rolloutValue(
	q: number[],
	B: number[][][],
	A: number[][],
	C: number[],
	d: number,
	n_actions: number
): number {
	if (d === 0) return 0;
	let best = -Infinity;
	for (let a = 0; a < n_actions; a++) {
		const q_next = propagateBeliefs(q, B, a);
		const q_obs = predictObservations(A, q_next);
		const val =
			epistemicValue(q_next, A) +
			pragmaticValue(q_obs, C) +
			rolloutValue(q_next, B, A, C, d - 1, n_actions);
		if (val > best) best = val;
	}
	return best;
}

/**
 * Compute the depth-d rollout value for every action at the root.
 *
 *   rolloutValues[a] = epistemic(B_a·q) + pragmatic(A·B_a·q) + V(B_a·q, d−1)
 *
 * Higher values are better (this is −G accumulated over the horizon).
 * The agent should choose the action with the highest rollout value among
 * physically feasible actions.
 *
 * @param agent  - Agent with posterior beliefs q(s) and generative model (A, B, C)
 * @param depth  - Planning horizon; 3 is recommended for a 7×7 maze
 */
export function computeAllRolloutValues(agent: Agent, depth: number): number[] {
	const { A, B, C } = agent.config;
	return Array.from({ length: agent.n_actions }, (_, a) => {
		const q_next = propagateBeliefs(agent.beliefs, B, a);
		const q_obs = predictObservations(A, q_next);
		return (
			epistemicValue(q_next, A) +
			pragmaticValue(q_obs, C) +
			rolloutValue(q_next, B, A, C, depth - 1, agent.n_actions)
		);
	});
}

/**
 * Select the best action via a depth-d EFE rollout, restricted to feasible actions.
 *
 * The agent looks `depth` steps ahead, balancing:
 *   • Epistemic value — how much the predicted observations would reduce uncertainty
 *   • Pragmatic value — how close the expected state is to the goal
 *
 * @param agent    - Agent with posterior beliefs and generative model
 * @param depth    - Planning horizon (recommended: 3)
 * @param feasible - Actions physically possible from the current true state
 */
export function selectActionRollout(
	agent: Agent,
	depth: number,
	feasible: readonly number[]
): number {
	const values = computeAllRolloutValues(agent, depth);
	return feasible.reduce((best, a) => (values[a] > values[best] ? a : best), feasible[0]);
}
