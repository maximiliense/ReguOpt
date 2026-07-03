import { describe, it, expect } from 'vitest';
import { createAgent, agentObserve, agentAct, agentStep } from '../active-inference/agent.js';
import {
	computeAllEFEs,
	selectAction,
	predictNextState,
	pragmaticValue,
	epistemicValue,
	efeDecomposition
} from '../active-inference/efe.js';
import type { AgentConfig } from '../active-inference/agent.js';

// ─── Toy 2-state environment ──────────────────────────────────────────────────
//
// States:  s=0 (preferred), s=1 (not preferred)
// Obs:     o=0 (see state 0), o=1 (see state 1)
// Actions: a=0 (move to s=0), a=1 (move to s=1)
//
// A[o][s] = identity (perfectly observable)
// B[s'][s][a]: deterministic transitions
//   a=0: always → s=0    B[0][*][0] = 1, B[1][*][0] = 0
//   a=1: always → s=1    B[0][*][1] = 0, B[1][*][1] = 1
// C: log p*(o) — prefer o=0: C = [log(0.9), log(0.1)]

function makeToyConfig(): AgentConfig {
	// A[o][s]: identity
	const A: number[][] = [
		[1, 0], // P(o=0 | s)
		[0, 1] // P(o=1 | s)
	];

	// B[s'][s][a]: transitions
	// B[s'=0][s=0][a], B[s'=0][s=1][a] for a in {0,1}
	const B: number[][][] = [
		// B[s'=0]
		[
			[1, 0], // B[s'=0][s=0][a=0]=1, B[s'=0][s=0][a=1]=0
			[1, 0] // B[s'=0][s=1][a=0]=1, B[s'=0][s=1][a=1]=0
		],
		// B[s'=1]
		[
			[0, 1], // B[s'=1][s=0][a=0]=0, B[s'=1][s=0][a=1]=1
			[0, 1] // B[s'=1][s=1][a=0]=0, B[s'=1][s=1][a=1]=1
		]
	];

	// C: log preferences — strongly prefer o=0
	const C: number[] = [Math.log(0.9), Math.log(0.1)];

	return { A, B, C };
}

describe('createAgent', () => {
	it('initialises with uniform beliefs by default', () => {
		const agent = createAgent(makeToyConfig());
		expect(agent.n_states).toBe(2);
		expect(agent.n_obs).toBe(2);
		expect(agent.n_actions).toBe(2);
		agent.beliefs.forEach((p) => expect(p).toBeCloseTo(0.5, 12));
	});

	it('normalizes custom initial beliefs', () => {
		const agent = createAgent(makeToyConfig(), [1, 3]);
		expect(agent.beliefs[0]).toBeCloseTo(0.25, 12);
		expect(agent.beliefs[1]).toBeCloseTo(0.75, 12);
	});
});

describe('agentObserve', () => {
	it('concentrates beliefs after unambiguous observation', () => {
		const agent = createAgent(makeToyConfig()); // uniform beliefs
		const updated = agentObserve(agent, 0); // see o=0 → must be in s=0
		expect(updated.beliefs[0]).toBeCloseTo(1, 10);
		expect(updated.beliefs[1]).toBeCloseTo(0, 10);
	});

	it('returns a new agent (immutable)', () => {
		const agent = createAgent(makeToyConfig());
		const updated = agentObserve(agent, 0);
		// Original should be unchanged
		expect(agent.beliefs[0]).toBeCloseTo(0.5, 12);
		expect(updated).not.toBe(agent);
	});
});

describe('predictNextState', () => {
	it('action 0 predicts landing in s=0', () => {
		const agent = createAgent(makeToyConfig());
		const q_future = predictNextState(agent, 0);
		expect(q_future[0]).toBeCloseTo(1, 10); // deterministic → s=0
		expect(q_future[1]).toBeCloseTo(0, 10);
	});

	it('action 1 predicts landing in s=1', () => {
		const agent = createAgent(makeToyConfig());
		const q_future = predictNextState(agent, 1);
		expect(q_future[0]).toBeCloseTo(0, 10);
		expect(q_future[1]).toBeCloseTo(1, 10);
	});
});

describe('pragmaticValue', () => {
	it('is higher for observation distributions matching preferences', () => {
		const C = [Math.log(0.9), Math.log(0.1)];
		const q_preferred = [1, 0]; // all mass on preferred obs
		const q_dispreferred = [0, 1]; // all mass on non-preferred obs
		expect(pragmaticValue(q_preferred, C)).toBeGreaterThan(pragmaticValue(q_dispreferred, C));
	});
});

describe('epistemicValue', () => {
	it('is zero for a perfectly ambiguous observation model (uniform A columns)', () => {
		// A where every state produces the same observation distribution
		const A_uniform: number[][] = [
			[0.5, 0.5],
			[0.5, 0.5]
		];
		const q = [0.5, 0.5];
		// Mutual information = H(q(o)) - E[H(p(o|s))] = H(uniform) - H(uniform) = 0
		expect(epistemicValue(q, A_uniform)).toBeCloseTo(0, 10);
	});

	it('is non-negative', () => {
		const agent = createAgent(makeToyConfig());
		expect(epistemicValue(agent.beliefs, agent.config.A)).toBeGreaterThanOrEqual(0);
	});

	it('is higher for informative (identity) A than ambiguous A', () => {
		const A_identity: number[][] = [
			[1, 0],
			[0, 1]
		];
		const A_half: number[][] = [
			[0.7, 0.3],
			[0.3, 0.7]
		];
		const q = [0.5, 0.5];
		expect(epistemicValue(q, A_identity)).toBeGreaterThan(epistemicValue(q, A_half));
	});
});

describe('computeEFE — action selection', () => {
	it('agent with preferences selects action leading to preferred state', () => {
		const agent = createAgent(makeToyConfig());
		const efes = computeAllEFEs(agent);
		// a=0 leads to s=0 (preferred), a=1 leads to s=1 (not preferred)
		// EFE(a=0) should be lower than EFE(a=1)
		expect(efes[0]).toBeLessThan(efes[1]);
		expect(selectAction(agent)).toBe(0);
	});
});

describe('agentAct', () => {
	it('selects the pragmatically preferred action', () => {
		const agent = createAgent(makeToyConfig());
		const action = agentAct(agent);
		expect(action).toBe(0); // prefer moving to s=0
	});
});

describe('agentStep', () => {
	it('returns updatedAgent and selected action', () => {
		const agent = createAgent(makeToyConfig());
		const { updatedAgent, action } = agentStep(agent, 1); // observe o=1 (in s=1)
		// After seeing s=1, agent still prefers to move to s=0 (a=0)
		expect(action).toBe(0);
		// Beliefs should be concentrated on s=1 after observing o=1
		expect(updatedAgent.beliefs[1]).toBeGreaterThan(0.9);
	});
});

describe('efeDecomposition', () => {
	it('total = -epistemic - pragmatic', () => {
		const agent = createAgent(makeToyConfig());
		const { epistemic, pragmatic, total } = efeDecomposition(agent, 0);
		expect(total).toBeCloseTo(-epistemic - pragmatic, 10);
	});

	it('epistemic >= 0', () => {
		const agent = createAgent(makeToyConfig());
		expect(efeDecomposition(agent, 0).epistemic).toBeGreaterThanOrEqual(0);
		expect(efeDecomposition(agent, 1).epistemic).toBeGreaterThanOrEqual(0);
	});
});
