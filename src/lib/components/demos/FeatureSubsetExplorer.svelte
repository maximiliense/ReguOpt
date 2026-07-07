<script lang="ts">
	import Figure from '$lib/components/charts/Figure.svelte';
	import HeatmapGrid from '$lib/components/charts/HeatmapGrid.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import Metrics from '$lib/components/layout/Metrics.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import Button from '$lib/components/controls/Button.svelte';
	import { buildDecisionStump } from '$lib/math/random-forest';

	// ─── Constants ──────────────────────────────────────────────
	const N_TRAIN = 300;
	const N_TEST = 200;
	const BOOTSTRAP_SAMPLES = 60; // per m value

	// ─── Seeded RNG (Lehmer / MINSTD) ──────────────────────────
	function makeRng(seed: number): () => number {
		let s = ((seed % 2147483647) + 2147483647) % 2147483647 || 1;
		return () => {
			s = (s * 16807) % 2147483647;
			return (s - 1) / 2147483646;
		};
	}

	function randn(rng: () => number): number {
		let u1 = rng(),
			u2 = rng();
		while (u1 === 0) u1 = rng();
		return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	}

	function shuffle(arr: number[], rng: () => number): void {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}

	// ─── Synthetic data generation with correlated features ─────
	function generateSyntheticData(d: number, seed: number) {
		const rng = makeRng(seed);
		const n = N_TRAIN + N_TEST;

		// Generate d independent base features ~N(0,1)
		const Z: number[][] = Array.from({ length: n }, () =>
			Array.from({ length: d }, () => randn(rng))
		);

		// Create correlations by mixing:
		// Features 0 & 1 highly correlated (rho ≈ 0.85)
		// Features 2 & 3 moderately correlated (rho ≈ 0.6)
		// Rest stay independent
		const X = Z.map((row) => [...row]);

		if (d >= 2) {
			for (let i = 0; i < n; i++) {
				X[i][1] = 0.85 * Z[i][0] + Math.sqrt(1 - 0.85 ** 2) * randn(rng);
			}
		}

		if (d >= 4) {
			for (let i = 0; i < n; i++) {
				X[i][3] = 0.6 * Z[i][2] + Math.sqrt(1 - 0.6 ** 2) * randn(rng);
			}
		}

		if (d >= 5 && d % 2 === 1) {
			const a = d - 2,
				b = d - 1;
			for (let i = 0; i < n; i++) {
				X[i][b] = 0.7 * Z[i][a] + Math.sqrt(1 - 0.7 ** 2) * randn(rng);
			}
		}

		// Target: binary, depends only on features 0 and 2 (irrelevant noise in others)
		const y = Array.from({ length: n }, (_, i) => {
			const score = X[i][0] + 0.8 * X[i][2];
			return Math.random() < 1 / (1 + Math.exp(-score)) ? 1 : 0;
		});

		// Compute correlation matrix for the d features
		const corrMatrix: number[][] = Array.from({ length: d }, () => Array(d).fill(0));

		for (let a = 0; a < d; a++) {
			for (let b = a; b < d; b++) {
				let sumXY = 0,
					sumX2 = 0,
					sumY2 = 0;
				const meanA = X.reduce((s, row) => s + row[a], 0) / n;
				const meanB = X.reduce((s, row) => s + row[b], 0) / n;

				for (let i = 0; i < n; i++) {
					const da = X[i][a] - meanA;
					const db = X[i][b] - meanB;
					sumXY += da * db;
					sumX2 += da * da;
					sumY2 += db * db;
				}

				const denom = Math.sqrt(sumX2 * sumY2);
				corrMatrix[a][b] = denom > 0 ? sumXY / denom : 1;
				if (a !== b) corrMatrix[b][a] = corrMatrix[a][b];
			}
			corrMatrix[a][a] = 1.0;
		}

		return { X, y, corrMatrix };
	}

	// ─── Simulation: error curves vs m ──────────────────────
	function simulate(d: number, X: number[][], y: number[]) {
		const trainX = X.slice(0, N_TRAIN);
		const trainY = y.slice(0, N_TRAIN);
		const testX = X.slice(N_TRAIN);
		const testY = y.slice(N_TRAIN);

		const trainErrors: number[] = [];
		const testErrors: number[] = [];

		for (let mVal = 1; mVal <= d; mVal++) {
			let totalTrainErr = 0,
				totalTestErr = 0;

			for (let b = 0; b < BOOTSTRAP_SAMPLES; b++) {
				const rng = makeRng(b * 9973 + mVal * 104729);

				// Bootstrap sample indices for training data
				const bootIndices: number[] = Array.from({ length: N_TRAIN }, () =>
					Math.floor(rng() * N_TRAIN)
				);

				const bootX = bootIndices.map((i) => trainX[i]);
				const bootY = bootIndices.map((i) => trainY[i]);

				// Random feature subset of size mVal from d features
				const allFeatures = Array.from({ length: d }, (_, i) => i);
				shuffle(allFeatures, rng);
				const selectedFeatures = allFeatures.slice(0, Math.min(mVal, d));

				// Build stump on bootstrap sample with feature subset
				const stump = buildDecisionStump(bootX, bootY, selectedFeatures, true);

				// Evaluate predictions (classification: round the mean label)
				const predictSample = (sx: number[][], sy: number[]): number => {
					let correct = 0;
					for (let i = 0; i < sx.length; i++) {
						const pred =
							sx[i][stump.featureIdx] <= stump.threshold
								? Math.round(stump.leftValue)
								: Math.round(stump.rightValue);
						if (pred === sy[i]) correct++;
					}
					return 1 - correct / sx.length; // error rate
				};

				totalTrainErr += predictSample(bootX, bootY);
				totalTestErr += predictSample(testX.slice(0, N_TEST), testY.slice(0, N_TEST));
			}

			trainErrors.push(totalTrainErr / BOOTSTRAP_SAMPLES);
			testErrors.push(totalTestErr / BOOTSTRAP_SAMPLES);
		}

		return { trainErrors, testErrors };
	}

	// ─── State ──────────────────────────────────────────────
	let dFeatures = $state(8); // total features (4–20)
	let dataSeed = $state(0);

	const D_MIN = 4;
	const D_MAX = 20;

	// ─── Derived: dataset & simulation results ─────────────
	const allData = $derived(generateSyntheticData(dFeatures, dataSeed * 7919 + 42));

	const simResults = $derived.by(() => {
		return simulate(dFeatures, allData.X, allData.y);
	});

	// ─── Derived: optimal m (lowest test error) & metrics ──
	const optimalM = $derived.by(() => {
		let bestIdx = 0;
		for (let i = 1; i < simResults.testErrors.length; i++) {
			if (simResults.testErrors[i] < simResults.testErrors[bestIdx]) bestIdx = i;
		}
		return bestIdx + 1; // 1-indexed
	});

	const sqrtD = $derived(Math.round(Math.sqrt(dFeatures)));

	// Average off-diagonal correlation strength (absolute value)
	const avgCorrelation = $derived.by(() => {
		let sumAbs = 0,
			count = 0;
		for (let i = 0; i < dFeatures; i++) {
			for (let j = i + 1; j < dFeatures; j++) {
				sumAbs += Math.abs(allData.corrMatrix[i][j]);
				count++;
			}
		}
		return count > 0 ? sumAbs / count : 0;
	});

	const biasVarianceGap = $derived(
		simResults.testErrors[0] - simResults.trainErrors[0] // gap at m=1
	);

	// ─── Derived: LineChart series ──────────────────────
	const lineSeries = $derived.by(() => [
		{
			values: simResults.trainErrors,
			color: 'var(--color-belief)',
			label: `Erreur train`
		},
		{
			values: simResults.testErrors,
			color: 'var(--color-surprise)',
			label: `Erreur test`
		}
	]);

	// ─── Controls ──────────────────────────────────────
	function regenerate() {
		dataSeed += 1;
	}
