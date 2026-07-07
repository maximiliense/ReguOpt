<script lang="ts">
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	// Controls
	let constraintRadius = $state(2.5);
	let penaltyType = $state('l1'); // 'l1' | 'l2' | 'elastic-net'
	let l1Ratio = $state(0.5); // for elastic net blend

	// OLS solution (center of MSE bowl)
	const olsW1 = 3.0,
		olsW2 = 2.5;

	// Projection functions matching ContourPlot's internal layout
	const chartWidth = 400,
		chartHeight = 350;
	const pad = 36;
	const xDomain = [-5, 5],
		yDomain = [-5, 5];

	function projX(x) {
		return pad + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (chartWidth - pad * 2);
	}
	function projY(y) {
		return pad + ((yDomain[1] - y) / (yDomain[1] - yDomain[0])) * (chartHeight - pad * 2);
	}

	// MSE landscape: elliptical bowl centered at OLS solution
	function mse(w1, w2) {
		const dw1 = w1 - olsW1,
			dw2 = w2 - olsW2;
		return (dw1 * dw1 + 0.6 * dw1 * dw2 + dw2 * dw2) / 2;
	}

	// Compute contact point between constraint and MSE contours
	const solutionPoint = $derived.by(() => {
		if (penaltyType === 'l2') {
			const t = constraintRadius / Math.sqrt(olsW1 * olsW1 + olsW2 * olsW2);
			return { x: olsW1 * t, y: olsW2 * t };
		} else if (penaltyType === 'l1') {
			const r = constraintRadius;
			return Math.abs(olsW1) > Math.abs(olsW2)
				? { x: Math.sign(olsW1) * r, y: 0 }
				: { x: 0, y: Math.sign(olsW2) * r };
		} else {
			const l1Part = constraintRadius * l1Ratio;
			const l2Part = constraintRadius * (1 - l1Ratio);
			const t = l2Part / Math.sqrt(olsW1 * olsW1 + olsW2 * olsW2);
			return { x: olsW1 * t, y: olsW2 * t };
		}
	});

	// Constraint shape SVG path in canvas coordinates
	const constraintPath = $derived.by(() => {
		if (penaltyType === 'l2') {
			const rPx = (constraintRadius / (xDomain[1] - xDomain[0])) * (chartWidth - pad * 2);
			return `<circle cx="${projX(0)}" cy="${projY(0)}" r="${rPx}" fill="none" stroke="#f59e0b" stroke-width="3"/>`;
		} else if (penaltyType === 'l1') {
			const pts = [
				`${projX(0)},${projY(constraintRadius)}`,
				`${projX(constraintRadius)},${projY(0)}`,
				`${projX(0)},${projY(-constraintRadius)}`,
				`${projX(-constraintRadius)},${projY(0)}`
			];
			return `<polygon points="${pts.join(' ')}" fill="none" stroke="#f59e0b" stroke-width="3"/>`;
		} else {
			const r = constraintRadius;
			const alpha = l1Ratio;
			const pts = Array.from({ length: 20 }, (_, i) => {
				const angle = (2 * Math.PI * i) / 20;
				const cosA = Math.cos(angle),
					sinA = Math.sin(angle);
				const l1Norm = Math.abs(cosA) + Math.abs(sinA);
				const scale =
					r / (alpha * l1Norm + (1 - alpha) * Math.sqrt(cosA * cosA + sinA * sinA) || 1e-10);
				return `${projX(scale * cosA)},${projY(scale * sinA)}`;
			});
			return `<polygon points="${pts.join(' ')}" fill="none" stroke="#f59e0b" stroke-width="3"/>`;
		}
	});

	// Markers for the plot
	const markers = $derived([
		{ x: olsW1, y: olsW2 },
		{ x: solutionPoint.x, y: solutionPoint.y }
	]);

	// Penalty type labels for toggle buttons
	const types = [
		{ key: 'l2', label: 'Ridge (L2)' },
		{ key: 'l1', label: 'Lasso (L1)' },
		{ key: 'elastic-net', label: 'Elastic Net' }
	];

	function setType(t) {
		penaltyType = t;
	}
</script>

