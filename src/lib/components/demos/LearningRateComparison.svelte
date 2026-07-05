<script lang="ts">
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid } from '$lib/math/test-functions.js';

	const f = paraboloid.f;
	const grad = paraboloid.grad;
	const domain: [[number, number], [number, number]] = [
		[-4, 4],
		[-3, 3]
	];
	const startX = -3.2;
	const startY = 2.5;

	interface LRConfig {
		label: string;
		alpha: number;
		color: string;
	}

	const configs: LRConfig[] = [
		{ label: 'α trop petit (0.01)', alpha: 0.01, color: '#94a3b8' },
		{ label: 'α optimal (0.15)', alpha: 0.15, color: '#22c55e' },
		{ label: 'α trop grand (0.3)', alpha: 0.3, color: '#ef4444' }
	];

	function runTrajectory(alpha: number, maxIter = 150): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			const gn = Math.sqrt(gx * gx + gy * gy);
			if (gn < 1e-8) break;

			let nx = x - alpha * gx;
			let ny = y - alpha * gy;
			const fv = f(nx, ny);

			// Divergence detection — stop early if value explodes
			if (!isFinite(fv) || fv > 1e6) break;

			x = nx;
			y = ny;
			traj.push({ x, y });
		}
		return traj;
	}

	const trajectories = $derived(configs.map((c) => ({ ...c, points: runTrajectory(c.alpha) })));

	function pathFor(points: { x: number; y: number }[]): string {
		if (points.length < 2) return '';
		let d = `M${projX(points[0].x)},${projY(points[0].y)}`;
		for (let i = 1; i < points.length; i++) {
			d += ` L${projX(points[i].x)},${projY(points[i].y)}`;
		}
		return d;
	}

	let panelWidth = $state(260);

	const pad = 36;
	const chartW = $derived(Math.min(panelWidth, 320));
	const chartH = $derived(
		Math.round(chartW * ((domain[1][1] - domain[1][0]) / (domain[0][1] - domain[0][0])))
	);

	function projX(x: number) {
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (chartW - pad * 2);
	}
	function projY(y: number) {
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (chartH - pad * 2);
	}
</script>

<div class="lr-comparison" bind:clientWidth={panelWidth}>
	<h3 class="section-title">Comparaison de pas d'apprentissage sur x² + 4y²</h3>
	<p class="sub-title">Point initial : ({startX}, {startY}) | Minimum global : (0, 0)</p>

	<div class="panels">
		{#each trajectories as tr}
			<div class="panel" style="--clr: {tr.color}">
				<span class="panel-label">{tr.label}</span>
				<div class="chart-container">
					<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={6} />
					<svg
						class="traj-overlay"
						width={chartW}
						height={chartH}
						viewBox={`0 0 ${chartW} ${chartH}`}
					>
						<path
							d={pathFor(tr.points)}
							fill="none"
							stroke={tr.color}
							stroke-width="2.5"
							opacity="0.9"
						/>
						{#if tr.points.length > 1}
							<circle
								cx={projX(startX)}
								cy={projY(startY)}
								r="4"
								fill="#fff"
								stroke={tr.color}
								stroke-width="2"
							/>
							<circle
								cx={projX(tr.points[tr.points.length - 1].x)}
								cy={projY(tr.points[tr.points.length - 1].y)}
								r="5"
								fill={tr.color}
							/>
						{/if}
					</svg>
				</div>

				<div class="panel-stats">
					<span>Itérations : {tr.points.length - 1}</span>
					<span
						>f(x⁽ᵏ⁾) = {f(
							tr.points[tr.points.length - 1].x,
							tr.points[tr.points.length - 1].y
						).toFixed(4)}</span
					>
				</div>

				{#if f(tr.points[tr.points.length - 1].x, tr.points[tr.points.length - 1].y) > 1e5}
					<div class="badge badge-diverge">⚠ Divergence</div>
				{:else if Math.abs(f(tr.points[tr.points.length - 1].x, tr.points[tr.points.length - 1].y)) < 0.01}
					<div class="badge badge-converge">✓ Convergence rapide</div>
				{:else}
					<div class="badge badge-slow">Convergence lente</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.lr-comparison {
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
	}

	.sub-title {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		text-align: center;
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
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border);
	}

	.panel-label {
		font-size: 0.75rem;
		color: var(--clr);
		font-weight: 600;
		text-align: center;
		min-width: 140px;
	}

	.chart-container {
		position: relative;
	}

	.traj-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.panel-stats {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	.badge {
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
	}

	.badge-converge {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.badge-diverge {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.badge-slow {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}
</style>
