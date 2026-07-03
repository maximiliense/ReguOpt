/**
 * Hidden-graph maze simulation for Active Inference (Section 3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CANONICAL EXPECTED FREE ENERGY
 * ─────────────────────────────────────────────────────────────────────────────
 * G(n) = -log p*(x_n) - I(n), both terms in nats.
 *
 * Pragmatic term: a genuine softmax (Gibbs/Boltzmann) over the SAME energy
 * used for pruning during expansion — no separate ad hoc criterion exists
 * anywhere else in this module:
 *
 *   E(x) = pathCostSoFar(x) + d(x, g | Q_t^path)     [steps, then β-scaled]
 *   p*(x) = exp(-β·E(x)) / Z,  Z = Σ_{candidates} exp(-β·E(x'))
 *   -log p*(x) = β·E(x) + log Z
 *
 * d(·,·|Q_t^path) is believedDistanceField, evaluated under each node's own
 * threaded hypothetical belief — never raw Euclidean/Manhattan distance.
 * β is a preference-rate parameter of the generative model (nats per step),
 * not a retrofitted exploration knob.
 *
 * Epistemic term: genuine expected information gain (mutual information
 * between an edge's hidden state and the hypothetical observation upon
 * visiting), marginalized over both possible outcomes, summed along the
 * path under each node's own threaded belief — so revisiting
 * already-resolved territory correctly yields ~0 marginal gain.
 *
 * FIVE ACTIONS, NO ABSORBING STATE: every node has exactly four hidden-edge
 * moves plus a "stay" action, all competing under the identical G. Stay
 * costs one full timestep — the same base unit as a certain (p=1) move —
 * not zero: charging it zero would have made staying dominant by
 * construction rather than by comparison. Because every branch at a given
 * depth pays roughly the same cumulative timestep cost regardless of
 * whether it moved or stayed, that common term washes out of the relative
 * comparison (and out of the softmax, via Z); what actually decides the
 * outcome is the same thing that decides everything else here — differences
 * in remaining believed distance and accumulated information gain. There is
 * no goal-specific special case anywhere: an agent already at the goal
 * "settles" only because moving away no longer improves G, not because it
 * is forced to. A policy is always evaluated to the FULL horizon H — no
 * branch terminates early, so every candidate at depth H genuinely spent H
 * timesteps, matching how the softmax's partition function is defined.
 *
 * BEAM WIDTH: pruning keeps the best K candidates per (cell, depth) rather
 * than a single winner. A width-1 collapse can discard a route that lost a
 * local G comparison to a cheaper-but-less-informative alternative — even
 * though its richer belief state might have made a LATER step of the same
 * route strictly better. Keeping K candidates per cell lets an informative
 * route survive long enough to prove that value before being cut, so a path
 * that resolves real uncertainty is judged the same way as one that
 * reaches the same endpoint uninformatively: not automatically preferred,
 * but not silently thrown away either. Pruning is still entirely
 * EFE-driven — the ranking criterion within each cell's candidate pool is
 * G = E − I, the identical quantity used for final selection.
 */

import type { MazeEnv } from './maze.js';
import { idToCell, cellId, inBounds, RENDER, COLOR } from './maze.js';
import { DR, DC } from './maze.js';

// ── Edge helpers ─────────────────────────────────────────────────────────────

export function edgeKey(s: number, a: number, maze: MazeEnv): string | null {
	const { row, col } = idToCell(s, maze.cols);
	const nr = row + DR[a];
	const nc = col + DC[a];
	if (!inBounds(nr, nc, maze.rows, maze.cols)) return null;
	const sp = cellId(nr, nc, maze.cols);
	const lo = Math.min(s, sp);
	const hi = Math.max(s, sp);
	return `${lo}_${hi}`;
}

