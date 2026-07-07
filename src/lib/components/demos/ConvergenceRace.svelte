<script lang="ts">
	/**
	 * Convergence Race: Compares GD, SGD, CD, and Newton side-by-side.
	 * Shows how f(x_k) decreases over iterations for each method.
	 */
	import { onDestroy } from 'svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';

	const MAX_ITER = 200;
	const CONVERGE_THRESHOLD = 1e-3;

	let containerWidth = $state(480);

	type MethodKey = 'gd' | 'sgd' | 'cd' | 'newton';

	const methodsInfo: Record<MethodKey, { label: string; color: string }> = {
		gd: { label: 'GD', color: '#3b82f6' },
		sgd: { label: 'SGD (B=1)', color: '#ef4444' },
		cd: { label: 'CD (cyclique)', color: '#8b5cf6' },
		newton: { label: 'Newton', color: '#f59e0b' }
	};

	// FIX: these must be $state, not plain `let` — in Svelte 5 runes mode,
	// only $state variables trigger reactivity. Since `series` below is a
	// $derived reading these arrays, reassigning them from a plain `let`
	// (as the original reset() did) never actually updates the chart —
	// clicking "Relancer" silently did nothing.
	let gdTrajectory: number[] = $state([]);
	let sgdTrajectory: number[] = $state([]);
	let cdTrajectory: number[] = $state([]);
	let newtonTrajectory: number[] = $state([]);

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

	// FIX: pad every trajectory to the SAME length (MAX_ITER + 1) by holding
	// the last value flat once a method stops iterating (e.g. Newton, which
	// exits early on convergence). Without this, series had different
	// lengths, which either misaligned the x-axis or truncated a series
	// mid-chart with no visual explanation — and made the race-bar panel
	// below impossible to synchronize across methods at a shared index k.
	function padTo(traj: number[], len: number): number[] {
		if (traj.length >= len) return traj.slice(0, len);
		const last = traj[traj.length - 1];
		return [...traj, ...Array(len - traj.length).fill(last)];
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
		let seed = 42;
		for (let k = 0; k < MAX_ITER; k++) {
			const [gx, gy] = grad(x, y);
			const s1 = ((seed * 16807) % 2147483647) / 2147483647 - 0.5;
			seed = s1 < 0 ? -s1 : s1;
			const noiseX = gx * 0.5 + s1 * 0.5;
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
			const hX = Math.max(1e-4, Math.abs(x) * 0.2);
			const fPos = f(x + hX, y);
			const fNeg = f(x - hX, y);
			const dir = fPos < fNeg ? 1 : -1;
			let lo = 0,
				hi = dir * hX * 4;
			if (dir < 0) [lo, hi] = [hi, lo];

			for (let iter = 0; iter < 20; iter++) {
				const range = hi - lo;
				if (Math.abs(range) < 1e-14) break;
				const c1 = lo + range * 0.382;
				const c2 = hi - range * 0.382;
				if (f(x + c1, y) < f(x + c2, y)) hi = c2;
				else lo = c1;
			}
			x += (lo + hi) / 2;
			traj.push(f(x, y));

			const hY = Math.max(1e-4, Math.abs(y) * 0.2);
			const fPos2 = f(x, y + hY);
			const fNeg2 = f(x, y - hY);
			const dir2 = fPos2 < fNeg2 ? 1 : -1;
			let lo2 = 0,
				hi2 = dir2 * hY * 4;
			if (dir2 < 0) [lo2, hi2] = [hi2, lo2];

			for (let iter = 0; iter < 20; iter++) {
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
		return traj.slice(0, MAX_ITER + 1);
	}

	function computeNewton(): number[] {
		let x = startX,
			y = startY;
		const traj: number[] = [f(x, y)];

		for (let k = 0; k < 20 && f(x, y) > 1e-14; k++) {
			const [gx, gy] = grad(x, y);
			const hxx = 2,
				hyy = 8,
				hxy = 0;
			const det = hxx * hyy - hxy * hxy;

			if (Math.abs(det) < 1e-15) {
				x -= 0.1 * gx;
				y -= 0.1 * gy;
			} else {
				const dx = (hyy * gx - hxy * gy) / det;
				const dy = (-hxy * gx + hxx * gy) / det;
				x -= dx;
				y -= dy;
			}
			traj.push(f(x, y));
		}
		return traj;
	}

	function computeRace() {
		gdTrajectory = padTo(computeGD(), MAX_ITER + 1);
		sgdTrajectory = padTo(computeSGD(), MAX_ITER + 1);
		cdTrajectory = padTo(computeCD(), MAX_ITER + 1);
		newtonTrajectory = padTo(computeNewton(), MAX_ITER + 1);
	}

	const series = $derived([
		{ values: gdTrajectory, color: methodsInfo.gd.color, label: methodsInfo.gd.label },
		{ values: sgdTrajectory, color: methodsInfo.sgd.color, label: methodsInfo.sgd.label },
		{ values: cdTrajectory, color: methodsInfo.cd.color, label: methodsInfo.cd.label },
		{ values: newtonTrajectory, color: methodsInfo.newton.color, label: methodsInfo.newton.label }
	]);

	const chartWidth = $derived(Math.min(containerWidth, 560));
	const chartHeight = 240;

	const logSeries = $derived(
		series.map((s) => ({
			values: s.values.map((v) => Math.log10(Math.max(v, 1e-12))),
			color: s.color,
			label: s.label
		}))
	);

	let useLogScale = $state(true); // log scale is genuinely more informative here by default

	// ── Animated race: reveals all four trajectories in lockstep up to `idx`.
	// This is the "wow": instead of a static finished chart, you watch Newton
	// dive to the minimum in a handful of steps while GD/SGD/CD are still
	// crawling — and a live race-bar panel makes the SPEED difference viscerally
	// obvious in a way a single static line chart doesn't. ──
	let idx = $state(0);
	let playing = $state(false);
	let speedMs = $state(30);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	function reset() {
		stopAnim();
		computeRace();
		idx = 0;
	}

	function play() {
		if (playing) return;
		if (idx >= MAX_ITER) idx = 0;
		playing = true;
		animTimer = setInterval(() => {
			idx = Math.min(idx + 1, MAX_ITER);
			if (idx >= MAX_ITER) stopAnim();
		}, speedMs);
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

	// Restart the interval at the new speed if currently playing.
	$effect(() => {
		void speedMs;
		if (playing) {
			if (animTimer !== null) clearInterval(animTimer);
			animTimer = setInterval(() => {
				idx = Math.min(idx + 1, MAX_ITER);
				if (idx >= MAX_ITER) stopAnim();
			}, speedMs);
		}
	});

	// Truncated series up to the current animation index, for the chart.
	const visibleSeries = $derived(
		(useLogScale ? logSeries : series).map((s) => ({
			...s,
			values: s.values.slice(0, idx + 1)
		}))
	);

	// First iteration each method drops below the convergence threshold —
	// used both for the "final" convergence badge and to compute a race winner.
	function firstConvergedIdx(values: number[]): number | null {
		const i = values.findIndex((v) => v < CONVERGE_THRESHOLD);
		return i === -1 ? null : i;
	}

	const convergenceIdx = $derived(
		Object.keys(methodsInfo).map((key, i) => ({
			key: key as MethodKey,
			idx: firstConvergedIdx(series[i].values)
		}))
	);

	const winner = $derived.by(() => {
		const converged = convergenceIdx.filter((c) => c.idx !== null) as {
			key: MethodKey;
			idx: number;
		}[];
		if (!converged.length) return null;
		return converged.reduce((a, b) => (a.idx <= b.idx ? a : b));
	});

	// Has this method converged by the current animation position?
	function hasConvergedByIdx(key: MethodKey): boolean {
		const c = convergenceIdx.find((c) => c.key === key);
		return c?.idx !== null && c!.idx <= idx;
	}

	// Race-bar length: log-scaled remaining distance to threshold, normalized.
	const raceMaxLog = $derived(Math.log10(Math.max(f(startX, startY), 1)));
	function raceBarPct(values: number[]): number {
		const v = Math.max(values[Math.min(idx, values.length - 1)], 1e-9);
		const logV = Math.log10(v);
		const pct = 100 * (1 - Math.max(0, Math.min(1, (logV + 3) / (raceMaxLog + 3))));
		return Math.max(2, pct);
	}

	reset();
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<div class="header">Course de convergence — Comparaison des méthodes</div>

	<div class="controls">
		<label>
			<input type="checkbox" bind:checked={useLogScale} />
			Échelle logarithmique (log₁₀ f)
		</label>
	</div>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Vitesse de lecture</div>
			<Slider bind:value={speedMs} min={5} max={150} step={5} label="ms / pas" />
		</div>
	</SliderGrid>

	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Relancer</button>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play}>⏵ Lancer la course</button>
		{/if}
		<div class="stats">k = {idx} / {MAX_ITER}</div>
	</div>

	<LineChart
		series={visibleSeries}
		xLabel="Itération k"
		yLabel={useLogScale ? 'log₁₀ f(xₖ)' : 'f(xₖ)'}
		width={chartWidth}
		height={chartHeight}
	/>

	<div class="legend">
		{#each Object.values(methodsInfo) as info}
			<span class="legend-item" style="color: {info.color}">● {info.label}</span>
		{/each}
	</div>

	<!-- Live race-bar panel: visceral "who's closest to the minimum right now" -->
	<div class="race-panel">
		<div class="race-title">Distance restante au minimum (en direct)</div>
		{#each Object.entries(methodsInfo) as [key, info] (key)}
			{@const values = series[Object.keys(methodsInfo).indexOf(key)].values}
			{@const converged = hasConvergedByIdx(key as MethodKey)}
			<div class="race-row">
				<span class="race-label" style="color:{info.color}">
					{info.label}
					{#if winner?.key === key && converged}🏆{/if}
				</span>
				<div class="race-track">
					<div
						class="race-bar"
						style:width="{raceBarPct(values)}%"
						style:background={info.color}
						class:converged
					></div>
				</div>
				<span class="race-value">{values[Math.min(idx, values.length - 1)].toExponential(1)}</span>
			</div>
		{/each}
	</div>

	<div class="stats-grid">
		{#each series as s (s.label)}
			{@const lastVal = s.values[s.values.length - 1]}
			{@const converged = lastVal < CONVERGE_THRESHOLD}
			<div class="stat-card" style="--card-color: {s.color}">
				<span class="method-name">{s.label}</span>
				<span class="final-value">f_final = {lastVal.toExponential(2)}</span>
				{#if converged}<span class="badge-converged">✓ convergé</span>{/if}
			</div>
		{/each}
	</div>

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

	.stats {
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--color-text-muted);
	}

	.legend {
		display: flex;
		gap: 1.2rem;
		font-size: 0.78rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.race-panel {
		width: 100%;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
	}
	.race-title {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		text-align: center;
	}
	.race-row {
		display: grid;
		grid-template-columns: 6.5rem 1fr 5rem;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
	}
	.race-label {
		font-weight: 600;
		white-space: nowrap;
		font-family: var(--font-mono, monospace);
	}
	.race-track {
		height: 12px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}
	.race-bar {
		height: 100%;
		border-radius: 4px;
		transition: width 0.08s linear;
	}
	.race-bar.converged {
		box-shadow: 0 0 6px currentColor;
	}
	.race-value {
		font-family: var(--font-mono, monospace);
		text-align: right;
		color: var(--color-text-muted);
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
