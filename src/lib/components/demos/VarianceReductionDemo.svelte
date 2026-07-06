<script lang="ts">
	import Figure from '$lib/components/charts/Figure.svelte';
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Metrics from '$lib/components/layout/Metrics.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import Button from '$lib/components/controls/Button.svelte';

	// ─── Constants ──────────────────────────────────────────────────────────────
	const N_POINTS = 100;
	const X_MIN = -3;
	const X_MAX = 3;
	const NOISE_STD = 1.2; // σ for individual model noise — visible but reasonable

	// Generate x grid shared by all models
	const xValues = Array.from({ length: N_POINTS }, (_, i) => {
		return X_MIN + (i / (N_POINTS - 1)) * (X_MAX - X_MIN);
	});

	// ─── True function ────────────────────────────────────────────────────────
	function trueFunction(x: number): number {
		return Math.sin(x) + 0.3 * x;
	}

	const truePoints = $derived(xValues.map((x): [number, number] => [x, trueFunction(x)]));

	// ─── Gaussian noise via Box-Muller ────────────────────────────────────────
	function randn(): number {
		let u1 = Math.random(),
			u2 = Math.random();
		while (u1 === 0) u1 = Math.random();
		return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	}

	// ─── State ────────────────────────────────────────────────────────────────
	let m = $state(5); // Number of models in the ensemble (1–50)
	let seed = $state(0); // Increment to regenerate noise

	const MAX_MODELS = 50;

	// ─── Model generation (lazy, memoized on seed change) ─────────────────────
	let rawModels: number[][] | null = null;
	let lastSeed = -1;

	function generateAllModels(): number[][] {
		const models: number[][] = [];
		for (let j = 0; j < MAX_MODELS; j++) {
			const preds: number[] = [];
			for (let i = 0; i < N_POINTS; i++) {
				preds.push(trueFunction(xValues[i]) + NOISE_STD * randn());
			}
			models.push(preds);
		}
		return models;
	}

	const models: number[][] = $derived.by(() => {
		if (seed !== lastSeed) {
			lastSeed = seed;
			rawModels = generateAllModels();
		}
		return rawModels! ?? generateAllModels();
	});

	// ─── Ensemble average of the first m models at each point ──────────────────
	const ensemblePoints: [number, number][] | null = $derived.by(() => {
		if (m <= 0 || !rawModels) return null;
		return xValues.map((_, i) => {
			let sum = 0;
			for (let j = 0; j < m; j++) sum += models[j][i];
			return [xValues[i], sum / m] as [number, number];
		});
	});

	// ─── Curves for DensityChart ──────────────────────────────────────────────
	const curves = $derived.by(() => {
		if (!rawModels || !ensemblePoints) return [];

		const result: Array<{
			points: [number, number][];
			stroke?: string;
			strokeWidth?: number;
			opacity?: number;
		}> = [];

		// ① Individual models — thin semi-transparent lines (render first, behind everything)
		for (let j = 0; j < m; j++) {
			const pts: [number, number][] = xValues.map((_, i) => [xValues[i], models[j][i]]);
			const hue = (j * 137.508 + 120) % 360; // Golden-angle spacing for good distribution
			// Opacity scales down as m increases so it stays readable
			const opacity = Math.max(0.04, 0.35 / Math.sqrt(m));
			result.push({ points: pts, stroke: `hsl(${hue}, 65%, 55%)`, strokeWidth: 0.7, opacity });
		}

		// ② Ensemble average — thick bold line (rendered after individuals)
		if (ensemblePoints.length > 0) {
			result.push({
				points: ensemblePoints,
				stroke: 'var(--color-positive)',
				strokeWidth: 3,
				opacity: 0.95
			});
		}

		// ③ True function — solid line drawn on top for clarity
		result.push({
			points: truePoints,
			stroke: 'var(--color-text)',
			strokeWidth: 2.5,
			opacity: 0.9
		});

		return result;
	});

	const legend = $derived.by(() => [
		{
			label: m === 1 ? '1 modèle' : `${m} modèles (individuels)`,
			color: `hsl(215, 65%, 55%)`,
			kind: 'line' as const
		},
		{ label: `Moyenne d'ensemble (m=${m})`, color: 'var(--color-positive)', kind: 'line' as const },
		{ label: 'Fonction vraie', color: 'var(--color-text)', kind: 'line' as const }
	]);

	// ─── Variance metrics (computed empirically) ──────────────────────────────
	const varianceMetrics = $derived.by(() => {
		if (!rawModels || m <= 0) {
			return { individualVar: 0, ensembleVar: 0, reductionRatio: 0, theoreticalReduction: 1 };
		}

		// Empirical individual variance: mean squared deviation of each model from truth, averaged over all points and models
		let sumIndividualMSE = 0;
		for (let j = 0; j < m; j++) {
			for (let i = 0; i < N_POINTS; i++) {
				const err = models[j][i] - trueFunction(xValues[i]);
				sumIndividualMSE += err * err;
			}
		}
		const individualVar = sumIndividualMSE / (m * N_POINTS);

		// Empirical ensemble variance: squared deviation of the ensemble from truth, averaged over all points
		let sumEnsembleMSE = 0;
		for (let i = 0; i < N_POINTS; i++) {
			const err = ensemblePoints![i][1] - trueFunction(xValues[i]);
			sumEnsembleMSE += err * err;
		}
		const ensembleVar = sumEnsembleMSE / N_POINTS;

		const reductionRatio = individualVar > 0 ? individualVar / ensembleVar : 0;
		const theoreticalReduction = m; // σ²_individual / (σ²/m) = m for independent unbiased models

		return { individualVar, ensembleVar, reductionRatio, theoreticalReduction };
	});

	// ─── Controls ──────────────────────────────────────────────────────────────
	function regenerate() {
		seed += 1;
	}
