<script lang="ts">
	import Figure from '$lib/components/charts/Figure.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';

	/** Data point with true class label */
	interface DataPoint {
		x: number;
		y: number;
		label: 0 | 1;
	}

	/** Weak linear classifier: h(x,y) = sign(w·x + v·y + b) */
	interface WeakClassifier {
		w: number;
		v: number;
		bias: number;
		accuracy: number;
		id: number;
	}

	// ── Reactive state ────────────────────────────────────────
	const defaultNumClassifiers = 7;
	let numClassifiers = $state(defaultNumClassifiers);
	const minNum = 1;
	const maxNum = 20;

	// ── Plot configuration ─────────────────────────────────────
	const svgW = 460,
		svgH = 380;
	const padL = 48,
		padR = 16,
		padT = 12,
		padB = 36;
	const plotW = $derived(svgW - padL - padR);
	const plotH = $derived(svgH - padT - padB);

	const domainX: [number, number] = [-0.25, 1.25];
	const domainY: [number, number] = [-0.85, 0.95];

	// Grid resolution for decision boundary (40×32 ≈ 1280 cells)
	const gridResX = 40;
	const gridResY = 32;

	// ── Pixel projection ───────────────────────────────────────
	function px(x: number): number {
		return padL + ((x - domainX[0]) / (domainX[1] - domainX[0])) * plotW;
	}
	function py(y: number): number {
		return padT + ((domainY[1] - y) / (domainY[1] - domainY[0])) * plotH;
	}

	// ── Data: two interleaving moons ───────────────────────────
	function generateMoonsData(n: number): DataPoint[] {
		const pts: DataPoint[] = [];
		const half = Math.floor(n / 2);

		for (let i = 0; i < n; i++) {
			let x: number, y: number, label: 0 | 1;
			if (i < half) {
				const angle = Math.PI * (i / (half - 1 || 1));
				x = 0.55 * Math.cos(angle) + 0.52;
				y = 0.55 * Math.sin(angle) - 0.1;
				label = 0 as const;
			} else {
				const idx = i - half;
				const angle = Math.PI * (idx / (half - 1 || 1));
				x = 0.5 * Math.cos(Math.PI + angle) + 0.38;
				y = 0.5 * Math.sin(Math.PI + angle) + 0.2;
				label = 1 as const;
			}
			const noise = () => (Math.random() - 0.5) * 0.13;
			pts.push({ x: x + noise(), y: y + noise(), label });
		}
		return pts;
	}

	let dataPoints = $state(generateMoonsData(90));

	// ── Weak classifiers generation ────────────────────────────
	function generateClassifiers(n: number): WeakClassifier[] {
		const cls: WeakClassifier[] = [];
		for (let i = 0; i < n; i++) {
			const angle = Math.random() * Math.PI * 2;
			const w = Math.cos(angle);
			const vCoeff = Math.sin(angle);
			const b = (Math.random() - 0.5) * 1.6;

			let correct = 0;
			for (const pt of dataPoints) {
				if ((w * pt.x + vCoeff * pt.y + b >= 0 ? 1 : 0) === pt.label) correct++;
			}
			cls.push({ w, v: vCoeff, bias: b, accuracy: correct / dataPoints.length, id: i });
		}
		return cls.sort((a, c2) => c2.accuracy - a.accuracy); // best first
	}

	let classifiers = $state(generateClassifiers(defaultNumClassifiers));

	function regenerate() {
		dataPoints = generateMoonsData(90);
		classifiers = generateClassifiers(numClassifiers);
	}

	// Regenerate classifiers when count changes (keep same data)
	$effect(() => {
		const n = numClassifiers; // read to register dependency
		classifiers = generateClassifiers(n);
	});

	// ── Prediction helpers ─────────────────────────────────────
	function classify(c: WeakClassifier, x: number, y: number): 0 | 1 {
		return c.w * x + c.v * y + c.bias >= 0 ? (1 as const) : (0 as const);
	}

	function ensemblePredict(x: number, y: number): 0 | 1 {
		let votes = 0;
		for (const c of classifiers) votes += classify(c, x, y);
		return votes > classifiers.length / 2 ? (1 as const) : (0 as const);
	}

	// ── Grid cells for decision boundary background ────────────
	const cellDataWx = $derived((domainX[1] - domainX[0]) / gridResX);
	const cellDataWy = $derived((domainY[1] - domainY[0]) / gridResY);

	// Precomputed pixel dimensions (constant)
	const cellPxW = $derived((plotW / gridResX) * 1.05); // slight overlap to avoid gaps
	const cellPxH = $derived((plotH / gridResY) * 1.05);

	interface GridCell {
		sx: number; // SVG pixel x (left)
		sy: number; // SVG pixel y (top — note flipped Y axis)
		vote: 0 | 1;
	}

	const gridCells = $derived.by(() => {
		const cells: GridCell[] = [];

		for (let iy = 0; iy < gridResY; iy++) {
			const sy = padT + iy * cellPxH;

			for (let ix = 0; ix < gridResX; ix++) {
				const cx = domainX[0] + (ix + 0.5) * cellDataWx;
				const cy = domainY[0] + (iy + 0.5) * cellDataWy;

				let votes1 = 0;
				for (const c of classifiers) votes1 += classify(c, cx, cy);

				cells.push({
					sx: padL + ix * cellPxW,
					sy,
					vote: votes1 > classifiers.length / 2 ? (1 as const) : (0 as const)
				});
			}
		}
		return cells;
	});

	// ── Boundary edges where vote changes between neighbors ────
	interface Edge {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}

	const boundaryEdges = $derived.by(() => {
		const edges: Edge[] = [];

		function getCell(ix: number, iy: number): GridCell | null {
			return gridCells[iy * gridResX + ix] ?? null;
		}

		for (let iy = 0; iy < gridResY - 1; iy++) {
			for (let ix = 0; ix < gridResX - 1; ix++) {
				const left = getCell(ix, iy);
				const right = getCell(ix + 1, iy);
				const below = getCell(ix, iy + 1);

				if (!left || !right || !below) continue;

				// Vertical boundary (left vs right neighbor — edge runs vertically in SVG)
				if (left.vote !== right.vote) {
					const midX = left.sx + cellPxW / 2;
					edges.push({ x1: midX, y1: left.sy - 3, x2: midX, y2: left.sy + cellPxH * 2 + 3 });
				}

				// Horizontal boundary (left vs below neighbor)
				if (left.vote !== below.vote) {
					const midY = left.sy + cellPxH / 2;
					edges.push({ x1: left.sx - 3, y1: midY, x2: left.sx + cellPxW * 2 + 3, y2: midY });
				}
			}
		}

		return edges;
	});

	// ── Mini classifier previews ───────────────────────────────
	const miniRes = 14;
	const miniSvgW = 80,
		miniSvgH = 52;
	const miniPad = 3;
	const miniPlotW = $derived(miniSvgW - miniPad * 2);
	const miniPlotH = $derived(miniSvgH - miniPad * 2);

	function mpx(x: number): number {
		return miniPad + ((x - domainX[0]) / (domainX[1] - domainX[0])) * miniPlotW;
	}
	function mpy(y: number): number {
		return miniPad + ((domainY[1] - y) / (domainY[1] - domainY[0])) * miniPlotH;
	}

	interface MiniCell {
		sx: number;
		sy: number;
		sw: number;
		sh: number;
		vote: 0 | 1;
	}

	const previewClassifiers = $derived.by(() => {
		const mWx = (domainX[1] - domainX[0]) / miniRes;
		const mWy = (domainY[1] - domainY[0]) / miniRes;
		const miniCellPxW = ((miniPlotW / miniRes) * 1.12) | 0;
		const miniCellPxH = ((miniPlotH / miniRes) * 1.12) | 0;

		return classifiers.slice(0, 8).map((c) => {
			const equation = `sign(${c.w.toFixed(1)}x ${c.v >= 0 ? '+' : ''}${c.v.toFixed(1)}y ${c.bias >= 0 ? '+' : ''}${c.bias.toFixed(2)})`;

			const cells: MiniCell[] = [];
			for (let iy = 0; iy < miniRes; iy++) {
				for (let ix = 0; ix < miniRes; ix++) {
					const cx = domainX[0] + (ix + 0.5) * mWx;
					const cy = domainY[0] + (iy + 0.5) * mWy;

					cells.push({
						sx: miniPad + ix * (miniPlotW / miniRes),
						sy: miniPad + iy * (miniPlotH / miniRes),
						sw: miniCellPxW,
						sh: miniCellPxH, // reuse, slight imprecision ok for mini
						vote: classify(c, cx, cy)
					});
				}
			}

			return { ...c, equation, miniCells: cells };
		});
	});

	// ── Projected data points (for the main chart) ─────────────
	interface ProjectedPoint {
		cx: number;
		cy: number;
		label: 0 | 1;
	}
	const projectedPoints = $derived(
		dataPoints.map((p) => ({ cx: px(p.x), cy: py(p.y), label: p.label }) as ProjectedPoint)
	);

	// ── Axis tick data ─────────────────────────────────────────
	const xTicks = $derived.by(() => {
		const ticks: { val: number; px: number }[] = [];
		for (let i = 0; i <= 4; i++) {
			const v = domainX[0] + (i / 4) * (domainX[1] - domainX[0]);
			ticks.push({ val: v, px: px(v) });
		}
		return ticks;
	});

	const yTicks = $derived.by(() => {
		const ticks: { val: number; py: number }[] = [];
		for (let i = 0; i <= 4; i++) {
			const v = domainY[0] + (i / 4) * (domainY[1] - domainY[0]);
			ticks.push({ val: v, py: py(v) });
		}
		return ticks;
	});

	// ── Accuracy metrics (derived) ─────────────────────────────
	const ensembleAccuracy = $derived.by(() => {
		let correct = 0;
		for (const pt of dataPoints) {
			if (ensemblePredict(pt.x, pt.y) === pt.label) correct++;
		}
		return correct / dataPoints.length;
	});

	const bestIndividualAccuracy = $derived(classifiers[0]?.accuracy ?? 0);
	const improvement = $derived(ensembleAccuracy - bestIndividualAccuracy);