export function incidentEdges(
	s: number,
	maze: MazeEnv
): Array<{ action: number; neighbor: number; key: string }> {
	const out: Array<{ action: number; neighbor: number; key: string }> = [];
	const { row, col } = idToCell(s, maze.cols);
	for (let a = 0; a < 4; a++) {
		const nr = row + DR[a];
		const nc = col + DC[a];
		if (!inBounds(nr, nc, maze.rows, maze.cols)) continue;
		const sp = cellId(nr, nc, maze.cols);
		const key = edgeKey(s, a, maze)!;
		out.push({ action: a, neighbor: sp, key });
	}
	return out;
}

// ── Edge belief ──────────────────────────────────────────────────────────────

export interface EdgeBelief {
	alpha: Map<string, number>;
	beta: Map<string, number>;
}

const PRIOR_ALPHA = 1;
const PRIOR_BETA = 1;
const OBS_WEIGHT = 49;
const EPS = 1e-12; // moved above first use (edgeEntropy), was previously declared after it

function getAlphaBeta(belief: EdgeBelief, key: string): [number, number] {
	return [belief.alpha.get(key) ?? PRIOR_ALPHA, belief.beta.get(key) ?? PRIOR_BETA];
}

export function edgeProb(belief: EdgeBelief, key: string): number {
	const [a, b] = getAlphaBeta(belief, key);
	return a / (a + b);
}

export function edgeEntropy(p: number): number {
	const a = p > EPS ? -p * Math.log(p) : 0;
	const b = 1 - p > EPS ? -(1 - p) * Math.log(1 - p) : 0;
	return a + b;
}

export function edgeEntropyOf(belief: EdgeBelief, key: string): number {
	return edgeEntropy(edgeProb(belief, key));
}

export function initEdgeBelief(): EdgeBelief {
	return { alpha: new Map(), beta: new Map() };
}

export function observeEdge(belief: EdgeBelief, key: string, isOpen: boolean): EdgeBelief {
	const [a, b] = getAlphaBeta(belief, key);
	const newAlpha = new Map(belief.alpha);
	const newBeta = new Map(belief.beta);
	if (isOpen) {
		newAlpha.set(key, a + OBS_WEIGHT);
		newBeta.set(key, b);
	} else {
		newAlpha.set(key, a);
		newBeta.set(key, b + OBS_WEIGHT);
	}
	return { alpha: newAlpha, beta: newBeta };
}

export function observeLocalNeighborhood(
	belief: EdgeBelief,
	maze: MazeEnv,
	pos: number
): { belief: EdgeBelief; touched: string[] } {
	let cur = belief;
	const touched: string[] = [];
	for (const { action, key } of incidentEdges(pos, maze)) {
		touched.push(key);
		cur = observeEdge(cur, key, maze.passable[pos][action]);
	}
	return { belief: cur, touched };
}

export function expectedBeliefAfterVisit(
	belief: EdgeBelief,
	maze: MazeEnv,
	pos: number
): EdgeBelief {
	const newAlpha = new Map(belief.alpha);
	const newBeta = new Map(belief.beta);
	for (const { key } of incidentEdges(pos, maze)) {
		const [a, b] = getAlphaBeta(belief, key);
		const p = a / (a + b);
		newAlpha.set(key, a + p * OBS_WEIGHT);
		newBeta.set(key, b + (1 - p) * OBS_WEIGHT);
	}
	return { alpha: newAlpha, beta: newBeta };
}

function expectedInformationGain(belief: EdgeBelief, maze: MazeEnv, pos: number): number {
	let ig = 0;
	for (const { key } of incidentEdges(pos, maze)) {
		const [a, b] = getAlphaBeta(belief, key);
		const p = a / (a + b);
		const H = edgeEntropy(p);
		const pOpen = (a + OBS_WEIGHT) / (a + b + OBS_WEIGHT);
		const Hopen = edgeEntropy(pOpen);
		const pClosed = a / (a + b + OBS_WEIGHT);
		const Hclosed = edgeEntropy(pClosed);
		ig += H - (p * Hopen + (1 - p) * Hclosed);
	}
	return ig;
}

export function totalEdgeEntropy(belief: EdgeBelief, allKeys: string[]): number {
	let H = 0;
	for (const k of allKeys) H += edgeEntropyOf(belief, k);
	return H;
}

