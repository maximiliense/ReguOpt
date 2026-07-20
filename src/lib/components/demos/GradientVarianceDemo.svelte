<script lang="ts">
	/**
	 * Shows how the variance of stochastic gradients decreases with batch size.
	 */

	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import { exactGradient, computeGradientVariance } from '$lib/math/stochastic.js';

	interface ComponentData {
		a: [number, number];
		b: number;
	}

	const N_COMPONENTS = 2000;

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

	// Generated once at declaration time — not at the bottom of the script —
	// so there's no reliance on script execution order for correctness.
	const components: ComponentData[] = generateComponents(N_COMPONENTS);

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
		const singleVar = computeGradientVariance(getComponentGrad, N_COMPONENTS, [thetaX, thetaY]);
		return singleVar / batchSize;
	}

	const variances = $derived(batchSizes.map((b) => getMiniBatchVariance(b)));

	// ── Log-scale bar heights ──
	// Variance decays as 1/B, which at linear scale makes every bar past B=1
	// collapse to a near-invisible sliver — defeating the point of a chart
	// meant to show the 1/B relationship. log(1+v) compresses the dynamic
	// range so every bar stays visually legible, while still preserving the
	// correct ORDER and relative comparison between bars.
	function logScale(v: number): number {
		return Math.log(1 + v);
	}
	const maxLogVar = $derived(Math.max(...variances.map(logScale), 1e-6));
	const normVariances = $derived(variances.map((v) => logScale(v) / maxLogVar));

	const exactG = $derived(exactGradient(getComponentGrad, N_COMPONENTS, [thetaX, thetaY]));
	const gradNorm = $derived(Math.sqrt(exactG[0] ** 2 + exactG[1] ** 2).toFixed(3));

	function barColor(i: number): string {
		const t = normVariances[i];
		if (t > 0.7) return '#ef4444';
		if (t > 0.3) return '#f59e0b';
		return '#10b981';
	}
</script>

<div class="demo-wrap">
	<div class="header">
		<span class="subtitle">
			Variance du gradient stochastique — E[‖∇f_i(θ) − ∇f(θ)‖²] — en fonction de la taille du batch
		</span>
	</div>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Position θ</div>
			<Slider bind:value={thetaX} min={-3} max={3} step={0.1} label="θ₁" />
			<Slider bind:value={thetaY} min={-3} max={3} step={0.1} label="θ₂" />
		</div>
	</SliderGrid>

	<div class="stat">‖∇f(θ)‖ = {gradNorm}</div>

	<!-- Chart: bars only, note moved OUT of this flex row -->
	<div class="chart-frame">
		{#each batchSizes as bs, i (i)}
			<div class="bar-column">
				<div class="bar-container">
					<div
						class="variance-bar"
						style:height="{Math.max(2, normVariances[i] * 100)}%"
						style:background-color={barColor(i)}
					>
						<span class="bar-value">{variances[i].toFixed(4)}</span>
					</div>
				</div>
				<div class="bar-label">
					{bs >= N_COMPONENTS ? 'Complet' : `B = ${bs}`}
				</div>
			</div>
		{/each}
	</div>

	<!-- Now a proper sibling block below the chart, not a stray flex item inside it -->
	<div class="reference-note">
		Variance théorique ∝ <span class="formula">σ² / B</span> — doublez B, divisez la variance par 2 (échelle
		logarithmique sur le graphique pour rester lisible malgré la décroissance rapide). Il s'agit ici d'un
		exemple avec un modèle à deux paramètres.
	</div>

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

	.stat {
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--color-text-muted);
		padding: 0.2rem 0.6rem;
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
