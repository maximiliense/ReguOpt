<script lang="ts">
	import { onDestroy } from 'svelte';
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import { rosenbrock } from '$lib/math/test-functions.js';

	// La fonction de Rosenbrock démontre l'intérêt du lookahead de Nesterov
	const f = rosenbrock.f;
	const grad = rosenbrock.grad;
	const domain: [[number, number], [number, number]] = [
		[-2, 2],
		[-1.5, 3]
	];

	const startX = -1.5;
	const startY = 2.5;
	let alpha = $state(0.0008);
	let betaVal = $state(0.85);
	let playing = $state(false);
	let visibleSteps = $state(0);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	interface Point {
		x: number;
		y: number;
		lookX?: number; // Point d'évaluation anticipé (Nesterov)
		lookY?: number;
	}

	// Calcule l'intégralité de la trajectoire purement selon la physique de l'optimiseur
	function runMomentum(b: number, maxIter = 200): Point[] {
		let x = startX,
			y = startY;
		let vx = 0,
			vy = 0;
		const traj: Point[] = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-7) break;
			vx = b * vx + gx;
			vy = b * vy + gy;
			x -= alpha * vx;
			y -= alpha * vy;

			// ── CRITICAL FIX: Stop if the math escapes our region of interest ──
			if (x < domain[0][0] || x > domain[0][1] || y < domain[1][0] || y > domain[1][1]) {
				break;
			}
			if (!isFinite(f(x, y))) break;

			traj.push({ x, y });
		}
		return traj;
	}

	function runNesterov(b: number, maxIter = 200): Point[] {
		let x = startX,
			y = startY;
		let vx = 0,
			vy = 0;
		const traj: Point[] = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-7) break;

			const xLook = x + b * vx;
			const yLook = y + b * vy;
			const [glx, gly] = grad(xLook, yLook);

			vx = b * vx - alpha * glx;
			vy = b * vy - alpha * gly;
			x += vx;
			y += vy;

			// ── CRITICAL FIX: Stop if the math escapes our region of interest ──
			if (x < domain[0][0] || x > domain[0][1] || y < domain[1][0] || y > domain[1][1]) {
				break;
			}
			if (!isFinite(f(x, y))) break;

			traj.push({ x, y, lookX: xLook, lookY: yLook });
		}
		return traj;
	}

	const momPoints = $derived(runMomentum(betaVal));
	const nagPoints = $derived(runNesterov(betaVal));

	const maxAvailableSteps = $derived(Math.max(momPoints.length, nagPoints.length));

	// ── Layout adaptatif ──
	let rowWidth = $state(680);
	const gapPx = 16;
	const chartW = $derived(Math.max(140, Math.min(320, (rowWidth - gapPx) / 2 - 24)));
	const pad = 30;
	const aspect = (domain[1][1] - domain[1][0]) / (domain[0][1] - domain[0][0]);
	const chartH = $derived(Math.round(chartW * aspect));

	// Fonctions de projections purement graphiques
	function projX(x: number) {
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (chartW - pad * 2);
	}
	function projY(y: number) {
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (chartH - pad * 2);
	}

	function pathFor(points: Point[], upTo: number): string {
		const slice = points.slice(0, upTo + 1);
		if (slice.length < 2) return '';
		let d = `M${projX(slice[0].x)},${projY(slice[0].y)}`;
		for (let i = 1; i < slice.length; i++) {
			d += ` L${projX(slice[i].x)},${projY(slice[i].y)}`;
		}
		return d;
	}

	const momVisible = $derived(Math.min(visibleSteps, momPoints.length - 1));
	const nagVisible = $derived(Math.min(visibleSteps, nagPoints.length - 1));

	const momPathVisible = $derived(pathFor(momPoints, momVisible));
	const nagPathVisible = $derived(pathFor(nagPoints, nagVisible));

	const momCurrent = $derived(momPoints[momVisible] ?? momPoints[0]);
	const nagCurrent = $derived(nagPoints[nagVisible] ?? nagPoints[0]);

	const momEnd = $derived(f(momCurrent.x, momCurrent.y));
	const nagEnd = $derived(f(nagCurrent.x, nagCurrent.y));

	// ── Convergence tracking: each simulation logs its own "settled" state. A sim
	// is settled when it has exhausted its trajectory OR the gradient norm at the
	// current point fell below the convergence threshold (1e-7) — whichever comes first.
	const momGradNorm = $derived(Math.hypot(...grad(momCurrent.x, momCurrent.y)));
	const nagGradNorm = $derived(Math.hypot(...grad(nagCurrent.x, nagCurrent.y)));

	const momSettled = $derived(visibleSteps >= momPoints.length - 1 || momGradNorm < 1e-7);
	const nagSettled = $derived(visibleSteps >= nagPoints.length - 1 || nagGradNorm < 1e-7);

	// Only reveal the comparison verdict once BOTH methods have stopped moving.
	const bothSettled = $derived(momSettled && nagSettled);

	function resetAnim() {
		stopAnim();
		visibleSteps = 0;
	}
	function tick() {
		if (bothSettled) {
			stopAnim();
			return;
		}
		visibleSteps++;
	}
	function play() {
		if (playing) return;
		if (bothSettled) resetAnim();
		playing = true;
		animTimer = setInterval(tick, 40);
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

	$effect(() => {
		void betaVal;
		void alpha;
		resetAnim();
	});
</script>

<div class="nag-demo">
	<h3 class="section-title">Méthode de Nesterov vs Momentum classique</h3>
	<p class="sub-title">
		Fonction de Rosenbrock — Nesterov évalue le gradient au point « anticipé » x̃⁽ᵏ⁾
	</p>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Momentum</div>
			<Slider bind:value={betaVal} min={0.5} max={0.98} step={0.01} label="β" />
		</div>
		<div class="grp">
			<div class="gttl">Taux d'apprentissage</div>
			<Slider bind:value={alpha} min={0.0001} max={0.005} step={0.0001} label="α" />
		</div>
	</SliderGrid>

	<div class="transport">
		<button class="btn" onclick={resetAnim}>⟲ Reset</button>
		<button class="btn" onclick={tick} disabled={playing || bothSettled}>▶ Un pas</button>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play} disabled={bothSettled}
				>⏵ Lancer la course</button
			>
		{/if}
		<div class="stats-inline">k = {visibleSteps} / {maxAvailableSteps - 1}</div>
	</div>

	<div class="panels-row" bind:clientWidth={rowWidth}>
		<div class="panel">
			<span class="panel-label" style="--clr: #f59e0b">Momentum classique</span>
			<div class="chart-container" style:width="{chartW}px" style:height="{chartH}px">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={8} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<g clip-path="inset(0px)">
						<path
							d={momPathVisible}
							fill="none"
							stroke="#f59e0b"
							stroke-width="2.5"
							opacity="0.9"
						/>
						<circle
							cx={projX(startX)}
							cy={projY(startY)}
							r="4"
							fill="#fff"
							stroke="#f59e0b"
							stroke-width="2"
						/>
						<circle cx={projX(momCurrent.x)} cy={projY(momCurrent.y)} r="5" fill="#f59e0b" />
					</g>
				</svg>
			</div>
			<div class="stats">
				k = {momVisible} | f = {momEnd < 1000 ? momEnd.toFixed(4) : '∞'}
			</div>
		</div>

		<div class="panel panel-highlighted">
			<span class="panel-label" style="--clr: #3b82f6">Nesterov (NAG)</span>
			<div class="chart-container" style:width="{chartW}px" style:height="{chartH}px">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={8} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<g clip-path="inset(0px)">
						<path
							d={nagPathVisible}
							fill="none"
							stroke="#3b82f6"
							stroke-width="2.5"
							opacity="0.9"
						/>
						<circle
							cx={projX(startX)}
							cy={projY(startY)}
							r="4"
							fill="#fff"
							stroke="#3b82f6"
							stroke-width="2"
						/>

						{#if nagCurrent.lookX !== undefined && nagCurrent.lookY !== undefined}
							{@const prevPt = nagPoints[Math.max(0, nagVisible - 1)] ?? nagCurrent}
							<line
								x1={projX(prevPt.x)}
								y1={projY(prevPt.y)}
								x2={projX(nagCurrent.lookX)}
								y2={projY(nagCurrent.lookY)}
								stroke="#3b82f6"
								stroke-width="1"
								stroke-dasharray="3 2"
								opacity="0.5"
							/>
							<circle
								cx={projX(nagCurrent.lookX)}
								cy={projY(nagCurrent.lookY)}
								r="3.5"
								fill="none"
								stroke="#3b82f6"
								stroke-width="1.5"
								opacity="0.7"
							/>
						{/if}
						<circle cx={projX(nagCurrent.x)} cy={projY(nagCurrent.y)} r="5" fill="#3b82f6" />
					</g>
				</svg>
			</div>
			<div class="stats">
				k = {nagVisible} | f = {nagEnd < 1000 ? nagEnd.toFixed(4) : '∞'}
			</div>
		</div>
	</div>

	{#if bothSettled}
		{#if nagEnd < momEnd && isFinite(nagEnd)}
			<div class="callout-intuition">
				✓ Nesterov converge plus vite ici — évaluation du gradient au point anticipé (cercle creux)
				permet de « freiner » avant le mur.
			</div>
		{:else if !isFinite(momEnd) && isFinite(nagEnd)}
			<div class="callout-intuition">
				✓ Le momentum classique diverge tandis que Nesterov reste stable — l'anticipation évite les
				oscillations explosives.
			</div>
		{:else if momEnd <= nagEnd && isFinite(momEnd)}
			<div
				class="callout-intuition"
				style="border-left-color: #f59e0b; background: rgba(245,158,11,0.1)"
			>
				Momentum a gagné dans cette configuration — le lookahead de Nesterov n'est pas toujours
				avantageux (essayez un autre β ou α).
			</div>
		{/if}
	{/if}

	<div class="formula-box">
		<p class="formula-title">Formule de Nesterov</p>
		<KatexBlock
			formula={'\\tilde{x}^{(k)} = x^{(k)} + \\beta \\left(x^{(k)} - x^{(k-1)}\\right)'}
		/>
		<KatexBlock
			formula={'x^{(k+1)} = \\tilde{x}^{(k)} - \\alpha \\, \\nabla f\\!\\left(\\tilde{x}^{(k)}\\right)'}
		/>
		<p class="formula-note">
			Le gradient est évalué en <KatexInline formula={'\\tilde{x}^{(k)}'} /> (le point anticipé, cercle
			creux ci-dessus), pas en <KatexInline formula={'x^{(k)}'} /> — c'est ce qui permet à la méthode
			de « voir » la courbure à venir et de freiner avant de la heurter.
		</p>
	</div>
</div>

<style>
	/* Styles inchangés */
	.nag-demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		font-size: 0.875rem;
	}
	.section-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
	}
	.sub-title {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		text-align: center;
	}
	.grp {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.gttl {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}
	.transport {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: center;
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
	.stats-inline {
		font-family: var(--font-mono, monospace);
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.panels-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
		justify-items: center;
	}
	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border);
		width: 100%;
	}
	.panel-highlighted {
		border-color: rgba(59, 130, 246, 0.3);
		box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
	}
	.panel-label {
		font-size: 0.72rem;
		color: var(--clr, inherit);
		font-weight: 600;
		text-align: center;
	}
	.chart-container {
		position: relative;
	}
	.traj-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.stats {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		color: var(--color-text-muted);
		text-align: center;
	}
	.callout-intuition {
		background: rgba(34, 197, 94, 0.1);
		border-left: 3px solid #22c55e;
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		max-width: 600px;
		text-align: center;
		line-height: 1.4;
	}
	.formula-box {
		background: var(--color-surface-2, rgba(255, 255, 255, 0.03));
		border-radius: var(--radius-sm, 4px);
		padding: 0.75rem 1rem;
		font-size: 0.82rem;
		text-align: center;
		line-height: 1.6;
		max-width: 520px;
	}
	.formula-title {
		margin: 0 0 0.3rem 0;
		font-weight: 600;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}
	.formula-note {
		margin: 0.4rem 0 0 0;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
</style>
