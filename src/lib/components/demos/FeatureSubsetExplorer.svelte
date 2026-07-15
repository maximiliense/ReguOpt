<script lang="ts">
	import { onDestroy } from 'svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import HeatmapGrid from '$lib/components/charts/HeatmapGrid.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import Metrics from '$lib/components/layout/Metrics.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import Button from '$lib/components/controls/Button.svelte';
	import { buildDecisionStump } from '$lib/math/random-forest';

	const N_TRAIN = 300;
	const N_TEST = 200;
	const BOOTSTRAP_SAMPLES = 60;

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

	function generateSyntheticData(d: number, seed: number) {
		const rng = makeRng(seed);
		const n = N_TRAIN + N_TEST;

		const Z: number[][] = Array.from({ length: n }, () =>
			Array.from({ length: d }, () => randn(rng))
		);
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

		const y = Array.from({ length: n }, (_, i) => {
			const score = X[i][0] + 0.8 * X[i][2];
			const p = 1 / (1 + Math.exp(-score));
			return rng() < p ? 1 : 0;
		});

		// FIX: precompute each feature's mean ONCE, outside the pairwise loop.
		// The previous version recomputed meanA via a fresh O(n) reduce on
		// EVERY (a,b) pair sharing the same a — for d=20 that's roughly 100k
		// wasted reduce operations per dataset generation, purely from
		// redundant recomputation of a value that only depends on `a`.
		const means = Array.from({ length: d }, (_, k) => {
			let s = 0;
			for (let i = 0; i < n; i++) s += X[i][k];
			return s / n;
		});

		const corrMatrix: number[][] = Array.from({ length: d }, () => Array(d).fill(0));
		for (let a = 0; a < d; a++) {
			for (let b = a; b < d; b++) {
				let sumXY = 0,
					sumX2 = 0,
					sumY2 = 0;
				const meanA = means[a];
				const meanB = means[b];
				for (let i = 0; i < n; i++) {
					const da = X[i][a] - meanA;
					const db = X[i][b] - meanB;
					sumXY += da * db;
					sumX2 += da * da;
					sumY2 += db * db;
				}
				const denom = Math.sqrt(sumX2 * sumY2);
				corrMatrix[a][b] = denom > 0 ? sumXY / denom : 0;
				if (a !== b) corrMatrix[b][a] = corrMatrix[a][b];
			}
			corrMatrix[a][a] = 1.0;
		}

		return { X, y, corrMatrix };
	}

	// ── State ──────────────────────────────────────────────
	// FIX (the main lag source): `dFeatures` now drives ONLY the slider's
	// displayed value, updating live and cheaply on every drag tick.
	// `committedD` is the value actually used to build the dataset AND run
	// the simulation — it only updates ~150ms after the slider stops moving.
	// The old version computed the O(d²·n) correlation matrix directly from
	// the live slider value, so EVERY drag tick triggered a full, expensive
	// dataset rebuild — this is what made dragging feel laggy even after the
	// simulation itself was debounced.
	let dFeatures = $state(8);
	const committedDInitial = 8;
	let committedD = $state(committedDInitial);
	let dataSeed = $state(0);

	const D_MIN = 4;
	const D_MAX = 20;

	const pendingChange = $derived(dFeatures !== committedD);

	let commitTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		void dFeatures;
		if (commitTimer !== null) clearTimeout(commitTimer);
		commitTimer = setTimeout(() => {
			committedD = dFeatures;
		}, 150);
	});

	// Only recomputed when committedD or dataSeed actually change — never
	// during a live drag.
	const allData = $derived(generateSyntheticData(committedD, dataSeed * 7919 + 42));

	let trainErrors = $state<number[]>([]);
	let testErrors = $state<number[]>([]);
	let simTargetD = $state(committedDInitial);
	let simProgress = $state(0);
	let simulating = $state(false);

	let runId = 0;

	function runSimulation() {
		const myRunId = ++runId;
		const d = committedD;
		const { X, y } = allData;

		const trainX = X.slice(0, N_TRAIN);
		const trainY = y.slice(0, N_TRAIN);
		const testX = X.slice(N_TRAIN);
		const testY = y.slice(N_TRAIN);

		trainErrors = [];
		testErrors = [];
		simTargetD = d;
		simProgress = 0;
		simulating = true;

		function computeForM(mVal: number) {
			let totalTrainErr = 0,
				totalTestErr = 0;

			for (let b = 0; b < BOOTSTRAP_SAMPLES; b++) {
				const rng = makeRng(b * 9973 + mVal * 104729);

				const bootIndices: number[] = Array.from({ length: N_TRAIN }, () =>
					Math.floor(rng() * N_TRAIN)
				);
				const bootX = bootIndices.map((i) => trainX[i]);
				const bootY = bootIndices.map((i) => trainY[i]);

				const allFeatures = Array.from({ length: d }, (_, i) => i);
				shuffle(allFeatures, rng);
				const selectedFeatures = allFeatures.slice(0, mVal);

				const stump = buildDecisionStump(bootX, bootY, selectedFeatures, true);

				const predictSample = (sx: number[][], sy: number[]): number => {
					let correct = 0;
					for (let i = 0; i < sx.length; i++) {
						const pred =
							sx[i][stump.featureIdx] <= stump.threshold
								? Math.round(stump.leftValue)
								: Math.round(stump.rightValue);
						if (pred === sy[i]) correct++;
					}
					return 1 - correct / sx.length;
				};

				totalTrainErr += predictSample(bootX, bootY);
				totalTestErr += predictSample(testX, testY);
			}

			return {
				trainErr: totalTrainErr / BOOTSTRAP_SAMPLES,
				testErr: totalTestErr / BOOTSTRAP_SAMPLES
			};
		}

		// FIX: chunks are now dispatched via requestAnimationFrame instead of
		// setTimeout(0). Zero-delay timeouts can be coalesced by the browser
		// without ever yielding to a paint, which made the "progressive"
		// build feel like it stuttered rather than animated smoothly.
		// requestAnimationFrame guarantees each chunk lands on its own frame.
		function stepM(mVal: number) {
			if (myRunId !== runId) return;
			if (mVal > d) {
				simulating = false;
				return;
			}
			const { trainErr, testErr } = computeForM(mVal);
			trainErrors = [...trainErrors, trainErr];
			testErrors = [...testErrors, testErr];
			simProgress = mVal;
			requestAnimationFrame(() => stepM(mVal + 1));
		}

		stepM(1);
	}

	$effect(() => {
		void committedD;
		void dataSeed;
		runSimulation();
	});

	onDestroy(() => {
		if (commitTimer !== null) clearTimeout(commitTimer);
		runId++;
	});

	const optimalM = $derived.by(() => {
		if (testErrors.length === 0) return 1;
		let bestIdx = 0;
		for (let i = 1; i < testErrors.length; i++) {
			if (testErrors[i] < testErrors[bestIdx]) bestIdx = i;
		}
		return bestIdx + 1;
	});

	const sqrtD = $derived(Math.round(Math.sqrt(committedD)));

	const avgCorrelation = $derived.by(() => {
		let sumAbs = 0,
			count = 0;
		for (let i = 0; i < committedD; i++) {
			for (let j = i + 1; j < committedD; j++) {
				sumAbs += Math.abs(allData.corrMatrix[i][j]);
				count++;
			}
		}
		return count > 0 ? sumAbs / count : 0;
	});

	const biasVarianceGap = $derived(
		testErrors.length > 0 && trainErrors.length > 0 ? testErrors[0] - trainErrors[0] : 0
	);

	const lineSeries = $derived.by(() => [
		{ values: trainErrors, color: 'var(--color-belief)', label: 'Erreur train' },
		{ values: testErrors, color: 'var(--color-surprise)', label: 'Erreur test' }
	]);

	const progressPct = $derived(Math.round((simProgress / Math.max(1, simTargetD)) * 100));

	function regenerate() {
		dataSeed += 1;
	}
