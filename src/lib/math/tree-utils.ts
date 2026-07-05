/**
 * Tree utilities for 2D visualization of decision stumps and simple trees.
 * Used by DecisionTreeStump and ForestGrowthAnimation demo components.
 */

export interface TreeNode {
	left?: TreeNode;
	right?: TreeNode;
	featureIdx: number;
	threshold: number;
	prediction: number; // leaf prediction value
	isLeaf: boolean;
}

/** Predict for a single 2D data point using a tree */
export function predictTree(node: TreeNode, x: [number, number]): number {
	if (node.isLeaf) return node.prediction;
	if (x[node.featureIdx] <= node.threshold) {
		return node.left ? predictTree(node.left, x) : node.prediction;
	} else {
		return node.right ? predictTree(node.right, x) : node.prediction;
	}
}

/** Build a simple decision stump as a TreeNode */
export function buildTreeNode(
	featureIdx: number,
	threshold: number,
	leftValue: number,
	rightValue: number,
	isLeaf = false
): TreeNode {
	return isLeaf
		? { featureIdx, threshold, prediction: leftValue, isLeaf: true }
		: {
				featureIdx,
				threshold,
				prediction: (leftValue + rightValue) / 2,
				isLeaf: false,
				left: { featureIdx, threshold, prediction: leftValue, isLeaf: true },
				right: { featureIdx, threshold, prediction: rightValue, isLeaf: true }
			};
}

/** Build a simple binary tree of given depth for visualization */
export function buildBalancedTree(depth: number): TreeNode {
	if (depth <= 0) return { featureIdx: 0, threshold: 0, prediction: 0, isLeaf: true };

	return {
		featureIdx: 0,
		threshold: 0,
		prediction: 0,
		isLeaf: false,
		left: buildBalancedTree(depth - 1),
		right: buildBalancedTree(depth - 1)
	};
}

/** Get all leaf nodes and their bounding regions for 2D visualization */
interface LeafRegion {
	node: TreeNode;
	xRange: [number, number];
	yRange: [number, number];
	prediction: number;
}

export function getLeafRegions(
	tree: TreeNode,
	xDomain: [number, number],
	yDomain: [number, number]
): LeafRegion[] {
	const regions: LeafRegion[] = [];

	function traverse(node: TreeNode, xRange: [number, number], yRange: [number, number]): void {
		if (node.isLeaf) {
			regions.push({ node, xRange, yRange, prediction: node.prediction });
			return;
		}

		const feat = node.featureIdx;
		let leftXR: [number, number], rightXR: [number, number];
		let leftYR: [number, number], rightYR: [number, number];

		if (feat === 0) {
			leftXR = [xRange[0], node.threshold];
			rightXR = [node.threshold, xRange[1]];
			leftYR = yRange;
			rightYR = yRange;
		} else {
			leftXR = xRange;
			rightXR = xRange;
			leftYR = [yRange[0], node.threshold];
			rightYR = [node.threshold, yRange[1]];
		}

		if (node.left) traverse(node.left, leftXR, leftYR);
		if (node.right) traverse(node.right, rightXR, rightYR);
	}

	traverse(tree, xDomain, yDomain);
	return regions;
}

/** Convert tree to SVG path data for decision boundary visualization */
export function treeBoundaryPaths(
	tree: TreeNode,
	xDomain: [number, number],
	yDomain: [number, number],
	projectX: (v: number) => number = (v) => v,
	projectY: (v: number) => number = (v) => v
): { d: string; prediction: number }[] {
	const regions = getLeafRegions(tree, xDomain, yDomain);

	return regions.map((r) => ({
		d: `M${projectX(r.xRange[0])},${projectY(r.yRange[0])}h${projectX(r.xRange[1] - r.xRange[0])}v${projectY(r.yRange[1] - r.yRange[0])}Z`,
		prediction: r.prediction
	}));
}
