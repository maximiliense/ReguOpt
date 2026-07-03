/**
 * Minimal discrete active inference agent.
 *
 * The agent maintains:
 *   - A generative model (A, B, C matrices)
 *   - Current beliefs q(s) over hidden states
 *   - Action selection via Expected Free Energy minimization
 *
 * All state is immutable: update functions return a new Agent object.
 */

import { normalize } from '../math/discrete.js';
import { selectAction } from './efe.js';
import type { AgentConfig, Agent } from './types.js';

export type { AgentConfig, Agent };

/**
 * Create a new agent from a generative model configuration.
 * Beliefs are initialised to uniform unless provided.
 *
 * @param config          - Generative model (A, B, C)
 * @param initialBeliefs  - Optional initial q(s); will be normalized
 */
export function createAgent(config: AgentConfig, initialBeliefs?: number[]): Agent {
	const n_states = config.A[0].length;
	const n_obs = config.A.length;
	const n_actions = config.B[0][0].length;
	const beliefs = initialBeliefs
		? normalize(initialBeliefs)
		: Array.from({ length: n_states }, () => 1 / n_states);
	return { config, beliefs, n_states, n_obs, n_actions };
}

/**
 * Bayesian belief update after receiving observation o.
 *
 * q(s | o) ∝ A[o][s] · q(s)
 *
 * Returns a new Agent with updated beliefs (immutable).
 */
export function agentObserve(agent: Agent, observation: number): Agent {
	const likelihood = agent.config.A[observation]; // A[o][s] for all s
	const unnorm = agent.beliefs.map((q, s) => q * likelihood[s]);
	const beliefs = normalize(unnorm);
	return { ...agent, beliefs };
}

/**
 * Select the action that minimises Expected Free Energy.
 * Delegates to efe.selectAction for EFE computation.
 */
export function agentAct(agent: Agent): number {
	return selectAction(agent);
}

/**
 * Convenience: observe then act.
 * Returns { updatedAgent, action }.
 */
export function agentStep(
	agent: Agent,
	observation: number
): { updatedAgent: Agent; action: number } {
	const updatedAgent = agentObserve(agent, observation);
	const action = agentAct(updatedAgent);
	return { updatedAgent, action };
}
