<script lang="ts">
	/**
	 * Animates Coordinate Descent on a contour plot, showing the characteristic
	 * zigzag pattern as it optimizes one coordinate at a time.
	 */
	import { onDestroy } from 'svelte';
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid, ellipse } from '$lib/math/test-functions.js';

	let containerWidth = $state(420);
	let selectedFunc = $state('paraboloid');
	let playing = $state(false);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	const funcOptions = [
		{ key: 'paraboloid', label: 'Paraboloïde (x² + 4y²)', func: paraboloid, color: '#8b5cf6' },
		{ key: 'ellipse', label: 'Ellipse (x²/4 + y²)', func: ellipse, color: '#06b6d4' }
	];

	const opt = $derived(funcOptions.find((o) => o.key === selectedFunc)!);
	const func = $derived(opt.func);

	const defaultDomain: [[number, number], [number, number]] = [
		[-3, 3],
		[-3, 3]
	];
	const domain = $derived(func.domain ?? defaultDomain);
	const aspect = $derived((domain[1][1] - domain[1][0]) / (domain[0][1] - domain[0][0]));
	const width = $derived(Math.min(containerWidth, 480));
	const height = $derived(Math.round(width * aspect));

	interface TrajPoint {
		x: number;
		y: number;
		fVal: number;
		coord: number; // -1 = start, 0 = optimized along x, 1 = optimized along y
	}

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	function optimizeCoordinate(x: number, y: number, coord: number): { x: number; y: number } {
		const h = Math.max(1e-4, coord === 0 ? Math.abs(x) * 0.2 : Math.abs(y) * 0.2);

		if (coord === 0) {
			const fPos = func.f(x + h, y);
			const fNeg = func.f(x - h, y);
			const dir = fPos < fNeg ? 1 : -1;

			let lo: number, hi: number;
			if (dir > 0) {
				lo = 0;
				hi = h * 8;
			} else {
				lo = -h * 8;
				hi = 0;
			}

			for (let iter = 0; iter < 30; iter++) {
				const range = hi - lo;
				if (Math.abs(range) < 1e-14) break;
				const phiInv = 0.618;
				const c1 = lo + range * (1 - phiInv);
				const c2 = hi - range * (1 - phiInv);
				const f1 = func.f(x + c1, y);
				const f2 = func.f(x + c2, y);
				if (f1 < f2) hi = c2;
				else lo = c1;
			}

			return { x: x + (lo + hi) / 2, y };
		} else {
			const fPos = func.f(x, y + h);
			const fNeg = func.f(x, y - h);
			const dir = fPos < fNeg ? 1 : -1;

			let lo: number, hi: number;
			if (dir > 0) {
				lo = 0;
				hi = h * 8;
			} else {
				lo = -h * 8;
				hi = 0;
			}

			for (let iter = 0; iter < 30; iter++) {
				const range = hi - lo;
				if (Math.abs(range) < 1e-14) break;
				const phiInv = 0.618;
				const c1 = lo + range * (1 - phiInv);
				const c2 = hi - range * (1 - phiInv);
				const f1 = func.f(x, y + c1);
				const f2 = func.f(x, y + c2);
				if (f1 < f2) hi = c2;
				else lo = c1;
			}

			return { x, y: y + (lo + hi) / 2 };
		}
	}

	function computeFullTrajectory(): TrajPoint[] {
		const traj: TrajPoint[] = [];
		const startX = -2.5,
			startY = 2.0;
		let x = startX,
			y = startY;
		traj.push({ x, y, fVal: func.f(x, y), coord: -1 });

		for (let k = 0; k < 30; k++) {
			const coord = k % 2 === 0 ? 0 : 1;
			const result = optimizeCoordinate(x, y, coord);

			x = Math.max(domain[0][0], Math.min(domain[0][1], result.x));
			y = Math.max(domain[1][0], Math.min(domain[1][1], result.y));

			const fVal = func.f(x, y);
			if (!Number.isFinite(fVal)) break;

			traj.push({ x, y, fVal, coord });

			const g = func.grad(x, y);
			if (Math.sqrt(g[0] ** 2 + g[1] ** 2) < 1e-6) break;
		}
		return traj;
	}

	const trajectory = $derived(computeFullTrajectory());

	// ── Single source of truth for "how far are we" — this replaces the old
	// currentStep / stepIdx / visibleSteps trio, which is exactly what caused
	// Reset to show the full path, Step to jump backward after Reset, and
	// Play to silently do nothing on a second run once the indices fell out
	// of sync with each other. ──
	let step = $state(0);
	const maxStep = $derived(trajectory.length - 1);
	const isDone = $derived(step >= maxStep);

	function reset() {
		stopAnim();
		step = 0;
	}

	function stepForward() {
		if (step >= maxStep) return;
		step++;
	}

	function play() {
		if (playing) return;
		if (isDone) reset();
		playing = true;
		animTimer = setInterval(() => {
			stepForward();
			if (step >= maxStep) stopAnim();
		}, 350);
	}
	function pause() {
		stopAnim();
	}
	function stopAnim() {
		if (animTimer !== null) clearInterval(animTimer);
		animTimer = null;
		playing = false;
	}
	onDestroy(stopAnim);

	function selectFunc(key: string) {
		stopAnim();
		selectedFunc = key;
		step = 0;
	}

	function trajectorySegments(): { d: string; color: string }[] {
		if (trajectory.length < 2) return [];
		const segs = [];
		for (let i = 1; i <= step && i < trajectory.length; i++) {
			segs.push({
				d: `M${projX(trajectory[i - 1].x).toFixed(1)},${projY(trajectory[i - 1].y).toFixed(1)} L${projX(trajectory[i].x).toFixed(1)},${projY(trajectory[i].y).toFixed(1)}`,
				color: trajectory[i].coord === 0 ? '#8b5cf6' : '#06b6d4'
			});
		}
		return segs;
	}

	const currentPoint = $derived(trajectory[Math.min(step, maxStep)]);
	const currentFVal = $derived(currentPoint ? currentPoint.fVal.toFixed(4) : '—');

	// Guide line showing which axis is currently being scanned — makes the
	// "optimize one coordinate at a time" mechanic visible, not just implied
	// by the zig-zag color.
	const activeAxisLine = $derived.by(() => {
		if (!currentPoint || currentPoint.coord < 0) return null;
		if (currentPoint.coord === 0) {
			return {
				x1: projX(domain[0][0]),
				y1: projY(currentPoint.y),
				x2: projX(domain[0][1]),
				y2: projY(currentPoint.y),
				color: '#8b5cf6'
			};
		}
		return {
			x1: projX(currentPoint.x),
			y1: projY(domain[1][0]),
			x2: projX(currentPoint.x),
			y2: projY(domain[1][1]),
			color: '#06b6d4'
		};
	});
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<div class="options-row">
		{#each funcOptions as o}
			<button
				class:active={selectedFunc === o.key}
				style:--opt-color={o.color}
				onclick={() => selectFunc(o.key)}
			>
				<span class="dot" style:background={o.color}></span>
				{o.label}
			</button>
		{/each}
	</div>

	<div class="controls">
		<span class="coord-tag coord-x">x (violet)</span>
		<span class="coord-tag coord-y">y (cyan)</span>
	</div>

	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Reset</button>
		<button class="btn" onclick={stepForward} disabled={playing || isDone}>▶ Step</button>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play} disabled={isDone}>⏵ Play</button>
		{/if}

		<div class="stats">
			k = {step} | f = {currentFVal}
			{#if currentPoint && currentPoint.coord >= 0}
				<span> — coord: {currentPoint.coord === 0 ? 'x' : 'y'}</span>
			{/if}
		</div>
	</div>

	<div class="chart-container" style:width="{width}px" style:height="{height}px">
		<ContourPlot f={func.f} {domain} {width} {height} gridSize={60} />
		<svg class="overlay" {width} {height} viewBox={`0 0 ${width} ${height}`}>
			{#if activeAxisLine}
				<line
					x1={activeAxisLine.x1}
					y1={activeAxisLine.y1}
					x2={activeAxisLine.x2}
					y2={activeAxisLine.y2}
					stroke={activeAxisLine.color}
					stroke-width="1"
					stroke-dasharray="4 3"
					opacity="0.4"
				/>
			{/if}

			{#each trajectorySegments() as seg}
				<path d={seg.d} fill="none" stroke={seg.color} stroke-width="2.5" stroke-linecap="round" />
			{/each}

			{#each trajectory as pt, i (i)}
				{#if i <= step}
					<circle
						cx={projX(pt.x)}
						cy={projY(pt.y)}
						r={i === step ? 5 : 3}
						fill={pt.coord === -1 ? '#f59e0b' : pt.coord === 0 ? '#8b5cf6' : '#06b6d4'}
						stroke={i === step ? '#fff' : 'none'}
						stroke-width="1.5"
					/>
				{/if}
			{/each}
		</svg>
	</div>

	<div class="legend">
		<span class="legend-item"><span class="swatch swatch-x"></span>Pas en x (optimiser θ₁)</span>
		<span class="legend-item"><span class="swatch swatch-y"></span>Pas en y (optimiser θ₂)</span>
		<span class="legend-item"><span class="swatch swatch-start"></span>Début</span>
	</div>

	<div class="description">
		CD alterne l'optimisation selon chaque coordonnée. Sur cette fonction séparable, CD converge
		très vite car chaque pas minimise exactement la restriction le long d'un axe (la ligne
		pointillée montre l'axe en cours d'optimisation).
	</div>
</div>

<style>
	.demo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
	}

	.options-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.options-row button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-text, inherit);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.options-row button .dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}
	.options-row button.active {
		background: var(--opt-color);
		color: white;
		border-color: var(--opt-color);
	}
	.options-row button.active .dot {
		background: white !important;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.coord-tag {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		padding: 1px 6px;
		border-radius: 3px;
	}
	.coord-x {
		color: #8b5cf6;
	}
	.coord-y {
		color: #06b6d4;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 0.85rem;
	}

	.btn {
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.btn:hover:not(:disabled) {
		background: var(--color-surface-3, rgba(255, 255, 255, 0.1));
	}
	.btn-primary {
		border-color: #3b82f6;
		color: #3b82f6;
	}
	.btn-warn {
		border-color: #f59e0b;
		color: #f59e0b;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.stats {
		margin-left: 1rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--color-text-muted);
	}

	.chart-container {
		position: relative;
	}
	.overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.legend {
		display: flex;
		gap: 1rem;
		font-size: 0.72rem;
		color: var(--color-text-muted);
		flex-wrap: wrap;
		justify-content: center;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.swatch {
		width: 14px;
		height: 3px;
		border-radius: 2px;
	}
	.swatch-x {
		background: #8b5cf6;
	}
	.swatch-y {
		background: #06b6d4;
	}
	.swatch-start {
		background: #f59e0b;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.description {
		max-width: 480px;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.5;
		padding: 0 0.5rem;
	}
</style>