</script>

<div class="demo-wrap">
	<!-- Header -->
	<div class="header">
		<h2>Exploration de la taille du sous-ensemble de features (m)</h2>
		<p class="subtitle">
			Comment le choix de <strong>m</strong> (features aléatoires par split) affecte-t-il les erreurs
			d'entraînement et de généralisation ?
		</p>
	</div>

	<!-- Charts: Heatmap + LineChart side by side -->
	<div class="charts-row">
		<!-- Correlation heatmap (small, square) -->
		<div class="heatmap-figure">
			<Figure type="chart">
				<HeatmapGrid data={allData.corrMatrix} colorScale="rose" showValues={dFeatures <= 10} />

				{#snippet caption()}
					Matrice de corrélation entre les {dFeatures} features (|ρ̄| = {avgCorrelation.toFixed(2)})
				{/snippet}
			</Figure>
		</div>

		<!-- Error curve line chart -->
		<div class="linechart-figure">
			<Figure type="chart">
				<LineChart
					series={lineSeries}
					xLabel="m (taille du sous-ensemble)"
					yLabel="Erreur"
					width={320}
					height={240}
				/>

				{#snippet caption()}
					Erreur moyenne sur {BOOTSTRAP_SAMPLES} stumps bootstrap par valeur de m | Optimum empirique
					: m = {optimalM}
				{/snippet}
			</Figure>
		</div>
	</div>

	<!-- Metrics Panel -->
	<Metrics align="center">
		<div class="cell">
			<span class="label">m optimal (empirique)</span>
			<span class="value" style:color="var(--color-positive)">{optimalM}</span>
			<span class="unit">erreur test min</span>
		</div>

		<div class="cell">
			<span class="label">√d (règle empirique)</span>
			<span class="value" style:color="var(--color-belief)">{sqrtD}</span>
			<span class="unit">≈ √{dFeatures}</span>
		</div>

		<div class="cell">
			<span class="label">Erreur test @ m optimal</span>
			<span class="value" style:color="var(--color-surprise)"
				>{(simResults.testErrors[optimalM - 1] * 100).toFixed(1)}%</span
			>
			<span class="unit">sur {N_TEST} échantillons</span>
		</div>

		<div class="cell">
			<span class="label">Écart train/test (m=1)</span>
			<span class="value" style:color="var(--color-text)"
				>{(biasVarianceGap * 100).toFixed(1)}%</span
			>
			<span class="unit">overfitting du stump</span>
		</div>

		<div class="cell">
			<span class="label">Corrélation moy.</span>
			<span class="value" style:color="var(--color-surprise)">{avgCorrelation.toFixed(3)}</span>
			<span class="unit">|ρ̄| hors diagonale</span>
		</div>
	</Metrics>

	<!-- Controls -->
	<div class="controls-panel">
		<Slider
			bind:value={dFeatures}
			min={D_MIN}
			max={D_MAX}
			step={1}
			label="Nombre de features (d)"
		/>

		<div class="actions-row">
			<Button variant="outline" size="sm" onclick={regenerate}>🔄 Re-générer les données</Button>
			<span class="info-label"
				>Target dépend de x₀ et x₂ uniquement | {N_TRAIN + N_TEST} échantillons</span
			>
		</div>
	</div>

	<!-- Insight box -->
	<div class="insight-box">
		<span class="icon">🔍</span>
		<p>
			Quand les features sont <strong>corrélées</strong> et que certaines sont
			<strong>inutiles</strong>, sélectionner un petit sous-ensemble aléatoire (<strong
				>m &lt; d</strong
			>) crée de la diversité entre arbres. C'est pourquoi le Random Forest utilise typiquement
			<strong>m ≈ √d = {sqrtD}</strong> : c'est un bon compromis qui évite à la fois l'oubli des features
			importantes (m trop petit) et le bruit introduit par les features inutiles (m = d). L'erreur test
			forme souvent une courbe en U inversé.
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
		max-width: 720px;
	}

	.subtitle {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	/* ─── Two-column chart layout ──────────────────────── */
	.charts-row {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		width: 100%;
		max-width: 720px;
		align-items: stretch;
	}

	.heatmap-figure {
		flex-shrink: 0;
		width: 160px;
		min-width: 140px;
	}

	/* Make heatmap figure compact */
	.heatmap-figure :global(figure) {
		margin: 0;
	}

	.linechart-figure {
		flex: 1;
		min-width: 0;

		/* Make line chart figure compact */
		:global(figure) {
			margin: 0;
		}
	}

	/* ─── Controls panel ────────────────────────────── */
	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 720px;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2);
	}

	.actions-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.info-label {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		color: var(--color-text-muted);
		margin-left: auto;
	}

	/* ─── Insight box ────────────────────────────── */
	.insight-box {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		padding: 0.65rem 1rem;
		background: color-mix(in srgb, var(--color-belief) 8%, transparent);
		border-radius: 6px;
		width: 100%;
		max-width: 720px;
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