</script>

<div class="demo-wrap">
	<div class="header">
		<h2>Exploration de la taille du sous-ensemble de features (m)</h2>
		<p class="subtitle">
			Comment le choix de <strong>m</strong> (features aléatoires par split) affecte-t-il les erreurs
			d'entraînement et de généralisation ?
		</p>
	</div>

	<div class="charts-row">
		<div class="heatmap-figure">
			<Figure type="chart">
				<HeatmapGrid data={allData.corrMatrix} colorScale="rose" showValues={committedD <= 10} />
				{#snippet caption()}
					{committedD} features (|ρ̄| = {avgCorrelation.toFixed(2)})
				{/snippet}
			</Figure>
		</div>

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
					{#if simulating}
						Construction en cours… m = {simProgress}/{simTargetD} ({progressPct}%)
					{:else}
						Moyenne sur {BOOTSTRAP_SAMPLES} stumps bootstrap par m | Optimum empirique : m = {optimalM}
					{/if}
				{/snippet}
			</Figure>
		</div>
	</div>

	<div class="status-row">
		{#if simulating}
			<div class="progress-bar">
				<div class="progress-fill" style:width="{progressPct}%"></div>
			</div>
			<span class="progress-pct">{progressPct}%</span>
		{:else if pendingChange}
			<span class="pending-note">
				<span class="pending-dot"></span>
				d = {dFeatures} en attente — mise à jour dans un instant…
			</span>
		{:else}
			<span class="status-idle">✓ À jour</span>
		{/if}
	</div>

	<Metrics align="center">
		<div class="cell">
			<span class="label">m optimal (empirique)</span>
			<span class="value" style:color="var(--color-positive)">{optimalM}</span>
			<span class="unit">erreur test min</span>
		</div>

		<div class="cell">
			<span class="label">√d (règle empirique)</span>
			<span class="value" style:color="var(--color-belief)">{sqrtD}</span>
			<span class="unit">≈ √{committedD}</span>
		</div>

		<div class="cell">
			<span class="label">Erreur test @ m optimal</span>
			<span class="value" style:color="var(--color-surprise)">
				{testErrors.length ? `${(testErrors[optimalM - 1] * 100).toFixed(1)}%` : '…'}
			</span>
			<span class="unit">sur {N_TEST} échantillons</span>
		</div>

		<div class="cell">
			<span class="label">Écart train/test (m=1)</span>
			<span class="value" style:color="var(--color-text)">
				{trainErrors.length ? `${(biasVarianceGap * 100).toFixed(1)}%` : '…'}
			</span>
			<span class="unit">overfitting du stump</span>
		</div>

		<div class="cell">
			<span class="label">Corrélation moy.</span>
			<span class="value" style:color="var(--color-surprise)">{avgCorrelation.toFixed(3)}</span>
			<span class="unit">|ρ̄| hors diagonale</span>
		</div>
	</Metrics>

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

	<div class="insight-box">
		<span class="icon">🔍</span>
		<p>
			Quand les features sont <strong>corrélées</strong> et que certaines sont
			<strong>inutiles</strong>, sélectionner un petit sous-ensemble aléatoire (<strong
				>m &lt; d</strong
			>) crée de la diversité entre arbres. C'est pourquoi le Random Forest utilise typiquement
			<strong>m ≈ √d = {sqrtD}</strong> : c'est un bon compromis qui évite à la fois l'oubli des features
			importantes (m trop petit) et le bruit introduit par les features inutiles (m = d). L'erreur test
			forme souvent une courbe en U inversé — regardez-la se construire point par point ci-dessus.
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

	.charts-row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1rem;
		width: 100%;
		max-width: 720px;
		align-items: stretch;
		justify-content: center;
	}

	.heatmap-figure {
		flex: 0 1 200px;
		min-width: 170px;
		max-width: 220px;
	}

	.heatmap-figure :global(figure) {
		margin: 0;
	}

	.linechart-figure {
		flex: 1 1 320px;
		min-width: 280px;

		:global(figure) {
			margin: 0;
		}
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		max-width: 720px;
		font-size: 0.75rem;
		min-height: 1.2rem;
	}

	.progress-bar {
		flex: 1;
		height: 5px;
		background: var(--color-surface-2);
		border-radius: 3px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: var(--color-belief);
		transition: width 0.1s linear;
	}
	.progress-pct {
		font-family: var(--font-mono, monospace);
		color: var(--color-text-muted);
		min-width: 2.5em;
		text-align: right;
	}

	.pending-note {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-text-muted);
		font-style: italic;
	}
	.pending-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-surprise);
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}

	.status-idle {
		color: var(--color-positive);
		font-family: var(--font-mono, monospace);
	}

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

	@media (max-width: 560px) {
		.info-label {
			margin-left: 0;
		}
	}
</style>
