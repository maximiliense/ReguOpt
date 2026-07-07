<script lang="ts">
	import Figure from '$lib/components/charts/Figure.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import Button from '$lib/components/controls/Button.svelte';
	import { runAdaBoostWithHistory, evaluateAdaboostBoundary } from '$lib/math/boosting.js';

	// ─── Constants ──────────────────────────────────────
	const N_SAMPLES = 80;
	const DEFAULT_MAX_ITER = 20;
	const GRID_RES = 32; // square-ish cells for boundary visualization

	// SVG dimensions
	const SVG_W = 460;
	const SVG_H = 380;
	const PAD_L = 48,
		PAD_R = 16,
		PAD_T = 12,
		PAD_B = 36;
	const PLOT_W = SVG_W - PAD_L - PAD_R;
	const PLOT_H = SVG_H - PAD_T - PAD_B;

	// Data domain (matches moons dataset range)
	const DOMAIN_X: [number, number] = [-1.5, 2.5];
	const DOMAIN_Y: [number, number] = [-1.5, 1.5];

	// ─── Seeded RNG (Lehmer / MINSTD) ──────────────────
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

	// ─── Data generation: two interleaving moons ────────
	function generateMoons(n: number, seed: number): { X: number[][]; y: number[] } {
		const rng = makeRng(seed + 42);
		const half = Math.floor(n / 2);

		const X: number[][] = [];
		const y: number[] = [];

		for (let i = 0; i < n; i++) {
			let x: number[], label: number;
			if (i < half) {
				// Upper moon — label +1
				const angle = Math.PI * (i / (half - 1 || 1));
				x = [
					0.9 * Math.cos(angle) + 0.45 + randn(rng) * 0.13,
					0.9 * Math.sin(angle) - 0.25 + randn(rng) * 0.13
				];
				label = 1;
			} else {
				// Lower moon — label −1
				const idx = i - half;
				const angle = Math.PI * (idx / (half - 1 || 1));
				x = [
					0.9 * Math.cos(Math.PI + angle) + 0.55 + randn(rng) * 0.13,
					0.9 * Math.sin(Math.PI + angle) + 0.25 + randn(rng) * 0.13
				];
				label = -1;
			}
			X.push(x);
			y.push(label);
		}

		return { X, y };
	}

	// ─── State ──────────────────────────────────────────
	let dataSeed = $state(0);
	let currentStep = $state(0);
	let maxIterations = $state(DEFAULT_MAX_ITER);
	let isPlaying = $state(false);

	// ─── Derived: dataset ──────────────────────────────
	const data = $derived(generateMoons(N_SAMPLES, dataSeed));

	// ─── Derived: AdaBoost training history ────────────
	const history = $derived.by(() => {
		return runAdaBoostWithHistory(data.X, data.y, maxIterations);
	});

	const numModels = $derived(history.models.length);

	// Clamp currentStep when model count changes
	$effect(() => {
		if (currentStep > numModels) {
			currentStep = Math.max(0, numModels);
		}
	});

	// ─── Derived: active models up to current step ─────
	const activeModels = $derived(history.models.slice(0, currentStep));

	// ─── Derived: sample weights at current step ──────
	const currentWeights = $derived.by(() => {
		if (history.weightsPerStep.length === 0) return new Array(N_SAMPLES).fill(1 / N_SAMPLES);
		return history.weightsPerStep[Math.min(currentStep, history.weightsPerStep.length - 1)];
	});

	// ─── SVG projection helpers ────────────────────────
	function projX(v: number): number {
		return PAD_L + ((v - DOMAIN_X[0]) / (DOMAIN_X[1] - DOMAIN_X[0])) * PLOT_W;
	}
	function projY(v: number): number {
		return PAD_T + ((DOMAIN_Y[1] - v) / (DOMAIN_Y[1] - DOMAIN_Y[0])) * PLOT_H;
	}

	// ─── Derived: grid cells for decision boundary ──────
	interface GridCellData {
		sx: number;
		sy: number;
		pred: number;
		margin: number;
	}

	interface GridData {
		cells: GridCellData[];
		cellW: number;
		cellH: number;
	}

	const gridCells = $derived.by((): GridData => {
		if (activeModels.length === 0) return { cells: [], cellW: 0, cellH: 0 };

		const boundary = evaluateAdaboostBoundary(activeModels, DOMAIN_X, DOMAIN_Y, GRID_RES);

		// Build uniform data-space grid coordinates
		const dx = (DOMAIN_X[1] - DOMAIN_X[0]) / GRID_RES;
		const dy = (DOMAIN_Y[1] - DOMAIN_Y[0]) / GRID_RES;

		// Precompute pixel dimensions from projection of first two points
		const cellW = projX(DOMAIN_X[0] + dx) - projX(DOMAIN_X[0]);
		const cellH = projY(DOMAIN_Y[0]) - projY(DOMAIN_Y[0] + dy); // positive due to Y flip

		const cells: GridCellData[] = [];

		for (let iy = 0; iy < GRID_RES; iy++) {
			const sy = projY(DOMAIN_Y[0] + (iy + 1) * dy);

			for (let ix = 0; ix < GRID_RES; ix++) {
				const sx = projX(DOMAIN_X[0] + ix * dx);
				const pred = boundary.predictions[iy]?.[ix] ?? 0;
				const margin = boundary.margins[iy]?.[ix] ?? 0;

				cells.push({ sx, sy, pred, margin });
			}
		}

		return { cells, cellW, cellH };
	});

	// ─── Derived: boundary contour edges ──────────────
	interface BoundaryEdgeData {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}

	const boundaryEdges = $derived.by(() => {
		const gc = gridCells;
		if (!gc.cells || gc.cells.length === 0) return [];

		const edges: BoundaryEdgeData[] = [];
		const cellW = gc.cellW;
		const cellH = gc.cellH;

		function getPred(ix: number, iy: number): number {
			const idx = iy * GRID_RES + ix;
			return gc.cells[idx]?.pred ?? 0;
		}

		for (let iy = 0; iy < GRID_RES - 1; iy++) {
			for (let ix = 0; ix < GRID_RES - 1; ix++) {
				const leftPred = getPred(ix, iy);
				const rightPred = getPred(ix + 1, iy);
				const belowPred = getPred(ix, iy + 1);

				// Vertical boundary (between columns)
				if (leftPred !== rightPred && leftPred !== 0 && rightPred !== 0) {
					const midX = gc.cells[iy * GRID_RES + ix].sx + cellW / 2;
					const topY = gc.cells[iy * GRID_RES + ix].sy - 1;
					const botY = topY + cellH + 2;
					edges.push({ x1: midX, y1: topY, x2: midX, y2: botY });
				}

				// Horizontal boundary (between rows)
				if (leftPred !== belowPred && leftPred !== 0 && belowPred !== 0) {
					const midY = gc.cells[iy * GRID_RES + ix].sy + cellH / 2;
					const leftX = gc.cells[iy * GRID_RES + ix].sx - 1;
					const rightX = leftX + cellW + 2;
					edges.push({ x1: leftX, y1: midY, x2: rightX, y2: midY });
				}
			}
		}

		return edges;
	});

	// ─── Derived: current stump decision line ──────────
	const stumpLine = $derived.by(() => {
		if (currentStep < 1) return null;

		const stump = history.models[currentStep - 1].stump;
		if (!stump) return null;

		if (stump.featureIdx === 0) {
			// Vertical split on x feature
			return {
				x1: projX(stump.threshold),
				y1: PAD_T,
				x2: projX(stump.threshold),
				y2: SVG_H - PAD_B
			};
		} else {
			// Horizontal split on y feature
			const sy = projY(stump.threshold);
			return {
				x1: PAD_L,
				y1: sy,
				x2: SVG_W - PAD_R,
				y2: sy
			};
		}
	});

	// ─── Derived: projected data points with weight sizing ──
	const projectedPoints = $derived.by(() => {
		const maxW = Math.max(...currentWeights, 1 / N_SAMPLES);
		return data.X.map((x, i) => ({
			cx: projX(x[0]),
			cy: projY(x[1]),
			label: data.y[i],
			r: 2.5 + (currentWeights[i] / maxW) * 5.5 // radius scales from ~2.5 to ~8
		}));
	});

	// ─── Derived: axis tick marks ──────────────────────
	const xTicks = $derived.by(() => {
		const ticks: { val: number; px: number }[] = [];
		for (let i = 0; i <= 4; i++) {
			const v = DOMAIN_X[0] + (i / 4) * (DOMAIN_X[1] - DOMAIN_X[0]);
			ticks.push({ val: v, px: projX(v) });
		}
		return ticks;
	});

	const yTicks = $derived.by(() => {
		const ticks: { val: number; py: number }[] = [];
		for (let i = 0; i <= 4; i++) {
			const v = DOMAIN_Y[0] + (i / 4) * (DOMAIN_Y[1] - DOMAIN_Y[0]);
			ticks.push({ val: v, py: projY(v) });
		}
		return ticks;
	});

	// ─── Metrics at current step ──────────────────────
	const currentError = $derived(currentStep >= 1 ? history.errors[currentStep - 1] : null);
	const currentAlpha = $derived(currentStep >= 1 ? history.alphas[currentStep - 1] : null);

	const cumulativeError = $derived.by(() => {
		if (currentStep < 1 || history.cumulativeErrors.length === 0) return 0;
		return history.cumulativeErrors[Math.min(currentStep, history.cumulativeErrors.length) - 1];
	});

	const ensembleAccuracy = $derived((1 - cumulativeError) * 100);

	// ─── Stump description for side panel ──────────────
	const stumpDescription = $derived.by(() => {
		if (currentStep < 1) return 'Aucune itération';
		const s = history.models[currentStep - 1].stump;
		const featureName = s.featureIdx === 0 ? 'x₁' : 'x₂';
		return `${featureName} ≤ ${s.threshold.toFixed(2)} → classe ${s.leftValue > 0 ? '+1' : '−1'}`;
	});

	// ─── Controls ──────────────────────────────────────
	function stepForward() {
		if (currentStep < numModels) currentStep++;
	}

	function stepBackward() {
		if (currentStep > 0) currentStep--;
	}

	function reset() {
		currentStep = 0;
		isPlaying = false;
	}

	function togglePlay() {
		if (currentStep >= numModels) {
			currentStep = 0;
		}
		isPlaying = !isPlaying;
	}

	// Auto-play animation loop
	$effect(() => {
		if (!isPlaying) return;

		const interval = setInterval(() => {
			if (currentStep >= numModels) {
				isPlaying = false;
			} else {
				currentStep++;
			}
		}, 900);

		return () => clearInterval(interval);
	});

	// Reset play state and step when data is regenerated
	$effect(() => {
		const s = dataSeed; // register dependency
		void s;
		isPlaying = false;
		currentStep = 0;
	});

	function regenerate() {
		dataSeed++;
	}
