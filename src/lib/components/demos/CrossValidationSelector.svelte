<script lang="ts">
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import { crossValidateRidge, generateSyntheticData } from '$lib/math/bias-variance.js';
	import { polyEval, ridgeSolver, polynomialFeatures } from '$lib/math/bias-variance.js';

	// Controls
	let degree = $state(5);
	let kFolds = $state(5);
	let numSamples = $state(100);

	const maxDegree = 8;

	// Generate data and compute CV scores
	const synthData = $derived.by(() => generateSyntheticData(numSamples, 0.3));

	const lambdas = $derived(
		Array.from({ length: 150 }, (_, i) => {
			return Math.exp(-8 + 16 * (i / 149));
		})
	);

	// ── Cross-validation with per-fold MSEs → mean + std ──────────────
	const cvResult = $derived.by(() => {
		const n = synthData.xs.length;
		const k = kFolds;
		const foldSize = Math.floor(n / k);

		// Build folds (sequential for reproducibility)
		const folds: Array<{ trainIdx: number[]; valIdx: number[] }> = [];
		for (let f = 0; f < k; f++) {
			const valStart = f * foldSize;
			const valEnd = f === k - 1 ? n : (f + 1) * foldSize;
			const valIdx = Array.from({ length: valEnd - valStart }, (_, i) => valStart + i);
			const trainIdx = [
				...Array.from({ length: valStart }, (_, i) => i),
				...Array.from({ length: n - valEnd }, (_, i) => valEnd + i)
			];
			folds.push({ trainIdx, valIdx });
		}

		const cvScores: number[] = [];
		const cvStds: number[] = [];

		for (const lambda of lambdas) {
			const foldMses: number[] = [];

			for (const { trainIdx, valIdx } of folds) {
				const xsTr = trainIdx.map((i) => synthData.xs[i]);
				const ysTr = trainIdx.map((i) => synthData.ys[i]);
				const xsVal = valIdx.map((i) => synthData.xs[i]);
				const ysVal = valIdx.map((i) => synthData.ys[i]);

				const X = polynomialFeatures(xsTr, degree);
				const coeffs = ridgeSolver(X, ysTr, lambda);

				let foldMse = 0;
				for (let i = 0; i < xsVal.length; i++) {
					const pred = polyEval(coeffs, xsVal[i]);
					foldMse += (pred - ysVal[i]) ** 2;
				}
				foldMses.push(foldMse / xsVal.length);
			}

			// Mean across folds
			const mean = foldMses.reduce((a, b) => a + b, 0) / foldMses.length;
			cvScores.push(mean);

			// Standard deviation across folds (1-sigma band)
			const variance =
				foldMses.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (foldMses.length - 1 || 1);
			cvStds.push(Math.sqrt(variance));
		}

		return { lambdas, cvScores, cvStds };
	});

	// ── Training error (fit on full data, evaluate on same) ───────────
	const trainError = $derived.by(() => {
		const X = polynomialFeatures(synthData.xs, degree);
		return lambdas.map((lambda) => {
			const coeffs = ridgeSolver(X, synthData.ys, lambda);
			let mse = 0;
			for (let i = 0; i < synthData.xs.length; i++) {
				const pred = polyEval(coeffs, synthData.xs[i]);
				mse += (pred - synthData.ys[i]) ** 2;
			}
			return mse / synthData.xs.length;
		});
	});

	// ── Build chart curves ────────────────────────────────────────────
	const curves = $derived.by(() => {
		const pts: Array<{
			points: [number, number][];
			stroke?: string;
			strokeWidth?: number;
			fill?: string;
			fillOpacity?: number;
		}> = [];

		// Validation error curve with 1-sigma band (fill under mean)
		pts.push({
			points: lambdas.map((l, i) => [Math.log10(l), cvResult.cvScores[i]] as [number, number]),
			stroke: '#ef4444',
			strokeWidth: 2.5,
			fill: '#ef4444',
			fillOpacity: 0.15
		});

		// Training error curve (comparison)
		pts.push({
			points: lambdas.map((l, i) => [Math.log10(l), trainError[i]] as [number, number]),
			stroke: '#3b82f6',
			strokeWidth: 2.5,
			fill: '#3b82f6',
			fillOpacity: 0.1
		});

		return pts;
	});

	// ── Find optimal lambda (minimum CV error) ────────────────────────
	const optIdx = $derived.by(() => {
		let minIdx = 0,
			minVal = Infinity;
		for (let i = 0; i < cvResult.cvScores.length; i++) {
			if (cvResult.cvScores[i] < minVal) {
				minVal = cvResult.cvScores[i];
				minIdx = i;
			}
		}
		return minIdx;
	});

	const optLambda = $derived(lambdas[optIdx]);
	const optLog10Lambda = $derived(Math.log10(optLambda));

	// Vertical line at optimal lambda
	const vlines = $derived([
		{
			x: optLog10Lambda,
			stroke: '#22c55e',
			strokeWidth: 2,
			label: `λ* = ${optLambda.toFixed(3)}`,
			opacity: 0.8
		}
	]);

	const legend = $derived([
		{ label: 'Erreur validation (CV)', color: '#ef4444', kind: 'fill' as const },
		{ label: 'Erreur entraînement', color: '#3b82f6', kind: 'line' as const }
	]);

	// X domain for log10(lambda) axis
	const xDomain = $derived([-3, 1]);
</script>

<div class="cv-selector">
	<Figure type="chart">
		<DensityChart
			{curves}
			xDomain={xDomain as [number, number]}
			height={280}
			nTicks={6}
			yAxis={true}
			{vlines}
			{legend}
			chartLabel="Erreur quadratique"
		/>
	</Figure>

	<!-- Optimal lambda display -->
	<div class="opt-display">
		<span class="opt-label">λ optimal :</span>
		<span class="opt-value">{optLambda.toFixed(4)}</span>
		<span class="opt-desc">(min erreur validation : {cvResult.cvScores[optIdx].toFixed(4)})</span>
	</div>

	<!-- Controls -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Modèle</div>
			<Slider bind:value={degree} min={1} max={maxDegree} step={1} label="Degré polynôme" />
		</div>
		<div class="grp">
			<div class="gttl">Validation croisée</div>
			<Slider bind:value={kFolds} min={2} max={10} step={1} label="K (folds)" unit="folds" />
		</div>
	</SliderGrid>

	<p class="cap">
		La validation croisée partitionne les données en K folds. Pour chaque λ, on entraîne sur K-1
		folds et valide sur le fold restant — puis on moyenne. Le λ optimal minimise l'erreur de
		validation (ligne verte). L'erreur d'entraînement décroît toujours avec <KatexInline
			formula="\\lambda"
		/>
		(modèle plus simple = moins de bruit), mais la validation suit un U caractéristique : trop faible
		→ surajustement, trop fort → sous-ajustement.
	</p>
</div>

<style>
	.cv-selector {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.opt-display {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.82rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-2, transparent);
		border-radius: var(--radius-sm, 6px);
	}

	.opt-label {
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.opt-value {
		font-family: 'SF Mono', monospace;
		font-size: 0.9rem;
		font-weight: 700;
		color: #22c55e;
	}
	.opt-desc {
		margin-left: auto;
		color: var(--color-text-muted);
		font-size: 0.78rem;
		text-align: right;
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

	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}
</style>