export function allEdgeKeys(maze: MazeEnv): string[] {
	const seen = new Set<string>();
	for (let s = 0; s < maze.n; s++) {
		for (const { key } of incidentEdges(s, maze)) seen.add(key);
	}
	return [...seen];
}

export function frontierUncertainty(belief: EdgeBelief, maze: MazeEnv, x: number): number {
	let U = 0;
	for (const { key } of incidentEdges(x, maze)) U += edgeEntropyOf(belief, key);
	return U;
}

// ── Distance field ───────────────────────────────────────────────────────────

export const PRUNE_EPS = 0.03;

class MinHeap {
	private heap: Array<[number, number]> = [];

	push(dist: number, node: number): void {
		this.heap.push([dist, node]);
		let i = this.heap.length - 1;
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (this.heap[parent][0] <= this.heap[i][0]) break;
			[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
			i = parent;
		}
	}

	pop(): [number, number] | undefined {
		if (this.heap.length === 0) return undefined;
		const top = this.heap[0];
		const last = this.heap.pop()!;
		if (this.heap.length > 0) {
			this.heap[0] = last;
			let i = 0;
			const n = this.heap.length;
			while (true) {
				const l = 2 * i + 1;
				const r = 2 * i + 2;
				let smallest = i;
				if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
				if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
				if (smallest === i) break;
				[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
				i = smallest;
			}
		}
		return top;
	}

	get size(): number {
		return this.heap.length;
	}
}

export function believedDistanceField(
	belief: EdgeBelief,
	maze: MazeEnv,
	source: number
): Float64Array {
	const { n } = maze;
	const dist = new Float64Array(n).fill(Infinity);
	const visited = new Uint8Array(n);
	dist[source] = 0;

	const heap = new MinHeap();
	heap.push(0, source);

	while (heap.size > 0) {
		const [d, u] = heap.pop()!;
		if (visited[u]) continue;
		if (d > dist[u]) continue;
		visited[u] = 1;

		for (const { neighbor, key } of incidentEdges(u, maze)) {
			if (visited[neighbor]) continue;
			const p = edgeProb(belief, key);
			if (p < PRUNE_EPS) continue;
			const alt = dist[u] + 1 / p;
			if (alt < dist[neighbor]) {
				dist[neighbor] = alt;
				heap.push(alt, neighbor);
			}
		}
	}

	return dist;
}

export function believedDistance(
	belief: EdgeBelief,
	maze: MazeEnv,
	from: number,
	goal: number
): number {
	return believedDistanceField(belief, maze, goal)[from];
}

// ── Horizon planner ──────────────────────────────────────────────────────────

export const DEFAULT_BETA_PREFERENCE_RATE = 0.2;

/** Sentinel action for "stay": distinct from the four hidden-edge move indices (0–3). */
export const STAY_ACTION = 4;

/** Candidates per (cell, depth) slot kept during pruning — see module header. */
export const DEFAULT_BEAM_WIDTH = 3;

export interface BFSNode {
	x: number;
	t: number;
	parent: number;
	actionFromParent: number;
	pathCostSoFar: number;
	epistemic: number;
	belief: EdgeBelief;
	energy: number;
}

export interface PolicyPath {
	actions: number[];
	cells: number[];
	score: number;
	epistemic: number;
	pragmatic: number;
	Z: number;
}

interface Candidate {
	x: number;
	parent: number;
	actionFromParent: number;
	pathCostSoFar: number;
	epistemic: number;
	belief: EdgeBelief;
	energy: number;
}

export function bfsHorizonExpand(
	belief: EdgeBelief,
	maze: MazeEnv,
	startX: number,
	goal: number,
	horizon: number,
	beta: number = DEFAULT_BETA_PREFERENCE_RATE,
	beamWidth: number = DEFAULT_BEAM_WIDTH
): { nodes: BFSNode[]; layers: number[][] } {
	const nodes: BFSNode[] = [];
	const layers: number[][] = [];

	const root: BFSNode = {
		x: startX,
		t: 0,
		parent: -1,
		actionFromParent: -1,
		pathCostSoFar: 0,
		epistemic: 0,
		belief,
		energy: beta * believedDistanceField(belief, maze, goal)[startX]
	};
	nodes.push(root);
	layers.push([0]);

	for (let depth = 1; depth <= horizon; depth++) {
		const candidates: Candidate[] = [];

		for (const parentIdx of layers[depth - 1]) {
			const parent = nodes[parentIdx];

			// Four hidden-edge moves — unchanged.
			for (const { action, neighbor, key } of incidentEdges(parent.x, maze)) {
				const p = edgeProb(parent.belief, key);
				if (p < PRUNE_EPS) continue;

				const stepCost = 1 / p;
				const pathCostSoFar = parent.pathCostSoFar + stepCost;

				const stepIG = expectedInformationGain(parent.belief, maze, neighbor);
				const epistemic = parent.epistemic + stepIG;

				const childBelief = expectedBeliefAfterVisit(parent.belief, maze, neighbor);
				const distToGoal = believedDistanceField(childBelief, maze, goal)[neighbor];
				const energy = beta * (pathCostSoFar + distToGoal);

				candidates.push({
					x: neighbor,
					parent: parentIdx,
					actionFromParent: action,
					pathCostSoFar,
					epistemic,
					belief: childBelief,
					energy
				});
			}

			// Fifth action — stay. Same base timestep cost as a certain move
			// (1/p at p=1), no observation, no belief change. Competes under
			// the identical G as the four real moves; nothing about this is
			// specific to the goal cell.
			{
				const pathCostSoFar = parent.pathCostSoFar + 1;
				const epistemic = parent.epistemic;
				const distToGoal = believedDistanceField(parent.belief, maze, goal)[parent.x];
				const energy = beta * (pathCostSoFar + distToGoal);

				candidates.push({
					x: parent.x,
					parent: parentIdx,
					actionFromParent: STAY_ACTION,
					pathCostSoFar,
					epistemic,
					belief: parent.belief,
					energy
				});
			}
		}

		// Beam selection: keep the best `beamWidth` candidates per destination
		// cell, ranked by the SAME G used everywhere else — not a separate
		// criterion. A width of 1 reduces to the original single-winner DP;
		// wider beams let an informative-but-locally-costlier route survive
		// long enough to prove its value on a later step.
		const byCell = new Map<number, Candidate[]>();
		for (const cand of candidates) {
			const list = byCell.get(cand.x);
			if (list) list.push(cand);
			else byCell.set(cand.x, [cand]);
		}

		const layerIndices: number[] = [];
		for (const list of byCell.values()) {
			list.sort((a, b) => a.energy - a.epistemic - (b.energy - b.epistemic));
			for (const cand of list.slice(0, beamWidth)) {
				nodes.push({
					x: cand.x,
					t: depth,
					parent: cand.parent,
					actionFromParent: cand.actionFromParent,
					pathCostSoFar: cand.pathCostSoFar,
					epistemic: cand.epistemic,
					belief: cand.belief,
					energy: cand.energy
				});
				layerIndices.push(nodes.length - 1);
			}
		}

		layers.push(layerIndices);
		if (layerIndices.length === 0) break;
	}

	return { nodes, layers };
}

function reconstructPath(nodes: BFSNode[], idx: number): { actions: number[]; cells: number[] } {
	const actions: number[] = [];
	const cells: number[] = [];
	let cur = idx;
	while (cur >= 0) {
		cells.push(nodes[cur].x);
		if (nodes[cur].actionFromParent >= 0) actions.push(nodes[cur].actionFromParent);
		cur = nodes[cur].parent;
	}
	actions.reverse();
	cells.reverse();
	return { actions, cells };
}

/**
 * Genuine Gibbs/Boltzmann policy selection over the depth-H frontier. No
 * early-terminal set to merge in: every branch — including ones that stayed
 * throughout — genuinely reached depth H, so the partition function's
 * comparison set is exactly `layers[layers.length - 1]`, nothing more.
 */
export function selectBestPolicy(nodes: BFSNode[], layers: number[][], startX: number): PolicyPath {
	if (layers.length < 2 || layers[1].length === 0) {
		return {
			actions: [],
			cells: [startX],
			score: nodes[0].energy,
			epistemic: 0,
			pragmatic: nodes[0].energy,
			Z: 1
		};
	}

	const deepest = layers[layers.length - 1];

	const minE = Math.min(...deepest.map((idx) => nodes[idx].energy));
	const Z = deepest.reduce((sum, idx) => sum + Math.exp(-(nodes[idx].energy - minE)), 0);
	const logZ = Math.log(Z) + minE;

	let bestIdx = deepest[0];
	let bestScore = Infinity;
	for (const idx of deepest) {
		const pragmatic = nodes[idx].energy + logZ;
		const score = pragmatic - nodes[idx].epistemic;
		if (score < bestScore) {
			bestScore = score;
			bestIdx = idx;
		}
	}

	const { actions, cells } = reconstructPath(nodes, bestIdx);
	const best = nodes[bestIdx];
	const pragmatic = best.energy + logZ;
	return {
		actions,
		cells,
		score: pragmatic - best.epistemic,
		epistemic: best.epistemic,
		pragmatic,
		Z
	};
}

// ── True step ────────────────────────────────────────────────────────────────

export function trueStep(maze: MazeEnv, pos: number, action: number): number {
	if (action === STAY_ACTION) return pos;
	const { row, col } = idToCell(pos, maze.cols);
	const nr = row + DR[action];
	const nc = col + DC[action];
	if (!inBounds(nr, nc, maze.rows, maze.cols) || !maze.passable[pos][action]) return pos;
	return cellId(nr, nc, maze.cols);
}

// ── Rendering ────────────────────────────────────────────────────────────────

export function drawEdgeUncertaintyHeatmap(
	ctx: CanvasRenderingContext2D,
	belief: EdgeBelief,
	maze: MazeEnv
): void {
	const C = RENDER.CELL;
	const maxU = 4 * Math.LN2;
	for (let s = 0; s < maze.n; s++) {
		const { row, col } = idToCell(s, maze.cols);
		const u = Math.min(1, frontierUncertainty(belief, maze, s) / maxU);
		ctx.fillStyle = `rgba(167,139,250,${(u * 0.55).toFixed(3)})`;
		ctx.fillRect(col * C, row * C, C, C);
	}
}

export function drawBelievedWalls(
	ctx: CanvasRenderingContext2D,
	belief: EdgeBelief,
	maze: MazeEnv
): void {
	const C = RENDER.CELL;
	const { rows, cols, n } = maze;
	ctx.lineCap = 'square';

	const drawnEdges = new Set<string>();

	for (let s = 0; s < n; s++) {
		const { row, col } = idToCell(s, cols);
		const x = col * C;
		const y = row * C;

		for (const { action, key } of incidentEdges(s, maze)) {
			if (drawnEdges.has(key)) continue;
			if (action !== 1 && action !== 3) continue;
			drawnEdges.add(key);

			const p = edgeProb(belief, key);
			let x1 = x,
				y1 = y,
				x2 = x,
				y2 = y;
			if (action === 1 && row < rows - 1) {
				x1 = x;
				y1 = y + C;
				x2 = x + C;
				y2 = y + C;
			} else if (action === 3 && col < cols - 1) {
				x1 = x + C;
				y1 = y;
				x2 = x + C;
				y2 = y + C;
			} else {
				continue;
			}

			if (p < PRUNE_EPS) {
				ctx.setLineDash([]);
				ctx.strokeStyle = COLOR.wall;
				ctx.lineWidth = RENDER.WALL_W;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
			} else if (p < 1 - PRUNE_EPS) {
				ctx.setLineDash([3, 3]);
				ctx.strokeStyle = 'rgba(212,212,216,0.45)';
				ctx.lineWidth = 1.25;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
				ctx.setLineDash([]);
			}
		}
	}

	ctx.strokeStyle = COLOR.border;
	ctx.lineWidth = RENDER.BORDER_W;
	const bw = RENDER.BORDER_W / 2;
	ctx.strokeRect(bw, bw, cols * C - RENDER.BORDER_W, rows * C - RENDER.BORDER_W);
}

export function drawExploredOverlay(
	ctx: CanvasRenderingContext2D,
	explored: ReadonlySet<number>,
	maze: MazeEnv
): void {
	const C = RENDER.CELL;
	ctx.fillStyle = 'rgba(6,182,212,0.07)';
	for (const s of explored) {
		const { row, col } = idToCell(s, maze.cols);
		ctx.fillRect(col * C, row * C, C, C);
	}
}

export function drawFrontierCells(
	ctx: CanvasRenderingContext2D,
	explored: ReadonlySet<number>,
	maze: MazeEnv
): void {
	const C = RENDER.CELL;
	const frontier = new Set<number>();
	for (const s of explored) {
		const { row, col } = idToCell(s, maze.cols);
		for (let a = 0; a < 4; a++) {
			const nr = row + DR[a];
			const nc = col + DC[a];
			if (!inBounds(nr, nc, maze.rows, maze.cols)) continue;
			const sp = cellId(nr, nc, maze.cols);
			if (!explored.has(sp)) frontier.add(sp);
		}
	}
	ctx.strokeStyle = 'rgba(244,244,245,0.5)';
	ctx.lineWidth = 1.5;
	ctx.setLineDash([2, 2]);
	for (const s of frontier) {
		const { row, col } = idToCell(s, maze.cols);
		ctx.strokeRect(col * C + 1.5, row * C + 1.5, C - 3, C - 3);
	}
	ctx.setLineDash([]);
}

export function drawPolicyPathPreview(
	ctx: CanvasRenderingContext2D,
	path: PolicyPath,
	maze: MazeEnv
): void {
	if (path.cells.length < 2) return;
	const C = RENDER.CELL;
	ctx.save();
	ctx.strokeStyle = 'rgba(16,185,129,0.85)';
	ctx.lineWidth = 3;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.beginPath();
	for (let i = 0; i < path.cells.length; i++) {
		const { row, col } = idToCell(path.cells[i], maze.cols);
		const x = col * C + C / 2;
		const y = row * C + C / 2;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
	ctx.restore();
}

export function drawHorizonTree(
	ctx: CanvasRenderingContext2D,
	nodes: BFSNode[],
	horizon: number,
	maze: MazeEnv
): void {
	const C = RENDER.CELL;

	for (const node of nodes) {
		if (node.t === 0) continue;
		const parent = nodes[node.parent];
		if (!parent) continue;

		const { row: pr, col: pc } = idToCell(parent.x, maze.cols);
		const { row: cr, col: cc } = idToCell(node.x, maze.cols);

		const alpha = 0.25 + 0.5 * (1 - node.t / Math.max(1, horizon));
		ctx.strokeStyle = `rgba(6,182,212,${alpha.toFixed(2)})`;
		ctx.beginPath();
		ctx.moveTo(pc * C + C / 2, pr * C + C / 2);
		ctx.lineTo(cc * C + C / 2, cr * C + C / 2);
		ctx.stroke();
	}

	for (const node of nodes) {
		const { row, col } = idToCell(node.x, maze.cols);
		const x = col * C + C / 2;
		const y = row * C + C / 2;
		const alpha = 0.3 + 0.6 * (1 - node.t / Math.max(1, horizon));

		if (node.t === 0) {
			ctx.fillStyle = `rgba(6,182,212,${(alpha * 0.9).toFixed(2)})`;
			ctx.beginPath();
			ctx.arc(x, y, C * 0.15, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.fillStyle = `rgba(6,122,212,${alpha.toFixed(2)})`;
			ctx.beginPath();
			ctx.arc(x, y, C * 0.1, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
