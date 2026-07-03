/**
 * T-Maze generative model and canvas rendering for Active Inference demonstrations.
 *
 * The T-maze is the canonical benchmark for epistemic behaviour in active inference.
 * An agent that minimises Expected Free Energy naturally visits the Cue arm first
 * (resolving uncertainty about reward location) before going to the correct arm.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Layout
 * ──────────────────────────────────────────────────────────────────────────────
 *   [Left Arm] [ Cue  ] [Right Arm]
 *              [Start ]
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Generative model — discrete POMDP
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Hidden states (8):  location (4) × context (2)
 *   Location ∈ { Start=0, Cue=1, Left=2, Right=3 }
 *   Context  ∈ { RewardLeft=0, RewardRight=1 }   ← fixed per trial, unknown to agent
 *
 * Observations (5):
 *   0 = neutral    (at Start; no information)
 *   1 = cue-left   (at Cue; reveals reward is on the left)
 *   2 = cue-right  (at Cue; reveals reward is on the right)
 *   3 = reward     (arrived at the correct arm)
 *   4 = no-reward  (arrived at the wrong arm)
 *
 * Actions (3):
 *   0 = go-cue
 *   1 = go-left
 *   2 = go-right
 */

import type { Agent } from '../active-inference/types.js';
import {
	predictNextState,
	predictObservations,
	epistemicValue,
	pragmaticValue,
	computeAllEFEs
} from '../active-inference/efe.js';
import { agentObserve } from '../active-inference/agent.js';

// ── Constants ──────────────────────────────────────────────────────────────────

export const LOC = { START: 0, CUE: 1, LEFT: 2, RIGHT: 3 } as const;
export const CTX = { REWARD_LEFT: 0, REWARD_RIGHT: 1 } as const;
export const OBS = {
	NEUTRAL: 0,
	CUE_LEFT: 1,
	CUE_RIGHT: 2,
	REWARD: 3,
	NO_REWARD: 4
} as const;
export const ACT = { CUE: 0, LEFT: 1, RIGHT: 2 } as const;

export const N_STATES = 8;
export const N_OBS = 5;
export const N_ACTIONS = 3;

export const ACTION_LABELS = ['Indice 🔍', 'Gauche ←', 'Droite →'] as const;
export const LOC_LABELS = ['Départ', 'Indice', 'Gauche', 'Droite'] as const;

// ── State encoding ─────────────────────────────────────────────────────────────

/** Flat state index from (location, context) pair.  s = loc * 2 + ctx */
export function stateId(loc: number, ctx: number): number {
	return loc * 2 + ctx;
}
export function stateLocation(s: number): number {
	return Math.floor(s / 2);
}
export function stateContext(s: number): number {
	return s % 2;
}

// ── Generative model ───────────────────────────────────────────────────────────

/**
 * A[o][s] = P(observation | state).
 * The cue location deterministically reveals the hidden context.
 * Arm locations deterministically reveal the reward outcome.
 */
export function buildA(): number[][] {
	const A: number[][] = Array.from({ length: N_OBS }, () => Array(N_STATES).fill(0));

	// Start: neutral observation (context is not visible)
	A[OBS.NEUTRAL][stateId(LOC.START, CTX.REWARD_LEFT)] = 1;
	A[OBS.NEUTRAL][stateId(LOC.START, CTX.REWARD_RIGHT)] = 1;

	// Cue: observation uniquely identifies context
	A[OBS.CUE_LEFT][stateId(LOC.CUE, CTX.REWARD_LEFT)] = 1;
	A[OBS.CUE_RIGHT][stateId(LOC.CUE, CTX.REWARD_RIGHT)] = 1;

	// Left arm
	A[OBS.REWARD][stateId(LOC.LEFT, CTX.REWARD_LEFT)] = 1; // correct
	A[OBS.NO_REWARD][stateId(LOC.LEFT, CTX.REWARD_RIGHT)] = 1; // wrong

	// Right arm
	A[OBS.NO_REWARD][stateId(LOC.RIGHT, CTX.REWARD_LEFT)] = 1; // wrong
	A[OBS.REWARD][stateId(LOC.RIGHT, CTX.REWARD_RIGHT)] = 1; // correct

	return A;
}

