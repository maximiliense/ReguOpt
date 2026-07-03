/**
 * Maze simulation engine for Active Inference demonstrations.
 *
 * Grid layout:  state s = row * cols + col
 * Actions:      0 = UP (↑)   1 = DOWN (↓)   2 = LEFT (←)   3 = RIGHT (→)
 *
 * Generative model matrices (discrete POMDP):
 *   A[o][s]      — likelihood   P(o | s)           shape: n_obs × n_states
 *   B[s'][s][a]  — transition   P(s' | s, a)       shape: n × n × 4
 *   C[o]         — log-prefs    log p*(o)           shape: n_obs
 */

// ── Direction constants ──────────────────────────────────────────────────────

export const DIR_UP = 0;
export const DIR_DOWN = 1;
export const DIR_LEFT = 2;
export const DIR_RIGHT = 3;

/** Row delta for each action index. */
export const DR = [-1, 1, 0, 0] as const;
/** Column delta for each action index. */
export const DC = [0, 0, -1, 1] as const;
/** Opposite direction index. */
export const OPPOSITE = [1, 0, 3, 2] as const;

export const ACTION_SYMBOL = ['↑', '↓', '←', '→'] as const;
export const ACTION_NAME = ['Nord', 'Sud', 'Ouest', 'Est'] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface Cell {
	row: number;
	col: number;
}

export interface MazeEnv {
	rows: number;
	cols: number;
	/** Total number of cells = rows × cols. */
	n: number;
	/**
	 * passable[state][action] = true if the agent can move in that direction.
	 * Border walls and internal walls are both encoded here.
	 */
	passable: boolean[][];
	startState: number;
	goalState: number;
}

// ── Grid helpers ─────────────────────────────────────────────────────────────

export function cellId(row: number, col: number, cols: number): number {
	return row * cols + col;
}

export function idToCell(id: number, cols: number): Cell {
	return { row: Math.floor(id / cols), col: id % cols };
}

export function inBounds(row: number, col: number, rows: number, cols: number): boolean {
	return row >= 0 && row < rows && col >= 0 && col < cols;
}

// ── Seeded PRNG (LCG) ────────────────────────────────────────────────────────

function makePRNG(seed: number) {
	let s = seed >>> 0;
	return () => {
		// Knuth's multiplicative hash
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 0x100000000;
	};
}

// ── Maze generation (DFS backtracking) ───────────────────────────────────────

/**
 * Generate a *perfect* maze (spanning tree, exactly one path between any two
 * cells) using iterative DFS with a fixed seed for full determinism.
 *
 * Start = top-left (0,0), Goal = bottom-right (rows-1, cols-1).
 */
export function generateMaze(rows: number, cols: number, seed = 42): MazeEnv {
	const n = rows * cols;
	// All directions blocked initially (no passages)
	const passable: boolean[][] = Array.from({ length: n }, () => [false, false, false, false]);
	const visited = new Uint8Array(n);
	const rng = makePRNG(seed);

	function shuffle(arr: number[]) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			const tmp = arr[i];
			arr[i] = arr[j];
			arr[j] = tmp;
		}
	}

	// Iterative DFS
	const stack = [0];
	visited[0] = 1;

	while (stack.length > 0) {
		const s = stack[stack.length - 1];
		const { row, col } = idToCell(s, cols);
		const dirs = [0, 1, 2, 3];
		shuffle(dirs);

		let carved = false;
		for (const d of dirs) {
			const nr = row + DR[d];
			const nc = col + DC[d];
			if (!inBounds(nr, nc, rows, cols)) continue;
			const sp = cellId(nr, nc, cols);
			if (visited[sp]) continue;

			// Carve passage in both directions
			passable[s][d] = true;
			passable[sp][OPPOSITE[d]] = true;
			visited[sp] = 1;
			stack.push(sp);
			carved = true;
			break; // one step at a time (DFS)
		}

		if (!carved) stack.pop();
	}

	return { rows, cols, n, passable, startState: 0, goalState: n - 1 };
}

