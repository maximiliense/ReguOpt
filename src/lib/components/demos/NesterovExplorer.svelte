<script lang="ts">
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { rosenbrock } from '$lib/math/test-functions.js';

	// Rosenbrock shows the benefit of Nesterov's lookahead clearly
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

	function runMomentum(b: number, maxIter = 200): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		let vx = 0,
			vy = 0;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-7) break;
			vx = b * vx + gx;
			vy = b * vy + gy;
			x -= alpha * vx;
			y -= alpha * vy;
			if (!isFinite(f(x, y)) || f(x, y) > 1000) {
				traj.push({ x: startX, y: startY }); // fallback on divergence
				break;
			}
			traj.push({ x, y });
		}
		return traj;
	}

	function runNesterov(b: number, maxIter = 200): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		let vx = 0,
			vy = 0;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-7) break;

			// Lookahead point
			const xLook = x + b * vx;
			const yLook = y + b * vy;
			const [glx, gly] = grad(xLook, yLook);

			vx = b * vx - alpha * glx;
			vy = b * vy - alpha * gly;
			x += vx;
			y += vy;

			if (!isFinite(f(x, y)) || f(x, y) > 1000) {
				traj.push({ x: startX, y: startY });
				break;
			}
			traj.push({ x, y });
		}
		return traj;
	}

	const momPoints = $derived(runMomentum(betaVal));
	const nagPoints = $derived(runNesterov(betaVal));

	let panelWidth = $state(300);

	const pad = 36;
	const chartW = $derived(Math.min(panelWidth, 340));
	const aspect = (domain[1][1] - domain[1][0]) / (domain[0][1] - domain[0][0]);
	const chartH = $derived(Math.round(chartW * aspect));

	function projX(x: number) {
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (chartW - pad * 2);
	}
	function projY(y: number) {
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (chartH - pad * 2);
	}

	function pathFor(points: { x: number; y: number }[]): string {
		if (points.length < 2) return '';
		let d = `M${projX(points[0].x)},${projY(points[0].y)}`;
		for (let i = 1; i < points.length; i++) {
			d += ` L${projX(points[i].x)},${projY(points[i].y)}`;
		}
		return d;
	}

	const momEnd = $derived(
		f(momPoints[momPoints.length - 1]?.x ?? 0, momPoints[momPoints.length - 1]?.y ?? 0)
	);
	const nagEnd = $derived(
		f(nagPoints[nagPoints.length - 1]?.x ?? 0, nagPoints[nagPoints.length - 1]?.y ?? 0)
	);

	$effect(() => {
		void betaVal; // trigger re-render
	});
</script>

<div class="nag-demo" bind:clientWidth={panelWidth}>
	<h3 class="section-title">Méthode de Nesterov vs Momentum classique</h3>
	<p class="sub-title">
		Fonction de Rosenbrock — Nesterov évalue le gradient au point « anticipé » x̃⁽ᵏ⁾
	</p>

	<div class="controls">
		<label for="beta-nag">β :</label>
		<input id="beta-nag" type="range" min={0.5} max={0.98} step={0.01} bind:value={betaVal} />
		<span class="val">{betaVal.toFixed(2)}</span>

		<label for="alpha-nag">α :</label>
		<input id="alpha-nag" type="range" min={0.0001} max={0.005} step={0.0001} bind:value={alpha} />
		<span class="val">{alpha.toFixed(5)}</span>
	</div>

	<div class="panels">
		<!-- Momentum -->
		<div class="panel">
			<span class="panel-label" style="--clr: #f59e0b">Momentum classique</span>
			<div class="chart-container">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={8} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<path
						d={pathFor(momPoints)}
						fill="none"
						stroke="#f59e0b"
						stroke-width="2.5"
						opacity="0.9"
					/>
					{#if momPoints.length > 1}
						<circle
							cx={projX(startX)}
							cy={projY(startY)}
							r="4"
							fill="#fff"
							stroke="#f59e0b"
							stroke-width="2"
						/>
						<circle
							cx={projX(momPoints[momPoints.length - 1].x)}
							cy={projY(momPoints[momPoints.length - 1].y)}
							r="5"
							fill="#f59e0b"
						/>
					{/if}
				</svg>
			</div>
			<div class="stats">
				k = {momPoints.length - 1} | f = {momEnd < 1000 ? momEnd.toFixed(4) : '∞'}
			</div>
		</div>

		<!-- Nesterov -->
		<div class="panel panel-highlighted">
			<span class="panel-label" style="--clr: #3b82f6">Nesterov (NG)</span>
			<div class="chart-container">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={8} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<path
						d={pathFor(nagPoints)}
						fill="none"
						stroke="#3b82f6"
						stroke-width="2.5"
						opacity="0.9"
					/>
					{#if nagPoints.length > 1}
						<circle
							cx={projX(startX)}
							cy={projY(startY)}
							r="4"
							fill="#fff"
							stroke="#3b82f6"
							stroke-width="2"
						/>
						<circle
							cx={projX(nagPoints[nagPoints.length - 1].x)}
							cy={projY(nagPoints[nagPoints.length - 1].y)}
							r="5"
							fill="#3b82f6"
						/>
					{/if}
				</svg>
			</div>
			<div class="stats">
				k = {nagPoints.length - 1} | f = {nagEnd < 1000 ? nagEnd.toFixed(4) : '∞'}
			</div>
		</div>
	</div>

	{#if nagEnd < momEnd && isFinite(nagEnd)}
		<div class="callout-intuition">
			✓ Nesterov converge plus vite ici — évaluation du gradient au point anticipé permet de «
			freiner » avant le mur.
		</div>
	{:else if !isFinite(momEnd) && isFinite(nagEnd)}
		<div class="callout-intuition">
			✓ Le momentum classique diverge tandis que Nesterov reste stable — l'anticipation évite les
			oscillations explosives.
		</div>
	{/if}

	<div class="formula-box">
		<p><strong>Formule de Nesterov :</strong></p>
		<p>x̃⁽ᵏ⁾ = x⁽ᵏ⁾ + β(x⁽ᵏ⁾ − x⁽ᵏ⁻¹⁾)</p>
		<p>x⁽ᵏ⁺¹⁾ = x̃⁽ᵏ⁾ − α∇f(x̃⁽ᵏ⁾)</p>
	</div>
</div>

<style>
	.nag-demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
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

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		padding: 0.4rem 1rem;
		background: var(--color-surface-2, rgba(255, 255, 255, 0.03));
		border-radius: var(--radius-sm, 4px);
		flex-wrap: wrap;
		justify-content: center;
	}

	input[type='range'] {
		width: 120px;
		cursor: pointer;
	}

	.val {
		font-family: var(--font-mono, monospace);
		min-width: 3em;
	}

	.panels {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border);
	}

	.panel-highlighted {
		border-color: rgba(59, 130, 246, 0.3);
		box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
	}

	.panel-label {
		font-size: 0.75rem;
		color: var(--clr, inherit);
		font-weight: 600;
		text-align: center;
		min-width: 130px;
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
		font-size: 0.75rem;
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
		font-size: 0.8rem;
		text-align: center;
		line-height: 1.6;
		max-width: 500px;
	}

	.formula-box p {
		margin: 0.2rem 0;
		font-family: var(--font-mono, monospace);
	}
</style>
