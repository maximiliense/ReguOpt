<script lang="ts">
	interface Props {
		probs: number[];
		labels: string[];
		color?: string;
		height?: number;
		/** Optional reference line at this probability (e.g. 1/K for uniform) */
		referenceLine?: number;
		referenceLabel?: string;
	}

	let {
		probs,
		labels,
		color = 'var(--color-belief)',
		height = 150,
		referenceLine,
		referenceLabel
	}: Props = $props();

	let containerWidth = $state(0);

	const K = $derived(probs.length);

	// 1. Keep paddings FIXED. They represent actual intent in CSS-like pixels.
	const pad = {
		top: 15,
		right: 15,
		bottom: 35,
		left: 15
	};

	// 2. The viewBox matches the physical container size 1:1
	const vbW = $derived(containerWidth || 560);
	const vbH = $derived(height);

	const plotW = $derived(Math.max(0, vbW - pad.left - pad.right));
	const plotH = $derived(Math.max(0, vbH - pad.top - pad.bottom));

	const groupW = $derived(plotW / K);
	// 3. Let bars shrink to fit the screen, cap their max width so they don't look huge on desktop
	const barW = $derived(Math.min(groupW * 0.6, 40));

	// 4. Clean, static sizing for text and strokes
	const fontSize = 10;
	const valueFontSize = 11;
	const labelFontSize = 12;
	const strokeWidth = 1;
	const dashArray = '4 3';
	const rx = 2;

	function barX(k: number): number {
		return pad.left + k * groupW + (groupW - barW) / 2;
	}
	function barY(p: number): number {
		return pad.top + plotH * (1 - p);
	}
	function barHeight(p: number): number {
		return plotH * p;
	}

	const refY = $derived(referenceLine !== undefined ? barY(referenceLine) : null);
</script>

<div class="chart-wrapper" bind:clientWidth={containerWidth}>
	{#if containerWidth > 0}
		<svg
			viewBox={`0 0 ${vbW} ${vbH}`}
			width="100%"
			{height}
			role="img"
			aria-label="Categorical distribution chart"
		>
			{#if refY !== null && referenceLine !== undefined}
				<line
					x1={pad.left}
					y1={refY}
					x2={vbW - pad.right}
					y2={refY}
					stroke="var(--color-text-muted)"
					stroke-width={strokeWidth}
					stroke-dasharray={dashArray}
					opacity="0.5"
				/>
				{#if referenceLabel}
					<text
						x={vbW - pad.right - 2}
						y={refY - 5}
						text-anchor="end"
						fill="var(--color-text-muted)"
						font-size={fontSize}
						font-family="var(--font-mono)">{referenceLabel}</text
					>
				{/if}
			{/if}

			{#each probs as p, k (k)}
				<rect
					x={barX(k)}
					y={barY(p)}
					width={barW}
					height={barHeight(p)}
					fill={color}
					opacity="0.75"
					{rx}
				/>
				<text
					x={barX(k) + barW / 2}
					y={barY(p) - 6}
					text-anchor="middle"
					fill={color}
					font-size={valueFontSize}
					font-family="var(--font-mono)">{p.toFixed(2)}</text
				>
				<text
					x={barX(k) + barW / 2}
					y={pad.top + plotH + 20}
					text-anchor="middle"
					fill="var(--color-text-muted)"
					font-size={labelFontSize}
					font-family="var(--font-sans)">{labels[k]}</text
				>
			{/each}

			<line
				x1={pad.left}
				y1={pad.top + plotH}
				x2={vbW - pad.right}
				y2={pad.top + plotH}
				stroke="var(--color-border)"
				stroke-width={strokeWidth}
			/>
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
