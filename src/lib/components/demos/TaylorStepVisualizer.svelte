<script lang="ts">
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import { paraboloid, rosenbrock } from '$lib/math/test-functions.js';

	interface FuncOption {
		key: string;
		label: string;
		func: typeof paraboloid;
		defaultSliceY: number;
	}

	const funcOptions: FuncOption[] = [
		{ key: 'paraboloid', label: 'Paraboloïde (x² + 4y²)', func: paraboloid, defaultSliceY: 0.5 },
		{
			key: 'rosenbrock',
			label: 'Rosenbrock ((1−x)² + 100(y−x²)²)',
			func: rosenbrock,
			defaultSliceY: 1
		}
	];

	let selectedKey = $state('paraboloid');
	let xStart = $state(-2);
	let alphaVal = $state(0.1);

	const opt = $derived(funcOptions.find((o) => o.key === selectedKey)!);
	const func = $derived(opt.func);
	const sliceY = $derived(opt.defaultSliceY);

	// 1D slice at fixed y
	function fSlice(x: number): number {
		return func.f(x, sliceY);
	}

	function gradSlice(x: number): number {
		const [gx] = func.grad(x, sliceY);
		return gx;
	}

	function hessSlice(): number {
		const eps = 1e-5;
		const [g1] = func.grad(xStart - eps, sliceY);
		const [g2] = func.grad(xStart + eps, sliceY);
		return (g2 - g1) / (2 * eps);
	}

	const gradAtX = $derived(gradSlice(xStart));
	const hessVal = $derived(hessSlice());
	const fAtX = $derived(fSlice(xStart));

	const xAfterGD = $derived(xStart - alphaVal * gradAtX);
	const fAfterGD = $derived(fSlice(xAfterGD));

	// Taylor approximations
	function taylor1(x: number): number {
		return fAtX + gradAtX * (x - xStart);
	}

	function taylor2(x: number): number {
		return fAtX + gradAtX * (x - xStart) + 0.5 * hessVal * (x - xStart) ** 2;
	}

	let containerWidth = $state(480);

	function handleFuncChange(newKey: string) {
		selectedKey = newKey;
		const o = funcOptions.find((opt) => opt.key === newKey)!;
		xStart = o.func.minimum ? o.func.minimum[0] - 1.5 : -2;
		alphaVal = newKey === 'rosenbrock' ? 0.001 : 0.1;
	}

	const xMin = $derived(Math.min(-3, xStart - 2));
	const xMax = $derived(Math.max(3, xAfterGD + 1));

	// Build curve points
	const N = 80;
	function makePoints(fn: (x: number) => number): [number, number][] {
		return Array.from({ length: N }, (_, i) => {
			const x = xMin + (i / (N - 1)) * (xMax - xMin);
			return [x, fn(x)];
		});
	}

	const curvesData = $derived([
		{ points: makePoints(fSlice), stroke: 'var(--color-primary, #3b82f6)', strokeWidth: 2.5 },
		{
			points: makePoints(taylor1),
			stroke: '#f59e0b',
			strokeWidth: 2,
			strokeDasharray: '6 4' as const
		},
		{
			points: makePoints(taylor2),
			stroke: '#8b5cf6',
			strokeWidth: 2,
			strokeDasharray: '3 3' as const
		}
	]);

	const curveDotsData = $derived([
		{ x: xStart, y: fAtX, r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 },
		{ x: xAfterGD, y: fAfterGD, r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }
	]);

	const vlinesData = $derived([
		{ x: xStart, stroke: '#ef4444', label: 'x⁽ᵏ⁾' },
		{ x: xAfterGD, stroke: '#22c55e', label: 'x⁽ᵏ⁺¹⁾' }
	]);

	const legendData = $derived([
		{ label: `f(x, y=${sliceY.toFixed(1)})`, color: '#3b82f6', kind: 'line' as const },
		{ label: 'Taylor 1 (linéaire)', color: '#f59e0b', kind: 'dashed-line' as const },
		{ label: 'Taylor 2 (quadratique)', color: '#8b5cf6', kind: 'dashed-line' as const }
	]);

	const yMaxVal = $derived.by(() => {
		const allY = curvesData.flatMap((c) => c.points.map((p) => p[1]));
		return Math.max(...allY) * 1.15;
	});
</script>