/**
 * B[s'][s][a] = P(next_state | state, action).
 * The hidden context never changes; only the agent's location transitions.
 * Arm states are absorbing (terminal): all actions keep agent there.
 */
export function buildB(): number[][][] {
	const B: number[][][] = Array.from({ length: N_STATES }, () =>
		Array.from({ length: N_STATES }, () => Array(N_ACTIONS).fill(0))
	);

	for (const ctx of [CTX.REWARD_LEFT, CTX.REWARD_RIGHT]) {
		// ── Go-Cue ──────────────────────────────────────────────────────────────
		B[stateId(LOC.CUE, ctx)][stateId(LOC.START, ctx)][ACT.CUE] = 1; // Start → Cue
		B[stateId(LOC.CUE, ctx)][stateId(LOC.CUE, ctx)][ACT.CUE] = 1; // Cue → Cue (idempotent)
		B[stateId(LOC.LEFT, ctx)][stateId(LOC.LEFT, ctx)][ACT.CUE] = 1; // Left → Left (absorbing)
		B[stateId(LOC.RIGHT, ctx)][stateId(LOC.RIGHT, ctx)][ACT.CUE] = 1; // Right → Right (absorbing)

		// ── Go-Left ─────────────────────────────────────────────────────────────
		B[stateId(LOC.LEFT, ctx)][stateId(LOC.START, ctx)][ACT.LEFT] = 1; // Start → Left
		B[stateId(LOC.LEFT, ctx)][stateId(LOC.CUE, ctx)][ACT.LEFT] = 1; // Cue → Left
		B[stateId(LOC.LEFT, ctx)][stateId(LOC.LEFT, ctx)][ACT.LEFT] = 1; // Left → Left (absorbing)
		B[stateId(LOC.RIGHT, ctx)][stateId(LOC.RIGHT, ctx)][ACT.LEFT] = 1; // Right → Right (absorbing)

		// ── Go-Right ────────────────────────────────────────────────────────────
		B[stateId(LOC.RIGHT, ctx)][stateId(LOC.START, ctx)][ACT.RIGHT] = 1; // Start → Right
		B[stateId(LOC.RIGHT, ctx)][stateId(LOC.CUE, ctx)][ACT.RIGHT] = 1; // Cue → Right
		B[stateId(LOC.LEFT, ctx)][stateId(LOC.LEFT, ctx)][ACT.RIGHT] = 1; // Left → Left (absorbing)
		B[stateId(LOC.RIGHT, ctx)][stateId(LOC.RIGHT, ctx)][ACT.RIGHT] = 1; // Right → Right (absorbing)
	}

	return B;
}

/**
 * C[o] = log p*(o) — log-preference over observations.
 * Only the terminal outcomes (reward / no-reward) carry preference value.
 * Cue observations are instrumentally valuable via epistemic value, not directly preferred.
 */
export function buildC(rewardScale = 4): number[] {
	return [
		0, //  neutral
		0, //  cue-left
		0, //  cue-right
		+rewardScale, //  reward     ← preferred
		-rewardScale //  no-reward  ← aversive
	];
}

/**
 * Initial belief state: uniform over hidden contexts, agent located at Start.
 * The agent knows its physical location but not which arm has the reward.
 */
export function initialBeliefs(): number[] {
	const b = Array(N_STATES).fill(0);
	b[stateId(LOC.START, CTX.REWARD_LEFT)] = 0.5;
	b[stateId(LOC.START, CTX.REWARD_RIGHT)] = 0.5;
	return b;
}

/**
 * Extract P(context = RewardLeft) from a belief vector by marginalising over location.
 */
export function pRewardLeft(beliefs: number[]): number {
	return (
		beliefs[stateId(LOC.START, CTX.REWARD_LEFT)] +
		beliefs[stateId(LOC.CUE, CTX.REWARD_LEFT)] +
		beliefs[stateId(LOC.LEFT, CTX.REWARD_LEFT)] +
		beliefs[stateId(LOC.RIGHT, CTX.REWARD_LEFT)]
	);
}

