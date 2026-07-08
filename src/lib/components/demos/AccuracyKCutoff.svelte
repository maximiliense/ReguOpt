<script lang="ts">
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import { findOptimalK } from '$lib/math/prediction-sets';

	// ─── Constants ──────────────────────────────────────
	const NUM_SAMPLES = 40;
	const CLASSES = ['Chat', 'Chien', 'Oiseau', 'Poisson', 'Lapin'];
	const NUM_CLASSES = CLASSES.length;

	// ─── Seeded PRNG (deterministic demo data) ──────────
	function mulberry32(seed: number): () => number {
		return function () {
			let s = (seed |= 0);
			s = (s + 0x6d2b79f5) | 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function softmax(logits: number[]): number[] {
		const maxL = Math.max(...logits);
		const exps = logits.map((l) => Math.exp(l - maxL));
		const sum = exps.reduce((a, b) => a + b, 0);
		return exps.map((e) => e / sum);
	}

	// ─── Static base data (seeded once at module level) ──
	interface SampleBase {
		trueClass: number;
		baseLogits: number[];
		noises: number[];
	}

	const rand = mulberry32(42);
	const samples: SampleBase[] = [];

	for (let s = 0; s < NUM_SAMPLES; s++) {
		const trueClass = Math.floor(rand() * NUM_CLASSES);
		const baseLogits = Array.from({ length: NUM_CLASSES }, (_, c) => {
			if (c === trueClass) return 2.0 + rand() * 3;
			return -1 + rand() * 2;
		});
		const noises = Array.from({ length: NUM_CLASSES }, () => (rand() - 0.5) * 3);
		samples.push({ trueClass, baseLogits, noises });
	}

	// ─── Reactive state ────────────────────────────────
	let targetAccuracy = $state(0.85);
	let noiseLevel = $state(0.8);

	// ─── Derived: probabilities with current noise ──────
	const data = $derived.by(() => {
		const yTrue: number[] = [];
		const yProba: number[][] = [];
		for (const s of samples) {
			yTrue.push(s.trueClass);
			const logits = s.baseLogits.map((l, c) => l + s.noises[c] * noiseLevel);
			yProba.push(softmax(logits));
		}
		return { yTrue, yProba };
	});

	// ─── Derived: optimal K search + accuracy curve ─────
	const optResult = $derived.by(() => findOptimalK(data.yTrue, data.yProba, targetAccuracy));

	const accCurvePoints = $derived(
		optResult.accuracies.map((acc, i) => [i + 1, acc] as [number, number])
	);

	const optimalAcc = $derived(optResult.accuracies[optResult.k - 1]);

	// Whether the target is actually achievable (at K = num_classes accuracy should be ~1.0)
	const targetAchievable = $derived(optimalAcc >= targetAccuracy);

	// ─── Chart layers ──────────────────────────────────

	// Curve index 0 — accuracy@K line with fill below
	const accCurve = $derived({
		points: accCurvePoints,
		stroke: 'var(--color-belief)',
		strokeWidth: 2.5,
		fill: 'var(--color-belief)',
		fillOpacity: 0.12
	});

	// Curve index 1 — horizontal dashed threshold line
	const thresholdCurve = $derived({
		points: [
			[1, targetAccuracy],
			[NUM_CLASSES, targetAccuracy]
		] as [number, number][],
		stroke: 'var(--color-surprise)',
		strokeWidth: 1.5,
		strokeDasharray: '6 4',
		fill: 'none'
	});

	const curves = $derived([accCurve, thresholdCurve]);

	// Fill between accuracy curve (0) and threshold curve (1) — shades the gap
	const fillRegion = $derived([
		{
			curveA: 0,
			curveB: 1,
			fill: 'var(--color-surprise)',
			opacity: 0.12
		}
	]);

	// Optimal K marker dot on curve
	const optimalDot = $derived([
		{
			x: optResult.k,
			y: optimalAcc,
			r: 7,
			fill: '#22c55e',
			stroke: 'var(--color-bg)',
			strokeWidth: 2.5,
			bar: true,
			barFill: '#22c55e',
			barOpacity: 0.1,
			barWidth: 3
		}
	]);

	// Vertical guide line at optimal K
	const optVline = $derived([
		{
			x: optResult.k,
			stroke: '#22c55e',
			strokeWidth: 1.5,
			strokeDasharray: '3 3'
		}
	]);

	// Legend entries
	const legend = $derived([
		{ label: 'Acc@K', color: 'var(--color-belief)', kind: 'line' as const },
		{
			label: `Seuil ${targetAccuracy.toFixed(2)}`,
			color: 'var(--color-surprise)',
			kind: 'dashed-line' as const
		}
	]);
</script>

<div class="acc-k-cutoff">
	<!-- ════════════════ Metrics panel ═══════════════ -->
	<div class="metrics-panel">
		<div class="metric-item">
			<span class="metric-label">K optimal</span>
			<span class="metric-value">{optResult.k}</span>
		</div>
		<div class="metric-divider"></div>
		<div class="metric-item">
			<span class="metric-label">Acc@{optResult.k}</span>
			<span class="metric-value">{(optimalAcc * 100).toFixed(1)}%</span>
		</div>
		<div class="metric-divider"></div>
		<div class="metric-item" class:achieved={targetAchievable}>
			<span class="metric-label">Cible</span>
			<span class="metric-value"
				>{targetAccuracy >= optimalAcc ? '✗ Non atteint' : '✓ Atteint'}</span
			>
		</div>
	</div>

	<!-- ════════════════ Accuracy@K chart ═══════════════ -->
	<div class="panel-title">
		Courbe d'exactitude — recherche de K minimal pour Acc ≥ {targetAccuracy.toFixed(2)}
	</div>

	<Figure type="chart">
		<DensityChart
			{curves}
			xDomain={[1, NUM_CLASSES]}
			yMax={1.05}
			height={240}
			nTicks={NUM_CLASSES + 1}
			yAxis
			vlines={optVline}
			curveDots={optimalDot}
			fillBetween={fillRegion}
			{legend}
		/>
	</Figure>

	<!-- ════════════════ Controls ═══════════════ -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Précision cible</div>
			<Slider bind:value={targetAccuracy} min={0.5} max={1.0} step={0.01} label="Acc" />
		</div>
		<div class="grp">
			<div class="gttl">Bruit du jeu de données</div>
			<Slider bind:value={noiseLevel} min={0} max={2} step={0.05} label="σ" />
		</div>
	</SliderGrid>

	<!-- ════════════════ Caption ═══════════════ -->
	<p class="cap">
		En pratique, on cherche le plus petit <strong>K</strong> tel que
		<KatexInline formula={String.raw`\text{Acc@}K \geq \tau`} /> où &thau; est un seuil de précision choisi
		(ici <KatexInline formula={String.raw`\tau = ${targetAccuracy.toFixed(2)}`} />). Ce compromis
		permet de garantir une couverture suffisante de la vraie classe tout en gardant l'ensemble de
		prédiction le plus restreint possible. Lorsque les séparations entre classes sont faibles (bruit
		élevé), il faut un <strong>K</strong> plus grand pour atteindre le même seuil — il est alors
		impossible d'être très sélectif sans sacrifier la précision. La règle de décision se formalise : <KatexInline
			formula={String.raw`K^* = \arg\min_{K}\; K \;\text{s.t.}\; \text{Acc@}K \geq \tau`}
		/>.
	</p>
</div>

<style>
	.acc-k-cutoff {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	/* ── Panel title ─────────────────── */
	.panel-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		margin-bottom: -0.25rem;
	}

	/* ── Metrics panel ─────────────── */
	.metrics-panel {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, rgba(148, 163, 184, 0.06));
		border: 1px solid var(--color-border);
	}

	.metric-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		min-width: 7rem;
	}

	.metric-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.metric-value {
		font-family: 'SF Mono', 'Fira Code', monospace, system-ui;
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.2;
	}

	.metric-item .metric-value {
		color: #3b82f6;
	}

	.metric-divider {
		width: 1px;
		height: 2rem;
		background: var(--color-border);
		flex-shrink: 0;
	}

	/* Status colors for target metric */
	.achieved .metric-value {
		color: #22c55e !important;
	}

	:not(.achieved) .metric-value {
		color: #ef4444 !important;
	}

	/* ── Slider group styling ─────────── */
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

	/* ── Caption ──────────────────── */
	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}

	.cap strong {
		color: inherit;
	}
</style>