</script>

<div class="demo-wrap">
	<!-- Header -->
	<div class="header">
		<h2>Réduction de variance par agrégation d'ensembles</h2>
		<p class="subtitle">
			Moyenner <strong>m</strong> modèles indépendants et non biaisés réduit la variance par un
			facteur
			<strong>m</strong> — théorème fondamental du Bagging.
		</p>
	</div>

	<!-- Chart -->
	<Figure type="chart">
		<DensityChart
			{curves}
			height={280}
			xDomain={[X_MIN, X_MAX]}
			nTicks={7}
			yAxis={true}
			{legend}
			chartLabel="f(x) vs prédictions"
		/>

		{#snippet caption()}
			M = {m} modèles | σ² agrégé ≈ σ² / m = {varianceMetrics.ensembleVar.toFixed(3)}
		{/snippet}
	</Figure>

	<!-- Metrics panel -->
	<Metrics align="center">
		<div class="cell">
			<span class="label">σ² individuel</span>
			<span class="value" style:color="var(--color-surprise)"
				>{varianceMetrics.individualVar.toFixed(4)}</span
			>
			<span class="unit">MSE moyen</span>
		</div>

		<div class="cell">
			<span class="label">σ² agrégé</span>
			<span class="value" style:color="var(--color-positive)"
				>{varianceMetrics.ensembleVar.toFixed(4)}</span
			>
			<span class="unit">≈ σ² / {m}</span>
		</div>

		<div class="cell">
			<span class="label">Réduction ×</span>
			<span class="value" style:color="var(--color-belief)"
				>{varianceMetrics.reductionRatio.toFixed(1)}</span
			>
			<span class="unit">(théorique : {varianceMetrics.theoreticalReduction})</span>
		</div>
	</Metrics>

	<!-- Controls -->
	<div class="controls-panel">
		<Slider bind:value={m} min={1} max={MAX_MODELS} step={1} label="Nombre de modèles (m)" />

		<div class="actions-row">
			<Button variant="outline" size="sm" onclick={regenerate}>🔄 Re-générer le bruit</Button>

			<span class="noise-label">σ = {NOISE_STD}</span>
		</div>
	</div>

	<!-- Insight box -->
	<div class="insight-box">
		<span class="icon">💡</span>
		<p>
			Chaque modèle est <strong>non biaisé</strong> (E[ε]=0) mais bruyant. La moyenne d'ensemble
			converge vers la vraie fonction car les erreurs indépendantes se <strong>compensent</strong>.
			Avec <strong>{m}</strong> modèles, l'erreur quadratique est divisée par ~<strong
				>{Math.round(varianceMetrics.reductionRatio)}</strong
			>.
		</p>
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

	h2 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.header {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
		max-width: 480px;
	}

	.subtitle {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 480px;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2);
	}

	.actions-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.noise-label {
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--color-text-muted);
	}

	.insight-box {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		padding: 0.65rem 1rem;
		background: color-mix(in srgb, var(--color-belief) 8%, transparent);
		border-radius: 6px;
		width: 100%;
		max-width: 480px;
	}

	.insight-box p {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-text);
	}

	.icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}
</style>
