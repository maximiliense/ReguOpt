<script lang="ts">
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid, rosenbrock, ellipse } from '$lib/math/test-functions.js';
	import { gdStep } from '$lib/math/gradient-descent.js';

	interface FuncOption {
		key: string;
		label: string;
		func: typeof paraboloid;
		defaultAlpha: number;
		startPoint: [number, number];
	}

	const funcOptions: FuncOption[] = [
		{
			key: 'paraboloid',
			label: 'Paraboloïde (x² + 4y²)',
			func: paraboloid,
			defaultAlpha: 0.1,
			startPoint: [-2.5, 2]
		},
		{
			key: 'rosenbrock',
			label: 'Rosenbrock ((1−x)² + 100(y−x²)²)',
			func: rosenbrock,
			defaultAlpha: 0.001,
			startPoint: [-1.5, 2]
		},
		{
			key: 'ellipse',
			label: 'Ellipse (x²/4 + y²)',
			func: ellipse,
			defaultAlpha: 0.3,
			startPoint: [-3, -3]
		}
	];

	let selectedKey = $state('paraboloid');
	let containerWidth = $state(420);
	let alpha = $state(paraboloid.domain ? 0.1 : 0.1);
	let currentStep = $state(-1); // -1 means not started yet
	let playing = $state(false);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	const opt = $derived(funcOptions.find((o) => o.key === selectedKey)!);
	const func = $derived(opt.func);
	const defaultDomain: [[number, number], [number, number]] = [
		[-3, 3],
		[-3, 3]
	];
	const domain = $derived(func.domain ?? defaultDomain);
	const aspect = $derived((domain[1][1] - domain[1][0]) / (domain[0][1] - domain[0][0]));
	const width = $derived(Math.min(containerWidth, 480));
	const height = $derived(Math.round(width * aspect));

	let trajectory: { x: number; y: number; fVal: number }[] = $state([]);
	let currentGrad: [number, number] | null = $state(null);

	function reset() {
		stopAnim();
		currentStep = -1;
		const sp = opt.startPoint;
		trajectory = [{ x: sp[0], y: sp[1], fVal: func.f(sp[0], sp[1]) }];
		updateGrad();
	}

	function step() {
		if (currentStep < 0) return;
		const last = trajectory[trajectory.length - 1];
		const [nx, ny] = gdStep(last.x, last.y, func.grad, alpha);

		// Clamp to domain for safety
		const clampedX = Math.max(domain[0][0], Math.min(domain[0][1], nx));
		const clampedY = Math.max(domain[1][0], Math.min(domain[1][1], ny));
		const fVal = func.f(clampedX, clampedY);

		if (isNaN(fVal) || !isFinite(fVal)) {
			stopAnim();
			return;
		}

		trajectory.push({ x: clampedX, y: clampedY, fVal });
		currentStep++;
		updateGrad();
	}

	function updateGrad() {
		if (trajectory.length === 0) return;
		const last = trajectory[trajectory.length - 1];
		const g = func.grad(last.x, last.y);
		const norm = Math.sqrt(g[0] ** 2 + g[1] ** 2);
		currentGrad = norm < 1e-12 ? null : g;
		if (norm < 1e-6) stopAnim();
	}

	function play() {
		if (playing) return;
		if (currentStep < 0) reset();
		playing = true;
		animTimer = setInterval(() => step(), 200);
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
		selectedKey = newKey;
		const o = funcOptions.find((opt) => opt.key === newKey)!;
		alpha = o.defaultAlpha;
		reset();
	}

	// Initialize on load
	reset();

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	function segmentColor(i: number): string {
		const total = trajectory.length - 1;
		if (total === 0) return '#f59e0b';
		const t = i / total;
		// Amber → Green gradient
		const r = Math.round(245 * (1 - t) + 16 * t);
		const g = Math.round(158 * (1 - t) + 163 * t);
		const b = Math.round(11 * (1 - t) + 129 * t);
		return `rgb(${r},${g},${b})`;
	}

	function trajectorySegments(): { d: string; color: string }[] {
		if (trajectory.length < 2) return [];
		const segs = [];
		for (let i = 1; i < trajectory.length; i++) {
			segs.push({
				d: `M${projX(trajectory[i - 1].x).toFixed(1)},${projY(trajectory[i - 1].y).toFixed(1)} L${projX(trajectory[i].x).toFixed(1)},${projY(trajectory[i].y).toFixed(1)}`,
				color: segmentColor(i - 1)
			});
		}
		return segs;
	}

	$effect(() => {
		void containerWidth;
	});
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<!-- Controls bar -->
	<div class="controls">
		<label for="func-select">Fonction :</label>
		<select
			id="func-select"
			value={selectedKey}
			onchange={(e) => handleFuncChange(e.currentTarget.value)}
		>
			{#each funcOptions as opt}
				<option value={opt.key}>{opt.label}</option>
			{/each}
		</select>

		<label class="alpha-label"
			>α : <input type="range" min={0.0001} max={1} step={0.0001} bind:value={alpha} /></label
		>
		<span class="alpha-val">{alpha.toFixed(4)}</span>
	</div>

	<!-- Transport controls -->
	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Reset</button>
		<button class="btn" onclick={step} disabled={currentStep < 0 || currentGrad === null}
			>▶ Step</button
		>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play}>⏵ Play</button>
		{/if}

		<div class="stats">
			k = {Math.max(0, currentStep + 1)} | f(x⁽ᵏ⁾) = {trajectory.length
				? trajectory[trajectory.length - 1].fVal.toFixed(4)
				: '—'}
		</div>
	</div>

	<!-- Chart with overlays -->
	<div class="chart-container">
		<ContourPlot f={func.f} {domain} {width} {height} />
		<svg class="overlay" {width} {height} viewBox={`0 0 ${width} ${height}`}>
			{#each trajectorySegments() as seg}
				<path d={seg.d} fill="none" stroke={seg.color} stroke-width="2.5" stroke-linecap="round" />
			{/each}

			<!-- Trajectory dots -->
			{#each trajectory as pt, i (i)}
				<circle
					cx={projX(pt.x)}
					cy={projY(pt.y)}
					r={i === trajectory.length - 1 ? 5 : 3}
					fill={segmentColor(i)}
				/>
			{/each}

			<!-- Gradient vector at current point -->
			{#if currentGrad && trajectory.length > 0}
				{@const last = trajectory[trajectory.length - 1]}
				{@const gNorm = Math.sqrt(currentGrad[0] ** 2 + currentGrad[1] ** 2)}
				{@const scale = Math.min(40 / gNorm, alpha * 2)}
				{@const ex = projX(last.x) - scale * currentGrad[0]}
				{@const ey = projY(last.y) + scale * currentGrad[1]}
				<line
					x1={projX(last.x)}
					y1={projY(last.y)}
					x2={ex}
					y2={ey}
					stroke="#ef4444"
					stroke-width="3"
					marker-end="url(#arrowhead)"
				/>
				<!-- Direction label -->
				<text
					x={(projX(last.x) + ex) / 2 + 8}
					y={(projY(last.y) + ey) / 2 - 4}
					fill="#ef4444"
					font-size="10"
					font-weight="600">−∇f</text
				>
			{/if}

			<defs>
				<polygon id="arrowhead" points="0,0 -8,-4 -3,0 -8,4" fill="#ef4444" />
			</defs>
		</svg>
	</div>

	<!-- Legend -->
	<div class="legend">
		<span class="legend-item"><span class="swatch swatch-start"></span>Début</span>
		<span class="legend-item"><span class="swatch swatch-end"></span>Fin</span>
		<span class="legend-item"><span class="swatch swatch-grad"></span>−∇f(x⁽ᵏ⁾)</span>
	</div>
</div>

<style>
	.demo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	select,
	input[type='range'] {
		padding: 0.3rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: var(--color-surface-2, transparent);
		color: inherit;
	}

	select {
		font-size: 0.8rem;
	}

	.alpha-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-left: 0.75rem;
	}

	input[type='range'] {
		width: 100px;
		cursor: pointer;
	}

	.alpha-val {
		font-size: 0.8rem;
		font-family: var(--font-mono, monospace);
		min-width: 3.5em;
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
		margin-left: auto;
		font-family: var(--font-mono, monospace);
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-align: right;
		min-width: 200px;
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
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.swatch {
		width: 12px;
		height: 3px;
		border-radius: 2px;
	}

	.swatch-start {
		background: #f59e0b;
	}

	.swatch-end {
		background: #10a381;
	}

	.swatch-grad {
		background: #ef4444;
		height: 12px;
		width: 3px;
	}
</style>
