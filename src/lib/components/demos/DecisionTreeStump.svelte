<script lang="ts">
	import Figure from '$lib/components/charts/Figure.svelte';
	import Metrics from '$lib/components/layout/Metrics.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import Button from '$lib/components/controls/Button.svelte';
	import { buildDecisionStump, giniImpurity, informationGain } from '$lib/math/random-forest';

	// ─── Constants ──────────────────────────────────────────────────────
	const N_SAMPLES = 80;
	const DATA_MIN = -3.5;
	const DATA_MAX = 3.5;

	// SVG dimensions
	const SVG_W = 460;
	const SVG_H = 360;
	const PAD = { top: 20, right: 20, bottom: 35, left: 40 };
	const PLOT_W = SVG_W - PAD.left - PAD.right;
	const PLOT_H = SVG_H - PAD.top - PAD.bottom;

	// ─── Seeded RNG (Lehmer / MINSTD) ──────────────────────────────────
	function makeRng(seed: number): () => number {
		let s = ((seed % 2147483647) + 2147483647) % 2147483647 || 1;
		return () => {
			s = (s * 16807) % 2147483647;
			return (s - 1) / 2147483646; // [0, 1)
		};
	}

	function randn(rng: () => number): number {
		let u1 = rng(),
			u2 = rng();
		while (u1 === 0) u1 = rng();
		return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	}

	// ─── Data generation: two Gaussian clusters ────────────────────────
	function generateData(seed: number): { X: number[][]; y: number[] } {
		const rng = makeRng(seed);
		const X: number[][] = [];
		const y: number[] = [];

		const half = Math.floor(N_SAMPLES / 2);

		// Class 0 cluster centered at (-1, -1)
		for (let i = 0; i < half; i++) {
			X.push([-1 + randn(rng) * 1.2, -1 + randn(rng) * 1.2]);
			y.push(0);
		}

		// Class 1 cluster centered at (1, 1)
		for (let i = 0; i < N_SAMPLES - half; i++) {
			X.push([1 + randn(rng) * 1.2, 1 + randn(rng) * 1.2]);
			y.push(1);
		}

		return { X, y };
	}

	// ─── State ──────────────────────────────────────────────────────────
	let seed = $state(0); // increment to regenerate data / retrain stump
	let mTry = $state(1); // feature subset size (1 or 2)

	const MAX_ITERATIONS = 30;

	// ─── Derived: dataset ──────────────────────────────────────────────
	const data = $derived(generateData(seed * 7919 + 42));

	// ─── Derived: feature subset for Random Forest behaviour ────────────
	const featureSubset = $derived.by(() => {
		if (mTry >= 2) return [0, 1]; // all features
		const rng = makeRng(seed * 31 + 7);
		return [Math.floor(rng() * 2)]; // random single feature
	});

	// ─── Derived: trained stump ────────────────────────────────────────
	const stump = $derived.by(() => {
		return buildDecisionStump(data.X, data.y, featureSubset, true);
	});

	// ─── Derived: predictions & accuracy ───────────────────────────────
	const leftCount = $derived(data.X.filter((x) => x[stump.featureIdx] <= stump.threshold).length);

	const rightCount = $derived(N_SAMPLES - leftCount);

	const accuracy = $derived.by(() => {
		let correct = 0;
		for (let i = 0; i < N_SAMPLES; i++) {
			const pred =
				data.X[i][stump.featureIdx] <= stump.threshold
					? Math.round(stump.leftValue)
					: Math.round(stump.rightValue);
			if (pred === data.y[i]) correct++;
		}
		return correct / N_SAMPLES;
	});

	// ─── Derived: left/right label sets for impurity metrics ────────────
	const leftLabels = $derived(
		data.X.map((x, i) => ({ x, yi: data.y[i] }))
			.filter((d) => d.x[stump.featureIdx] <= stump.threshold)
			.map((d) => d.yi)
	);

	const rightLabels = $derived(
		data.X.map((x, i) => ({ x, yi: data.y[i] }))
			.filter((d) => d.x[stump.featureIdx] > stump.threshold)
			.map((d) => d.yi)
	);

	const giniBefore = $derived(giniImpurity(data.y));
	const giniLeft = $derived(giniImpurity(leftLabels));
	const giniRight = $derived(giniImpurity(rightLabels));
	const giniAfter = $derived((leftCount * giniLeft + rightCount * giniRight) / N_SAMPLES);
	const infoGainVal = $derived(informationGain(data.y, leftLabels, rightLabels));

	// ─── SVG projection helpers ────────────────────────────────────────
	function projX(v: number): number {
		return PAD.left + ((v - DATA_MIN) / (DATA_MAX - DATA_MIN)) * PLOT_W;
	}
	function projY(v: number): number {
		return SVG_H - PAD.bottom - ((v - DATA_MIN) / (DATA_MAX - DATA_MIN)) * PLOT_H;
	}

	// ─── Derived: visual properties ────────────────────────────────────
	const splitsOnFeature = $derived(stump.featureIdx === 0 ? 'x₁' : 'x₂');
	const isHorizontalSplit = $derived(stump.featureIdx === 1);

	const leftPredClass = $derived(Math.round(stump.leftValue));
	const rightPredClass = $derived(Math.round(stump.rightValue));

	// ─── Controls ──────────────────────────────────────────────────────
	function step() {
		if (seed < MAX_ITERATIONS) seed += 1;
	}
	function reset() {
		seed = 0;
	}
