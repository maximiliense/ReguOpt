<script lang="ts">
	/**
	 * Convergence Race: Compares GD, SGD, CD, and Newton side-by-side.
	 * Shows how f(x_k) decreases over iterations for each method.
	 */
	import LineChart from '$lib/components/charts/LineChart.svelte';

	const MAX_ITER = 200;

	let containerWidth = $state(480);

	type MethodKey = 'gd' | 'sgd' | 'cd' | 'newton';

	const methodsInfo: Record<MethodKey, { label: string; color: string }> = {
		gd: { label: 'GD', color: '#3b82f6' },
		sgd: { label: 'SGD (B=1)', color: '#ef4444' },
		cd: { label: 'CD (cycique)', color: '#8b5cf6' },
		newton: { label: 'Newton', color: '#f59e0b' }
	};

	let gdTrajectory: number[] = [];
	let sgdTrajectory: number[] = [];
	let cdTrajectory: number[] = [];
	let newtonTrajectory: number[] = [];

	function computeRace() {
		gdTrajectory = computeGD();
		sgdTrajectory = computeSGD();
		cdTrajectory = computeCD();
		newtonTrajectory = computeNewton();
	}

	// Quadratic: f(x, y) = x² + 4y². Minimum at (0, 0).
	function f(x: number, y: number): number {
		return x * x + 4 * y * y;
	}
	function grad(x: number, y: number): [number, number] {
		return [2 * x, 8 * y];
	}

	const DOMAIN: [[number, number], [number, number]] = [
		[-3, 3],
		[-3, 3]
	];
	const startX = -2.5;
	const startY = 2.0;

	function clamp(v: number, lo: number, hi: number): number {
		return Math.max(lo, Math.min(hi, v));
	}

	function computeGD(): number[] {
		let x = startX,
			y = startY;
		const alpha = 0.035;
		const traj: number[] = [f(x, y)];
		for (let k = 0; k < MAX_ITER; k++) {
			const [gx, gy] = grad(x, y);
			x = clamp(x - alpha * gx, DOMAIN[0][0], DOMAIN[0][1]);
			y = clamp(y - alpha * gy, DOMAIN[1][0], DOMAIN[1][1]);
			traj.push(f(x, y));
		}
		return traj;
	}

	function computeSGD(): number[] {
		let x = startX,
			y = startY;
		const alpha = 0.05;
		const traj: number[] = [f(x, y)];
		// Simulate stochastic gradient with noise for quadratic
		let seed = 42;
		for (let k = 0; k < MAX_ITER; k++) {
			const [gx, gy] = grad(x, y);
			const s1 = ((seed * 16807) % 2147483647) / 2147483647 - 0.5;
			seed = s1 < 0 ? -s1 : s1;
			const noiseX = gx * 0.5 + s1 * 0.5; // ~50% noise injection
			const s2 = ((seed * 16807) % 2147483647) / 2147483647 - 0.5;
			seed = s2 < 0 ? -s2 : s2;
			const noiseY = gy * 0.5 + s2 * 0.5;

			x = clamp(x - alpha * noiseX, DOMAIN[0][0], DOMAIN[0][1]);
			y = clamp(y - alpha * noiseY, DOMAIN[1][0], DOMAIN[1][1]);
			traj.push(f(x, y));
		}
		return traj;
	}

	function computeCD(): number[] {
		let x = startX,
			y = startY;
		const traj: number[] = [f(x, y)];

		for (let k = 0; k < MAX_ITER / 2; k++) {
			// Each iteration optimizes both coords
			// Optimize along x: min_x x² + C → x* = 0
			// With line search along x
			const hX = Math.max(1e-4, Math.abs(x) * 0.2);
			const fPos = f(x + hX, y);
			const fNeg = f(x - hX, y);
			let dir = fPos < fNeg ? 1 : -1;
			let lo = 0,
				hi = dir * hX * 4;
			if (dir < 0) {
				[lo, hi] = [hi, lo];
			}

			for (let _ = 0; _ < 20; _++) {
				const range = hi - lo;
				if (Math.abs(range) < 1e-14) break;
				const c1 = lo + range * 0.382;
				const c2 = hi - range * 0.382;
				if (f(x + c1, y) < f(x + c2, y)) hi = c2;
				else lo = c1;
			}
			x += (lo + hi) / 2;

			traj.push(f(x, y));

			// Optimize along y
			const hY = Math.max(1e-4, Math.abs(y) * 0.2);
			const fPos2 = f(x, y + hY);
			const fNeg2 = f(x, y - hY);
			let dir2 = fPos2 < fNeg2 ? 1 : -1;
			let lo2 = 0,
				hi2 = dir2 * hY * 4;
			if (dir2 < 0) {
				[lo2, hi2] = [hi2, lo2];
			}

			for (let _ = 0; _ < 20; _++) {
				const range = hi2 - lo2;
				if (Math.abs(range) < 1e-14) break;
				const c1 = lo2 + range * 0.382;
				const c2 = hi2 - range * 0.382;
				if (f(x, y + c1) < f(x, y + c2)) hi2 = c2;
				else lo2 = c1;
			}
			y += (lo2 + hi2) / 2;

			traj.push(f(x, y));
		}
		return traj.slice(0, MAX_ITER);
	}

	function computeNewton(): number[] {
		let x = startX,
			y = startY;
		const traj: number[] = [f(x, y)];

		for (let k = 0; k < 20 && f(x, y) > 1e-14; k++) {
			const [gx, gy] = grad(x, y);
			const hxx = 2,
				hyyy = 8,
				hxy = 0;
			const det = hxx * hyyy - hxy * hxy;

			if (Math.abs(det) < 1e-15) {
				x -= 0.1 * gx;
				y -= 0.1 * gy;
			} else {
				const dxx = (hyyy * gx - hxy * gy) / det;
				const dyy = (-hxy * gx + hxx * gy) / det;
				x -= dxx;
				y -= dyy;
			}

			traj.push(f(x, y));
		}

		// Pad to match length
		return traj;
	}

	const series = $derived([
		{ values: gdTrajectory, color: methodsInfo.gd.color, label: methodsInfo.gd.label },
		{ values: sgdTrajectory, color: methodsInfo.sgd.color, label: methodsInfo.sgd.label },
		{ values: cdTrajectory, color: methodsInfo.cd.color, label: methodsInfo.cd.label },
		{ values: newtonTrajectory, color: methodsInfo.newton.color, label: methodsInfo.newton.label }
	]);

	const chartWidth = $derived(Math.min(containerWidth, 560));
	const chartHeight = 240;

	// Log scale for better visibility
	const logSeries = $derived(
		series.map((s) => ({
			values: s.values.map((v) => Math.log10(Math.max(v, 1e-12))),
			color: s.color,
			label: s.label
		}))
	);

	let useLogScale = $state(false);

	function reset() {
		computeRace();
	}

	reset();
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<!-- Header -->
	<div class="header">Course de convergence — Comparaison des méthodes</div>

	<!-- Controls -->
	<div class="controls">
		<label>
			<input type="checkbox" bind:checked={useLogScale} />
			Echelle logarithmique (log₁₀ f)
		</label>
		<button class="btn" onclick={reset}>⟲ Relancer</button>
	</div>

	<!-- Chart -->
	<LineChart
		series={useLogScale ? logSeries : series}
		xLabel="Itération k"
		yLabel={useLogScale ? 'log₁₀ f(xₖ)' : 'f(xₖ)'}
		width={chartWidth}
		height={chartHeight}
	/>

	<!-- Legend -->
	<div class="legend">
		{#each Object.values(methodsInfo) as info}
			<span class="legend-item" style="color: {info.color}">● {info.label}</span>
		{/each}
	</div>

	<!-- Summary stats -->
	<div class="stats-grid">
		{#each series as s (s.label)}
			{@const converged = Math.min(...s.values) < 0.01 ? true : false}
			{@const lastVal = s.values[s.values.length - 1]}
			<div class="stat-card" style="--card-color: {s.color}">
				<span class="method-name">{s.label}</span>
				<span class="final-value">f_final = {lastVal.toExponential(2)}</span>
				{#if converged}<span class="badge-converged">✓ convergé</span>{/if}
			</div>
		{/each}
	</div>

	<!-- Key takeaway -->
	<div class="takeaway">
		<p>
			<strong>Résultat attendu :</strong> Newton converge en quelques itérations (quadratique). GD est
			stable mais lent. CD est efficace pour les fonctions séparables. SGD atteint le voisinage du minimum
			rapidement mais oscille autour de l'optimum.
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

	.header {
		font-size: 0.95rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.82rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
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

	.legend {
		display: flex;
		gap: 1.2rem;
		font-size: 0.78rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 0.5rem;
		width: 100%;
		max-width: 560px;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.5rem;
		border-radius: 6px;
		border-left: 3px solid var(--card-color, #888);
		background: rgba(125, 125, 125, 0.05);
	}

	.method-name {
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--card-color, #888);
		font-family: var(--font-mono, monospace);
	}

	.final-value {
		font-size: 0.72rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-muted);
		text-align: center;
	}

	.badge-converged {
		font-size: 0.68rem;
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
		padding: 1px 6px;
		border-radius: 4px;
	}

	.takeaway {
		max-width: 560px;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.5;
		padding: 0.5rem;
		background: rgba(139, 92, 246, 0.06);
		border-radius: 6px;
	}

	.takeaway p {
		margin: 0;
	}

	@media (max-width: 500px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