</script>

<Figure type="chart">
	<div class="adaboost-demo">
		<!-- Header -->
		<header class="demo-header">
			<h2>AdaBoost — Apprentissage par renforcement progressif</h2>
			<p>
				Chaque stump faible ajuste son coup selon les poids d'erreur. L'agrégat pondéré affine la
				frontière de décision itération après itération.
			</p>
		</header>

		<!-- Visualization area -->
		<div class="viz-grid">
			<!-- Main chart with decision boundary and data points -->
			<div class="main-plot">
				<svg
					viewBox={`0 0 ${SVG_W} ${SVG_H}`}
					width="100%"
					height={SVG_H}
					role="img"
					aria-label="Frontière de décision AdaBoost pas à pas"
				>
					<!-- Background grid cells colored by ensemble prediction -->
					{#if gridCells.cells && gridCells.cells.length > 0}
						{#each gridCells.cells as cell}
							<rect
								x={cell.sx}
								y={cell.sy}
								width={gridCells.cellW}
								height={gridCells.cellH}
								fill={cell.pred === 1
									? 'rgba(59,130,246,0.18)'
									: cell.pred === -1
										? 'rgba(239,68,68,0.18)'
										: 'transparent'}
							/>
						{/each}

						<!-- Ensemble decision boundary edges -->
						{#each boundaryEdges as edge}
							<line
								x1={edge.x1}
								y1={edge.y1}
								x2={edge.x2}
								y2={edge.y2}
								stroke="var(--color-epistemic, #A78BFA)"
								stroke-width="0.9"
								opacity="0.45"
							/>
						{/each}
					{/if}

					<!-- Current stump decision line (animated dash) -->
					{#if stumpLine}
						<line
							class="stump-line"
							stroke="#f59e0b"
							stroke-width="2.5"
							stroke-dasharray="6 4"
							x1={stumpLine.x1}
							y1={stumpLine.y1}
							x2={stumpLine.x2}
							y2={stumpLine.y2}
						/>
					{/if}

					<!-- Data points — size reflects weight, color reflects true label -->
					{#each projectedPoints as p}
						<circle
							cx={p.cx}
							cy={p.cy}
							r={p.r}
							fill={p.label === 1 ? 'var(--color-belief)' : 'var(--color-surprise)'}
							stroke="rgba(255,255,255,0.6)"
							stroke-width="0.8"
							opacity="0.88"
						/>
					{/each}

					<!-- Axes -->
					<line
						x1={PAD_L}
						y1={SVG_H - PAD_B + 4}
						x2={SVG_W - PAD_R}
						y2={SVG_H - PAD_B + 4}
						stroke="var(--color-border)"
						stroke-width="0.5"
					/>
					<line
						x1={PAD_L}
						y1={PAD_T - 4}
						x2={PAD_L}
						y2={SVG_H - PAD_B + 4}
						stroke="var(--color-border)"
						stroke-width="0.5"
					/>

					<!-- X-axis tick labels -->
					{#each xTicks as tick}
						<text x={tick.px} y={SVG_H - 6} text-anchor="middle" class="axis-label"
							>{tick.val.toFixed(1)}</text
						>
					{/each}

					<!-- Y-axis tick labels -->
					{#each yTicks as tick}
						<text x={PAD_L - 8} y={tick.py + 4} text-anchor="end" class="axis-label"
							>{tick.val.toFixed(1)}</text
						>
					{/each}

					<!-- Axis labels -->
					<text
						x={SVG_W / 2}
						y={SVG_H - 2}
						text-anchor="middle"
						font-size="10"
						fill="var(--color-text-muted)">x₁</text
					>
					<text
						x={12}
						y={SVG_H / 2}
						text-anchor="middle"
						font-size="10"
						fill="var(--color-text-muted)"
						transform={`rotate(-90, 12, ${SVG_H / 2})`}>x₂</text
					>
				</svg>
			</div>

			<!-- Side panel: iteration metrics -->
			<div class="side-panel">
				<div class="panel-title">Métriques de l'itération</div>

				<!-- Iteration card -->
				<div class="metric-card">
					<span class="metric-label">Itération</span>
					<span class="metric-value metric-step">{currentStep}</span>
					<span class="metric-subtext">/ {numModels} stumps</span>
				</div>

				<!-- Weighted error card -->
				<div class="metric-card">
					<span class="metric-label">Erreur εₜ pondérée</span>
					{#if currentError !== null}
						<span
							class="metric-value"
							style:color={currentError < 0.5 ? 'var(--color-positive)' : 'var(--color-surprise)'}
							>{(currentError * 100).toFixed(1)}%</span
						>
					{:else}
						<span class="metric-value metric-empty">—</span>
					{/if}
				</div>

				<!-- Model weight card -->
				<div class="metric-card">
					<span class="metric-label">Poids αₜ du modèle</span>
					{#if currentAlpha !== null}
						<span class="metric-value metric-alpha">{currentAlpha.toFixed(4)}</span>
						<span class="metric-formula">= ½ ln((1−εₜ)/εₜ)</span>
					{:else}
						<span class="metric-value metric-empty">—</span>
					{/if}
				</div>

				<!-- Cumulative error card -->
				<div class="metric-card">
					<span class="metric-label">Erreur globale</span>
					{#if currentStep > 0}
						<span
							class="metric-value"
							style:color={cumulativeError === 0
								? 'var(--color-positive)'
								: cumulativeError < 0.2
									? 'var(--color-belief)'
									: 'var(--color-surprise)'}>{(cumulativeError * 100).toFixed(1)}%</span
						>
					{:else}
						<span class="metric-value metric-empty">—</span>
					{/if}
				</div>

				<!-- Ensemble accuracy card -->
				<div class="metric-card metric-accent">
					<span class="metric-label">Précision de l'ensemble</span>
					<span class="metric-value" style:color="var(--color-belief)"
						>{ensembleAccuracy.toFixed(1)}%</span
					>
				</div>

				<!-- Current stump description -->
				<div class="stump-info">
					<span class="stump-label">Stump t={currentStep > 0 ? currentStep : '—'}</span>
					<span class="stump-eq">{stumpDescription}</span>
				</div>
			</div>
		</div>

		<!-- Controls -->
		<div class="controls-panel">
			<Slider bind:value={currentStep} min={0} max={numModels} step={1} label="Étape" />

			<div class="button-row">
				<Button variant="ghost" size="sm" onclick={reset}>⟲ Reset</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={stepBackward}
					disabled={currentStep <= 0 || numModels === 0}>← Préc.</Button
				>
				<Button variant="primary" size="sm" onclick={togglePlay} disabled={numModels === 0}>
					{isPlaying ? '⏸ Pause' : '▶ Lecture'}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={stepForward}
					disabled={currentStep >= numModels || numModels === 0}>Suiv. →</Button
				>
			</div>

			<Slider
				bind:value={maxIterations}
				min={1}
				max={40}
				step={1}
				label="Nombre maximum d'itérations"
			/>

			<div class="button-row">
				<Button variant="outline" size="sm" onclick={regenerate}>↻ Régénérer les données</Button>
			</div>
		</div>

		<!-- Legend -->
		<div class="legend">
			<span><span class="swatch-dot swatch-blue"></span> Classe +1 (lune supérieure)</span>
			<span><span class="swatch-dot swatch-red"></span> Classe −1 (lune inférieure)</span>
			<span><span class="swatch-rect swatch-bluish"></span> Zone prédite +1</span>
			<span><span class="swatch-rect swatch-reddish"></span> Zone prédite −1</span>
			<span><span class="swatch-line stump-swatch"></span> Stump courant hₜ(x)</span>
			<span><span class="swatch-line boundary-swatch"></span> Frontière agrégée</span>
		</div>

		<!-- Caption -->
		<p class="caption-note">
			<strong>Pédagogie :</strong> Les points grossissent quand leur poids wᵢ augmente — c'est-à-dire
			que le modèle « se concentre » sur les exemples difficiles. Les stumps successifs (ligne orange
			pointillée) affinent progressivement la frontière bleue de l'ensemble pondéré.
		</p>
	</div>
</Figure>

<style>
	.adaboost-demo {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
		padding: 0.25rem;
	}

	.demo-header {
		text-align: center;
		max-width: 600px;
	}

	.demo-header h2 {
		font-size: 1.1rem;
		margin-bottom: 0.2rem;
		color: var(--color-text);
	}

	.demo-header p {
		font-size: 0.82rem;
		color: var(--color-text-muted);
		line-height: 1.45;
	}

	/* ─── Visualization grid ───────────────────────────── */
	.viz-grid {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		align-items: stretch;
		width: 100%;
		max-width: 680px;
	}

	.main-plot svg {
		max-width: 480px;
		width: 100%;
		user-select: none;
	}

	/* ─── Side panel ────────────────────────────────────── */
	.side-panel {
		min-width: 165px;
		max-width: 200px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.panel-title {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
		padding-left: 4px;
		margin-bottom: 0.15rem;
	}

	.metric-card {
		background: var(--color-surface, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm, 4px);
		padding: 0.45rem 0.55rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.metric-card.metric-accent {
		border-color: var(--color-belief);
		background: color-mix(in srgb, var(--color-belief) 6%, transparent);
	}

	.metric-label {
		font-size: 0.62rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: var(--font-mono, monospace);
	}

	.metric-value {
		font-family: var(--font-mono, monospace);
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.1;
	}

	.metric-value.metric-empty {
		color: var(--color-text-muted);
		opacity: 0.4;
	}

	.metric-value.metric-step {
		font-size: 1.5rem;
		color: var(--color-belief);
	}

	.metric-subtext {
		font-size: 0.62rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono, monospace);
	}

	.metric-formula {
		font-size: 0.58rem;
		color: var(--color-text-muted);
		font-family: var(--font-mono, monospace);
		opacity: 0.7;
	}

	.stump-info {
		background: color-mix(in srgb, #f59e0b 8%, transparent);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: var(--radius-sm, 4px);
		padding: 0.4rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
	}

	.stump-label {
		font-size: 0.6rem;
		color: #b45309;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--font-mono, monospace);
	}

	.stump-eq {
		font-size: 0.72rem;
		color: #92400e;
		font-family: var(--font-mono, monospace);
		line-height: 1.35;
	}

	/* ─── Stump line animation ──────────────────────────── */
	.stump-line {
		stroke: #f59e0b;
		stroke-width: 2;
		stroke-dasharray: 6 4;
		animation:
			stump-march 1s linear infinite,
			stump-blink 2.5s ease-in-out infinite;
	}

	@keyframes stump-march {
		to {
			stroke-dashoffset: -20;
		}
	}

	@keyframes stump-blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* ─── Controls panel ──────────────────────────────── */
	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 100%;
		max-width: 420px;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2);
	}

	.button-row {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		justify-content: center;
		padding: 0.15rem 0;
	}

	/* ─── Legend ─────────────────────────────────────── */
	.legend {
		display: flex;
		gap: 0.7rem;
		font-size: 0.7rem;
		color: var(--color-text-muted);
		flex-wrap: wrap;
		justify-content: center;
		padding-bottom: 0.25rem;
	}

	.swatch-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		vertical-align: middle;
		margin-right: 3px;
	}

	.swatch-blue {
		background: var(--color-belief);
	}
	.swatch-red {
		background: var(--color-surprise);
	}

	.swatch-rect {
		display: inline-block;
		width: 12px;
		height: 10px;
		border-radius: 2px;
		vertical-align: middle;
		margin-right: 3px;
	}

	.swatch-bluish {
		background: rgba(59, 130, 246, 0.3);
	}
	.swatch-reddish {
		background: rgba(239, 68, 68, 0.3);
	}

	.swatch-line {
		display: inline-block;
		width: 16px;
		height: 2px;
		border-radius: 1px;
		vertical-align: middle;
		margin-right: 3px;
	}

	.stump-swatch {
		background: #f59e0b;
		height: 2.5px;
	}

	.boundary-swatch {
		background: var(--color-epistemic, #a78bfa);
		opacity: 0.6;
	}

	.axis-label {
		fill: var(--color-text-muted);
		font-size: 9px;
		font-family: var(--font-mono, monospace);
	}

	.caption-note {
		max-width: 620px;
		text-align: center;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		padding: 0.25rem 0.5rem 0;
		font-style: italic;
	}

	/* ─── Responsive ─────────────────────────────────── */
	@media (max-width: 640px) {
		.viz-grid {
			flex-direction: column;
			align-items: center;
		}

		.side-panel {
			width: 100%;
			max-width: 420px;
			min-width: auto;
			flex-direction: row;
			flex-wrap: wrap;
		}

		.metric-card {
			flex: 1;
			min-width: 100px;
		}

		.stump-info {
			width: 100%;
		}

		.controls-panel {
			max-width: 100%;
		}

		.button-row {
			justify-content: center;
		}
	}
</style>
