<script lang="ts">
	/**
	 * Animates Coordinate Descent on a contour plot, showing the characteristic
	 * zigzag pattern as it optimizes one coordinate at a time.
	 */
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid, ellipse } from '$lib/math/test-functions.js';

	let containerWidth = $state(420);
	let selectedFunc = $state('paraboloid');
	let currentStep = $state(-1);
	let playing = $state(false);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	const funcOptions = [
		{ key: 'paraboloid', label: 'Paraboloïde (x² + 4y²)', func: paraboloid },
		{ key: 'ellipse', label: 'Ellipse (x²/4 + y²)', func: ellipse }
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

	let trajectory: { x: number; y: number; fVal: number; coord: number }[] = $state([]);

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	// Simple line search along one coordinate
	function optimizeCoordinate(x: number, y: number, coord: number): { x: number; y: number } {
		const h = Math.max(1e-4, coord === 0 ? Math.abs(x) * 0.2 : Math.abs(y) * 0.2);

		// Determine descent direction
		if (coord === 0) {
			const fPos = func.f(x + h, y);
			const fNeg = func.f(x - h, y);
			let dir = fPos < fNeg ? 1 : -1;

			// Golden section search along x
			let lo: number, hi: number;
			if (dir > 0) {
				lo = 0;
				hi = h * 8;
			} else {
				lo = -h * 8;
				hi = 0;
			}

			for (let _ = 0; _ < 30; _) {
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
			let dir = fPos < fNeg ? 1 : -1;

			let lo: number, hi: number;
			if (dir > 0) {
				lo = 0;
				hi = h * 8;
			} else {
				lo = -h * 8;
				hi = 0;
			}

			for (let _ = 0; _ < 30; _) {
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

	function computeFullTrajectory() {
		trajectory = [];
		const startX = -2.5,
			startY = 2.0;
		let x = startX,
			y = startY;
		trajectory.push({ x, y, fVal: func.f(x, y), coord: -1 });

		for (let k = 0; k < 30; k++) {
			// Alternate between optimizing x and y
			const coord = k % 2 === 0 ? 0 : 1; // Even steps optimize x, odd steps optimize y
			const result = optimizeCoordinate(x, y, coord);

			x = result.x;
			y = result.y;

			// Clamp to domain
			x = Math.max(domain[0][0], Math.min(domain[0][1], x));
			y = Math.max(domain[1][0], Math.min(domain[1][1], y));

			const fVal = func.f(x, y);
			if (isNaN(fVal) || !isFinite(fVal)) break;

			trajectory.push({ x, y, fVal, coord });

			// Check convergence
			const g = func.grad(x, y);
			if (Math.sqrt(g[0] ** 2 + g[1] ** 2) < 1e-6) break;
		}
	}

	let visibleSteps = $state(0);

	function reset() {
		stopAnim();
		currentStep = -1;
		computeFullTrajectory();
		visibleSteps = trajectory.length - 1;
	}

	function animReset() {
		stopAnim();
		computeFullTrajectory();
		visibleSteps = 0;
	}

	let stepIdx = $state(0);

	function stepForward() {
		if (stepIdx >= trajectory.length - 1) return;
		stepIdx++;
		visibleSteps = stepIdx;
		currentStep = stepIdx;
	}

	function play() {
		if (playing) return;
		if (stepIdx === 0 && visibleSteps === 0) animReset();
		playing = true;
		animTimer = setInterval(() => {
			stepForward();
			if (stepIdx >= trajectory.length - 1) stopAnim();
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

	function handleFuncChange(newKey: string) {
		selectedFunc = newKey;
		reset();
		stepIdx = 0;
		visibleSteps = 0;
	}

	// Compute segments with alternating colors for x-steps and y-steps
	function trajectorySegments(): { d: string; color: string }[] {
		if (trajectory.length < 2) return [];
		const segs = [];
		for (let i = 1; i <= visibleSteps && i < trajectory.length; i++) {
			segs.push({
				d: `M${projX(trajectory[i - 1].x).toFixed(1)},${projY(trajectory[i - 1].y).toFixed(1)} L${projX(trajectory[i].x).toFixed(1)},${projY(trajectory[i].y).toFixed(1)}`,
				color: trajectory[i].coord === 0 ? '#8b5cf6' : '#06b6d4' // Purple for x, Cyan for y
			});
		}
		return segs;
	}

	const currentFVal = $derived(
		trajectory.length > visibleSteps ? trajectory[visibleSteps].fVal.toFixed(4) : '—'
	);

	reset();
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<!-- Controls -->
	<div class="controls">
		<label for="func-select">Fonction :</label>
		<select
			id="func-select"
			value={selectedFunc}
			onchange={(e) => handleFuncChange(e.currentTarget.value)}
		>
			{#each funcOptions as o}
				<option value={o.key}>{o.label}</option>
			{/each}
		</select>

		<span class="coord-tag coord-x">x (violet)</span>
		<span class="coord-tag coord-y">y (cyan)</span>
	</div>

	<!-- Transport -->
	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Reset</button>
		<button class="btn" onclick={stepForward} disabled={trajectory.length <= visibleSteps + 1}
			>▶ Step</button
		>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play}>⏵ Play</button>
		{/if}

		<div class="stats">
			k = {Math.max(0, currentStep + 1)} | f = {currentFVal}
			{#if trajectory[visibleSteps] && trajectory[visibleSteps].coord >= 0}
				<span> — coord: {trajectory[visibleSteps].coord === 0 ? 'x' : 'y'}</span>
			{/if}
		</div>
	</div>

	<!-- Chart with overlay -->
	<div class="chart-container">
		<ContourPlot f={func.f} {domain} {width} {height} gridSize={60} />
		<svg class="overlay" {width} {height} viewBox={`0 0 ${width} ${height}`}>
			{#each trajectorySegments() as seg}
				<path d={seg.d} fill="none" stroke={seg.color} stroke-width="2.5" stroke-linecap="round" />
			{/each}

			<!-- Dots at each vertex -->
			{#each trajectory as pt, i (i)}
				{#if i <= visibleSteps && i < trajectory.length}
					<circle
						cx={projX(pt.x)}
						cy={projY(pt.y)}
						r={i === visibleSteps ? 5 : 3}
						fill={pt.coord === -1 ? '#f59e0b' : pt.coord === 0 ? '#8b5cf6' : '#06b6d4'}
						stroke={i === visibleSteps ? '#fff' : 'none'}
					/>
				{/if}
			{/each}

			<!-- Arrowhead defs -->
			<defs>
				<polygon id="arrow-x" points="0,0 -8,-3 -3,0 -8,3" fill="#8b5cf6" />
				<polygon id="arrow-y" points="0,0 -8,-3 -3,0 -8,3" fill="#06b6d4" />
			</defs>
		</svg>
	</div>

	<!-- Legend -->
	<div class="legend">
		<span class="legend-item"><span class="swatch swatch-x"></span>Pas en x (optimiser θ₁)</span>
		<span class="legend-item"><span class="swatch swatch-y"></span>Pas en y (optimiser θ₂)</span>
		<span class="legend-item"><span class="swatch swatch-start"></span>Début</span>
	</div>

	<!-- Description -->
	<div class="description">
		CD alterne l'optimisation selon chaque coordonnée. Sur cette fonction séparable, CD converge
		très vite car chaque pas minimise exactement la restriction le long d'un axe.
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

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	select {
		padding: 0.3rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: var(--color-surface-2, transparent);
		color: inherit;
		font-size: 0.8rem;
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
