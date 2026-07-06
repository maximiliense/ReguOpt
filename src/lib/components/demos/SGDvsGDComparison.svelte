<script lang="ts">
	/**
	 * Compares SGD (single-sample) vs full Gradient Descent on a shared contour plot.
	 */
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';

	const N = 30; // number of data points

	// Deterministic synthetic data: f(θ) = (1/N) Σ_i 0.5*(a_i·θ - b_i)²
	interface DataPoint {
		a: [number, number];
		b: number;
	}

	const DATA: DataPoint[] = Array.from({ length: N }, (_, i) => {
		const s1 = ((i * 16807 + 7919) % 2147483647) / 2147483647 - 0.5;
		const s2 = (((i + 3) * 16807 + 4231) % 2147483647) / 2147483647 - 0.5;
		return { a: [s1 * 3, s2 * 3] as [number, number], b: s1 + s2 };
	});

	// f(x, y) — matches ContourPlot's expected signature
	function loss(x: number, y: number): number {
		let s = 0;
		for (const d of DATA) {
			const r = d.a[0] * x + d.a[1] * y - d.b;
			s += 0.5 * r * r;
		}
		return s / N;
	}

	function fullGrad(x: number, y: number): [number, number] {
		let gx = 0,
			gy = 0;
		for (let i = 0; i < N; i++) {
			const r = DATA[i].a[0] * x + DATA[i].a[1] * y - DATA[i].b;
			gx += r * DATA[i].a[0];
			gy += r * DATA[i].a[1];
		}
		return [gx / N, gy / N];
	}

	function singleGrad(x: number, y: number, i: number): [number, number] {
		const d = DATA[i % N];
		const r = d.a[0] * x + d.a[1] * y - d.b;
		return [r * d.a[0], r * d.a[1]];
	}

	let containerWidth = $state(420);

	const domain: [[number, number], [number, number]] = [
		[-3, 3],
		[-3, 3]
	];
	const width = $derived(Math.min(containerWidth, 520));
	const height = $derived(width); // square

	let gdSteps: { x: number; y: number }[] = $state([]);
	let sgdSteps: { x: number; y: number }[] = $state([]);
	let visibleGD = $state(0);
	let visibleSGD = $state(0);
	let playing = $state(false);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	function buildGD(): { x: number; y: number }[] {
		const alpha = 0.005;
		let [x, y] = [-1.5, 1.5];
		const traj: { x: number; y: number }[] = [{ x, y }];
		for (let k = 0; k < 60; k++) {
			const [gx, gy] = fullGrad(x, y);
			x -= alpha * gx;
			y -= alpha * gy;
			traj.push({ x, y });
		}
		return traj;
	}

	function buildSGD(): { x: number; y: number }[] {
		const alpha = 0.015;
		let [x, y] = [-1.5, 1.5];
		const traj: { x: number; y: number }[] = [{ x, y }];
		let seed = 42;
		for (let k = 0; k < 300; k++) {
			seed = (seed * 16807) % 2147483647;
			const i_k = Math.floor((seed / 2147483647) * N);
			const [gx, gy] = singleGrad(x, y, i_k);
			x -= alpha * gx;
			y -= alpha * gy;
			traj.push({ x, y });
		}
		return traj;
	}

	function reset() {
		stopAnim();
		gdSteps = buildGD();
		sgdSteps = buildSGD();
		visibleGD = gdSteps.length - 1;
		visibleSGD = sgdSteps.length - 1;
	}

	let animGDIdx = $state(0);
	let animSGDIdx = $state(0);

	function play() {
		if (playing) return;
		if (animGDIdx === 0 && animSGDIdx === 0) {
			gdSteps = buildGD();
			sgdSteps = buildSGD();
		}
		playing = true;
		animTimer = setInterval(() => {
			animGDIdx++;
			animSGDIdx += 3; // SGD has more steps, advance faster visually

			if (animGDIdx >= gdSteps.length) animGDIdx = gdSteps.length - 1;
			if (animSGDIdx >= sgdSteps.length) animSGDIdx = sgdSteps.length - 1;

			visibleGD = animGDIdx;
			visibleSGD = animSGDIdx;

			if (animGDIdx >= gdSteps.length - 1 && animSGDIdx >= sgdSteps.length - 1) stopAnim();
		}, 80);
	}

	function pause() {
		stopAnim();
	}

	function stepGD() {
		animGDIdx++;
		if (animGDIdx < gdSteps.length) visibleGD = animGDIdx;
	}

	function stepSGD() {
		animSGDIdx += 3;
		if (animSGDIdx < sgdSteps.length) visibleSGD = animSGDIdx;
	}

	function stopAnim() {
		if (animTimer !== null) clearInterval(animTimer);
		animTimer = null;
		playing = false;
	}

	function lines(traj: { x: number; y: number }[], end: number): string {
		let d = '';
		const len = Math.min(end + 1, traj.length);
		for (let i = 1; i < len; i++) {
			d += `M${projX(traj[i - 1].x).toFixed(1)},${projY(traj[i - 1].y).toFixed(1)} L${projX(traj[i].x).toFixed(1)},${projY(traj[i].y).toFixed(1)}`;
		}
		return d;
	}

	const gdLoss = $derived(
		gdSteps.length > visibleGD ? loss(gdSteps[visibleGD].x, gdSteps[visibleGD].y).toFixed(3) : '—'
	);
	const sgdLoss = $derived(
		sgdSteps.length > visibleSGD
			? loss(sgdSteps[visibleSGD].x, sgdSteps[visibleSGD].y).toFixed(3)
			: '—'
	);

	reset();
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<!-- Controls -->
	<div class="controls">
		<span class="tag" style="color: #3b82f6">● GD</span>
		<span class="tag" style="color: #ef4444">● SGD (B=1)</span>
		<span>n = {N} échantillons</span>
	</div>

	<!-- Transport -->
	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Reset</button>
		<button class="btn" onclick={stepGD}>GD ▶</button>
		<button class="btn" onclick={stepSGD}>SGD ▶</button>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play}>⏵ Animer</button>
		{/if}

		<div class="stats">GD: f = {gdLoss} &nbsp;|&nbsp; SGD: f = {sgdLoss}</div>
	</div>

	<!-- Contour with overlays -->
	<div class="chart-container">
		<ContourPlot f={loss} {domain} {width} {height} gridSize={60} numLevels={8} />
		<svg class="overlay" {width} {height} viewBox={`0 0 ${width} ${height}`}>
			<!-- GD path -->
			<path
				d={lines(gdSteps, visibleGD)}
				fill="none"
				stroke="#3b82f6"
				stroke-width="2.5"
				opacity="0.85"
			/>
			<!-- SGD path -->
			<path
				d={lines(sgdSteps, visibleSGD)}
				fill="none"
				stroke="#ef4444"
				stroke-width="1.2"
				opacity="0.5"
			/>

			{#if gdSteps.length > 0}
				{@const pt = gdSteps[visibleGD]}
				<circle
					cx={projX(pt.x)}
					cy={projY(pt.y)}
					r="5"
					fill="#3b82f6"
					stroke="#fff"
					stroke-width="1.5"
				/>
			{/if}
			{#if sgdSteps.length > 0}
				{@const pt = sgdSteps[visibleSGD]}
				<circle
					cx={projX(pt.x)}
					cy={projY(pt.y)}
					r="5"
					fill="#ef4444"
					stroke="#fff"
					stroke-width="1.5"
				/>
			{/if}
		</svg>
	</div>

	<div class="legend">
		<span class="item"><span class="swatch s-gd"></span>GD (lisse)</span>
		<span class="item"><span class="swatch s-sgd"></span>SGD (bruité)</span>
	</div>
</div>

<style>
	.demo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.tag {
		font-weight: 600;
		font-family: var(--font-mono, monospace);
	}
	.transport {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 0.82rem;
	}
	.btn {
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.78rem;
	}
	.btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
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
		margin-left: 1rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
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
	}
	.item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.swatch {
		width: 14px;
		height: 3px;
		border-radius: 2px;
	}
	.s-gd {
		background: #3b82f6;
	}
	.s-sgd {
		background: repeating-linear-gradient(
			90deg,
			#ef4444 0,
			#ef4444 3px,
			transparent 3px,
			transparent 5px
		);
		height: 3px;
		width: 14px;
	}
</style>
