<script lang="ts">
	import {
		conformityScoreRank,
		conformityScore1MinusProba,
		conformityScoreCumulative,
		computeQuantileThreshold
	} from '$lib/math/conformal';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	// ─── Constants ──────────────────────────────────────────────
	const NUM_CAL = 50;
	const NUM_CLASSES = 4;
	const CLASSES = ['A', 'B', 'C', 'D'];
	const CLASS_COLORS = ['#06b6d4', '#f43f5e', '#10b981', '#eab308'];
	const NUM_TEST = 5;
	const HIST_HEIGHT = 140;
	const HIST_PAD = { top: 8, right: 8, bottom: 24, left: 28 };
	const NUM_BINS = 10;

	// ─── Score type definitions ─────────────────────────────────
	const SCORE_TYPES = [
		{
			name: 'Rang',
			label: 'Rang',
			color: '#06b6d4',
			func: conformityScoreRank,
			formula: 's(x,y) = \\text{rang}(y)',
			discrete: true
		},
		{
			name: '1-p̂',
			label: '1-p̂',
			color: '#f43f5e',
			func: conformityScore1MinusProba,
			formula: 's(x,y) = 1 - \\hat{p}_y',
			discrete: false
		},
		{
			name: 'Cumulatif',
			label: 'Cumulatif',
			color: '#10b981',
			func: conformityScoreCumulative,
			formula: 's(x,y) = 1 - \\sum_{j:\\hat{p}_j\\geq\\hat{p}_y}\\hat{p}_j',
			discrete: false
		}
	];

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
	const rand = mulberry32(42);

	// ─── Softmax ────────────────────────────────────────────────
	function softmax(logits: number[]): number[] {
		const maxL = Math.max(...logits);
		const exps = logits.map((l) => Math.exp(l - maxL));
		const sum = exps.reduce((a, b) => a + b, 0);
		return exps.map((e) => e / sum);
	}

	// ─── Generate calibration data ──────────────────────────────
	interface CalPoint {
		probas: number[];
		label: number;
	}

	const calData: CalPoint[] = [];
	for (let s = 0; s < NUM_CAL; s++) {
		const trueClass = Math.floor(rand() * NUM_CLASSES);
		const logits = Array.from({ length: NUM_CLASSES }, (_, c) => {
			if (c === trueClass) return 1.5 + rand() * 3;
			return -1 + rand() * 3.5;
		});
		if (rand() < 0.2) {
			const decoy = (trueClass + 1 + Math.floor(rand() * (NUM_CLASSES - 1))) % NUM_CLASSES;
			logits[decoy] += 2 + rand() * 2;
		}
		calData.push({ probas: softmax(logits), label: trueClass });
	}

	// ─── Generate test data ─────────────────────────────────────
	const testData: CalPoint[] = [];
	for (let s = 0; s < NUM_TEST; s++) {
		const trueClass = Math.floor(rand() * NUM_CLASSES);
		const logits = Array.from({ length: NUM_CLASSES }, (_, c) => {
			if (c === trueClass) return 1 + rand() * 2.5;
			return -0.5 + rand() * 3;
		});
		testData.push({ probas: softmax(logits), label: trueClass });
	}

	// ─── Reactive state ─────────────────────────────────────────
	let alpha = $state(0.1);
	let testIndex = $state(0);
	let histWidthRank = $state(0);
	let histWidthOneMinusProba = $state(0);
	let histWidthCumulative = $state(0);

	// ─── Compute scores for each type ──────────────────────────
	// For each score type: compute calibration scores, quantile, prediction set

	// Rank scores
	const calScoresRank = $derived(calData.map((p) => conformityScoreRank(p.probas, p.label)));
	const qRank = $derived(computeQuantileThreshold(calScoresRank, alpha));

	// 1-p scores
	const calScores1MinusProba = $derived(
		calData.map((p) => conformityScore1MinusProba(p.probas, p.label))
	);
	const qOneMinusProba = $derived(computeQuantileThreshold(calScores1MinusProba, alpha));

	// Cumulative scores
	const calScoresCumulative = $derived(
		calData.map((p) => conformityScoreCumulative(p.probas, p.label))
	);
	const qCumulative = $derived(computeQuantileThreshold(calScoresCumulative, alpha));

	// Current test point
	const currentTest = $derived(testData[testIndex]);

	// Prediction sets for current test point
	const predSetRank = $derived(
		SCORE_TYPES[0].func(currentTest.probas, currentTest.label) <= qRank
			? buildPredictionSet(currentTest.probas, qRank, SCORE_TYPES[0].func)
			: buildPredictionSet(currentTest.probas, qRank, SCORE_TYPES[0].func)
	);
	const predSetOneMinusProba = $derived(
		buildPredictionSet(currentTest.probas, qOneMinusProba, SCORE_TYPES[1].func)
	);
	const predSetCumulative = $derived(
		buildPredictionSet(currentTest.probas, qCumulative, SCORE_TYPES[2].func)
	);

	function buildPredictionSet(
		testProba: number[],
		qHat: number,
		scoreFn: (p: number[], l: number) => number
	): number[] {
		const included: number[] = [];
		for (let j = 0; j < NUM_CLASSES; j++) {
			if (scoreFn(testProba, j) <= qHat) {
				included.push(j);
			}
		}
		return included;
	}

	// Coverage across all test points
	const coverageRank = $derived(
		testData.filter((p) =>
			buildPredictionSet(p.probas, qRank, SCORE_TYPES[0].func).includes(p.label)
		).length
	);
	const coverageOneMinusProba = $derived(
		testData.filter((p) =>
			buildPredictionSet(p.probas, qOneMinusProba, SCORE_TYPES[1].func).includes(p.label)
		).length
	);
	const coverageCumulative = $derived(
		testData.filter((p) =>
			buildPredictionSet(p.probas, qCumulative, SCORE_TYPES[2].func).includes(p.label)
		).length
	);

	// ─── Histogram helpers ──────────────────────────────────────
	function computeHistogram(
		scores: number[],
		isDiscrete: boolean
	): { bins: number[]; labels: string[]; min: number; max: number } {
		if (isDiscrete) {
			// For rank scores, bins are integer values 1..NUM_CLASSES
			const bins = new Array(NUM_CLASSES).fill(0);
			scores.forEach((s) => {
				const idx = Math.min(Math.max(Math.round(s) - 1, 0), NUM_CLASSES - 1);
				bins[idx]++;
			});
			const labels = Array.from({ length: NUM_CLASSES }, (_, idx) => String(idx + 1));
			return { bins, labels, min: 1, max: NUM_CLASSES };
		} else {
			// For continuous scores, use equal-width bins
			const min = Math.min(...scores);
			const max = Math.max(...scores);
			const range = max - min || 1;
			const binWidth = range / NUM_BINS;
			const bins = Array.from({ length: NUM_BINS }, () => 0);
			scores.forEach((s) => {
				const idx = Math.min(Math.floor((s - min) / binWidth), NUM_BINS - 1);
				bins[idx]++;
			});
			const labels = Array.from({ length: NUM_BINS }, (_, i) => (min + i * binWidth).toFixed(1));
			return { bins, labels, min, max };
		}
	}

	const histRank = $derived(computeHistogram(calScoresRank, true));
	const histOneMinusProba = $derived(computeHistogram(calScores1MinusProba, false));
	const histCumulative = $derived(computeHistogram(calScoresCumulative, false));
