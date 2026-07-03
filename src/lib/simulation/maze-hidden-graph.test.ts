import { describe, it, expect } from 'vitest';
import { generateMaze } from './maze.js';
import {
	edgeKey,
	incidentEdges,
	initEdgeBelief,
	edgeProb,
	edgeEntropy,
	edgeEntropyOf,
	observeEdge,
	observeLocalNeighborhood,
	totalEdgeEntropy,
	allEdgeKeys,
	frontierUncertainty,
	believedDistanceField,
	believedDistance,
	bfsHorizonExpand,
	selectBestPolicy,
	trueStep,
	PRUNE_EPS,
	STAY_ACTION
} from './maze-hidden-graph.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function smallMaze() {
	return generateMaze(3, 3, 42);
}

function tinyMaze() {
	return generateMaze(2, 2, 42);
}

// ─────────────────────────────────────────────────────────────────────────────
// edgeKey
// ─────────────────────────────────────────────────────────────────────────────

describe('edgeKey', () => {
	it('returns null for out-of-bounds actions', () => {
		const maze = smallMaze();
		// Cell 0 is at (0,0). UP (0) and LEFT (2) go out of bounds.
		expect(edgeKey(0, 0, maze)).toBeNull(); // UP
		expect(edgeKey(0, 2, maze)).toBeNull(); // LEFT
	});

	it('produces the same canonical key for opposite directions', () => {
		const maze = smallMaze();
		// Cell 0 (0,0) RIGHT -> cell 1 (0,1)
		// Cell 1 (0,1) LEFT  -> cell 0 (0,0)
		const keyA = edgeKey(0, 3, maze); // from 0, RIGHT
		const keyB = edgeKey(1, 2, maze); // from 1, LEFT
		expect(keyA).not.toBeNull();
		expect(keyA).toBe(keyB);
	});

	it('key format is "lo_hi" with lo < hi', () => {
		const maze = smallMaze();
		const key = edgeKey(0, 3, maze);
		expect(key).not.toBeNull();
		const [lo, hi] = key!.split('_').map(Number);
		expect(lo).toBeLessThan(hi);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// incidentEdges
// ─────────────────────────────────────────────────────────────────────────────

describe('incidentEdges', () => {
	it('returns 2 edges for a corner cell', () => {
		const maze = smallMaze();
		const edges = incidentEdges(0, maze); // (0,0) corner
		expect(edges).toHaveLength(2);
	});

	it('returns 4 edges for an interior cell', () => {
		const maze = smallMaze();
		const edges = incidentEdges(4, maze); // (1,1) center of 3x3
		expect(edges).toHaveLength(4);
	});

	it('each edge contains valid action, neighbor, and key', () => {
		const maze = smallMaze();
		for (const e of incidentEdges(4, maze)) {
			expect(e.action).toBeGreaterThanOrEqual(0);
			expect(e.action).toBeLessThanOrEqual(3);
			expect(e.neighbor).toBeGreaterThanOrEqual(0);
			expect(e.neighbor).toBeLessThan(maze.n);
			expect(typeof e.key).toBe('string');
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// initEdgeBelief
// ─────────────────────────────────────────────────────────────────────────────

describe('initEdgeBelief', () => {
	it('returns empty alpha and beta maps', () => {
		const b = initEdgeBelief();
		expect(b.alpha.size).toBe(0);
		expect(b.beta.size).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// edgeProb
// ─────────────────────────────────────────────────────────────────────────────

describe('edgeProb', () => {
	it('defaults to 0.5 (uniform prior) for an unseen edge', () => {
		const b = initEdgeBelief();
		expect(edgeProb(b, '0_1')).toBeCloseTo(0.5, 10);
	});

	it('returns updated probability after observing open', () => {
		let b = initEdgeBelief();
		b = observeEdge(b, '0_1', true);
		expect(edgeProb(b, '0_1')).toBeGreaterThan(0.5);
	});

	it('returns updated probability after observing closed', () => {
		let b = initEdgeBelief();
		b = observeEdge(b, '0_1', false);
		expect(edgeProb(b, '0_1')).toBeLessThan(0.5);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// edgeEntropy
// ─────────────────────────────────────────────────────────────────────────────

describe('edgeEntropy', () => {
	it('is zero for deterministic probabilities (p=0 or p=1)', () => {
		expect(edgeEntropy(0)).toBeCloseTo(0, 12);
		expect(edgeEntropy(1)).toBeCloseTo(0, 12);
	});

	it('is maximal at p=0.5 and equals ln(2)', () => {
		expect(edgeEntropy(0.5)).toBeCloseTo(Math.LN2, 10);
	});

	it('is symmetric around p=0.5', () => {
		expect(edgeEntropy(0.2)).toBeCloseTo(edgeEntropy(0.8), 12);
		expect(edgeEntropy(0.1)).toBeCloseTo(edgeEntropy(0.9), 12);
	});

	it('is non-negative for all valid probabilities', () => {
		for (let i = 0; i <= 100; i++) {
			const p = i / 100;
			expect(edgeEntropy(p)).toBeGreaterThanOrEqual(0);
		}
	});

	it('handles near-zero probabilities without NaN', () => {
		const result = edgeEntropy(1e-15);
		expect(isNaN(result)).toBe(false);
		expect(isFinite(result)).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// edgeEntropyOf
// ─────────────────────────────────────────────────────────────────────────────

describe('edgeEntropyOf', () => {
	it('matches edgeEntropy(edgeProb(belief, key))', () => {
		const b = initEdgeBelief();
		const key = '0_1';
		const h1 = edgeEntropyOf(b, key);
		const h2 = edgeEntropy(edgeProb(b, key));
		expect(h1).toBeCloseTo(h2, 12);
	});

	it('returns max entropy for unseen edge', () => {
		const b = initEdgeBelief();
		expect(edgeEntropyOf(b, '0_1')).toBeCloseTo(Math.LN2, 10);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// observeEdge
// ─────────────────────────────────────────────────────────────────────────────

describe('observeEdge', () => {
	it('observing open increases alpha', () => {
		let b = initEdgeBelief();
		b = observeEdge(b, '0_1', true);
		expect(b.alpha.get('0_1')).toBeGreaterThan(1);
		expect(b.beta.get('0_1')).toBe(1);
	});

	it('observing closed increases beta', () => {
		let b = initEdgeBelief();
		b = observeEdge(b, '0_1', false);
		expect(b.alpha.get('0_1')).toBe(1);
		expect(b.beta.get('0_1')).toBeGreaterThan(1);
	});

	it('repeated open observations drive probability toward 1', () => {
		let b = initEdgeBelief();
		for (let i = 0; i < 10; i++) {
			b = observeEdge(b, '0_1', true);
		}
		expect(edgeProb(b, '0_1')).toBeGreaterThan(0.99);
	});

	it('repeated closed observations drive probability toward 0', () => {
		let b = initEdgeBelief();
		for (let i = 0; i < 10; i++) {
			b = observeEdge(b, '0_1', false);
		}
		expect(edgeProb(b, '0_1')).toBeLessThan(0.01);
	});

	it('returns a new belief object without mutating the original', () => {
		const b1 = initEdgeBelief();
		const b2 = observeEdge(b1, '0_1', true);
		expect(b1.alpha.size).toBe(0);
		expect(b2.alpha.size).toBe(1);
	});

	it('a single observation of a closed edge drives p below PRUNE_EPS', () => {
		let b = initEdgeBelief();
		b = observeEdge(b, '0_1', false);
		expect(edgeProb(b, '0_1')).toBeLessThan(PRUNE_EPS);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// observeLocalNeighborhood
// ─────────────────────────────────────────────────────────────────────────────

describe('observeLocalNeighborhood', () => {
	it('touches all incident edges of the current cell', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { touched } = observeLocalNeighborhood(b, maze, 4);
		expect(touched).toHaveLength(4);
	});

	it('returns updated belief with all edges observed', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { belief } = observeLocalNeighborhood(b, maze, 4);
		for (const k of allEdgeKeys(maze)) {
			const p = edgeProb(belief, k);
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThanOrEqual(1);
		}
	});

	it('corner cell produces 2 touched edges', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { touched } = observeLocalNeighborhood(b, maze, 0);
		expect(touched).toHaveLength(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// totalEdgeEntropy
// ─────────────────────────────────────────────────────────────────────────────

describe('totalEdgeEntropy', () => {
	it('equals sum of individual edge entropies', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const keys = allEdgeKeys(maze);
		let sum = 0;
		for (const k of keys) sum += edgeEntropyOf(b, k);
		expect(totalEdgeEntropy(b, keys)).toBeCloseTo(sum, 12);
	});

	it('starts at maximum for a fresh belief', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const keys = allEdgeKeys(maze);
		const expected = keys.length * Math.LN2;
		expect(totalEdgeEntropy(b, keys)).toBeCloseTo(expected, 10);
	});

	it('decreases after observing edges', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const keys = allEdgeKeys(maze);
		const before = totalEdgeEntropy(b, keys);
		const { belief } = observeLocalNeighborhood(b, maze, maze.startState);
		const after = totalEdgeEntropy(belief, keys);
		expect(after).toBeLessThan(before);
	});

	it('is zero for an empty key list', () => {
		const b = initEdgeBelief();
		expect(totalEdgeEntropy(b, [])).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// allEdgeKeys
// ─────────────────────────────────────────────────────────────────────────────

describe('allEdgeKeys', () => {
	it('returns unique keys', () => {
		const maze = smallMaze();
		const keys = allEdgeKeys(maze);
		expect(keys).toHaveLength(new Set(keys).size);
	});

	it('all keys have lo_hi format with lo < hi', () => {
		const maze = smallMaze();
		for (const k of allEdgeKeys(maze)) {
			const parts = k.split('_').map(Number);
			expect(parts).toHaveLength(2);
			expect(parts[0]).toBeLessThan(parts[1]);
		}
	});

	it('edge count matches internal adjacencies for a 2x2 maze', () => {
		// 2x2 grid has 4 internal edges: (0,1), (2,3), (0,2), (1,3)
		const maze = tinyMaze();
		const keys = allEdgeKeys(maze);
		expect(keys.length).toBe(4);
	});

	it('edge count is consistent for a 3x3 maze', () => {
		// 3x3: 3*2 horizontal + 3*2 vertical = 12
		const maze = smallMaze();
		const keys = allEdgeKeys(maze);
		expect(keys.length).toBe(12);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// frontierUncertainty
// ─────────────────────────────────────────────────────────────────────────────

describe('frontierUncertainty', () => {
	it('approaches 0 when edges are observed many times', () => {
		const maze = smallMaze();
		let b = initEdgeBelief();
		// Repeatedly observe all edges incident to cell 4 to drive their entropy near 0.
		// Each observation adds OBS_WEIGHT pseudo-counts, pushing p toward 0 or 1.
		for (let i = 0; i < 10; i++) {
			const result = observeLocalNeighborhood(b, maze, 4);
			b = result.belief;
		}
		const u = frontierUncertainty(b, maze, 4);
		// After 10 rounds each edge has p ≈ 1 or p ≈ 0, so entropy ≈ 0
		expect(u).toBeLessThan(0.1);
	});

	it('returns max entropy for unobserved interior cell', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		// Cell 4 (center) has 4 edges, each at p=0.5, so U = 4*ln(2)
		const u = frontierUncertainty(b, maze, 4);
		expect(u).toBeCloseTo(4 * Math.LN2, 10);
	});

	it('corner cell has lower max uncertainty than center', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const cornerU = frontierUncertainty(b, maze, 0); // 2 edges
		const centerU = frontierUncertainty(b, maze, 4); // 4 edges
		expect(cornerU).toBeCloseTo(2 * Math.LN2, 10);
		expect(centerU).toBeCloseTo(4 * Math.LN2, 10);
		expect(cornerU).toBeLessThan(centerU);
	});

	it('is non-negative', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		for (let s = 0; s < maze.n; s++) {
			expect(frontierUncertainty(b, maze, s)).toBeGreaterThanOrEqual(0);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// believedDistanceField
// ─────────────────────────────────────────────────────────────────────────────

describe('believedDistanceField', () => {
	it('returns distance 0 at the source', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const dist = believedDistanceField(b, maze, 0);
		expect(dist[0]).toBe(0);
	});

	it('all distances are non-negative', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const dist = believedDistanceField(b, maze, 0);
		for (let i = 0; i < maze.n; i++) {
			expect(dist[i]).toBeGreaterThanOrEqual(0);
		}
	});

	it('distance is 1/p per edge when all edges are at prior', () => {
		const maze = tinyMaze();
		const b = initEdgeBelief();
		// With all p=0.5, each edge costs 1/0.5 = 2
		const dist = believedDistanceField(b, maze, 0);
		// Cell 0 to cell 0 is 0
		expect(dist[0]).toBe(0);
		// Neighbors of 0 are reachable at cost 2
		for (const { neighbor } of incidentEdges(0, maze)) {
			expect(dist[neighbor]).toBeCloseTo(2, 6);
		}
	});

	it('unreachable cells remain at Infinity when boxed in', () => {
		const maze = tinyMaze();
		let b = initEdgeBelief();
		// Manually set every edge incident to cell 0 as closed (confirmed wall)
		for (const { key } of incidentEdges(0, maze)) {
			b = observeEdge(b, key, false);
		}

		const dist = believedDistanceField(b, maze, 0);
		expect(dist[0]).toBe(0);
		// Neighbors are unreachable since all incident edges from 0 are confirmed walls
		for (const { neighbor } of incidentEdges(0, maze)) {
			expect(dist[neighbor]).toBe(Infinity);
		}
	});

	it('returns Float64Array of correct length', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const dist = believedDistanceField(b, maze, 0);
		expect(dist).toBeInstanceOf(Float64Array);
		expect(dist.length).toBe(maze.n);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// believedDistance
// ─────────────────────────────────────────────────────────────────────────────

describe('believedDistance', () => {
	it('distance from a cell to itself is 0', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		expect(believedDistance(b, maze, 0, 0)).toBe(0);
	});

	it('matches believedDistanceField result', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const field = believedDistanceField(b, maze, maze.goalState);
		expect(believedDistance(b, maze, 0, maze.goalState)).toBeCloseTo(field[0], 12);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// bfsHorizonExpand
// ─────────────────────────────────────────────────────────────────────────────

describe('bfsHorizonExpand', () => {
	it('returns at least one node (the root)', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		expect(nodes.length).toBeGreaterThan(0);
	});

	it('root node is at depth 0', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		expect(nodes[0].x).toBe(0);
		expect(nodes[0].t).toBe(0);
		expect(nodes[0].parent).toBe(-1);
	});

	it('layers include the root layer', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		expect(layers[0]).toContain(0);
	});

	it('expands up to the given horizon depth', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 5);
		// Should have layers 0..5 (6 layers) unless boxed in earlier
		expect(layers.length).toBeLessThanOrEqual(6);
		expect(layers.length).toBeGreaterThan(1);
	});

	it('fills horizon with stays when fully boxed in', () => {
		const maze = tinyMaze();
		let b = initEdgeBelief();
		// Manually close every edge incident to the start cell
		for (const { key } of incidentEdges(0, maze)) {
			b = observeEdge(b, key, false);
		}
		const { nodes, layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 10);
		// Root layer + one stay-node per horizon step
		expect(layers.length).toBe(11);
		for (let d = 1; d < layers.length; d++) {
			expect(nodes[layers[d][0]].actionFromParent).toBe(STAY_ACTION);
		}
	});

	it('each non-root node has a valid parent', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		for (let i = 1; i < nodes.length; i++) {
			expect(nodes[i].parent).toBeGreaterThanOrEqual(0);
			expect(nodes[i].parent).toBeLessThan(i);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// selectBestPolicy
// ─────────────────────────────────────────────────────────────────────────────

describe('selectBestPolicy', () => {
	it('returns a policy with cells starting at startX', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes, layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		const policy = selectBestPolicy(nodes, layers, 0);
		expect(policy.cells[0]).toBe(0);
	});

	it('returns stay actions when boxed in', () => {
		const maze = tinyMaze();
		let b = initEdgeBelief();
		for (const { key } of incidentEdges(0, maze)) {
			b = observeEdge(b, key, false);
		}
		const { nodes, layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 10);
		const policy = selectBestPolicy(nodes, layers, 0);
		// When boxed in the policy issues stays through the horizon.
		expect(policy.actions.length).toBeGreaterThan(0);
		for (const a of policy.actions) {
			expect(a).toBe(STAY_ACTION);
		}
	});

	it('actions and cells arrays have consistent lengths', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes, layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		const policy = selectBestPolicy(nodes, layers, 0);
		expect(policy.cells.length).toBe(policy.actions.length + 1);
	});

	it('score reflects pragmatic cost minus epistemic gain', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes, layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		const policy = selectBestPolicy(nodes, layers, 0);
		expect(policy.pragmatic).toBeGreaterThan(0);
		expect(policy.epistemic).toBeGreaterThanOrEqual(0);
		expect(policy.score).toBeCloseTo(policy.pragmatic - policy.epistemic, 8);
	});

	it('returns valid action indices (0-4, including STAY)', () => {
		const maze = smallMaze();
		const b = initEdgeBelief();
		const { nodes, layers } = bfsHorizonExpand(b, maze, 0, maze.goalState, 3);
		const policy = selectBestPolicy(nodes, layers, 0);
		for (const a of policy.actions) {
			expect(a).toBeGreaterThanOrEqual(0);
			expect(a).toBeLessThanOrEqual(STAY_ACTION);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// trueStep
// ─────────────────────────────────────────────────────────────────────────────

describe('trueStep', () => {
	it('stays in place when hitting a wall', () => {
		const maze = smallMaze();
		// Cell 0 (0,0). UP goes out of bounds.
		expect(trueStep(maze, 0, 0)).toBe(0);
	});

	it('stays in place when hitting the maze border', () => {
		const maze = smallMaze();
		// Cell 0 at (0,0), UP (action 0) goes out of bounds
		expect(trueStep(maze, 0, 0)).toBe(0);
	});

	it('moves to the correct neighbor when passage is open', () => {
		const maze = smallMaze();
		// Find an open passage from start
		for (let a = 0; a < 4; a++) {
			if (maze.passable[0][a]) {
				const newPos = trueStep(maze, 0, a);
				expect(newPos).not.toBe(0);
				expect(newPos).toBeGreaterThanOrEqual(0);
				expect(newPos).toBeLessThan(maze.n);
			}
		}
	});

	it('returns a valid cell id', () => {
		const maze = smallMaze();
		const pos = trueStep(maze, 0, 3);
		expect(pos).toBeGreaterThanOrEqual(0);
		expect(pos).toBeLessThan(maze.n);
	});

	it('can navigate from start to goal using known passages', () => {
		const maze = tinyMaze();
		let pos = maze.startState;
		// Follow open passages greedily toward goal
		for (let _ = 0; _ < maze.n; _++) {
			if (pos === maze.goalState) break;
			let moved = false;
			for (let a = 0; a < 4; a++) {
				if (maze.passable[pos][a]) {
					const newPos = trueStep(maze, pos, a);
					if (newPos !== pos) {
						pos = newPos;
						moved = true;
						break;
					}
				}
			}
			if (!moved) break; // dead end
		}
		// In a perfect maze, we should be able to reach the goal
		expect(pos).toBe(maze.goalState);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUNE_EPS
// ─────────────────────────────────────────────────────────────────────────────

describe('PRUNE_EPS', () => {
	it('is a small positive value', () => {
		expect(PRUNE_EPS).toBeGreaterThan(0);
		expect(PRUNE_EPS).toBeLessThan(0.1);
	});
});