<div class="taylor-demo" bind:clientWidth={containerWidth}>
	<h3 class="section-title">Justification par développement de Taylor</h3>
	<p class="sub-title">
		f(x − α∇f) ≈ f(x) − α‖∇f‖² + o(α) — le terme −α‖∇f‖² assure la décroissance locale quand α est
		petit.
	</p>

	<div class="controls">
		<label for="func-taylor">Fonction :</label>
		<select
			id="func-taylor"
			value={selectedKey}
			onchange={(e) => handleFuncChange(e.currentTarget.value)}
		>
			{#each funcOptions as o}
				<option value={o.key}>{o.label}</option>
			{/each}
		</select>

		<label for="x0-slider">x₀ :</label>
		<input id="x0-slider" type="range" min={xMin} max={xMax} step={0.1} bind:value={xStart} />
		<span class="val">{xStart.toFixed(2)}</span>

		<label for="alpha-slider">α :</label>
		<input id="alpha-slider" type="range" min={0.0001} max={1} step={0.001} bind:value={alphaVal} />
		<span class="val">{alphaVal.toFixed(4)}</span>
	</div>

	<!-- DensityChart with curves, curveDots, vlines -->
	<DensityChart
		curves={curvesData}
		xDomain={[xMin, xMax]}
		yMax={yMaxVal}
		height={300}
		nTicks={6}
		curveDots={curveDotsData}
		vlines={vlinesData}
		legend={legendData}
	>
		{#snippet children()}
			<!-- Custom overlay can be added here -->
		{/snippet}
	</DensityChart>

	<!-- Info panel -->
	<div class="info-grid">
		<div class="info-item info-red">
			<span class="label">f(x⁽ᵏ⁾)</span>
			<span class="value">{fAtX.toFixed(4)}</span>
		</div>
		<div class="info-item info-green">
			<span class="label">f(x⁽ᵏ⁺¹⁾)</span>
			<span class="value">{fAfterGD.toFixed(4)}</span>
		</div>
		<div class="info-item info-amber">
			<span class="label">Δf (exact)</span>
			<span class="value">{(fAfterGD - fAtX).toFixed(4)}</span>
		</div>
		<div class="info-item info-purple">
			<span class="label">−α·f'(x⁽ᵏ⁾)² (Taylor 1)</span>
			<span class="value">{(-alphaVal * gradAtX ** 2).toFixed(4)}</span>
		</div>
	</div>

	{#if fAfterGD < fAtX}
		<div class="callout-good">
			✓ Décroissance confirmée : f(x⁽ᵏ⁺¹⁾) &lt; f(x⁽ᵏ⁾). Le terme −α‖∇f‖² domine pour α petit.
		</div>
	{:else}
		<div class="callout-warn">
			⚠ Pas trop grand : le développement limité ne garantit la décroissance que localement (α
			suffisamment petit).
		</div>
	{/if}
</div>

<style>
	.taylor-demo {
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
		max-width: 550px;
		line-height: 1.4;
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

	select {
		padding: 0.3rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: transparent;
		color: inherit;
		font-size: 0.75rem;
	}

	input[type='range'] {
		width: 100px;
		cursor: pointer;
	}

	.val {
		font-family: var(--font-mono, monospace);
		min-width: 3em;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.5rem;
		width: 100%;
		max-width: 600px;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.4rem;
		border-radius: var(--radius-sm, 4px);
		font-size: 0.8rem;
	}

	.info-item .label {
		color: var(--color-text-muted);
		font-size: 0.7rem;
		margin-bottom: 0.15rem;
	}

	.info-item .value {
		font-family: var(--font-mono, monospace);
		font-weight: 600;
	}

	.info-red {
		border-left: 3px solid #ef4444;
		background: rgba(239, 68, 68, 0.05);
	}

	.info-green {
		border-left: 3px solid #22c55e;
		background: rgba(34, 197, 94, 0.05);
	}

	.info-amber {
		border-left: 3px solid #f59e0b;
		background: rgba(245, 158, 11, 0.05);
	}

	.info-purple {
		border-left: 3px solid #8b5cf6;
		background: rgba(139, 92, 246, 0.05);
	}

	.callout-good {
		background: rgba(34, 197, 94, 0.1);
		border-left: 3px solid #22c55e;
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		max-width: 600px;
		text-align: center;
		line-height: 1.4;
	}

	.callout-warn {
		background: rgba(245, 158, 11, 0.1);
		border-left: 3px solid #f59e0b;
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		max-width: 600px;
		text-align: center;
		line-height: 1.4;
	}
</style>