// ── BFS distances ─────────────────────────────────────────────────────────────

/**
 * Compute shortest-path distances from every cell to `goalState` via BFS.
 * Returns dist[s] = number of steps on the optimal path from s to goal.
 * Unreachable cells (shouldn't happen in a perfect maze) get Infinity.
 */
export function bfsDistances(maze: MazeEnv, goalState: number): Float32Array {
	const { n, rows, cols, passable } = maze;
	const dist = new Float32Array(n).fill(Infinity);
	dist[goalState] = 0;
	const queue: number[] = [goalState];

	while (queue.length > 0) {
		const s = queue.shift()!;
		const { row, col } = idToCell(s, cols);
		for (let a = 0; a < 4; a++) {
			const nr = row + DR[a];
			const nc = col + DC[a];
			if (!inBounds(nr, nc, rows, cols)) continue;
			const sp = cellId(nr, nc, cols);
			if (!passable[s][a]) continue;
			if (dist[sp] < Infinity) continue;
			dist[sp] = dist[s] + 1;
			queue.push(sp);
		}
	}

	return dist;
}

// ── Generative model constructors ─────────────────────────────────────────────

/**
 * Build the transition matrix B[s'][s][a] = P(s' | s, a).
 *
 * In a deterministic maze:
 *   - If action a is passable from s → B[next(s,a)][s][a] = 1
 *   - If blocked (wall or border)    → B[s][s][a] = 1  (agent stays)
 */
export function buildBMatrix(maze: MazeEnv): number[][][] {
	const { rows, cols, n, passable } = maze;
	const B: number[][][] = Array.from({ length: n }, () =>
		Array.from({ length: n }, () => new Array<number>(4).fill(0))
	);

	for (let s = 0; s < n; s++) {
		const { row, col } = idToCell(s, cols);
		for (let a = 0; a < 4; a++) {
			const nr = row + DR[a];
			const nc = col + DC[a];
			if (!inBounds(nr, nc, rows, cols) || !passable[s][a]) {
				B[s][s][a] = 1; // bounce back
			} else {
				B[cellId(nr, nc, cols)][s][a] = 1;
			}
		}
	}

	return B;
}

/**
 * **Identity likelihood** A[o][s] = δ(o, s).
 *
 * Perfect observation: the agent receives the exact current state as
 * observation.  Beliefs collapse to a point mass after each update.
 * Used for `maze-simple`.
 */
export function buildAIdentity(n: number): number[][] {
	return Array.from({ length: n }, (_, o) =>
		Array.from({ length: n }, (_, s) => (o === s ? 1.0 : 0.0))
	);
}

/**
 * **Gaussian likelihood** for `maze-fog`.
 *
 * A[o][s] ∝ exp(−‖pos(o) − pos(s)‖² / 2σ²)
 *
 * Each *column* s is normalised so Σ_o A[o][s] = 1.
 * With σ ≈ 1.2 the agent receives a blurry position signal:
 * it knows roughly where it is but has uncertainty over 3–5 cells.
 */
export function buildAFog(rows: number, cols: number, sigma = 1.2): number[][] {
	const n = rows * cols;
	const sigma2 = sigma * sigma;

	const A: number[][] = Array.from({ length: n }, (_, o) => {
		const { row: or, col: oc } = idToCell(o, cols);
		return Array.from({ length: n }, (_, s) => {
			const { row: sr, col: sc } = idToCell(s, cols);
			const d2 = (or - sr) ** 2 + (oc - sc) ** 2;
			return Math.exp(-d2 / (2 * sigma2));
		});
	});

	// Normalise columns
	for (let s = 0; s < n; s++) {
		const colSum = A.reduce((acc, row) => acc + row[s], 0);
		if (colSum > 0)
			A.forEach((row) => {
				row[s] /= colSum;
			});
	}

	return A;
}