</script>

<div class="score-comparison">
	<!-- ═══════════ Header: Test point info ═══════════ -->
	<div class="header">
		<div class="test-point-label">
			Point test #{testIndex + 1} — Classe vraie :
			<strong style="color: {CLASS_COLORS[currentTest.label]}">{CLASSES[currentTest.label]}</strong>
		</div>

		<!-- Mini bar chart of test probabilities -->
		<div class="proba-bars">
			{#each currentTest.probas as p, i (i)}
				<div class="proba-col">
					<div class="proba-bar" style="height: {p * 100}%; background: {CLASS_COLORS[i]}">
						{#if p > 0.15}
							<span class="proba-val">{(p * 100).toFixed(0)}%</span>
						{/if}
					</div>
					<span class="class-label" class:true={i === currentTest.label}>{CLASSES[i]}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- ═══════════ Three score panels ═══════════ -->
	<div class="panels">
		<!-- Panel 1: Rank score -->
		<div class="panel">
			<div class="panel-header" style="border-color: {SCORE_TYPES[0].color}">
				<span class="panel-title">Score de rang</span>
				<span class="panel-formula"><KatexInline formula={SCORE_TYPES[0].formula} /></span>
			</div>

			<Figure type="chart" containerWidth={histWidthRank}>
				{#if histWidthRank > 0}
					{@const hW = histWidthRank}
					{@const hPlotW = hW - HIST_PAD.left - HIST_PAD.right}
					{@const hPlotH = HIST_HEIGHT - HIST_PAD.top - HIST_PAD.bottom}
					{@const hBase = HIST_HEIGHT - HIST_PAD.bottom}
					{@const maxCount = Math.max(...histRank.bins)}
					<svg viewBox={`0 0 ${hW} ${HIST_HEIGHT}`} width="100%" height={HIST_HEIGHT} role="img">
						{#each histRank.bins as count, i (i)}
							{@const slotW = hPlotW / NUM_CLASSES}
							{@const bW = Math.min(slotW * 0.6, 36)}
							{@const bX = HIST_PAD.left + i * slotW + (slotW - bW) / 2}
							{@const bH = (count / maxCount) * hPlotH}
							{@const isIncluded = i + 1 <= qRank}
							<rect
								x={bX}
								y={hBase - bH}
								width={bW}
								height={Math.max(0, bH)}
								fill={SCORE_TYPES[0].color}
								opacity={isIncluded ? 0.75 : 0.25}
								rx="2"
							/>
							<text
								x={bX + bW / 2}
								y={hBase + 14}
								text-anchor="middle"
								font-size="9.5"
								font-family="var(--font-mono)"
								fill="var(--color-text-muted)"
							>
								{i + 1}
							</text>
						{/each}

						{#if qRank !== Infinity}
							{@const qNorm = (qRank - 0.5) / NUM_CLASSES}
							{@const qX = HIST_PAD.left + Math.min(1, Math.max(0, qNorm)) * hPlotW}
							<line
								x1={qX}
								y1={HIST_PAD.top}
								x2={qX}
								y2={hBase}
								stroke="var(--color-text)"
								stroke-width="1.5"
								stroke-dasharray="4,3"
							/>
							<text
								x={qX}
								y={HIST_PAD.top - 1}
								text-anchor="middle"
								font-size="9"
								font-family="var(--font-mono)"
								fill="var(--color-text)"
								font-weight="600">q̂={qRank}</text
							>
						{/if}

						<line
							x1={HIST_PAD.left}
							y1={hBase}
							x2={hW - HIST_PAD.right}
							y2={hBase}
							stroke="var(--color-border)"
							stroke-width="1"
						/>
					</svg>
				{/if}
			</Figure>

			<div class="panel-stats">
				<div class="stat-row">
					<span class="stat-label">q̂</span>
					<span class="stat-value">{Number.isInteger(qRank) ? qRank : qRank.toFixed(2)}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">C(x)</span>
					<span class="stat-value">[{predSetRank.map((c) => CLASSES[c]).join(', ')}]</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">|C(x)|</span>
					<span class="stat-value">{predSetRank.length}/{NUM_CLASSES}</span>
				</div>
				<div class="stat-row coverage">
					<span class="stat-label">Couverture</span>
					<span class="stat-value"
						>{coverageRank}/{NUM_TEST} = {((coverageRank / NUM_TEST) * 100).toFixed(0)}%</span
					>
				</div>
			</div>
		</div>

		<!-- Panel 2: 1-p score -->
		<div class="panel">
			<div class="panel-header" style="border-color: {SCORE_TYPES[1].color}">
				<span class="panel-title">1-p̂</span>
				<span class="panel-formula"><KatexInline formula={SCORE_TYPES[1].formula} /></span>
			</div>

			<Figure type="chart" containerWidth={histWidthOneMinusProba}>
				{#if histWidthOneMinusProba > 0}
					{@const hW = histWidthOneMinusProba}
					{@const hPlotW = hW - HIST_PAD.left - HIST_PAD.right}
					{@const hPlotH = HIST_HEIGHT - HIST_PAD.top - HIST_PAD.bottom}
					{@const hBase = HIST_HEIGHT - HIST_PAD.bottom}
					{@const maxCount = Math.max(...histOneMinusProba.bins)}
					<svg viewBox={`0 0 ${hW} ${HIST_HEIGHT}`} width="100%" height={HIST_HEIGHT} role="img">
						{#each histOneMinusProba.bins as count, i (i)}
							{@const bW = hPlotW / NUM_BINS}
							{@const bX = HIST_PAD.left + i * bW}
							{@const bH = (count / maxCount) * hPlotH}
							{@const binStart =
								histOneMinusProba.min +
								(i / NUM_BINS) * (histOneMinusProba.max - histOneMinusProba.min)}
							{@const isIncluded = binStart <= qOneMinusProba}
							<rect
								x={bX}
								y={hBase - bH}
								width={bW}
								height={Math.max(0, bH)}
								fill={SCORE_TYPES[1].color}
								opacity={isIncluded ? 0.75 : 0.25}
								rx="1"
							/>
						{/each}

						{#each histOneMinusProba.labels as label, i (i)}
							{#if i % 2 === 0}
								<text
									x={HIST_PAD.left + (i + 0.5) * (hPlotW / NUM_BINS)}
									y={hBase + 14}
									text-anchor="middle"
									font-size="9"
									font-family="var(--font-mono)"
									fill="var(--color-text-muted)"
								>
									{label}
								</text>
							{/if}
						{/each}

						{#if qOneMinusProba !== Infinity}
							{@const qNorm =
								(qOneMinusProba - histOneMinusProba.min) /
								(histOneMinusProba.max - histOneMinusProba.min)}
							{@const qX = HIST_PAD.left + Math.min(1, Math.max(0, qNorm)) * hPlotW}
							<line
								x1={qX}
								y1={HIST_PAD.top}
								x2={qX}
								y2={hBase}
								stroke="var(--color-text)"
								stroke-width="1.5"
								stroke-dasharray="4,3"
							/>
							<text
								x={qX}
								y={HIST_PAD.top - 1}
								text-anchor="middle"
								font-size="9"
								font-family="var(--font-mono)"
								fill="var(--color-text)"
								font-weight="600">q̂={qOneMinusProba.toFixed(2)}</text
							>
						{/if}

						<line
							x1={HIST_PAD.left}
							y1={hBase}
							x2={hW - HIST_PAD.right}
							y2={hBase}
							stroke="var(--color-border)"
							stroke-width="1"
						/>
					</svg>
				{/if}
			</Figure>

			<div class="panel-stats">
				<div class="stat-row">
					<span class="stat-label">q̂</span>
					<span class="stat-value">{qOneMinusProba.toFixed(3)}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">C(x)</span>
					<span class="stat-value">[{predSetOneMinusProba.map((c) => CLASSES[c]).join(', ')}]</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">|C(x)|</span>
					<span class="stat-value">{predSetOneMinusProba.length}/{NUM_CLASSES}</span>
				</div>
				<div class="stat-row coverage">
					<span class="stat-label">Couverture</span>
					<span class="stat-value"
						>{coverageOneMinusProba}/{NUM_TEST} = {(
							(coverageOneMinusProba / NUM_TEST) *
							100
						).toFixed(0)}%</span
					>
				</div>
			</div>
		</div>

		<!-- Panel 3: Cumulative score -->
		<div class="panel">
			<div class="panel-header" style="border-color: {SCORE_TYPES[2].color}">
				<span class="panel-title">Cumulatif</span>
				<span class="panel-formula"><KatexInline formula={SCORE_TYPES[2].formula} /></span>
			</div>

			<Figure type="chart" containerWidth={histWidthCumulative}>
				{#if histWidthCumulative > 0}
					{@const hW = histWidthCumulative}
					{@const hPlotW = hW - HIST_PAD.left - HIST_PAD.right}
					{@const hPlotH = HIST_HEIGHT - HIST_PAD.top - HIST_PAD.bottom}
					{@const hBase = HIST_HEIGHT - HIST_PAD.bottom}
					{@const maxCount = Math.max(...histCumulative.bins)}
					<svg viewBox={`0 0 ${hW} ${HIST_HEIGHT}`} width="100%" height={HIST_HEIGHT} role="img">
						{#each histCumulative.bins as count, i (i)}
							{@const bW = hPlotW / NUM_BINS}
							{@const bX = HIST_PAD.left + i * bW}
							{@const bH = (count / maxCount) * hPlotH}
							{@const binStart =
								histCumulative.min + (i / NUM_BINS) * (histCumulative.max - histCumulative.min)}
							{@const isIncluded = binStart <= qCumulative}
							<rect
								x={bX}
								y={hBase - bH}
								width={bW}
								height={Math.max(0, bH)}
								fill={SCORE_TYPES[2].color}
								opacity={isIncluded ? 0.75 : 0.25}
								rx="1"
							/>
						{/each}

						{#each histCumulative.labels as label, i (i)}
							{#if i % 2 === 0}
								<text
									x={HIST_PAD.left + (i + 0.5) * (hPlotW / NUM_BINS)}
									y={hBase + 14}
									text-anchor="middle"
									font-size="9"
									font-family="var(--font-mono)"
									fill="var(--color-text-muted)"
								>
									{label}
								</text>
							{/if}
						{/each}

						{#if qCumulative !== Infinity}
							{@const qNorm =
								(qCumulative - histCumulative.min) / (histCumulative.max - histCumulative.min)}
							{@const qX = HIST_PAD.left + Math.min(1, Math.max(0, qNorm)) * hPlotW}
							<line
								x1={qX}
								y1={HIST_PAD.top}
								x2={qX}
								y2={hBase}
								stroke="var(--color-text)"
								stroke-width="1.5"
								stroke-dasharray="4,3"
							/>
							<text
								x={qX}
								y={HIST_PAD.top - 1}
								text-anchor="middle"
								font-size="9"
								font-family="var(--font-mono)"
								fill="var(--color-text)"
								font-weight="600">q̂={qCumulative.toFixed(2)}</text
							>
						{/if}

						<line
							x1={HIST_PAD.left}
							y1={hBase}
							x2={hW - HIST_PAD.right}
							y2={hBase}
							stroke="var(--color-border)"
							stroke-width="1"
						/>
					</svg>
				{/if}
			</Figure>

			<div class="panel-stats">
				<div class="stat-row">
					<span class="stat-label">q̂</span>
					<span class="stat-value">{qCumulative.toFixed(3)}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">C(x)</span>
					<span class="stat-value">[{predSetCumulative.map((c) => CLASSES[c]).join(', ')}]</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">|C(x)|</span>
					<span class="stat-value">{predSetCumulative.length}/{NUM_CLASSES}</span>
				</div>
				<div class="stat-row coverage">
					<span class="stat-label">Couverture</span>
					<span class="stat-value"
						>{coverageCumulative}/{NUM_TEST} = {((coverageCumulative / NUM_TEST) * 100).toFixed(
							0
						)}%</span
					>
				</div>
			</div>
		</div>
	</div>

	<!-- ═══════════ Controls ═══════════ -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Niveau de signification α</div>
			<Slider bind:value={alpha} min={0.01} max={0.3} step={0.01} label="α" />
		</div>
		<div class="grp">
			<div class="gttl">Point test</div>
			<Slider bind:value={testIndex} min={0} max={NUM_TEST - 1} step={1} label="Index" />
		</div>
	</SliderGrid>

	<p class="cap">
		Comparaison des trois scores de conformité pour la même donnée de test. Le score de rang produit
		des ensembles discrets (Top-K), tandis que les scores probabilistes (1-p̂ et cumulatif)
		permettent des ensembles de taille variable. Le score cumulatif tend à produire des ensembles
		plus petits pour un même niveau de couverture.
	</p>
</div>

<style>
	.score-comparison {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	/* ── Header ────────────────────── */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.82rem;
	}

	.test-point-label {
		color: var(--color-text-muted);
	}

	/* ── Probability bars ──────────── */
	.proba-bars {
		display: flex;
		gap: 0.35rem;
		align-items: flex-end;
		height: 50px;
	}

	.proba-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.proba-bar {
		width: 28px;
		border-radius: 3px 3px 0 0;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 2px;
		transition: height 0.3s ease;
	}

	.proba-val {
		font-size: 8px;
		font-family: var(--font-mono);
		color: white;
		font-weight: 600;
	}

	.class-label {
		font-size: 9px;
		color: var(--color-text-muted);
	}

	.class-label.true {
		color: var(--color-surprise);
		font-weight: 700;
	}

	/* ── Panels ────────────────────── */
	.panels {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	@media (max-width: 768px) {
		.panels {
			grid-template-columns: 1fr;
		}
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.panel-header {
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		border-left: 3px solid;
		background: var(--color-surface-2, transparent);
	}

	.panel-title {
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}

	.panel-formula {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* ── Stats ─────────────────────── */
	.panel-stats {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		background: var(--color-surface-2, transparent);
		border-radius: 6px;
		font-size: 0.75rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
	}

	.stat-label {
		color: var(--color-text-muted);
	}

	.stat-value {
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.stat-row.coverage .stat-value {
		color: var(--color-positive, #22c55e);
	}

	/* ── Slider group ──────────────── */
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

	/* ── Caption ───────────────────── */
	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}
</style>