</script>

<div class="demo-wrap">
	<!-- Header -->
	<div class="header">
		<h2>Décision Stump — arbre de profondeur 1</h2>
		<p class="subtitle">
			Une seule question sur une seule variable pour séparer deux classes. C'est l'unité de base
			d'AdaBoost et des Random Forests.
		</p>
	</div>

	<!-- Chart -->
	<Figure type="chart">
		<svg
			viewBox={`0 0 ${SVG_W} ${SVG_H}`}
			class="scatter-svg"
			role="img"
			aria-label="Nuage de points avec frontière de décision du stump"
		>
			<!-- Grid lines -->
			<g class="grid">
				{#each Array.from({ length: 8 }, (_, i) => DATA_MIN + (i / 7) * (DATA_MAX - DATA_MIN)) as tick}
					<line x1={projX(tick)} y1={PAD.top} x2={projX(tick)} y2={SVG_H - PAD.bottom} />
					<line x1={PAD.left} y1={projY(tick)} x2={SVG_W - PAD.right} y2={projY(tick)} />
				{/each}
			</g>

			<!-- Decision regions -->
			{#if isHorizontalSplit}
				<rect
					x={PAD.left}
					y={SVG_H - PAD.bottom}
					width={PLOT_W}
					height={projY(stump.threshold) - (SVG_H - PAD.bottom)}
					class="region region-left"
					class:is-class-0={leftPredClass === 0}
					class:is-class-1={leftPredClass === 1}
				/>
				<rect
					x={PAD.left}
					y={projY(stump.threshold)}
					width={PLOT_W}
					height={PAD.top - projY(stump.threshold) + PLOT_H}
					class="region region-right"
					class:is-class-0={rightPredClass === 0}
					class:is-class-1={rightPredClass === 1}
				/>
			{:else}
				<rect
					x={PAD.left}
					y={PAD.top}
					width={projX(stump.threshold) - PAD.left}
					height={PLOT_H}
					class="region region-left"
					class:is-class-0={leftPredClass === 0}
					class:is-class-1={leftPredClass === 1}
				/>
				<rect
					x={projX(stump.threshold)}
					y={PAD.top}
					width={SVG_W - PAD.right - projX(stump.threshold)}
					height={PLOT_H}
					class="region region-right"
					class:is-class-0={rightPredClass === 0}
					class:is-class-1={rightPredClass === 1}
				/>
			{/if}

			<!-- Decision boundary line -->
			{#if isHorizontalSplit}
				<line
					x1={PAD.left}
					y1={projY(stump.threshold)}
					x2={SVG_W - PAD.right}
					y2={projY(stump.threshold)}
					class="boundary"
				/>
			{:else}
				<line
					x1={projX(stump.threshold)}
					y1={PAD.top}
					x2={projX(stump.threshold)}
					y2={SVG_H - PAD.bottom}
					class="boundary"
				/>
			{/if}

			<!-- Data points -->
			{#each data.X as point, i}
				<circle
					cx={projX(point[0])}
					cy={projY(point[1])}
					r={3.5}
					class="dot"
					class:is-class-0={data.y[i] === 0}
					class:is-class-1={data.y[i] === 1}
				/>
			{/each}

			<!-- Axes labels -->
			<text x={SVG_W / 2} y={SVG_H - 4} class="axis-label" text-anchor="middle">x₁</text>
			<text
				x={12}
				y={SVG_H / 2}
				class="axis-label"
				text-anchor="middle"
				transform={`rotate(-90, 12, ${SVG_H / 2})`}>x₂</text
			>

			<!-- Threshold annotation -->
			{#if isHorizontalSplit}
				<rect
					x={SVG_W - PAD.right + 2}
					y={projY(stump.threshold) - 8}
					width="52"
					height="16"
					rx="3"
					class="annotation-bg"
				/>
				<text x={SVG_W - PAD.right + 7} y={projY(stump.threshold) + 4} class="annotation-text"
					>x₂ ≤ {stump.threshold.toFixed(2)}</text
				>
			{:else}
				<rect
					x={projX(stump.threshold) + 3}
					y={PAD.top - 18}
					width="56"
					height="16"
					rx="3"
					class="annotation-bg"
				/>
				<text x={projX(stump.threshold) + 8} y={PAD.top - 5} class="annotation-text"
					>x₁ ≤ {stump.threshold.toFixed(2)}</text
				>
			{/if}

			<!-- Stump info badge inside chart -->
			<g transform={`translate(${SVG_W / 2}, ${PAD.top - 4})`}>
				<rect x="-75" y="-10" width="150" height="20" rx="4" class="badge-bg" />
				<text x="0" y="3" text-anchor="middle" class="badge-text"
					>Split: ${splitsOnFeature} ≤ {stump.threshold.toFixed(2)}</text
				>
			</g>
		</svg>

		{#snippet caption()}
			Itération #{seed + 1} | m = {mTry} feature{mTry > 1 ? 's' : ''} sur 2 | Données : {N_SAMPLES} échantillons
			(2 classes)
		{/snippet}
	</Figure>

	<!-- Stump Parameters Panel -->
	<div class="stump-params">
		<div class="param-cell">
			<span class="label">Feature</span>
			<span class="value mono">{splitsOnFeature}</span>
		</div>
		<div class="param-cell">
			<span class="label">Seuil</span>
			<span class="value mono">{stump.threshold.toFixed(3)}</span>
		</div>
		<div class="param-cell">
			<span class="label">← Préd.</span>
			<span
				class="value"
				style:color={leftPredClass === 0 ? 'var(--color-surprise)' : 'var(--color-positive)'}
				>{leftPredClass}</span
			>
		</div>
		<div class="param-cell">
			<span class="label">Préd. →</span>
			<span
				class="value"
				style:color={rightPredClass === 0 ? 'var(--color-surprise)' : 'var(--color-positive)'}
				>{rightPredClass}</span
			>
		</div>
		<div class="param-cell">
			<span class="label">Échantillons</span>
			<span class="value mono">{leftCount} / {rightCount}</span>
		</div>
	</div>

	<!-- Metrics Panel -->
	<Metrics align="center">
		<div class="cell">
			<span class="label">Précision</span>
			<span class="value" style:color="var(--color-positive)">{(accuracy * 100).toFixed(1)}%</span>
			<span class="unit">{Math.round(accuracy * N_SAMPLES)}/{N_SAMPLES} corrects</span>
		</div>

		<div class="cell">
			<span class="label">Gini avant</span>
			<span class="value" style:color="var(--color-surprise)">{giniBefore.toFixed(3)}</span>
			<span class="unit">impureté globale</span>
		</div>

		<div class="cell">
			<span class="label">Gini après</span>
			<span class="value" style:color="var(--color-belief)">{giniAfter.toFixed(3)}</span>
			<span class="unit"
				>pondéré {leftCount}×{giniLeft.toFixed(2)} + {rightCount}×{giniRight.toFixed(2)}</span
			>
		</div>

		<div class="cell">
			<span class="label">Gain info.</span>
			<span class="value" style:color="var(--color-positive)">{infoGainVal.toFixed(3)}</span>
			<span class="unit">bits d'entropie</span>
		</div>
	</Metrics>

	<!-- Controls -->
	<div class="controls-panel">
		<Slider bind:value={mTry} min={1} max={2} step={1} label="Taille sous-ensemble (m)" />

		<div class="actions-row">
			<Button variant="outline" size="sm" onclick={reset}>⟲ Reset</Button>
			<Button variant="primary" size="sm" onclick={step} disabled={seed >= MAX_ITERATIONS}
				>▶ Prochain stump</Button
			>
			<span class="iter-label"># {seed + 1} / {MAX_ITERATIONS + 1}</span>
		</div>
	</div>

	<!-- Insight box -->
	<div class="insight-box">
		<span class="icon">🌲</span>
		<p>
			Dans un <strong>Random Forest</strong>, chaque arbre reçoit un sous-ensemble aléatoire de {mTry}
			feature{mTry > 1 ? 's' : ''}. Cette <strong>sélection aléatoire des variables</strong> crée de
			la diversité entre les arbres : même sur les mêmes données, les stumps choisissent des seuils
			différents. En moyennant {mTry >= 2 ? 'tous les features' : 'une seule feature'}, on obtient
			un modèle qui {mTry === 1
				? "diversifie mais peut manquer d'information"
				: "utilise toute l'information disponible"} — c'est le compromis
			<strong>biais-variance</strong> des forêts aléatoires.
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

	/* ─── SVG scatter plot ────────────────────────────────────────── */
	.scatter-svg {
		width: 100%;
		height: auto;
	}

	.grid line {
		stroke: var(--color-border);
		stroke-opacity: 0.4;
		stroke-width: 0.5;
	}

	.axis-label {
		font-size: 12px;
		fill: var(--color-text-muted);
		font-family: var(--font-mono, monospace);
	}

	/* Decision regions */
	.region {
		opacity: 0.12;
		transition: fill 0.3s ease;
	}
	.region.is-class-0 {
		fill: var(--color-surprise);
	}
	.region.is-class-1 {
		fill: var(--color-positive);
	}

	/* Decision boundary line */
	.boundary {
		stroke: var(--color-belief);
		stroke-width: 2.5;
		stroke-dasharray: none;
		filter: drop-shadow(0 0 3px color-mix(in srgb, var(--color-belief) 40%, transparent));
	}

	/* Data points */
	.dot.is-class-0 {
		fill: var(--color-surprise);
		stroke: white;
		stroke-width: 1;
	}
	.dot.is-class-1 {
		fill: var(--color-positive);
		stroke: white;
		stroke-width: 1;
	}

	/* Threshold annotation */
	.annotation-bg {
		fill: var(--color-surface-2);
		stroke: var(--color-border);
		stroke-width: 0.5;
	}
	.annotation-text {
		font-size: 9px;
		fill: var(--color-belief);
		font-family: var(--font-mono, monospace);
	}

	/* Stump info badge */
	.badge-bg {
		fill: var(--color-surface-2);
		stroke: var(--color-border);
		stroke-width: 0.8;
	}
	.badge-text {
		font-size: 10px;
		fill: var(--color-text);
		font-family: var(--font-mono, monospace);
	}

	/* ─── Stump Parameters Panel ────────────────────────────────────── */
	.stump-params {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		max-width: 480px;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		flex-wrap: wrap;
	}

	.param-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		min-width: 60px;
	}

	.param-cell .label {
		font-size: 0.625rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: var(--font-mono, monospace);
	}

	.param-cell .value {
		font-family: var(--font-mono, monospace);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-text);
	}

	.mono {
		font-family: var(--font-mono, monospace);
	}

	/* ─── Controls panel ────────────────────────────────────────────── */
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
		gap: 0.5rem;
	}

	.iter-label {
		font-family: var(--font-mono, monospace);
		font-size: 0.78rem;
		color: var(--color-text-muted);
		margin-left: auto;
	}

	/* ─── Insight box ───────────────────────────────────────────── */
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
