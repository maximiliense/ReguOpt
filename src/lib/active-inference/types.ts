/**
 * Shared types for the discrete active inference agent.
 * Kept in a separate file to avoid circular imports between agent.ts and efe.ts.
 */

/**
 * Generative model parameters for a discrete POMDP.
 *
 * Shapes:
 *   A[o][s]      — n_obs   × n_states              (likelihood: P(o|s))
 *   B[s'][s][a]  — n_states × n_states × n_actions (transition: P(s'|s,a))
 *   C[o]         — n_obs                            (log preferences: log p*(o))
 */
export interface AgentConfig {
	A: number[][];
	B: number[][][];
	C: number[];
}

/** Runtime state of an active inference agent. */
export interface Agent {
	config: AgentConfig;
	beliefs: number[]; // q(s), length = n_states
	n_states: number;
	n_obs: number;
	n_actions: number;
}
