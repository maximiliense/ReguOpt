<script lang="ts">
	interface Series {
		samples: number[];
		color: string;
		label: string;
	}

	interface Props {
		series: Series[];
		domain?: [number, number];
		ticks?: number[];
		height?: number;
	}

	let { series, domain = [-6, 6], ticks = [-4, -2, 0, 2, 4], height = 60 }: Props = $props();

	let containerWidth = $state(0);

	// 1. Static padding in CSS-like pixels
	const pad = { left: 15, right: 15 };

	// 2. ViewBox matches physical dimensions exactly
	const vbW = $derived(containerWidth || 560);
	const vbH = $derived(height);
	const plotW = $derived(Math.max(0, vbW - pad.left - pad.right));

	// 3. Row spacing adapts dynamically to the container's height constraint
	const nSeries = $derived(series.length);
	const rowSpread = $derived(vbH * 0.25);
	const axisY = $derived(vbH / 2);

	function xMap(x: number): number {
		return pad.left + ((x - domain[0]) / (domain[1] - domain[0])) * plotW;
	}

	function rowY(i: number): number {
		if (nSeries === 1) return axisY;
		const offset = (i - (nSeries - 1) / 2) * rowSpread;
		return axisY + offset;
	}

	// 4. Stable font, dot, and stroke sizing
	const fontSize = 11;
	const dotR = 4;
	const strokeWidth = 1;

	// Legend layout - fixed spacing for text alignments
	const legendDotR = dotR;
	const legendSpacing = 85;
</script>

<div class="chart-wrapper" bind:clientWidth={containerWidth}>
	{#if containerWidth > 0}
		<svg
			viewBox={`0 0 ${vbW} ${vbH}`}
			width="100%"
			{height}
			role="img"
			aria-label="Sample dot plot"
		>
			<line
				x1={pad.left}
				y1={axisY}
				x2={vbW - pad.right}
				y2={axisY}
				stroke="var(--color-border)"
				stroke-width={strokeWidth}
			/>

			{#each ticks as tick (tick)}
				<text
					x={xMap(tick)}
					y={vbH - 2}
					text-anchor="middle"
					fill="var(--color-text-muted)"
					font-size={fontSize}
					font-family="var(--font-mono)">{tick}</text
				>
			{/each}

			{#each series as s, i (s.label)}
				{@const cy = rowY(i)}
				{#each s.samples as sample (sample + '-' + i)}
					<circle cx={xMap(sample)} {cy} r={dotR} fill={s.color} opacity="0.8" />
				{/each}
			{/each}

			{#each series as s, i (s.label)}
				{@const lx = pad.left + i * legendSpacing}
				<circle
					cx={lx + legendDotR}
					cy={legendDotR + 2}
					r={legendDotR}
					fill={s.color}
					opacity="0.8"
				/>
				<text
					x={lx + legendDotR * 2 + 5}
					y={legendDotR * 2 + 3}
					fill={s.color}
					font-size={fontSize}
					font-family="var(--font-sans)">{s.label}</text
				>
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