/**
 * **Gaussian likelihood using BFS (maze-topology) distance** for `maze-fog`.
 *
 * A[o][s] ∝ exp(−bfsDist(o, s)² / 2σ²), column-normalised.
 *
 * Unlike `buildAFog` (Euclidean), BFS distance respects maze walls:
 * cells separated by a wall have large BFS distance → near-zero likelihood.
 * This means:
 *   • The belief blob spreads through corridors, never through walls.
 *   • EFE-based action selection is wall-aware without special casing.
 *   • Hitting a wall correctly reduces belief mass on states where
 *     that move would have been passable.
 *
 * σ is in maze-step units.  σ ≈ 3–5 covers several corridors while
 * remaining informative enough for reliable navigation.
 */
export function buildAFogBFS(maze: MazeEnv, sigma: number): number[][] {
	const { n } = maze;
	const sigma2 = sigma * sigma;

	// Precompute BFS distances from every cell (O(n²) total, fast for n ≤ 49).
	// fromCell[s][o] = shortest-path distance from s to o in the maze.
	const fromCell: Float32Array[] = Array.from({ length: n }, (_, s) => bfsDistances(maze, s));

	const A: number[][] = Array.from({ length: n }, (_, o) =>
		Array.from({ length: n }, (_, s) => {
			const d = fromCell[s][o];
			return isFinite(d) ? Math.exp(-(d * d) / (2 * sigma2)) : 0;
		})
	);

	// Column-normalise: Σ_o A[o][s] = 1 for each state s.
	for (let s = 0; s < n; s++) {
		let colSum = 0;
		for (let o = 0; o < n; o++) colSum += A[o][s];
		if (colSum > 0) {
			for (let o = 0; o < n; o++) A[o][s] /= colSum;
		}
	}

	return A;
}

/**
 * Builds an ambiguous observation matrix A[o][s] where observations are not perfectly
 * correlated with the true state. This introduces ambiguity based on a noise level.
 *
 * @param maze The maze environment
 * @param noiseLevel The level of noise/ambiguity to introduce
 * @returns The ambiguous observation matrix
 */
export function buildAAmbiguous(maze: MazeEnv, noiseLevel: number): number[][] {
	const { n } = maze;
	const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

	// For each state, create a probability distribution over observations
	for (let s = 0; s < n; s++) {
		// The true observation has the highest probability
		A[s][s] = 1 - noiseLevel;

		// Distribute the remaining probability mass to other states
		const remainingProb = noiseLevel;
		const otherStates = Array.from({ length: n }, (_, i) => i).filter((i) => i !== s);
		const probPerOtherState = remainingProb / otherStates.length;

		for (const o of otherStates) {
			A[o][s] = probPerOtherState;
		}
	}

	return A;
}

/**
 * **Preference vector** C[o] derived from BFS distances.
 *
 * C[o] = goalPref × (1 − dist[o] / maxDist)
 *
 * This encodes a smooth gradient: observations near the goal are
 * preferred.  With 1-step EFE, the agent follows the gradient and
 * always picks the action that reduces its distance to the goal —
 * equivalent to optimal shortest-path following.
 */
export function buildCFromBFS(dists: Float32Array, goalPref = 5.0): number[] {
	const finite = Array.from(dists).filter(isFinite);
	const maxDist = finite.length > 0 ? Math.max(...finite) : 1;
	return Array.from(dists, (d) => (isFinite(d) ? goalPref * (1 - d / maxDist) : 0));
}

// ── Environment step ──────────────────────────────────────────────────────────

/**
 * Apply action `a` to the real environment at `state`.
 * Returns the new true state (same as `state` if blocked).
 */
export function applyAction(maze: MazeEnv, state: number, action: number): number {
	const { row, col } = idToCell(state, maze.cols);
	const nr = row + DR[action];
	const nc = col + DC[action];
	if (!inBounds(nr, nc, maze.rows, maze.cols) || !maze.passable[state][action]) {
		return state;
	}
	return cellId(nr, nc, maze.cols);
}

/**
 * Return the most-likely observation given true state (argmax of A column).
 * For the identity A matrix this is always `trueState` itself.
 */
