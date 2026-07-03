<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Single path entry: d attribute + fill color */
	interface ContourPath {
		d: string;
		fill: string;
	}

	interface Props {
		f: (x: number, y: number) => number;
		domain: [[number, number], [number, number]]; // [xmin,xmax], [ymin,ymax]
		width?: number;
		height?: number;
		gridSize?: number;
		numLevels?: number;
		colorScheme?: 'diverging' | 'warm' | 'cool';
		showAxes?: boolean;
		showLabels?: boolean;
		snippetOverlay?: Snippet;
	}

	let {
		f,
		domain,
		width = 400,
		height = 350,
		gridSize = 120,
		numLevels = 30,
		colorScheme = 'diverging',
		showAxes = true,
		showLabels = false,
		snippetOverlay
	}: Props = $props();

	const xMin = $derived(domain[0][0]);
	const xMax = $derived(domain[0][1]);
	const yMin = $derived(domain[1][0]);
	const yMax = $derived(domain[1][1]);

	const pad = 4;
	const plotW = $derived(width - pad * 2);
	const plotH = $derived(height - pad * 2);

	// Map data coords -> SVG pixel coords (flip Y so positive-y is up)
	function project(x: number, y: number): [number, number] {
		const px = pad + ((x - xMin) / (xMax - xMin)) * plotW;
		const py = pad + ((yMax - y) / (yMax - yMin)) * plotH;
		return [px, py];
	}

	// Evaluate f on a uniform grid -> number[][]
	const values: number[][] = $derived.by(() => {
		const g: number[][] = new Array(gridSize);
		for (let j = 0; j < gridSize; j++) {
			g[j] = new Array(gridSize);
			for (let i = 0; i < gridSize; i++) {
				const x = xMin + (i / (gridSize - 1)) * (xMax - xMin);
				const y = yMin + (j / (gridSize - 1)) * (yMax - yMin);
				g[j][i] = f(x, y);
			}
		}
		return g;
	});

	// Grid min/max for normalization
	const vRange: [number, number] = $derived.by(() => {
		let mn = Infinity,
			mx = -Infinity;
		for (const row of values) {
			for (const v of row) {
				if (isFinite(v)) {
					if (v < mn) mn = v;
					if (v > mx) mx = v;
				}
			}
		}
		return [mn === Infinity ? 0 : mn, mx === -Infinity ? 1 : mx];
	});

	// Color helper: normed in [-1, +1] -> 'rgb(r,g,b)'
	function getColor(normed: number): string {
		if (colorScheme === 'diverging') {
			if (normed < 0) {
				const t = Math.abs(normed);
				return `rgb(${(10 + t * 234) | 0},${(10 + (1 - t) * 15) | 0},${(30 + (1 - t) * 182) | 0})`;
			} else {
				const t = normed;
				return `rgb(${(30 + t * 214) | 0},${(10 + (1 - t) * 15) | 0},${(30 + (1 - t) * 50) | 0})`;
			}
		} else if (colorScheme === 'warm') {
			const t = Math.max(0, Math.min(1, (normed + 1) / 2));
			return `rgb(${(30 + t * 214) | 0},${(15 + t * 60) | 0},${(30 + (1 - t) * 80) | 0})`;
		} else {
			// cool
			const t = Math.max(0, Math.min(1, (normed + 1) / 2));
			return `rgb(${(30 + (1 - t) * 50) | 0},${(15 + t * 60) | 0},${(30 + t * 182) | 0})`;
		}
	}

	// Filled contour: bucket cells by color -> ~numLevels path elements (no {@html})
	const filledPaths = $derived.by((): ContourPath[] => {
		if (gridSize < 2) return [];
		const [vMin, vMax] = vRange;
		const span = Math.max(vMax - vMin, Number.EPSILON) * 2;
		const centerVal = (vMax + vMin) / 2;

		// Bucket: normed -> path d string, keyed by quantized level
		const buckets = new Map<number, { d: string; fill: string }>();

		for (let j = 0; j < gridSize; j++) {
			for (let i = 0; i < gridSize; i++) {
				const avg =
					(values[j][i] + values[j]?.[i + 1] + values[j + 1]?.[i] + values[j + 1]?.[i + 1]) / 4;
				if (!isFinite(avg)) continue;

				const normed = Math.max(-1, Math.min(1, (avg - centerVal) / (span / 2)));
				// Quantize to numLevels buckets for grouping
				const bucketKey = Math.round(normed * numLevels);
				let entry = buckets.get(bucketKey);
				if (!entry) {
					entry = { d: '', fill: getColor(Math.max(-1, Math.min(1, bucketKey / numLevels))) };
					buckets.set(bucketKey, entry);
				}

				const px = pad + (i / (gridSize - 1)) * plotW;
				const py = pad + (j / (gridSize - 1)) * plotH;
				entry.d += `M${px},${py}h${plotW / gridSize + 0.5}v${plotH / gridSize + 0.5}Z`;
			}
		}

		return Array.from(buckets.values());
	});

	interface LinePath {
		d: string;
		opacity: number;
	}

	// Contour lines: one path element per level (pure Svelte SVG)
	const contourPaths = $derived.by((): LinePath[] => {
		if (gridSize < 2) return [];
		const [vMin, vMax] = vRange;
		if (vMax === vMin) return [];

		const paths: LinePath[] = [];
		const step = (vMax - vMin) / numLevels;
		const midIdx = Math.floor(numLevels / 2);

		for (let lv = 0; lv <= numLevels; lv++) {
			const level = vMin + lv * step;
			let d = '';

			for (let j = 0; j < gridSize - 1; j++) {
				for (let i = 0; i < gridSize - 1; i++) {
					const a = values[j][i],
						bb = values[j][i + 1];
					const cc = values[j + 1][i],
						dd = values[j + 1][i + 1];
					if (!isFinite(a) || !isFinite(bb) || !isFinite(cc) || !isFinite(dd)) continue;

					const edges: [number, number][] = [];

					// Top edge
					if ((a - level) * (bb - level) < 0) {
						const t = (level - a) / (bb - a);
						edges.push(
							project(
								xMin + ((i + t) / (gridSize - 1)) * (xMax - xMin),
								yMin + (j / (gridSize - 1)) * (yMax - yMin)
							)
						);
					}
					// Right edge
					if ((bb - level) * (dd - level) < 0) {
						const t = (level - bb) / (dd - bb);
						edges.push(
							project(
								xMin + ((i + 1) / (gridSize - 1)) * (xMax - xMin),
								yMin + ((j + t) / (gridSize - 1)) * (yMax - yMin)
							)
						);
					}
					// Bottom edge
					if ((cc - level) * (dd - level) < 0) {
						const t = (level - cc) / (dd - cc);
						edges.push(
							project(
								xMin + ((i + t) / (gridSize - 1)) * (xMax - xMin),
								yMin + ((j + 1) / (gridSize - 1)) * (yMax - yMin)
							)
						);
					}
					// Left edge
					if ((a - level) * (cc - level) < 0) {
						const t = (level - a) / (cc - a);
						edges.push(
							project(
								xMin + (i / (gridSize - 1)) * (xMax - xMin),
								yMin + ((j + t) / (gridSize - 1)) * (yMax - yMin)
							)
						);
					}

					for (let k = 0; k < edges.length - 1; k++) {
						d += `M${edges[k][0].toFixed(1)},${edges[k][1].toFixed(1)}L${edges[k + 1][0].toFixed(1)},${edges[k + 1][1].toFixed(1)}`;
					}
				}
			}

			if (d.length > 0) {
				paths.push({ d, opacity: lv === midIdx ? 0.6 : 0.3 });
			}
		}
		return paths;
	});

	// Axis ticks for {#each} rendering
	const axisTickData = $derived.by(() => {
		if (!showLabels) return [];
		const result: { xVal: number; px: number }[] = [];
		for (let i = 0; i <= 4; i++) {
			const xVal = xMin + (i / 4) * (xMax - xMin);
			result.push({ xVal, px: project(xVal, yMin)[0] });
		}
		return result;
	});

	const yAxisTickData = $derived.by(() => {
		if (!showLabels) return [];
		const result: { yVal: number; py: number }[] = [];
		for (let j = 0; j <= 4; j++) {
			const yVal = yMin + (j / 4) * (yMax - yMin);
			result.push({ yVal, py: project(xMin, yVal)[1] });
		}
		return result;
	});

	// Computed axis endpoints for template rendering
	const axesCoords = $derived.by(() => ({
		xLeft: project(xMin, yMax)[0],
		xRight: project(xMax, yMin)[0],
		yTop: project(xMin, yMax)[1],
		yBot: project(xMin, yMin)[1]
	}));