<div class="reg-contour">
	<div class="chart-area">
		<Figure type="chart" containerWidth={400}>
			<ContourPlot
				f={mse}
				domain={[xDomain, yDomain]}
				{chartWidth}
				{chartHeight}
				numLevels={12}
				showAxes={true}
				markers={[{ x: olsW1, y: olsW2 }]}
			/>
		</Figure>

		<!-- SVG overlay for constraint shape -->
		<svg class="overlay" width={chartWidth} height={chartHeight}>
			{@html constraintPath}

			<!-- OLS marker (red) -->
			<circle
				cx={projX(olsW1)}
				cy={projY(olsW2)}
				r="7"
				fill="#ef4444"
				stroke="white"
				stroke-width="2"
			/>
			<text
				x={projX(olsW1)}
				y={projY(olsW2) - 12}
				text-anchor="middle"
				fill="#ef4444"
				font-size="11">OLS</text
			>

			<!-- Regularized solution marker (green) -->
			<circle
				cx={projX(solutionPoint.x)}
				cy={projY(solutionPoint.y)}
				r="7"
				fill="#22c55e"
				stroke="white"
				stroke-width="2"
			/>
			<text
				x={projX(solutionPoint.x)}
				y={projY(solutionPoint.y) - 12}
				text-anchor="middle"
				fill="#22c55e"
				font-size="11">Solution</text
			>

			<!-- Zero lines (dashed, showing axes where coefficients = 0) -->
			<line
				x1={projX(0)}
				y1={pad}
				x2={projX(0)}
				y2={chartHeight - pad}
				stroke="#6b7280"
				stroke-width="1"
				stroke-dasharray="4 3"
			/>
			<line
				x1={pad}
				y1={projY(0)}
				x2={chartWidth - pad}
				y2={projY(0)}
				stroke="#6b7280"
				stroke-width="1"
				stroke-dasharray="4 3"
			/>
		</svg>
	</div>

	<!-- Penalty type toggle -->
	<div class="toggle-group">
		{#each types as t (t.key)}
			<button class="type-btn" class:active={penaltyType === t.key} onclick={() => setType(t.key)}
				>{t.label}</button
			>
		{/each}
	</div>

	<!-- Elastic net blend slider (only visible when elastic-net selected) -->
	{#if penaltyType === 'elastic-net'}
		<SliderGrid variant="outline">
			<div class="grp">
				<div class="gttl">Mélange Elastic Net</div>
				<Slider bind:value={l1Ratio} min={0} max={1} step={0.05} label="α (mix L1/L2)" />
			</div>
		</SliderGrid>
	{/if}

	<!-- Constraint radius slider -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Force de régularisation</div>
			<Slider bind:value={constraintRadius} min={0.5} max={5} step={0.1} label="Rayon contrainte" />
		</div>
	</SliderGrid>

	<!-- Solution values panel -->
	<div class="solution-panel">
		<span class="sol-label">Solution régulière:</span>
		<span class="sol-value"
			>w₁ ≈ {solutionPoint.x.toFixed(3)}, w₂ ≈ {solutionPoint.y.toFixed(3)}</span
		>
		{#if solutionPoint.x === 0 || solutionPoint.y === 0}
			<span class="sparsity-badge">✓ Sparse (un coefficient = 0)</span>
		{/if}
	</div>

	<p class="cap">
		La régularisation restreint les coefficients dans une zone de contrainte. Avec le
		<strong>Lasso (L1)</strong>, la forme diamantée touche souvent les axes → coefficients
		exactement nuls (<KatexInline formula="w_i = 0" />). Avec le
		<strong>Ridge (L2)</strong>, le cercle glisse sur des bords lisses → rétrécissement sans zéro.
	</p>
</div>

<style>
	.reg-contour {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.chart-area {
		position: relative;
		width: fit-content;
		margin: 0 auto;
	}

	.overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.toggle-group {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.type-btn {
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.78rem;
		color: var(--color-text, inherit);
	}

	.type-btn.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
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

	.solution-panel {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
		background: var(--color-surface-2, transparent);
		font-size: 0.82rem;
	}

	.sol-label {
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.sol-value {
		font-family: 'SF Mono', monospace;
		margin-left: auto;
		color: #22c55e;
	}

	.sparsity-badge {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
		padding: 0.15em 0.5em;
		border-radius: var(--radius-sm, 4px);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}

	@media (max-width: 540px) {
		.solution-panel {
			flex-wrap: wrap;
		}
	}
</style>
