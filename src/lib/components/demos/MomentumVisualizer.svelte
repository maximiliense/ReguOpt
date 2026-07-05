<script lang="ts">
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { ellipse } from '$lib/math/test-functions.js';

	// Use the elliptic function to show how momentum helps in narrow valleys
	const f = ellipse.f;
	const grad = ellipse.grad;
	const domain: [[number, number], [number, number]] = [
		[-6, 6],
		[-5, 5]
	];

	const startX = -5;
	const startY = 4;
	const alpha = 0.3;
	let beta = $state(0.9);

	function runGD(maxIter = 120): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-8) break;
			x -= alpha * gx;
			y -= alpha * gy;
			if (!isFinite(f(x, y))) break;
			traj.push({ x, y });
		}
		return traj;
	}

	function runMomentum(maxIter = 120): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		let vx = 0,
			vy = 0;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-8) break;
			vx = beta * vx + gx;
			vy = beta * vy + gy;
			x -= alpha * vx;
			y -= alpha * vy;
			if (!isFinite(f(x, y))) break;
			traj.push({ x, y });
		}
		return traj;
	}

	const gdPoints = $derived(runGD());
	const momPoints = $derived(runMomentum());

	let panelWidth = $state(260);

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

	const gdEnd = $derived(
		f(gdPoints[gdPoints.length - 1]?.x ?? 0, gdPoints[gdPoints.length - 1]?.y ?? 0)
	);
	const momEnd = $derived(
		f(momPoints[momPoints.length - 1]?.x ?? 0, momPoints[momPoints.length - 1]?.y ?? 0)
	);

	$effect(() => {
		void beta; // trigger re-render when momentum coefficient changes
	});
</script>

<div class="mom-demo" bind:clientWidth={panelWidth}>
	<h3 class="section-title">Momentum : amortissement des oscillations</h3>
	<p class="sub-title">Fonction elliptique (x²/4 + y²) — vallée étroite, GD classique oscille</p>

	<div class="beta-control">
		<label for="beta-slider">β (momentum) :</label>
		<input id="beta-slider" type="range" min={0} max={0.99} step={0.01} bind:value={beta} />
		<span class="val">{beta.toFixed(2)}</span>
	</div>

	<div class="panels">
		<!-- GD without momentum -->
		<div class="panel">
			<span class="panel-label" style="--clr: #94a3b8">GD classique (sans momentum)</span>
			<div class="chart-container">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={6} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<path
						d={pathFor(gdPoints)}
						fill="none"
						stroke="#94a3b8"
						stroke-width="2.5"
						opacity="0.9"
					/>
					{#if gdPoints.length > 1}
						<circle
							cx={projX(startX)}
							cy={projY(startY)}
							r="4"
							fill="#fff"
							stroke="#94a3b8"
							stroke-width="2"
						/>
						<circle
							cx={projX(gdPoints[gdPoints.length - 1].x)}
							cy={projY(gdPoints[gdPoints.length - 1].y)}
							r="5"
							fill="#94a3b8"
						/>
					{/if}
				</svg>
			</div>
			<div class="stats">k = {gdPoints.length - 1} | f = {gdEnd.toFixed(4)}</div>
		</div>

		<!-- Momentum -->
		<div class="panel panel-highlighted">
			<span class="panel-label" style="--clr: #22c55e">GD + Momentum (β = {beta.toFixed(2)})</span>
			<div class="chart-container">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={6} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<path
						d={pathFor(momPoints)}
						fill="none"
						stroke="#22c55e"
						stroke-width="2.5"
						opacity="0.9"
					/>
					{#if momPoints.length > 1}
						<circle
							cx={projX(startX)}
							cy={projY(startY)}
							r="4"
							fill="#fff"
							stroke="#22c55e"
							stroke-width="2"
						/>
						<circle
							cx={projX(momPoints[momPoints.length - 1].x)}
							cy={projY(momPoints[momPoints.length - 1].y)}
							r="5"
							fill="#22c55e"
						/>
					{/if}
				</svg>
			</div>
			<div class="stats">k = {momPoints.length - 1} | f = {momEnd.toFixed(4)}</div>
		</div>
	</div>

	<div class="callout-intuition">
		💡 β proche de 0 → comportement du GD classique. β > 0.9 → accélération dans la direction de la
		vallée, oscillations réduites.
	</div>
</div>

<style>
	.mom-demo {
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

	.beta-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		padding: 0.4rem 1rem;
		background: var(--color-surface-2, rgba(255, 255, 255, 0.03));
		border-radius: var(--radius-sm, 4px);
	}

	input[type='range'] {
		width: 140px;
		cursor: pointer;
	}

	.val {
		font-family: var(--font-mono, monospace);
		min-width: 2.5em;
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
		border-color: rgba(34, 197, 94, 0.3);
		box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
	}

	.panel-label {
		font-size: 0.75rem;
		color: var(--clr, inherit);
		font-weight: 600;
		text-align: center;
		min-width: 160px;
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
		background: rgba(245, 158, 11, 0.1);
		border-left: 3px solid #f59e0b;
		color: var(--color-text-muted);
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		max-width: 600px;
		text-align: center;
		line-height: 1.4;
	}
</style>
