<script lang="ts">
	import { conformityScore1MinusProba, computeQuantileThreshold } from '$lib/math/conformal';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	// ─── Constants ──────────────────────────────────────────────
	const NUM_CLASSES = 4;
	const MAX_CAL_SIZE = 100;

	// ─── Seeded PRNG ────────────────────────────────────────────
	function mulberry32(seed: number): () => number {
		return function () {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	const rand = mulberry32(77);

	// ─── Softmax ────────────────────────────────────────────────
	function softmax(logits: number[]): number[] {
		const maxL = Math.max(...logits);
		const exps = logits.map((l) => Math.exp(l - maxL));
		const sum = exps.reduce((a, b) => a + b, 0);
		return exps.map((e) => e / sum);
	}

	// ─── Generate all calibration points (deterministic) ────────
	interface CalPoint {
		probas: number[];
		label: number;
	}

	const ALL_POINTS: CalPoint[] = [];
	for (let s = 0; s < MAX_CAL_SIZE; s++) {
		const trueClass = Math.floor(rand() * NUM_CLASSES);
		const logits = Array.from({ length: NUM_CLASSES }, (_, c) => {
			if (c === trueClass) return 1.5 + rand() * 3;
			return -1 + rand() * 3.5;
		});
		if (rand() < 0.2) {
			const decoy = (trueClass + 1 + Math.floor(rand() * (NUM_CLASSES - 1))) % NUM_CLASSES;
			logits[decoy] += 2 + rand() * 2;
		}
		ALL_POINTS.push({ probas: softmax(logits), label: trueClass });
	}

	// ─── Reactive state ─────────────────────────────────────────
	let calSize = $state(30);
	let alpha = $state(0.1);

	// ─── Measured DOM Width ─────────────────────────────────────
	let containerWidth = $state(0);

	// ─── Derived: active calibration subset ─────────────────────
	const calData = $derived(ALL_POINTS.slice(0, calSize));

	// ─── Derived: scores ────────────────────────────────────────
	const scores = $derived(calData.map((p) => conformityScore1MinusProba(p.probas, p.label)));
	const sortedScores = $derived([...scores].toSorted((a, b) => a - b));

	// ─── Derived: quantile threshold ────────────────────────────
	const qHat = $derived(computeQuantileThreshold(scores, alpha));
	const kIndex = $derived(Math.ceil((calSize + 1) * (1 - alpha)));
	const kClamped = $derived(Math.min(kIndex, calSize));

	// ─── Derived: score histogram bins ──────────────────────────
	const NUM_BINS = 20;
	const scoreMin = $derived(calData.length > 0 ? Math.min(...scores) : 0);
	const scoreMax = $derived(calData.length > 0 ? Math.max(...scores) : 1);
	const scoreRange = $derived(scoreMax - scoreMin || 1);

	const binCounts = $derived(
		(() => {
			const bins = new Array(NUM_BINS).fill(0);
			for (const s of scores) {
				const idx = Math.min(Math.floor(((s - scoreMin) / scoreRange) * NUM_BINS), NUM_BINS - 1);
				bins[idx]++;
			}
			return bins;
		})()
	);

	const maxBinCount = $derived(Math.max(...binCounts, 1));

	// ─── Derived: sorted score dots for strip chart ─────────────
	const stripDots = $derived(
		sortedScores.map((s, i) => {
			const rank = i + 1;
			const isThreshold = rank === kClamped;
			const isBelow = rank < kClamped;
			return { score: s, rank, isThreshold, isBelow };
		})
	);

	// ─── Derived: quantile info ─────────────────────────────────
	const kValue = $derived(calData.length > 0 ? sortedScores[kClamped - 1] : 0);

	// ─── Layout constants ────────────────────────────────────────
	const HIST_HEIGHT = 160;
	const HIST_PAD = { top: 15, right: 12, bottom: 30, left: 36 };
	const STRIP_HEIGHT = 40;
	const STRIP_PAD = { top: 4, right: 12, bottom: 4, left: 36 };

	// ─── Derived Metrics Based on Client Layout Width ───────────
	const activeWidth = $derived(containerWidth || 600);
	const plotW = $derived(Math.max(0, activeWidth - HIST_PAD.left - HIST_PAD.right));
	const plotH = $derived(HIST_HEIGHT - HIST_PAD.top - HIST_PAD.bottom);
	const baseline = $derived(HIST_PAD.top + plotH);
	const stripPlotW = $derived(Math.max(0, activeWidth - STRIP_PAD.left - STRIP_PAD.right));

	// ─── Safe Formula Strings for KaTeX ─────────────────────────
	const formulaQHat = String.raw`\hat{q}`;
	const formulaRank = String.raw`\lceil(n+1)(1-\alpha)\rceil`;
	const formulaExpression = String.raw`\hat{q} = \text{sorted\_scores}[\lceil(n+1)(1-\alpha)\rceil - 1]`;
</script>

<!-- The root element captures width reactively, removing shared state collapse -->
<div class="quantile-viz" bind:clientWidth={containerWidth}>
	<!-- ═══════════ Theory summary ═══════════ -->
	<div class="theory">
		<p>
			Le seuil <KatexInline formula={formulaQHat} /> est le
			<KatexInline formula={formulaRank} />-ème plus petit score de conformité sur l'ensemble de
			calibration. Ici, avec <KatexInline formula={`n = ${calSize}`} /> et
			<KatexInline formula={`\\alpha = ${alpha.toFixed(2)}`} /> :
		</p>
		<div class="formula-box">
			<KatexInline formula={formulaExpression} />
			= <strong>{kValue.toFixed(4)}</strong>
		</div>
		<p>
			L'indice du quantile est
			<KatexInline
				formula={`\\lceil(${calSize}+1)\\times(1-${alpha.toFixed(2)})\\rceil = ${kClamped}`}
			/>. Ce sont les <strong>{kClamped} plus petits scores</strong> (en violet) qui déterminent le seuil.
		</p>
	</div>

	<!-- ═══════════ Strip chart of sorted scores ═══════════ -->
	<div class="panel-title">Scores de calibration triés — chaque point est un échantillon</div>

	<svg
		viewBox={`0 0 ${activeWidth} ${STRIP_HEIGHT}`}
		width="100%"
		height={STRIP_HEIGHT}
		role="img"
		aria-label="Diagramme des scores triés"
	>
		{#each stripDots as dot, i (i)}
			{@const dotX = STRIP_PAD.left + (i / Math.max(1, calSize - 1)) * stripPlotW}
			<circle
				cx={dotX.toFixed(1)}
				cy={STRIP_HEIGHT / 2}
				r={dot.isThreshold ? 5 : 3.5}
				fill={dot.isThreshold
					? '#8b5cf6'
					: dot.isBelow
						? 'var(--color-belief, #3b82f6)'
						: 'var(--color-border, #e5e7eb)'}
				opacity={dot.isThreshold ? 1 : dot.isBelow ? 0.7 : 0.35}
				stroke={dot.isThreshold ? '#7c3aed' : 'none'}
				stroke-width={dot.isThreshold ? 2 : 0}
			/>
		{/each}

		{#if qHat !== Infinity && calSize > 1}
			{@const qX = STRIP_PAD.left + ((kClamped - 1) / (calSize - 1)) * stripPlotW}
			<line
				x1={qX.toFixed(1)}
				y1={STRIP_PAD.top}
				x2={qX.toFixed(1)}
				y2={STRIP_HEIGHT - STRIP_PAD.bottom}
				stroke="#8b5cf6"
				stroke-width="2"
				stroke-dasharray="4,2"
			/>
		{/if}
	</svg>

	<!-- ═══════════ Histogram ═══════════ -->
	<div class="panel-title">Distribution des scores de conformité</div>

	<Figure type="chart" containerWidth={activeWidth}>
		<svg
			viewBox={`0 0 ${activeWidth} ${HIST_HEIGHT}`}
			width="100%"
			height={HIST_HEIGHT}
			role="img"
			aria-label="Histogramme des scores de conformité"
		>
			<!-- Grid lines -->
			{#each [0, 0.25, 0.5, 0.75, 1] as tick (tick)}
				{@const ty = HIST_PAD.top + plotH * (1 - tick)}
				<line
					x1={HIST_PAD.left}
					y1={ty}
					x2={activeWidth - HIST_PAD.right}
					y2={ty}
					stroke="var(--color-border, #e5e7eb)"
					stroke-width="1"
					stroke-dasharray="3,3"
					opacity="0.5"
				/>
				<text
					x={HIST_PAD.left - 6}
					y={ty + 4}
					text-anchor="end"
					font-size="9"
					font-family="var(--font-mono, monospace)"
					fill="var(--color-text-muted, #6b7280)"
				>
					{tick.toFixed(2)}
				</text>
			{/each}

			<!-- Baseline -->
			<line
				x1={HIST_PAD.left}
				y1={baseline}
				x2={activeWidth - HIST_PAD.right}
				y2={baseline}
				stroke="var(--color-border, #e5e7eb)"
				stroke-width="1"
			/>

			<!-- Bars -->
			{#each binCounts as count, i (i)}
				{@const bW = plotW / NUM_BINS}
				{@const bX = HIST_PAD.left + i * bW}
				{@const bH = (count / maxBinCount) * plotH}
				{@const binLeft = scoreMin + (i / NUM_BINS) * scoreRange}
				{@const isBelow = binLeft <= qHat}

				<!-- Shade the region below threshold -->
				{#if isBelow}
					<rect
						x={bX}
						y={HIST_PAD.top}
						width={bW}
						height={plotH}
						fill="var(--color-belief, #3b82f6)"
						opacity="0.06"
					/>
				{/if}

				<rect
					x={bX}
					y={baseline - bH}
					width={Math.max(0, bW - 1)}
					height={Math.max(0, bH)}
					fill={isBelow ? 'var(--color-belief, #3b82f6)' : 'var(--color-border, #e5e7eb)'}
					opacity={isBelow ? 0.6 : 0.25}
					rx="1"
				/>
			{/each}

			<!-- Quantile threshold line -->
			{#if qHat !== Infinity}
				{@const qNorm = (qHat - scoreMin) / scoreRange}
				{@const qX = HIST_PAD.left + Math.min(1, Math.max(0, qNorm)) * plotW}
				<line
					x1={qX}
					y1={HIST_PAD.top}
					x2={qX}
					y2={baseline}
					stroke="#8b5cf6"
					stroke-width="2"
					stroke-dasharray="5,3"
				/>
				<text
					x={qX}
					y={HIST_PAD.top - 4}
					text-anchor="middle"
					font-size="10"
					font-family="var(--font-mono, monospace)"
					fill="#8b5cf6"
					font-weight="700"
				>
					q̂ = {qHat.toFixed(3)}
				</text>
			{/if}

			<!-- X-axis labels -->
			{#each Array.from({ length: 6 }, (_, i) => i) as ti (ti)}
				{@const xVal = scoreMin + (ti / 5) * scoreRange}
				{@const xPx = HIST_PAD.left + (ti / 5) * plotW}
				<text
					x={xPx}
					y={baseline + 16}
					text-anchor="middle"
					font-size="9"
					font-family="var(--font-mono, monospace)"
					fill="var(--color-text-muted, #6b7280)"
				>
					{xVal.toFixed(2)}
				</text>
			{/each}
		</svg>
	</Figure>

	<!-- ═══════════ Key stats ═══════════ -->
	<div class="stats-row">
		<div class="stat-card">
			<div class="stat-label">Taille calibration</div>
			<div class="stat-value">{calSize}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Indice quantile k</div>
			<div class="stat-value">{kClamped}</div>
		</div>
		<div class="stat-card highlight">
			<div class="stat-label">Seuil q̂</div>
			<div class="stat-value">{qHat === Infinity ? '∞' : qHat.toFixed(4)}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Garantie</div>
			<div class="stat-value">1-α = {(1 - alpha).toFixed(2)}</div>
		</div>
	</div>

	<!-- ═══════════ Controls ═══════════ -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Taille de l'ensemble de calibration (n)</div>
			<Slider bind:value={calSize} min={5} max={MAX_CAL_SIZE} step={1} label="n" />
		</div>
		<div class="grp">
			<div class="gttl">Niveau de signification (α)</div>
			<Slider bind:value={alpha} min={0.01} max={0.3} step={0.01} label="α" />
		</div>
	</SliderGrid>

	<p class="cap">
		Ce visualiseur montre comment le seuil conformel
		<KatexInline formula={formulaQHat} /> évolue avec la taille de l'ensemble de calibration et le niveau
		de signification <KatexInline formula="\alpha" />. Le diagramme trié montre chaque score
		individuel; les points en bleu sont en dessous du seuil et déterminent
		<KatexInline formula={formulaQHat} />. L'histogramme illustre la distribution complète des
		scores avec la région incluse ombrée en bleu.
	</p>
</div>

<style>
	.quantile-viz {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		width: 100%;
		box-sizing: border-box;
	}

	/* ── Theory ──────────────────────────── */
	.theory {
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-muted, #6b7280);
		padding: 0.75rem;
		background: var(--color-surface-2, #f9fafb);
		border-radius: 6px;
	}

	.formula-box {
		margin: 0.5rem 0;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg, #ffffff);
		border-radius: 4px;
		font-size: 0.9rem;
		border: 1px solid var(--color-border, #e5e7eb);
	}

	/* ── Panel titles ────────────────────── */
	.panel-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted, #6b7280);
		margin-top: 0.25rem;
		font-weight: 600;
	}

	/* ── Stats row ───────────────────────── */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	@media (max-width: 600px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		border-radius: 6px;
		background: var(--color-surface-2, #f9fafb);
		border: 1px solid var(--color-border, #e5e7eb);
	}

	.stat-card.highlight {
		border-color: #8b5cf6;
		background: rgba(139, 92, 246, 0.06);
	}

	.stat-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted, #6b7280);
		margin-bottom: 0.25rem;
		text-align: center;
	}

	.stat-value {
		font-size: 1rem;
		font-family: var(--font-mono, monospace);
		font-weight: 700;
	}

	.stat-card.highlight .stat-value {
		color: #8b5cf6;
	}

	/* ── Slider group ────────────────────── */
	.grp {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.gttl {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted, #6b7280);
	}

	/* ── Caption ─────────────────────────── */
	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted, #6b7280);
		text-align: justify;
	}
</style>
