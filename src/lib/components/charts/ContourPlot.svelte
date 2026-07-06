<script lang="ts">
	import { onMount, tick } from 'svelte';

	interface Marker {
		x: number;
		y: number;
	}

	interface Props {
		f: (x: number, y: number) => number;
		domain: [[number, number], [number, number]];
		width?: number;
		height?: number;
		gridSize?: number;
		numLevels?: number;
		showAxes?: boolean;
		markers?: Marker[];
		sublevel?: number | null;
		sublevelTouchesBoundary?: boolean;
	}

	let {
		f,
		domain,
		width = 400,
		height = 350,
		gridSize = 90,
		numLevels = 8,
		showAxes = true,
		markers = [],
		sublevel = null,
		sublevelTouchesBoundary = $bindable(false)
	}: Props = $props();

	let canvasEl: HTMLCanvasElement;

	const xMin = $derived(domain[0][0]);
	const xMax = $derived(domain[0][1]);
	const yMin = $derived(domain[1][0]);
	const yMax = $derived(domain[1][1]);

	const pad = 36;

	function projX(x: number): number {
		return pad + ((x - xMin) / (xMax - xMin)) * (width - pad * 2);
	}
	function projY(y: number): number {
		return pad + ((yMax - y) / (yMax - yMin)) * (height - pad * 2);
	}

	function computeGrid(res: number): number[][] {
		const grid: number[][] = [];
		for (let j = 0; j < res; j++) {
			const row: number[] = [];
			const y = yMax - (j / (res - 1)) * (yMax - yMin);
			for (let i = 0; i < res; i++) {
				const x = xMin + (i / (res - 1)) * (xMax - xMin);
				row.push(f(x, y));
			}
			grid.push(row);
		}
		return grid;
	}

	function percentile(vals: number[], p: number): number {
		const sorted = [...vals].sort((a, b) => a - b);
		return sorted[Math.floor(p * (sorted.length - 1))];
	}

	function colorFor(v: number, lo: number, hi: number): string {
		const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)));
		const stops: [number, number, number][] = [
			[37, 99, 235],
			[241, 245, 249],
			[220, 38, 38]
		];
		const seg = t < 0.5 ? 0 : 1;
		const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
		const [r1, g1, b1] = stops[seg];
		const [r2, g2, b2] = stops[seg + 1];
		const r = Math.round(r1 + (r2 - r1) * localT);
		const g = Math.round(g1 + (g2 - g1) * localT);
		const b = Math.round(b1 + (b2 - b1) * localT);
		return `rgb(${r},${g},${b})`;
	}

	// ── Blend helpers for sublevel spotlight effect ──
	function parseRgb(rgbStr: string): [number, number, number] {
		const m = rgbStr.match(/\d+/g)!;
		return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
	}
	function blendTowards(rgbStr: string, target: [number, number, number], t: number): string {
		const [r, g, b] = parseRgb(rgbStr);
		const nr = Math.round(r + (target[0] - r) * t);
		const ng = Math.round(g + (target[1] - g) * t);
		const nb = Math.round(b + (target[2] - b) * t);
		return `rgb(${nr},${ng},${nb})`;
	}
	function fadeToGray(rgbStr: string, t: number): string {
		const [r, g, b] = parseRgb(rgbStr);
		const gray = 0.3 * r + 0.59 * g + 0.11 * b;
		const nr = Math.round(r + (gray - r) * t);
		const ng = Math.round(g + (gray - g) * t);
		const nb = Math.round(b + (gray - b) * t);
		return `rgb(${nr},${ng},${nb})`;
	}

	const heatGrid = $derived.by(() => computeGrid(gridSize));

	function drawHeatmap() {
		if (!canvasEl) return;
		const grid = heatGrid;
		const res = grid.length;
		const flat = grid.flat();
		const lo = percentile(flat, 0.03);
		const hi = percentile(flat, 0.97);

		canvasEl.width = width;
		canvasEl.height = height;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const cellW = (width - pad * 2) / res;
		const cellH = (height - pad * 2) / res;
		for (let j = 0; j < res; j++) {
			for (let i = 0; i < res; i++) {
				const v = grid[j][i];
				let color = colorFor(v, lo, hi);
				if (sublevel != null) {
					color =
						v <= sublevel
							? blendTowards(color, [16, 185, 129], 0.4) // emerald spotlight on {f ≤ c}
							: fadeToGray(color, 0.75); // dim everything else
				}
				ctx.fillStyle = color;
				ctx.fillRect(pad + i * cellW - 0.5, pad + j * cellH - 0.5, cellW + 1, cellH + 1);
			}
		}
	}

	function marchingSquares(res: number, levels: number[]): string[] {
		const grid = computeGrid(res);
		const cellW = (width - pad * 2) / (res - 1);
		const cellH = (height - pad * 2) / (res - 1);
		const paths: string[] = [];

		for (const level of levels) {
			const segments: string[] = [];
			for (let j = 0; j < res - 1; j++) {
				for (let i = 0; i < res - 1; i++) {
					const tl = grid[j][i],
						tr = grid[j][i + 1],
						bl = grid[j + 1][i],
						br = grid[j + 1][i + 1];
					const corners = [tl, tr, br, bl];
					const above = corners.map((c) => c > level);
					const code =
						(above[0] ? 8 : 0) | (above[1] ? 4 : 0) | (above[2] ? 2 : 0) | (above[3] ? 1 : 0);
					if (code === 0 || code === 15) continue;

					const x0 = pad + i * cellW,
						x1 = pad + (i + 1) * cellW;
					const y0 = pad + j * cellH,
						y1 = pad + (j + 1) * cellH;
					const lerp = (a: number, b: number, va: number, vb: number) =>
						a + ((level - va) / (vb - va || 1e-9)) * (b - a);

					const top: [number, number] = [lerp(x0, x1, tl, tr), y0];
					const right: [number, number] = [x1, lerp(y0, y1, tr, br)];
					const bottom: [number, number] = [lerp(x0, x1, bl, br), y1];
					const left: [number, number] = [x0, lerp(y0, y1, tl, bl)];

					const table: Record<number, [number, number][][]> = {
						1: [[left, bottom]],
						2: [[bottom, right]],
						3: [[left, right]],
						4: [[top, right]],
						5: [
							[left, top],
							[bottom, right]
						],
						6: [[top, bottom]],
						7: [[left, top]],
						8: [[left, top]],
						9: [[top, bottom]],
						10: [
							[top, left],
							[right, bottom]
						],
						11: [[top, right]],
						12: [[left, right]],
						13: [[bottom, right]],
						14: [[left, bottom]]
					};
					for (const [a, b] of table[code] ?? []) {
						segments.push(
							`M${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)}`
						);
					}
				}
			}
			paths.push(segments.join(' '));
		}
		return paths;
	}

	const contourLevels = $derived.by(() => {
		const flat = computeGrid(40).flat();
		const lo = percentile(flat, 0.05);
		const hi = percentile(flat, 0.95);
		return Array.from(
			{ length: numLevels },
			(_, k) => lo + ((k + 1) / (numLevels + 1)) * (hi - lo)
		);
	});
	const contourPaths = $derived(marchingSquares(70, contourLevels));

	const sublevelPath = $derived.by(() =>
		sublevel == null ? '' : (marchingSquares(90, [sublevel])[0] ?? '')
	);

	// Boundary touches iff any grid cell on the domain edge already satisfies f ≤ c —
	// the visual/geometric signature of an unbounded sublevel set escaping the view.
	const computedTouchesBoundary = $derived.by(() => {
		if (sublevel == null) return false;
		const grid = heatGrid;
		const res = grid.length;
		for (let i = 0; i < res; i++) {
			if (grid[0][i] <= sublevel) return true;
			if (grid[res - 1][i] <= sublevel) return true;
			if (grid[i][0] <= sublevel) return true;
			if (grid[i][res - 1] <= sublevel) return true;
		}
		return false;
	});

	$effect(() => {
		sublevelTouchesBoundary = computedTouchesBoundary;
	});

	$effect(() => {
		void heatGrid;
		void f;
		void domain;
		void width;
		void height;
		void sublevel;
		tick().then(() => drawHeatmap());
	});

	onMount(() => {
		requestAnimationFrame(() => {
			tick().then(() => drawHeatmap());
		});
	});