// ── Two-step Expected Free Energy ─────────────────────────────────────────────

export interface EFEResult {
	efes: number[];
	epistemic: number[];
	pragmatic: number[];
	g2: (number | null)[]; // second-step EFE for CUE action; null otherwise
}

/**
 * Compute two-step EFE for each action from the current agent beliefs.
 *
 * Single-step EFE cannot distinguish the three actions from Start:
 * all have the same epistemic value (they all resolve the context uncertainty)
 * and the same zero pragmatic value (50 % chance of reward = 0 on average).
 *
 * Two-step EFE captures the crucial asymmetry:
 *
 *   G(CUE)  = G₁(CUE)  + E_o[ min_{a₂} G₂(a₂ | q(s | o)) ]
 *           ≈ −log 2   + (−rewardScale)     ← guaranteed reward after Cue
 *
 *   G(LEFT) = G₁(LEFT) = −log 2             ← no second action; 50/50 gamble
 *   G(RIGHT)= G₁(RIGHT)= −log 2
 *
 * Result: G(CUE) ≪ G(LEFT) = G(RIGHT), so the agent always explores first.
 */
export function computeTwoStepEFEs(agent: Agent): EFEResult {
	const { A, C } = agent.config;
	const epistemic: number[] = [];
	const pragmatic: number[] = [];
	const g2: (number | null)[] = [];
	const efes: number[] = [];

	for (let a = 0; a < N_ACTIONS; a++) {
		const qNext = predictNextState(agent, a);
		const qObs = predictObservations(A, qNext);
		const epist = epistemicValue(qNext, A);
		const pragmat = pragmaticValue(qObs, C);
		const g1 = -epist - pragmat;

		if (a === ACT.CUE) {
			// Look one extra step ahead: after observing the cue the agent selects the best arm.
			let g2Exp = 0;
			for (let o = 0; o < agent.n_obs; o++) {
				if (qObs[o] <= 1e-12) continue;
				// Posterior beliefs at Cue given observation o
				const posterior = agentObserve({ ...agent, beliefs: qNext }, o);
				// Best arm action after observing the cue (min EFE over all actions)
				g2Exp += qObs[o] * Math.min(...computeAllEFEs(posterior));
			}
			efes.push(g1 + g2Exp);
			g2.push(g2Exp);
		} else {
			// Terminal action — no further step.
			efes.push(g1);
			g2.push(null);
		}

		epistemic.push(epist);
		pragmatic.push(pragmat);
	}

	return { efes, epistemic, pragmatic, g2 };
}

// ── Environment simulation ────────────────────────────────────────────────────

/**
 * Return the observation the environment emits given an action and the true context.
 */
export function getEnvObs(action: number, trueContext: number): number {
	if (action === ACT.CUE) {
		return trueContext === CTX.REWARD_LEFT ? OBS.CUE_LEFT : OBS.CUE_RIGHT;
	}
	if (action === ACT.LEFT) {
		return trueContext === CTX.REWARD_LEFT ? OBS.REWARD : OBS.NO_REWARD;
	}
	// RIGHT
	return trueContext === CTX.REWARD_RIGHT ? OBS.REWARD : OBS.NO_REWARD;
}

// ── Canvas rendering ───────────────────────────────────────────────────────────

export const CELL = 80;
export const CANVAS_W = CELL * 3; // 240
export const CANVAS_H = CELL * 2; // 160

export const COLOR = {
	bg: '#09090b',
	surface: '#18181b',
	border: '#27272a',
	startFill: 'rgba(99,102,241,0.15)',
	startStroke: '#6366f1',
	cueFill: 'rgba(139,92,246,0.18)',
	cueStroke: '#8b5cf6',
	leftFill: 'rgba(16,185,129,0.15)',
	leftStroke: '#10b981',
	rightFill: 'rgba(245,158,11,0.15)',
	rightStroke: '#f59e0b',
	agent: '#06b6d4',
	reward: '#10b981',
	noReward: '#ef4444',
	text: '#a1a1aa',
	textBright: '#e4e4e7'
} as const;