</script>

<Figure type="chart">
	<div class="ensemble-demo">
		<!-- Header -->
		<header class="demo-header">
			<h2>Vote majoritaire — Méthodes ensemblistes</h2>
			<p>
				Chaque classifieur faible trace un simple coup linéaire. Ensemble, leur vote majoritaire
				capture la courbure des données.
			</p>
		</header>

		<!-- Visualization area -->
		<div class="viz-grid">
			<!-- Main chart with ensemble boundary overlay -->
			<div class="main-plot">
				<svg
					viewBox={`0 0 ${svgW} ${svgH}`}
					width="100%"
					height={svgH}
					role="img"
					aria-label="Frontière de décision de l'ensemble"
				>
					<!-- Decision boundary background grid (colored rectangles) -->
					{#each gridCells as cell}
						<rect
							x={cell.sx}
							y={cell.sy}
							width={cellPxW}
							height={cellPxH}
							fill={cell.vote === 1 ? 'rgba(239,68,68,0.14)' : 'rgba(59,130,246,0.14)'}
						/>
					{/each}

					<!-- Boundary contour edges (where vote flips between neighbors) -->
					{#each boundaryEdges as edge}
						<line
							x1={edge.x1}
							y1={edge.y1}
							x2={edge.x2}
							y2={edge.y2}
							stroke="var(--color-text)"
							stroke-width="0.7"
							opacity="0.3"
						/>
					{/each}

					<!-- Data points -->
					{#each projectedPoints as p}
						<circle
							cx={p.cx}
							cy={p.cy}
							r="4.5"
							fill={p.label === 1 ? 'var(--color-surprise)' : 'var(--color-belief)'}
							opacity="0.85"
						/>
					{/each}

					<!-- Axes -->
					<line
						x1={padL}
						y1={svgH - padB + 4}
						x2={svgW - padR}
						y2={svgH - padB + 4}
						stroke="var(--color-border)"
						stroke-width="0.5"
					/>
					<line
						x1={padL}
						y1={padT - 4}
						x2={padL}
						y2={svgH - padB + 4}
						stroke="var(--color-border)"
						stroke-width="0.5"
					/>

					<!-- X-axis ticks -->
					{#each xTicks as tick}
						<text x={tick.px} y={svgH - 6} text-anchor="middle" class="axis-label"
							>{tick.val.toFixed(2)}</text
						>
					{/each}

					<!-- Y-axis ticks -->
					{#each yTicks as tick}
						<text x={padL - 8} y={tick.py + 4} text-anchor="end" class="axis-label"
							>{tick.val.toFixed(2)}</text
						>
					{/each}

					<!-- Axis labels -->
					<text
						x={svgW / 2}
						y={svgH - 2}
						text-anchor="middle"
						font-size="10"
						fill="var(--color-text-muted)">x</text
					>
					<text
						x={12}
						y={svgH / 2}
						text-anchor="middle"
						font-size="10"
						fill="var(--color-text-muted)"
						transform={`rotate(-90, 12, ${svgH / 2})`}>y</text
					>
				</svg>
			</div>

			<!-- Individual classifier previews -->
			<div class="side-panel">
				<div class="panel-title">Classifieurs individuels</div>
				{#each previewClassifiers as pc (pc.id)}
					<div class="classifier-card">
						<svg viewBox={`0 0 ${miniSvgW} ${miniSvgH}`} width={miniSvgW} height={miniSvgH}>
							<!-- Mini decision grid -->
							{#each pc.miniCells as cell}
								<rect
									x={cell.sx}
									y={cell.sy}
									width={cell.sw}
									height={cell.sh}
									fill={cell.vote === 1 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}
								/>
							{/each}
							<!-- Mini data points -->
							{#each dataPoints as pt}
								<circle
									cx={mpx(pt.x)}
									cy={mpy(pt.y)}
									r="1"
									fill={pt.label === 1 ? 'var(--color-surprise)' : 'var(--color-belief)'}
									opacity="0.65"
								/>
							{/each}
						</svg>
						<div class="classif-info">
							<span class="classif-acc">{(pc.accuracy * 100).toFixed(0)}%</span>
							<span class="classif-eq">{pc.equation}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Metrics -->
		<div class="metrics-row">
			<div class="cell">
				<span class="label">Classifieurs</span>
				<span class="value">{classifiers.length}</span>
			</div>
			<div class="cell style-operator"></div>
			<div class="cell">
				<span class="label">Meilleur individuel</span>
				<span class="value" style:color="var(--color-warn, #f59e0b)"
					>{(bestIndividualAccuracy * 100).toFixed(0)}%</span
				>
			</div>
			<div class="cell style-operator"></div>
			<div class="cell">
				<span class="label">Ensemble</span>
				<span class="value" style:color="var(--color-belief)"
					>{(ensembleAccuracy * 100).toFixed(0)}%</span
				>
			</div>
			<div class="cell style-operator"></div>
			<div class="cell">
				<span class="label">Gain</span>
				<span
					class="value"
					style:color={improvement > 0 ? 'var(--color-belief)' : 'var(--color-surprise)'}
				>
					{improvement >= 0 ? '+' : ''}{(improvement * 100).toFixed(1)}%
				</span>
			</div>
		</div>

		<!-- Controls -->
		<div class="controls-panel">
			<Slider
				bind:value={numClassifiers}
				min={minNum}
				max={maxNum}
				step={1}
				label="Nombre de classifieurs"
			/>
			<button class="action-btn" onclick={regenerate}>↻ Régénérer</button>
		</div>

		<!-- Legend -->
		<div class="legend">
			<span><span class="swatch-dot swatch-blue"></span> Classe 0 (cercle extérieur)</span>
			<span><span class="swatch-dot swatch-red"></span> Classe 1 (cercle intérieur)</span>
			<span><span class="swatch-rect swatch-bluish"></span> Zone vote = classe 0</span>
			<span><span class="swatch-rect swatch-reddish"></span> Zone vote = classe 1</span>
			<span><span class="swatch-line"></span> Frontière de décision</span>
		</div>
	</div>

	<!--
  Note: snippetOverlay for ScatterPlot and Figure's caption prop both accept Snippet values.
  In Svelte 5, snippets are defined via {:snippet name()} inside render contexts.
  For now, the pedagogical message is rendered as plain HTML below the chart.
-->
</Figure>

<p class="caption-note">
	<strong>Pédagogie :</strong> Les classifieurs individuels sont linéaires et pauvres. Leur vote majoritaire
	crée une frontière non-linéaire qui s'adapte à la structure des données. C'est l'intuition fondamentale
	des méthodes ensemblistes (Random Forest, AdaBoost…).
</p>

<style>
	.ensemble-demo {
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

	.viz-grid {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		align-items: flex-start;
		width: 100%;
		max-width: 680px;
	}

	.main-plot svg {
		max-width: 480px;
		width: 100%;
		user-select: none;
	}

	.side-panel {
		width: 175px;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.panel-title {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
		margin-bottom: 0.2rem;
		padding-left: 4px;
	}

	.classifier-card {
		display: flex;
		flex-direction: column;
		gap: 1px;
		align-items: center;
		background: var(--color-surface, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm, 4px);
		padding: 3px;
	}

	.classifier-card svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.classif-info {
		font-size: 0.62rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-text-muted);
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.classif-acc {
		font-weight: 700;
		font-size: 0.68rem;
		color: var(--color-text);
	}

	.classif-eq {
		opacity: 0.75;
		line-height: 1.3;
	}

	/* ── Metrics row (matches Metrics.svelte styling) ─────────── */
	.metrics-row {
		width: 100%;
		max-width: 620px;
		display: flex;
		flex-direction: row;
		padding: 0.8rem 1rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		flex: 1;
		min-width: 80px;
		text-align: center;
		align-items: center;
	}

	.cell.style-operator {
		width: 0.2rem;
		flex: none;
		min-width: auto;
	}

	.label {
		font-size: 0.65rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--font-mono, monospace);
	}

	.value {
		font-family: var(--font-mono, monospace);
		font-size: 1.08rem;
		font-weight: 700;
		color: var(--color-text);
	}

	/* ── Controls panel ──────────────────────────────────────── */
	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		max-width: 420px;
		padding: 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2);
	}

	.action-btn {
		align-self: center;
		padding: 0.35rem 1rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.78rem;
		color: var(--color-text, inherit);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.action-btn:hover {
		background: var(--color-belief);
		color: #fff;
		border-color: var(--color-belief);
	}

	/* ── Legend ─────────────────────────────────────────────── */
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
		width: 14px;
		height: 2px;
		background: var(--color-text);
		opacity: 0.5;
		border-radius: 1px;
		vertical-align: middle;
		margin-right: 3px;
	}

	.axis-label {
		fill: var(--color-text-muted);
		font-size: 9px;
		font-family: var(--font-mono, monospace);
	}

	.caption-note {
		max-width: 600px;
		text-align: center;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		line-height: 1.45;
		padding: 0 0.5rem;
		font-style: italic;
	}

	/* ── Responsive ─────────────────────────────────────────── */
	@media (max-width: 640px) {
		.viz-grid {
			flex-direction: column;
			align-items: center;
		}

		.side-panel {
			width: 100%;
			max-width: 320px;
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