</script>

<svg
	{width}
	{height}
	viewBox={`0 0 ${width} ${height}`}
	class="contour-svg"
	role="img"
	aria-label="Contour plot"
>
	<!-- Filled background: one <path> per color bucket (~30 elements) -->
	<g class="filled-cells">
		{#each filledPaths as path}
			<path d={path.d} fill={path.fill} shape-rendering="crispEdges" />
		{/each}
	</g>

	<!-- Stroked contour lines: one <path> per level -->
	<g class="contour-lines">
		{#each contourPaths as lp}
			<path
				d={lp.d}
				stroke="var(--color-evidence)"
				fill="none"
				stroke-width="0.5"
				opacity={lp.opacity}
			/>
		{/each}
	</g>

	<!-- Axes and labels -->
	{#if showAxes}
		<g class="axes">
			<line
				x1={axesCoords.xLeft}
				y1={axesCoords.yBot}
				x2={axesCoords.xRight}
				y2={axesCoords.yBot}
				stroke="var(--color-border)"
				stroke-width="0.5"
			/>
			<line
				x1={axesCoords.xLeft}
				y1={axesCoords.yTop}
				x2={axesCoords.xLeft}
				y2={axesCoords.yBot}
				stroke="var(--color-border)"
				stroke-width="0.5"
			/>

			{#each axisTickData as tick}
				<text x={tick.px} y={axesCoords.yBot + 16} text-anchor="middle" class="axis-label">
					{tick.xVal.toFixed(1)}
				</text>
			{/each}

			{#each yAxisTickData as tick}
				<text x={axesCoords.xLeft - 6} y={tick.py + 3.5} text-anchor="end" class="axis-label">
					{tick.yVal.toFixed(1)}
				</text>
			{/each}
		</g>
	{/if}

	<!-- User overlay snippet (trajectory, markers) -->
	{#if snippetOverlay}
		{@render snippetOverlay()}
	{/if}
</svg>

<style>
	.contour-svg {
		display: block;
		width: 100%;
		height: auto;
		user-select: none;
	}

	.axis-label {
		fill: var(--color-text-muted);
		font-size: 10px;
	}
</style>
