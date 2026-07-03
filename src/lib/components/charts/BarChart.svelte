<script lang="ts">
	// ─── Bar label ────────────────────────────────────────────────────────────────

	/**
	 * Label for a single bar. `primary` appears on the first line below the axis,
	 * `secondary` on a smaller second line (optional).
	 */
	interface BarLabel {
		primary: string;
		secondary?: string;
	}

	// ─── Props ────────────────────────────────────────────────────────────────────

	interface Props {
		/** One value per bar, in [0, 1] by default (or in [0, yMax]). */
		values: number[];
		/**
		 * Labels for each bar. Pass strings for single-line labels,
		 * or BarLabel objects for two-line labels.
		 */
		labels: (string | BarLabel)[];
		/** Bar fill color. Default var(--color-belief). */
		color?: string;
		/** Bar fill opacity. Default 0.82. */
		opacity?: number;
		/** Chart height in CSS px. Default 188. */
		height?: number;
		/**
		 * Explicit y-axis maximum. Defaults to 1.
		 * Set to a value slightly above max(values) for tight scaling.
		 */
		yMax?: number;
		/**
		 * Y positions at which to draw horizontal grid lines + left-side tick labels.
		 * Default: no grid lines.
		 */
		yTicks?: number[];
		/** Show value annotations above each bar. Default true. */
		showValues?: boolean;
		/** Minimum bar height (px) below which value annotation is hidden. Default 14. */
		valueMinHeight?: number;
		/** Corner radius of bars. Default 3. */
		rx?: number;
		/**
		 * Extra bottom padding to accommodate two-line labels.
		 * Computed automatically if labels contain BarLabel objects, but can be overridden.
		 */
		bottomPad?: number;
	}

	let {
		values,
		labels,
		color = 'var(--color-belief)',
		opacity = 0.82,
		height = 188,
		yMax = 1,
		yTicks = [],
		showValues = true,
		valueMinHeight = 14,
		rx = 3,
		bottomPad
	}: Props = $props();

	// ─── Layout ───────────────────────────────────────────────────────────────────

	let containerWidth = $state(0);

	const hasSecondaryLabels = $derived(
		labels.some((l) => typeof l !== 'string' && l.secondary !== undefined)
	);

	const pad = $derived({
		top: 20,
		right: 16,
		// Extra 14px when two-line labels are present
		bottom: bottomPad ?? (hasSecondaryLabels ? 60 : 46),
		left: yTicks.length > 0 ? 36 : 16
	});

	const vbW = $derived(containerWidth || 560);
	const vbH = $derived(height);

	const plotW = $derived(Math.max(0, vbW - pad.left - pad.right));
	const plotH = $derived(Math.max(0, vbH - pad.top - pad.bottom));
	const baseline = $derived(pad.top + plotH);

	const K = $derived(values.length);
	const slotW = $derived(plotW / K);
	const barW = $derived(Math.min(slotW * 0.58, 48));

	// ─── Helpers ─────────────────────────────────────────────────────────────────

	function barX(i: number): number {
		return pad.left + i * slotW + (slotW - barW) / 2;
	}

	function barTop(v: number): number {
		return pad.top + plotH * (1 - v / yMax);
	}

	function barHeight(v: number): number {
		return Math.max(2, plotH * (v / yMax));
	}

	function tickY(v: number): number {
		return pad.top + plotH * (1 - v / yMax);
	}

	function labelPrimary(l: string | BarLabel): string {
		return typeof l === 'string' ? l : l.primary;
	}

	function labelSecondary(l: string | BarLabel): string | undefined {
		return typeof l === 'string' ? undefined : l.secondary;
	}
</script>

<div class="chart-wrapper" bind:clientWidth={containerWidth}>
	{#if containerWidth > 0}
		<svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" height={vbH} role="img" aria-label="Bar chart">
			<!-- ① Y grid lines + tick labels -->
			{#each yTicks as tick (tick)}
				{@const ty = tickY(tick)}
				<line
					x1={pad.left}
					y1={ty}
					x2={vbW - pad.right}
					y2={ty}
					stroke="var(--color-border)"
					stroke-width="1"
					stroke-dasharray="3,3"
				/>
				<text
					x={pad.left - 4}
					y={ty + 4}
					text-anchor="end"
					font-size="10"
					font-family="var(--font-mono)"
					fill="var(--color-text-muted)">{tick.toFixed(2)}</text
				>
			{/each}

			<!-- ② Baseline -->
			<line
				x1={pad.left}
				y1={baseline}
				x2={vbW - pad.right}
				y2={baseline}
				stroke="var(--color-border)"
				stroke-width="1"
			/>

			<!-- ③ Bars + value annotations + labels -->
			{#each values as v, i (i)}
				{@const bx = barX(i)}
				{@const bTop = barTop(v)}
				{@const bH = barHeight(v)}
				{@const midX = bx + barW / 2}

				<rect
					x={bx.toFixed(1)}
					y={bTop.toFixed(1)}
					width={barW.toFixed(1)}
					height={bH.toFixed(1)}
					fill={color}
					{opacity}
					{rx}
				/>

				{#if showValues && bH > valueMinHeight}
					<text
						x={midX.toFixed(1)}
						y={(bTop - 4).toFixed(1)}
						text-anchor="middle"
						font-size="11"
						font-family="var(--font-mono)"
						font-weight="600"
						fill={color}>{v.toFixed(2)}</text
					>
				{/if}

				<!-- Primary label -->
				<text
					x={midX.toFixed(1)}
					y={(baseline + 16).toFixed(1)}
					text-anchor="middle"
					font-size="12"
					fill="var(--color-text-muted)">{labelPrimary(labels[i])}</text
				>

				<!-- Secondary label (optional) -->
				{#if labelSecondary(labels[i])}
					<text
						x={midX.toFixed(1)}
						y={(baseline + 30).toFixed(1)}
						text-anchor="middle"
						font-size="10"
						fill="var(--color-text-muted)"
						opacity="0.7">{labelSecondary(labels[i])}</text
					>
				{/if}
			{/each}
		</svg>
	{/if}
</div>

<style>
	.chart-wrapper {
		width: 100%;
	}

	svg {
		display: block;
		overflow: visible;
	}
</style>