/** Top-left pixel position of each location cell on the canvas. */
export const CELL_POS: Record<number, { x: number; y: number }> = {
	[LOC.LEFT]: { x: 0, y: 0 },
	[LOC.CUE]: { x: CELL, y: 0 },
	[LOC.RIGHT]: { x: CELL * 2, y: 0 },
	[LOC.START]: { x: CELL, y: CELL }
};

/** Pixel centre of a location cell. */
export function cellCenter(loc: number): { x: number; y: number } {
	const p = CELL_POS[loc];
	return { x: p.x + CELL / 2, y: p.y + CELL / 2 };
}

/**
 * Draw the T-maze on a Canvas2D context.
 *
 * @param ctx       Canvas rendering context
 * @param agentLoc  Current agent location (use -1 to hide)
 * @param outcome   Outcome to display at the arm ('reward' | 'no-reward' | null)
 */
export function drawTMaze(
	ctx: CanvasRenderingContext2D,
	agentLoc: number,
	outcome: 'reward' | 'no-reward' | null = null
): void {
	// ── Background ────────────────────────────────────────────────────────────
	ctx.fillStyle = COLOR.bg;
	ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

	// ── Corridor ──────────────────────────────────────────────────────────────
	ctx.fillStyle = COLOR.surface;
	ctx.fillRect(0, 0, CANVAS_W, CELL); // horizontal row
	ctx.fillRect(CELL, 0, CELL, CANVAS_H); // vertical connector (Cue→Start)

	// ── Location cells ────────────────────────────────────────────────────────
	const locations = [
		{ loc: LOC.LEFT, fill: COLOR.leftFill, stroke: COLOR.leftStroke, label: 'Gauche' },
		{ loc: LOC.CUE, fill: COLOR.cueFill, stroke: COLOR.cueStroke, label: 'Indice' },
		{ loc: LOC.RIGHT, fill: COLOR.rightFill, stroke: COLOR.rightStroke, label: 'Droite' },
		{ loc: LOC.START, fill: COLOR.startFill, stroke: COLOR.startStroke, label: 'Départ' }
	];

	const pad = 5;
	for (const { loc, fill, stroke, label } of locations) {
		const pos = CELL_POS[loc];
		const x = pos.x + pad;
		const y = pos.y + pad;
		const w = CELL - pad * 2;
		const h = CELL - pad * 2;
		const isAgent = agentLoc === loc;

		ctx.fillStyle = fill;
		ctx.fillRect(x, y, w, h);

		ctx.strokeStyle = isAgent ? COLOR.agent : stroke;
		ctx.lineWidth = isAgent ? 2 : 1;
		ctx.strokeRect(x, y, w, h);

		ctx.fillStyle = COLOR.text;
		ctx.font = '10px system-ui,sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText(label, pos.x + CELL / 2, pos.y + CELL - 5);
	}

	// ── Outcome indicator ─────────────────────────────────────────────────────
	if (outcome !== null && (agentLoc === LOC.LEFT || agentLoc === LOC.RIGHT)) {
		const { x, y } = cellCenter(agentLoc);
		const isReward = outcome === 'reward';

		const pos = CELL_POS[agentLoc];
		ctx.fillStyle = isReward ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)';
		ctx.fillRect(pos.x + pad, pos.y + pad, CELL - pad * 2, CELL - pad * 2);

		ctx.fillStyle = isReward ? COLOR.reward : COLOR.noReward;
		ctx.font = '9px system-ui,sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(isReward ? 'Récompense' : 'Rien', x, y - 22);

		ctx.font = `bold 18px system-ui,sans-serif`;
		ctx.fillText(isReward ? '✓' : '✗', x, y - 7);
	}

	// ── Agent dot ─────────────────────────────────────────────────────────────
	if (agentLoc >= 0) {
		const { x, y } = cellCenter(agentLoc);
		ctx.save();
		ctx.shadowColor = COLOR.agent;
		ctx.shadowBlur = 16;
		ctx.fillStyle = COLOR.agent;
		ctx.beginPath();
		ctx.arc(x, y, CELL * 0.19, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}