export function mostLikelyObs(A: number[][], trueState: number): number {
	let bestO = 0;
	let bestP = -Infinity;
	for (let o = 0; o < A.length; o++) {
		if (A[o][trueState] > bestP) {
			bestP = A[o][trueState];
			bestO = o;
		}
	}
	return bestO;
}

/**
 * Sample a random observation from A[·][trueState].
 * Used in fog mode to introduce genuine stochasticity.
 */
export function sampleObs(A: number[][], trueState: number): number {
	const u = Math.random();
	let cum = 0;
	for (let o = 0; o < A.length; o++) {
		cum += A[o][trueState];
		if (u < cum) return o;
	}
	return A.length - 1;
}

// ── Canvas rendering helpers ──────────────────────────────────────────────────

export const RENDER = {
	CELL: 48,
	WALL_W: 2,
	BORDER_W: 3,
	AGENT_R: 0.28 // fraction of CELL
} as const;

/** Colour palette (matches app.css design tokens). */
export const COLOR = {
	bg: '#09090b',
	surface: '#18181b',
	wall: '#d4d4d8',
	border: '#f4f4f5',
	goal: '#fbbf24',
	agent: '#06b6d4',
	trail: 'rgba(6, 182, 212, 0.12)',
	fog: 'rgba(9, 9, 11, 0.82)',
	belief: '#06b6d4',
	epistemic: '#a78bfa',
	positive: '#10b981'
} as const;

/** Return (x, y) pixel centre of a cell. */
export function cellCenter(s: number, cols: number): { x: number; y: number } {
	const { row, col } = idToCell(s, cols);
	const C = RENDER.CELL;
	return { x: col * C + C / 2, y: row * C + C / 2 };
}

/**
 * Draw maze walls onto a canvas context.
 * Call once per frame (after clearing).
 *
 * We draw internal walls as south/east edges to avoid double-drawing.
 * The outer border is drawn last with a heavier stroke.
 */
export function drawMazeWalls(ctx: CanvasRenderingContext2D, maze: MazeEnv): void {
	const { rows, cols, n, passable } = maze;
	const C = RENDER.CELL;

	ctx.lineCap = 'square';

	// Internal walls
	ctx.strokeStyle = COLOR.wall;
	ctx.lineWidth = RENDER.WALL_W;

	for (let s = 0; s < n; s++) {
		const { row, col } = idToCell(s, cols);
		const x = col * C;
		const y = row * C;

		// South internal wall
		if (row < rows - 1 && !passable[s][DIR_DOWN]) {
			ctx.beginPath();
			ctx.moveTo(x, y + C);
			ctx.lineTo(x + C, y + C);
			ctx.stroke();
		}
		// East internal wall
		if (col < cols - 1 && !passable[s][DIR_RIGHT]) {
			ctx.beginPath();
			ctx.moveTo(x + C, y);
			ctx.lineTo(x + C, y + C);
			ctx.stroke();
		}
	}

	// Outer border
	ctx.strokeStyle = COLOR.border;
	ctx.lineWidth = RENDER.BORDER_W;
	const bw = RENDER.BORDER_W / 2;
	ctx.strokeRect(bw, bw, cols * C - RENDER.BORDER_W, rows * C - RENDER.BORDER_W);
}

/** Fill cell backgrounds for a value heatmap (0–1 per cell → colour). */
export function drawHeatmap(
	ctx: CanvasRenderingContext2D,
	values: number[],
	cols: number,
	/** Map a normalised value in [0,1] to a CSS color string. */
	colorFn: (v: number) => string
): void {
	const C = RENDER.CELL;
	for (let s = 0; s < values.length; s++) {
		const { row, col } = idToCell(s, cols);
		ctx.fillStyle = colorFn(values[s]);
		ctx.fillRect(col * C, row * C, C, C);
	}
}