</script>

<div class="contour-frame" style:width="{width}px" style:height="{height}px">
	<canvas bind:this={canvasEl} {width} {height}></canvas>
	<svg {width} {height} viewBox={`0 0 ${width} ${height}`} class="overlay">
		{#each contourPaths as d}
			<path {d} fill="none" stroke="rgba(15,23,42,0.35)" stroke-width="1" />
		{/each}

		{#if sublevelPath}
			<path d={sublevelPath} fill="none" stroke="#fff" stroke-width="4.5" opacity="0.7" />
			<path
				d={sublevelPath}
				fill="none"
				stroke="#059669"
				stroke-width="2.5"
				stroke-dasharray={computedTouchesBoundary ? '6 4' : 'none'}
			/>
		{/if}

		{#if showAxes}
			{#each [xMin, (xMin + xMax) / 2, xMax] as tickVal}
				<text
					x={projX(tickVal)}
					y={height - 12}
					text-anchor="middle"
					font-size="11"
					fill="var(--color-text-muted)"
				>
					{tickVal.toFixed(1)}
				</text>
			{/each}
			{#each [yMin, (yMin + yMax) / 2, yMax] as tickVal}
				<text
					x={16}
					y={projY(tickVal) + 4}
					text-anchor="middle"
					font-size="11"
					fill="var(--color-text-muted)"
				>
					{tickVal.toFixed(1)}
				</text>
			{/each}
		{/if}

		{#each markers as m, i (i)}
			<circle cx={projX(m.x)} cy={projY(m.y)} r="6" fill="none" stroke="#0f172a" stroke-width="2" />
			<circle
				cx={projX(m.x)}
				cy={projY(m.y)}
				r="6"
				fill="none"
				stroke="#fff"
				stroke-width="3.5"
				opacity="0.6"
			/>
		{/each}
	</svg>
</div>

<style>
	.contour-frame {
		position: relative;
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}
	canvas {
		position: absolute;
		inset: 0;
	}
	.overlay {
		position: absolute;
		inset: 0;
	}
</style>
