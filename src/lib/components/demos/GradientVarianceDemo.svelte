<script lang="ts">
	/**
	 * Shows how the variance of stochastic gradients decreases with batch size.
	 * Uses CategoricalChart to display variance bars for different batch sizes.
	 */

	import { exactGradient, computeGradientVariance } from '$lib/math/stochastic.js';

	interface ComponentData {
		a: [number, number];
		b: number;
	}

	const N_COMPONENTS = 20;
	let components: ComponentData[] = [];

	function generateComponents(n: number): ComponentData[] {
		const data: ComponentData[] = [];
		for (let i = 0; i < n; i++) {
			const s1 = ((i * 16807 + 7919) % 2147483647) / 2147483647 - 0.5;
			const s2 = (((i + 3) * 16807 + 4231) % 2147483647) / 2147483647 - 0.5;
			data.push({
				a: [s1 * 4, s2 * 4],
				b: s1 + s2 + 0.3 * (((i * 9973) % 1000) / 500 - 0.5)
			});
		}
		return data;
	}

	function getComponentGrad(theta: [number, number], i: number): [number, number] {
		const c = components[i % components.length];
		const r = c.a[0] * theta[0] + c.a[1] * theta[1] - c.b;
		return [r * c.a[0], r * c.a[1]];
	}

	let thetaX = $state(-1.0);
	let thetaY = $state(1.5);

	const batchSizes = [1, 2, 4, 8, 10, N_COMPONENTS];

	function getMiniBatchVariance(batchSize: number): number {
		if (batchSize >= N_COMPONENTS) return 0; // Full gradient has zero variance
		// For a mini-batch of size B, Var(1/B Σ ∇f_i) = (1/B) * σ² where σ² is single-sample variance
		const singleVar = computeGradientVariance(getComponentGrad, N_COMPONENTS, [thetaX, thetaY]);
		return singleVar / batchSize;
	}

	const variances = $derived(batchSizes.map((b) => getMiniBatchVariance(b)));

	const maxVar = $derived(Math.max(...variances, 1e-6));

	function normalize(v: number): number {
		return v / maxVar; // Scale to [0, 1] for the chart
	}

	const normVariances = $derived(variances.map(normalize));

	// Exact gradient norm at current point
	const exactG = $derived(exactGradient(getComponentGrad, N_COMPONENTS, [thetaX, thetaY]));
	const gradNorm = $derived(Math.sqrt(exactG[0] ** 2 + exactG[1] ** 2).toFixed(3));

	// Color based on variance: high variance = red, low = green
	function barColor(i: number): string {
		const t = normVariances[i];
		if (t > 0.7) return '#ef4444'; // High variance — bad
		if (t > 0.3) return '#f59e0b';
		return '#10b981';
	}
	components = generateComponents(N_COMPONENTS);
</script>

<div class="demo-wrap">
	<!-- Header -->
	<div class="header">
		<span class="subtitle">Variance du gradient stochastique en fonction de la taille du batch</span
		>
	</div>

	<!-- Theta position controls -->
	<div class="controls">
		<label>θ₁: <input type="range" min={-3} max={3} step={0.1} bind:value={thetaX} /></label>
		<span class="val">{thetaX.toFixed(2)}</span>
		<label>θ₂: <input type="range" min={-3} max={3} step={0.1} bind:value={thetaY} /></label>
		<span class="val">{thetaY.toFixed(2)}</span>
		<div class="stat">‖∇f(θ)‖ = {gradNorm}</div>
	</div>

	<!-- Chart -->
	<div class="chart-frame" style:width="100%">
		{#each batchSizes as bs, i (i)}
			<div class="bar-column">
				<div class="bar-container">
					<div
						class="variance-bar"
						style:height="{normVariances[i] * 100}%"
						style:background-color={barColor(i)}
					>
						<span class="bar-value">{variances[i].toFixed(4)}</span>
					</div>
				</div>
				<div class="bar-label">B = {bs}</div>
			</div>
		{/each}

		<!-- Reference line for 1/B relationship -->
		<div class="reference-note">
			Variance théorique ∝ <span class="formula">σ² / B</span> &mdash; doublez B, divisez la variance
			par 2
		</div>
	</div>

	<!-- Insight -->
	<div class="insight-box">
		<span class="icon">💡</span>
		<p>
			SGD pur (B=1) a la <strong>plus grande variance</strong>, ce qui explique sa trajectoire
			bruyante. Mais chaque étape coûte O(1) au lieu de O(n). Le compromis optimal est souvent B ∈
			[8, 64].
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
		text-align: center;
		color: var(--color-text-muted);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 0.85rem;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	input[type='range'] {
		width: 100px;
		cursor: pointer;
	}

	.val {
		font-family: var(--font-mono, monospace);
		min-width: 3em;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.stat {
		margin-left: 1rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--color-text-muted);
		padding: 0.2rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
	}

	.chart-frame {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 16px 20px 8px;
		height: 210px;
		width: 100%;
		max-width: 480px;
		border-bottom: 2px solid var(--color-border);
		position: relative;
	}

	.bar-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		height: 100%;
		justify-content: flex-end;
	}

	.bar-container {
		width: 100%;
		max-width: 50px;
		flex-grow: 1;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		border-radius: 4px;
		position: relative;
	}

	.variance-bar {
		width: 70%;
		max-width: 40px;
		border-radius: 3px 3px 0 0;
		transition:
			height 0.3s ease,
			background-color 0.2s;
		position: relative;
		min-height: 2px;
	}

	.bar-value {
		position: absolute;
		top: -16px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.65rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.bar-label {
		margin-top: auto;
		padding-top: 4px;
		font-size: 0.75rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-muted);
		text-align: center;
	}

	.reference-note {
		margin-top: 0.6rem;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		text-align: center;
		padding: 0.4rem;
		background: rgba(125, 125, 125, 0.08);
		border-radius: 4px;
		width: 100%;
		max-width: 480px;
	}

	.formula {
		font-family: var(--font-mono, monospace);
		background: rgba(255, 255, 255, 0.06);
		padding: 1px 4px;
		border-radius: 3px;
	}

	.insight-box {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		padding: 0.75rem 1rem;
		background: rgba(59, 130, 246, 0.08);
		border-radius: 6px;
		max-width: 500px;
		width: 100%;
	}

	.insight-box p {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
	}

	.icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}
</style>
