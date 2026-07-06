<script lang="ts">
	/**
	 * Animates Newton's method on a contour plot, demonstrating quadratic convergence.
	 * Shows how the Hessian-based direction finds the minimum in very few steps.
	 */
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid, ellipse } from '$lib/math/test-functions.js';
	import KatexInline from '../narrative/KatexInline.svelte';

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

	interface NewtonPoint {
		x: number;
		y: number;
		fVal: number;
		gradNorm: number;
		k: number;
	}

	let trajectory: NewtonPoint[] = $state([]);

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	// Newton step using analytical Hessian
	function newtonStep(x: number, y: number): { x: number; y: number } {
		const [gx, gy] = func.grad(x, y);
		const hessMat = func.hess(x, y);
		const hxx = hessMat[0][0],
			hxy = hessMat[0][1];
		const hyx = hessMat[1][0],
			hyy = hessMat[1][1];

		const det = hxx * hyy - hxy * hyx;

		if (Math.abs(det) < 1e-15) {
			// Fallback to gradient step
			return { x: x - 0.1 * gx, y: y - 0.1 * gy };
		}

		const dxx = (hyy * gx - hxy * gy) / det;
		const dyy = (-hyx * gx + hxx * gy) / det;

		return { x: x - dxx, y: y - dyy };
	}

	function computeTrajectory() {
		trajectory = [];
		let x = -2.5,
			y = 2.0;

		for (let k = 0; k < 15; k++) {
			const fVal = func.f(x, y);
			const [gx, gy] = func.grad(x, y);
			const gNorm = Math.sqrt(gx * gx + gy * gy);

			trajectory.push({ x, y, fVal, gradNorm: gNorm, k });

			if (gNorm < 1e-10) break;

			const result = newtonStep(x, y);
			x = Math.max(domain[0][0], Math.min(domain[0][1], result.x));
			y = Math.max(domain[1][0], Math.min(domain[1][1], result.y));
		}

		// Add final point if not already added
		if (trajectory.length === 0 || trajectory[trajectory.length - 1].gradNorm >= 1e-10) {
			const fVal = func.f(x, y);
			const [gx, gy] = func.grad(x, y);
			trajectory.push({ x, y, fVal, gradNorm: Math.sqrt(gx * gx + gy * gy), k: trajectory.length });
		}
	}

	let visibleStep = $state(0);

	function reset() {
		stopAnim();
		currentStep = -1;
		computeTrajectory();
		visibleStep = trajectory.length - 1;
	}

	function animReset() {
		stopAnim();
		computeTrajectory();
		visibleStep = 0;
	}

	let stepIdx = $state(0);

	function stepForward() {
		if (stepIdx >= trajectory.length - 1) return;
		stepIdx++;
		visibleStep = stepIdx;
		currentStep = stepIdx;
	}

	function play() {
		if (playing) return;
		if (stepIdx === 0 && visibleStep === 0) animReset();
		playing = true;
		animTimer = setInterval(() => {
			stepForward();
			if (stepIdx >= trajectory.length - 1) stopAnim();
		}, 600); // Slower for Newton — dramatic pauses between steps
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
		visibleStep = 0;
	}

	function segments(): { d: string; i: number }[] {
		const segs = [];
		for (let i = 1; i <= visibleStep && i < trajectory.length; i++) {
			segs.push({
				d: `M${projX(trajectory[i - 1].x).toFixed(1)},${projY(trajectory[i - 1].y).toFixed(1)} L${projX(trajectory[i].x).toFixed(1)},${projY(trajectory[i].y).toFixed(1)}`,
				i
			});
		}
		return segs;
	}

	function segmentColor(i: number): string {
		const total = trajectory.length - 1;
		if (total === 0) return '#f59e0b';
		const t = i / total;
		// Amber -> Green gradient
		const r = Math.round(245 * (1 - t) + 16 * t);
		const g = Math.round(158 * (1 - t) + 163 * t);
		const b = Math.round(11 * (1 - t) + 129 * t);
		return `rgb(${r},${g},${b})`;
	}

	const currentFVal = $derived(
		trajectory[visibleStep] ? trajectory[visibleStep].fVal.toFixed(6) : '—'
	);
	const gradNormStr = $derived(
		trajectory[visibleStep] ? `${trajectory[visibleStep].gradNorm.toExponential(2)}` : '—'
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

		<span class="tag">Newton-Raphson (ordre 2)</span>
	</div>

	<!-- Transport -->
	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Reset</button>
		<button class="btn" onclick={stepForward} disabled={trajectory.length <= visibleStep + 1}
			>▶ Step</button
		>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play}>⏵ Play</button>
		{/if}

		<div class="stats">
			k = {Math.max(0, currentStep + 1)} &nbsp;|&nbsp; f = {currentFVal} &nbsp;|&nbsp; ‖∇f‖ = {gradNormStr}
		</div>
	</div>

	<!-- Chart with overlay -->
	<div class="chart-container">
		<ContourPlot f={func.f} {domain} {width} {height} gridSize={60} />
		<svg class="overlay" {width} {height} viewBox={`0 0 ${width} ${height}`}>
			{#each segments() as seg (seg.i)}
				<path
					d={seg.d}
					fill="none"
					stroke={segmentColor(seg.i)}
					stroke-width="2.5"
					stroke-linecap="round"
				/>
			{/each}

			<!-- Dots -->
			{#each trajectory as pt, i (i)}
				{#if i <= visibleStep}
					<circle
						cx={projX(pt.x)}
						cy={projY(pt.y)}
						r={i === visibleStep ? 6 : 4}
						fill="#f59e0b"
						stroke={i === visibleStep ? '#fff' : 'none'}
					/>
					<text
						x={projX(pt.x) + 8}
						y={projY(pt.y) - 6}
						font-size="10"
						fill="#f59e0b"
						font-family="var(--font-mono)"
						font-weight="bold">k={i}</text
					>
				{/if}
			{/each}

			<!-- Gradient direction at current point (computed in script) -->
		</svg>
	</div>

	<!-- Legend -->
	<div class="legend">
		<span class="legend-item"><span class="swatch swatch-step"></span>Trajectoire (Newton)</span>
		<span class="legend-item"><span class="swatch swatch-grad"></span>Direction du gradient</span>
		<span class="legend-item"><span class="swatch swatch-point"></span>Point courant</span>
	</div>

	<!-- Description -->
	<div class="description">
		<p>
			La méthode de Newton utilise l'information Hessienne H pour calculer
			<KatexInline formula={`x^{(k+1)} = x^{(k)} - [Hf(x^{(k)})]^{-1} \nabla f(x^{(k)})`} />.
		</p>
		<p>
			Sur les fonctions quadratiques, elle converge en un seul pas. La convergence quadratique
			signifie que le nombre de chiffres significatifs double à chaque itération.
		</p>
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

	.tag {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		padding: 1px 6px;
		border-radius: 3px;
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
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
	.swatch-step {
		background: #f59e0b;
	}
	.swatch-grad {
		background: #ef4444;
		height: 10px;
		width: 2px;
	}
	.swatch-point {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f59e0b;
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
