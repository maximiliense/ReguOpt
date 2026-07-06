<script lang="ts">
	/**
	 * Animates Newton's method on a contour plot, demonstrating quadratic convergence.
	 * Shows how the Hessian-based direction finds the minimum in very few steps.
	 */
	import { onDestroy } from 'svelte';
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid, ellipse } from '$lib/math/test-functions.js';
	import KatexInline from '../narrative/KatexInline.svelte';

	let containerWidth = $state(420);
	let selectedFunc = $state('paraboloid');
	let playing = $state(false);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	const funcOptions = [
		{ key: 'paraboloid', label: 'Paraboloïde (x² + 4y²)', func: paraboloid, color: '#f59e0b' },
		{ key: 'ellipse', label: 'Ellipse (x²/4 + y²)', func: ellipse, color: '#f59e0b' }
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
		grad: [number, number];
		newtonDir: [number, number]; // the actual Newton step direction taken FROM this point
		k: number;
	}

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	function newtonStep(x: number, y: number): { dx: number; dy: number } {
		const [gx, gy] = func.grad(x, y);
		const hessMat = func.hess(x, y);
		const hxx = hessMat[0][0],
			hxy = hessMat[0][1];
		const hyx = hessMat[1][0],
			hyy = hessMat[1][1];

		const det = hxx * hyy - hxy * hyx;

		if (Math.abs(det) < 1e-15) {
			return { dx: 0.1 * gx, dy: 0.1 * gy };
		}

		const dx = (hyy * gx - hxy * gy) / det;
		const dy = (-hyx * gx + hxx * gy) / det;
		return { dx, dy };
	}

	function computeTrajectory(): NewtonPoint[] {
		const traj: NewtonPoint[] = [];
		let x = -2.5,
			y = 2.0;

		for (let k = 0; k < 15; k++) {
			const fVal = func.f(x, y);
			const [gx, gy] = func.grad(x, y);
			const gNorm = Math.sqrt(gx * gx + gy * gy);
			const { dx, dy } = newtonStep(x, y);

			traj.push({ x, y, fVal, gradNorm: gNorm, grad: [gx, gy], newtonDir: [dx, dy], k });

			if (gNorm < 1e-10) break;

			x = Math.max(domain[0][0], Math.min(domain[0][1], x - dx));
			y = Math.max(domain[1][0], Math.min(domain[1][1], y - dy));
		}

		if (traj.length === 0 || traj[traj.length - 1].gradNorm >= 1e-10) {
			const fVal = func.f(x, y);
			const [gx, gy] = func.grad(x, y);
			const { dx, dy } = newtonStep(x, y);
			traj.push({
				x,
				y,
				fVal,
				gradNorm: Math.sqrt(gx * gx + gy * gy),
				grad: [gx, gy],
				newtonDir: [dx, dy],
				k: traj.length
			});
		}
		return traj;
	}

	const trajectory = $derived(computeTrajectory());

	// ── Single index, replacing the old currentStep / stepIdx / visibleStep
	// trio — that trio is exactly what made Reset show the fully-solved path
	// instead of the start, and made Play silently no-op on a second run
	// once the indices had drifted out of sync with each other. ──
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
	onDestroy(stopAnim);

	function selectFunc(key: string) {
		stopAnim();
		selectedFunc = key;
		step = 0;
	}

	function segments(): { d: string; i: number }[] {
		const segs = [];
		for (let i = 1; i <= step && i < trajectory.length; i++) {
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
		const r = Math.round(245 * (1 - t) + 16 * t);
		const g = Math.round(158 * (1 - t) + 163 * t);
		const b = Math.round(11 * (1 - t) + 129 * t);
		return `rgb(${r},${g},${b})`;
	}

	const currentPoint = $derived(trajectory[Math.min(step, maxStep)]);
	const currentFVal = $derived(currentPoint ? currentPoint.fVal.toFixed(6) : '—');
	const gradNormStr = $derived(currentPoint ? currentPoint.gradNorm.toExponential(2) : '—');

	// ── Direction arrows at the current point: gradient (red) vs Newton step
	// (amber) — actually rendered now, unlike the legend's previously-empty
	// promise. Seeing both overlaid makes it visually obvious that Newton's
	// curvature-aware direction can differ substantially from plain −∇f. ──
	const arrowScale = 0.9;

	const gradArrow = $derived.by(() => {
		if (!currentPoint) return null;
		const [gx, gy] = currentPoint.grad;
		const norm = Math.hypot(gx, gy);
		if (norm < 1e-9) return null;
		const scale = Math.min(35 / norm, arrowScale * 30);
		return {
			x1: projX(currentPoint.x),
			y1: projY(currentPoint.y),
			x2: projX(currentPoint.x) - scale * gx,
			y2: projY(currentPoint.y) + scale * gy
		};
	});

	const newtonArrow = $derived.by(() => {
		if (!currentPoint) return null;
		const [dx, dy] = currentPoint.newtonDir;
		const norm = Math.hypot(dx, dy);
		if (norm < 1e-9) return null;
		const scale = Math.min(35 / norm, arrowScale * 30);
		return {
			x1: projX(currentPoint.x),
			y1: projY(currentPoint.y),
			x2: projX(currentPoint.x) - scale * dx,
			y2: projY(currentPoint.y) + scale * dy
		};
	});

	// KaTeX formula built with regular quotes and explicit double backslashes
	// — the previous version used a TEMPLATE LITERAL (backticks) containing
	// "\nabla", which JavaScript interprets as an actual newline character
	// before KaTeX ever sees the string, silently turning \nabla into a line
	// break followed by the literal text "abla". Regular strings with \\
	// avoid this entirely.
	const newtonFormula = 'x^{(k+1)} = x^{(k)} - \\left[H_f(x^{(k)})\\right]^{-1} \\nabla f(x^{(k)})';
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<div class="options-row">
		{#each funcOptions as o}
			<button
				class:active={selectedFunc === o.key}
				style:--opt-color={o.color}
				onclick={() => selectFunc(o.key)}
			>
				{o.label}
			</button>
		{/each}
	</div>

	<div class="controls">
		<span class="tag">Newton-Raphson (ordre 2)</span>
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
			k = {step} &nbsp;|&nbsp; f = {currentFVal} &nbsp;|&nbsp; ‖∇f‖ = {gradNormStr}
		</div>
	</div>

	<div class="chart-container" style:width="{width}px" style:height="{height}px">
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

			{#each trajectory as pt, i (i)}
				{#if i <= step}
					<circle
						cx={projX(pt.x)}
						cy={projY(pt.y)}
						r={i === step ? 6 : 4}
						fill="#f59e0b"
						stroke={i === step ? '#fff' : 'none'}
						stroke-width="1.5"
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

			{#if !isDone}
				{#if gradArrow}
					<line
						x1={gradArrow.x1}
						y1={gradArrow.y1}
						x2={gradArrow.x2}
						y2={gradArrow.y2}
						stroke="#ef4444"
						stroke-width="2"
						marker-end="url(#arrow-grad)"
					/>
				{/if}
				{#if newtonArrow}
					<line
						x1={newtonArrow.x1}
						y1={newtonArrow.y1}
						x2={newtonArrow.x2}
						y2={newtonArrow.y2}
						stroke="#f59e0b"
						stroke-width="2.5"
						marker-end="url(#arrow-newton)"
					/>
				{/if}
			{/if}

			<defs>
				<marker id="arrow-grad" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<path d="M0,0 L8,4 L0,8 Z" fill="#ef4444" />
				</marker>
				<marker id="arrow-newton" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
				</marker>
			</defs>
		</svg>
	</div>

	<div class="legend">
		<span class="legend-item"><span class="swatch swatch-step"></span>Trajectoire (Newton)</span>
		<span class="legend-item"><span class="swatch swatch-grad"></span>Direction −∇f</span>
		<span class="legend-item"><span class="swatch swatch-newton"></span>Direction de Newton</span>
	</div>

	<div class="description">
		<p>
			La méthode de Newton utilise l'information Hessienne <KatexInline formula="H_f" /> pour calculer
			<KatexInline formula={newtonFormula} />.
		</p>
		<p>
			La flèche <strong style="color:#ef4444">rouge</strong> montre la direction du gradient seul ;
			la flèche <strong style="color:#f59e0b">orange</strong> montre la direction corrigée par la courbure
			(Hessien) que Newton utilise réellement — souvent très différente, surtout loin du minimum.
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

	.options-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.options-row button {
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
	.options-row button.active {
		background: var(--opt-color);
		color: white;
		border-color: var(--opt-color);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		flex-wrap: wrap;
		justify-content: center;
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
	}
	.swatch-newton {
		background: #f59e0b;
		height: 4px;
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