/** Draw the start marker (S). */
export function drawStart(ctx: CanvasRenderingContext2D, startState: number, cols: number): void {
	const C = RENDER.CELL;
	const { x, y } = cellCenter(startState, cols);
	ctx.fillStyle = '#f4f4f5';
	ctx.font = `bold ${C * 0.3}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('S', x, y);
}

/** Draw the goal marker (★). */
export function drawGoal(ctx: CanvasRenderingContext2D, goalState: number, cols: number): void {
	const C = RENDER.CELL;
	const { row, col } = idToCell(goalState, cols);
	const { x, y } = cellCenter(goalState, cols);

	ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
	ctx.fillRect(col * C, row * C, C, C);

	ctx.fillStyle = COLOR.goal;
	ctx.font = `${C * 0.42}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('★', x, y);
}

/** Draw the agent circle with a cyan glow. */
export function drawAgent(ctx: CanvasRenderingContext2D, state: number, cols: number): void {
	const C = RENDER.CELL;
	const { x, y } = cellCenter(state, cols);
	const r = C * RENDER.AGENT_R;

	ctx.save();
	ctx.shadowColor = COLOR.agent;
	ctx.shadowBlur = 12;
	ctx.fillStyle = COLOR.agent;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/** Draw the trail of visited states. */
export function drawTrail(ctx: CanvasRenderingContext2D, trail: number[], cols: number): void {
	const C = RENDER.CELL;
	ctx.fillStyle = COLOR.trail;
	for (const s of trail) {
		const { row, col } = idToCell(s, cols);
		ctx.fillRect(col * C, row * C, C, C);
	}
}

/** Draw fog overlay: dim cells with opacity = fogLevels[s] ∈ [0, 1]. */
export function drawFog(
	ctx: CanvasRenderingContext2D,
	fogLevels: Float32Array | number[],
	cols: number
): void {
	const C = RENDER.CELL;
	for (let s = 0; s < fogLevels.length; s++) {
		const alpha = fogLevels[s];
		if (alpha < 0.01) continue;
		const { row, col } = idToCell(s, cols);
		ctx.fillStyle = `rgba(9, 9, 11, ${alpha.toFixed(2)})`;
		ctx.fillRect(col * C, row * C, C, C);
	}
}

// ── Colour interpolation helpers ─────────────────────────────────────────────

/**
 * Value-map colour: dark navy → teal/green gradient.
 * v ∈ [0, 1] where 1 = goal (highest preference).
 */
export function valueColor(v: number): string {
	// 0 → dark surface; 1 → bright positive green
	const r = Math.round(v * 16);
	const g = Math.round(8 + v * 177);
	const b = Math.round(12 + v * 117);
	return `rgb(${r},${g},${b})`;
}

/**
 * Belief-map colour: dark → cyan.
 * v ∈ [0, 1] where 1 = max belief.
 */
export function beliefColor(v: number): string {
	// 0 → surface; 1 → agent cyan
	const r = Math.round(v * 6);
	const g = Math.round(v * 182);
	const b = Math.round(v * 212);
	return `rgb(${r},${g},${b})`;
}

// ── EFE arrow overlay ─────────────────────────────────────────────────────────

/**
 * Draw an arrow inside cell `state` pointing in direction `action`.
 */
export function drawActionArrow(
	ctx: CanvasRenderingContext2D,
	state: number,
	action: number,
	cols: number,
	alpha = 1
): void {
	const C = RENDER.CELL;
	const { x, y } = cellCenter(state, cols);
	const len = C * 0.28;

	const angle = [
		-Math.PI / 2, // UP
		Math.PI / 2, // DOWN
		Math.PI, // LEFT
		0 // RIGHT
	][action];

	const tx = x + len * Math.cos(angle);
	const ty = y + len * Math.sin(angle);

	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = COLOR.agent;
	ctx.fillStyle = COLOR.agent;
	ctx.lineWidth = 2;

	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(tx, ty);
	ctx.stroke();

	// Arrowhead
	const hw = 4;
	ctx.beginPath();
	ctx.moveTo(tx, ty);
	ctx.lineTo(tx - hw * Math.cos(angle - 0.5), ty - hw * Math.sin(angle - 0.5));
	ctx.lineTo(tx - hw * Math.cos(angle + 0.5), ty - hw * Math.sin(angle + 0.5));
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}
