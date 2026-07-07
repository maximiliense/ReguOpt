<script lang="ts">
	import Figure from '$lib/components/charts/Figure.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import Button from '$lib/components/controls/Button.svelte';
	import { runAdaBoostWithHistory } from '$lib/math/boosting.js';

	// ── Constants ──────────────────────────────────────
	const N_SAMPLES = 50;
	const SVG_W = 620;
	const SVG_H_MAIN = 280;
	const PAD_L = 55;
	const PAD_R = 20;
	const PAD_T = 25;
	const PAD_B = 40;

	// Convergence chart constants
	const CONV_H = 160;
	const CONV_PAD_B = 35;

	function makeRng(seed: number): () => number {
		let s = seed;
		return () => {
			s = (s * 16807) % 2147483647;
			return s / 2147483647;
		};
	}

	function randn(rng: () => number): number {
		let u1 = rng(),
			u2 = rng();
		while (u1 === 0) u1 = rng();
		return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	}

	function generateMoons(n: number, noise: number): { X: number[][]; y: number[] } {
		const rng = makeRng(dataSeed);
		const half = Math.floor(n / 2);
		const X: number[][] = [];
		const y: number[] = [];

		for (let i = 0; i < n; i++) {
			let x, label;
			if (i < half) {
				const angle = Math.PI * (i / half);
				x = [Math.cos(angle), Math.sin(angle)];
				label = 1;
			} else {
				const angle = Math.PI * ((i - half) / half);
				x = [1 + Math.sin(angle), 1 - Math.cos(angle)];
				label = -1;
			}
			X.push([x[0] + noise * randn(rng), x[1] + noise * randn(rng)]);
			y.push(label);
		}

		return { X, y };
	}

	let dataSeed = $state(42);
	let currentStep = $state(0);
	const numSamples = N_SAMPLES;
	const noiseLevel = 0.15;

	const data = $derived(generateMoons(numSamples, noiseLevel));

	const history = $derived.by(() => {
		return runAdaBoostWithHistory(data.X, data.y, 20);
	});

	const numModels = $derived(history.models.length);

	function projXMain(x: number): number {
		const xMin = -4,
			xMax = 5;
		return PAD_L + ((x - xMin) / (xMax - xMin)) * (SVG_W - PAD_L - PAD_R);
	}

	function projYMain(y: number): number {
		const yMin = 0,
			yMax = 60;
		return SVG_H_MAIN - PAD_B - ((y - yMin) / (yMax - yMin)) * (SVG_H_MAIN - PAD_T - PAD_B);
	}

	function projXConv(x: number): number {
		const xMin = 0,
			xMax = Math.max(numModels, 1);
		return PAD_L + ((x - xMin) / (xMax - xMin)) * (SVG_W - PAD_L - PAD_R);
	}

	function projYConv(y: number): number {
		const yMin = 0;
		const allLosses = avgLosses;
		const yMax = Math.max(2, ...allLosses) * 1.1;
		return (
			SVG_H_MAIN +
			CONV_PAD_B +
			PAD_T +
			(CONV_H - CONV_PAD_B - PAD_T) -
			((y - yMin) / (yMax - yMin)) * (CONV_H - PAD_T - CONV_PAD_B)
		);
	}

	// Exponential loss curve points
	const expLossPoints = $derived.by(() => {
		const xMin = -4,
			xMax = 5;
		return Array.from({ length: 200 }, (_, i) => {
			const m = xMin + ((xMax - xMin) * i) / 199;
			const y = Math.exp(-m);
			return { x: m, y };
		});
	});

	// Compute margins at current step for each sample
	const currentMargins = $derived.by(() => {
		if (currentStep <= 0 || history.models.length === 0) return new Array(data.X.length).fill(0);
		const modelsUpToCurrent = history.models.slice(0, currentStep);
		return data.X.map((x) => {
			let margin = 0;
			for (const { stump, alpha } of modelsUpToCurrent) {
				const pred = x[stump.featureIdx] <= stump.threshold ? stump.leftValue : stump.rightValue;
				margin += alpha * pred;
			}
			return margin;
		});
	});

	// Average exponential loss at each step (for convergence curve)
	const avgLosses = $derived.by(() => {
		const losses: number[] = [];
		// Step 0: all samples have margin=0 → exp(0)=1, average=1
		losses[0] = 1;

		for (let s = 1; s <= numModels; s++) {
			const modelsUpToS = history.models.slice(0, s);
			let sumLoss = 0;
			for (let i = 0; i < data.X.length; i++) {
				let margin = 0;
				for (const { stump, alpha } of modelsUpToS) {
					const pred =
						data.X[i][stump.featureIdx] <= stump.threshold ? stump.leftValue : stump.rightValue;
					margin += alpha * data.y[i] * pred;
				}
				sumLoss += Math.exp(-margin);
			}
			losses.push(sumLoss / data.X.length);
		}

		return losses;
	});

	// Current average exponential loss
	const currentAvgLoss = $derived(avgLosses[currentStep] ?? 1);

	// Correctly classified count at current step (margin > 0 means correct for y * F(x) > 0)
	const correctlyClassified = $derived.by(() => {
		if (currentStep <= 0) return data.X.length; // all margin=0 → boundary case
		let count = 0;
		for (let i = 0; i < data.y.length; i++) {
			const signedMargin = data.y[i] * currentMargins[i];
			if (signedMargin > 0) count++;
		}
		return count;
	});

	const minMargin = $derived(
		currentMargins.length > 0 ? Math.min(...currentMargins.map((m, i) => data.y[i] * m)) : 0
	);

	function stepForward() {
		if (currentStep < numModels) currentStep++;
	}

	function stepBackward() {
		if (currentStep > 0) currentStep--;
	}

	function resetDemo() {
		currentStep = 0;
		isPlaying = false;
	}

	let isPlaying = $state(false);

	$effect(() => {
		if (!isPlaying) return;
		const id = setInterval(() => {
			if (currentStep < numModels) currentStep++;
			else isPlaying = false;
		}, 500);
		return () => clearInterval(id);
	});

	function togglePlay() {
		isPlaying = !isPlaying;
		if (isPlaying && currentStep >= numModels) currentStep = 0;
	}

	function regenerate() {
		dataSeed++;
		currentStep = 0;
		isPlaying = false;
	}

	// X-axis ticks for main chart
	const xTicksMain = $derived(
		Array.from({ length: 10 }, (_, i) => ({ val: -4 + i, px: projXMain(-4 + i) }))
	);

	// Pre-computed SVG path data (cannot use $derived() inline in template)
	const lossCurveD = $derived(
		expLossPoints
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${projXMain(p.x)} ${projYMain(Math.min(p.y, 60))}`)
			.join(' ')
	);

	const convergenceCurveD = $derived(
		avgLosses.map((l, i) => `${i === 0 ? 'M' : 'L'} ${projXConv(i)} ${projYConv(l)}`).join(' ')
	);
</script>

<Figure type="chart">
	<div class="exp-loss-demo">
		<header class="demo-header">
			<h2>Perte exponentielle et marges fonctionnelles</h2>
			<p>Observez comment AdaBoost minimise la perte L = exp(−y·F(x)) à chaque itération.</p>
		</header>

		<!-- Main chart: exponential loss curve with margin markers -->
		<div class="main-chart">
			<svg viewBox={`0 0 ${SVG_W} ${SVG_H_MAIN}`} width="100%" height={SVG_H_MAIN}>
				<!-- Grid lines -->
				<g class="grid">
					{#each xTicksMain as tick}
						<line x1={tick.px} y1={PAD_T} x2={tick.px} y2={SVG_H_MAIN - PAD_B} />
					{/each}
				</g>

				<!-- Exponential loss curve -->
				<path d={lossCurveD} class="loss-curve" />

				<!-- Zero margin reference line -->
				<line
					x1={projXMain(0)}
					y1={PAD_T}
					x2={projXMain(0)}
					y2={SVG_H_MAIN - PAD_B}
					class="zero-line"
				/>
				<text x={projXMain(0)} y={SVG_H_MAIN - 8} text-anchor="middle" class="annotation-text"
					>m = 0</text
				>

				<!-- Margin markers for current step -->
				{#if currentStep > 0}
					{#each currentMargins as margin, i}
						{@const signedMargin = data.y[i] * margin}
						<line
							x1={projXMain(signedMargin)}
							y1={SVG_H_MAIN - PAD_B}
							x2={projXMain(signedMargin)}
							y2={projYMain(Math.min(Math.exp(-signedMargin), 60))}
							class={`margin-line ${signedMargin > 0 ? 'correct' : 'incorrect'}`}
						/>
					{/each}

					<!-- Average loss indicator -->
					<circle cx={projXMain(0)} cy={projYMain(currentAvgLoss)} r="5" class="avg-marker" />
					<text x={projXMain(0) + 10} y={projYMain(currentAvgLoss) - 8} class="avg-label"
						>L̄ = {currentAvgLoss.toFixed(3)}</text
					>
				{/if}

				<!-- Axes -->
				<line
					x1={PAD_L}
					y1={SVG_H_MAIN - PAD_B}
					x2={SVG_W - PAD_R}
					y2={SVG_H_MAIN - PAD_B}
					class="axis"
				/>
				<line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={SVG_H_MAIN - PAD_B} class="axis" />

				<!-- X-axis labels -->
				{#each xTicksMain as tick}
					<text x={tick.px} y={SVG_H_MAIN - 8} text-anchor="middle" class="axis-label">
						{tick.val.toFixed(1)}
					</text>
				{/each}

				<!-- Y-axis label -->
				<text
					transform={`translate(${PAD_L - 45}, ${SVG_H_MAIN / 2}) rotate(-90)`}
					text-anchor="middle"
					class="axis-y-label"
				>
					exp(−m)
				</text>

				<!-- X-axis title -->
				<text x={SVG_W / 2} y={SVG_H_MAIN - 1} text-anchor="middle" class="axis-title">
					Marge fonctionnelle m = y · F(x)
				</text>
			</svg>
		</div>

		<!-- Convergence chart -->
		<div class="convergence-chart">
			<svg viewBox={`0 0 ${SVG_W} ${CONV_H}`} width="100%" height={CONV_H}>
				<!-- Grid lines -->
				<g class="grid">
					{#each Array.from({ length: Math.max(numModels, 1) + 1 }, (_, i) => i) as tickVal}
						<line
							x1={projXConv(tickVal)}
							y1={PAD_T}
							x2={projXConv(tickVal)}
							y2={CONV_H - CONV_PAD_B}
						/>
					{/each}
				</g>

				<!-- Convergence curve -->
				<path d={convergenceCurveD} class="convergence-curve" />

				<!-- Current step indicator -->
				{#if currentStep > 0}
					<circle
						cx={projXConv(currentStep)}
						cy={projYConv(avgLosses[currentStep])}
						r="5"
						class="current-dot"
					/>
					<line
						x1={projXConv(currentStep)}
						y1={PAD_T}
						x2={projXConv(currentStep)}
						y2={CONV_H - CONV_PAD_B}
						class="step-line"
					/>
				{/if}

				<!-- Axes -->
				<line
					x1={PAD_L}
					y1={CONV_H - CONV_PAD_B}
					x2={SVG_W - PAD_R}
					y2={CONV_H - CONV_PAD_B}
					class="axis"
				/>
				<line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={CONV_H - CONV_PAD_B} class="axis" />

				<!-- X-axis labels -->
				{#each Array.from({ length: Math.max(numModels, 1) + 1 }, (_, i) => i) as tickVal}
					<text
						x={projXConv(tickVal)}
						y={CONV_H - CONV_PAD_B + 14}
						text-anchor="middle"
						class="axis-label"
					>
						{tickVal}
					</text>
				{/each}

				<!-- Axis titles -->
				<text x={SVG_W / 2} y={CONV_H - 1} text-anchor="middle" class="axis-title">
					Itération t
				</text>
				<text
					transform={`translate(${PAD_L - 45}, {CONV_H / 2}) rotate(-90)`}
					text-anchor="middle"
					class="axis-y-label"
				>
					Perte moyenne
				</text>
			</svg>
		</div>

		<!-- Metrics panel -->
		<div class="metrics-row">
			<div class="cell">
				<span class="label">Perte L̄ = exp(−m)</span>
				<span class="value">{currentAvgLoss.toFixed(4)}</span>
			</div>
			<div class="cell style-operator"></div>
			<div class="cell">
				<span class="label">Correctement classés</span>
				<span class="value" style:color="var(--color-positive)">
					{correctlyClassified}/{data.X.length} ({(
						(100 * correctlyClassified) /
						data.X.length
					).toFixed(1)}%)
				</span>
			</div>
			<div class="cell style-operator"></div>
			<div class="cell">
				<span class="label">Marge minimale</span>
				<span
					class="value"
					style:color={minMargin > 0 ? 'var(--color-positive)' : 'var(--color-surprise)'}
				>
					{minMargin.toFixed(4)}
				</span>
			</div>
		</div>

		<!-- Controls -->
		<div class="controls-panel">
			<Slider bind:value={currentStep} min={0} max={numModels} step={1} label="Étape" />
			<div class="button-row">
				<Button variant="ghost" size="sm" onclick={resetDemo}>⟲ Reset</Button>
				<Button variant="outline" size="sm" onclick={stepBackward} disabled={currentStep <= 0}
					>← Préc.</Button
				>
				<Button variant="primary" size="sm" onclick={togglePlay} disabled={numModels === 0}>
					{isPlaying ? '⏸ Pause' : '▶ Jouer'}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={stepForward}
					disabled={currentStep >= numModels}>Suiv. →</Button
				>
			</div>
			<div class="button-row">
				<Button variant="outline" size="sm" onclick={regenerate}>⟳ Nouvelles données</Button>
			</div>
		</div>

		<!-- Legend -->
		<div class="legend">
			<span><span class="swatch-line curve-swatch"></span> Perte exponentielle L(m)</span>
			<span><span class="swatch-dot swatch-correct"></span> Marge > 0 (correct)</span>
			<span><span class="swatch-dot swatch-incorrect"></span> Marge ≤ 0 (erreur)</span>
		</div>

		<p class="caption-note">
			<strong>AdaBoost minimise implicitement la perte exponentielle.</strong>
			La marge fonctionnelle m = y·F(x) détermine si un échantillon est correctement classé (m > 0).
		</p>
	</div>

	{#snippet caption()}
		<p>Perte exponentielle et convergence d'AdaBoost — étape {currentStep}/{numModels}</p>
	{/snippet}
</Figure>

<style>
	.exp-loss-demo {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
		width: 100%;
		max-width: 680px;
	}

	.demo-header {
		text-align: center;
		padding-bottom: 0.25rem;
	}

	.demo-header h2 {
		font-size: var(--font-size-lg, 1.125rem);
		margin: 0 0 0.25rem 0;
		color: var(--color-text);
	}

	.demo-header p {
		font-size: var(--font-size-sm, 0.875rem);
		color: var(--color-text-muted);
		margin: 0;
	}

	.main-chart svg,
	.convergence-chart svg {
		display: block;
		width: 100%;
		height: auto;
		user-select: none;
	}

	.grid line {
		stroke: var(--color-border);
		stroke-width: 0.3;
		stroke-dasharray: 2, 2;
	}

	.loss-curve {
		fill: none;
		stroke: var(--color-epistemic, #a78bfa);
		stroke-width: 2;
	}

	.zero-line {
		stroke: var(--color-text-muted);
		stroke-width: 0.5;
		stroke-dasharray: 4, 3;
	}

	.margin-line {
		stroke-width: 1;
		opacity: 0.6;
	}

	.margin-line.correct {
		stroke: var(--color-belief);
	}

	.margin-line.incorrect {
		stroke: var(--color-surprise);
	}

	.avg-marker {
		fill: var(--color-epistemic, #a78bfa);
		stroke: var(--color-surface);
		stroke-width: 2;
	}

	.avg-label {
		fill: var(--color-epistemic, #a78bfa);
		font-size: 10px;
		font-weight: bold;
	}

	.convergence-curve {
		fill: none;
		stroke: var(--color-belief);
		stroke-width: 2;
	}

	.current-dot {
		fill: var(--color-surprise);
		stroke: var(--color-surface);
		stroke-width: 2;
	}

	.step-line {
		stroke: var(--color-surprise);
		stroke-width: 0.5;
		stroke-dasharray: 3, 3;
		opacity: 0.5;
	}

	.axis {
		stroke: var(--color-border);
		stroke-width: 0.8;
	}

	.axis-label {
		fill: var(--color-text-muted);
		font-size: 10px;
	}

	.axis-title {
		fill: var(--color-text-muted);
		font-size: 11px;
	}

	.axis-y-label {
		fill: var(--color-text-muted);
		font-size: 10px;
	}

	.annotation-text {
		fill: var(--color-text-muted);
		font-size: 9px;
	}

	.metrics-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		background: var(--color-surface-2, #1a1b2e);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		padding: 0.75rem 1rem;
		width: 100%;
		max-width: 600px;
	}

	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 0.25rem 0.75rem;
	}

	.cell.style-operator {
		display: none;
	}

	.label {
		font-size: 10px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.value {
		font-size: 14px;
		font-weight: bold;
		font-family: var(--font-mono, monospace);
		color: var(--color-text);
	}

	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--color-surface-2, #1a1b2e);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		padding: 0.75rem 1rem;
		width: 100%;
		max-width: 460px;
	}

	.button-row {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.legend {
		display: flex;
		gap: 1rem;
		font-size: 11px;
		color: var(--color-text-muted);
		flex-wrap: wrap;
		justify-content: center;
	}

	.swatch-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 4px;
		vertical-align: middle;
	}

	.swatch-line {
		display: inline-block;
		width: 20px;
		height: 3px;
		margin-right: 4px;
		vertical-align: middle;
		border-radius: 1px;
	}

	.swatch-correct {
		background: var(--color-belief);
	}

	.swatch-incorrect {
		background: var(--color-surprise);
	}

	.curve-swatch {
		background: var(--color-epistemic, #a78bfa);
	}

	.caption-note {
		font-size: 12px;
		color: var(--color-text-muted);
		text-align: center;
		max-width: 500px;
		line-height: 1.4;
		margin-top: 0.25rem;
	}

	@media (max-width: 640px) {
		.button-row {
			flex-direction: column;
			align-items: stretch;
		}

		.metrics-row {
			flex-direction: column;
			align-items: stretch;
		}

		.cell.style-operator {
			display: none;
		}
	}
</style>
