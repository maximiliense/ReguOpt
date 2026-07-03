<script lang="ts">
	import { scaleSequential } from 'd3';

	interface Props {
		data: number[][];
		colorScale?: 'cyan' | 'rose' | 'violet';
		showValues?: boolean;
		class?: string;
	}

	let { data, colorScale = 'cyan', showValues = false, class: className = '' }: Props = $props();

	const rows = $derived(data.length);
	const cols = $derived(data[0]?.length ?? 0);

	// Flatten to find min/max
	const allValues = $derived(data.flat());
	const minVal = $derived(Math.min(...allValues));
	const maxVal = $derived(Math.max(...allValues));

	const colorInterpolators = {
		cyan: (t: number) => {
			// Interpolate from dark surface to cyan
			const r = Math.round(24 + t * (6 - 24));
			const g = Math.round(24 + t * (182 - 24));
			const b = Math.round(27 + t * (212 - 27));
			return `rgb(${r},${g},${b})`;
		},
		rose: (t: number) => {
			const r = Math.round(24 + t * (244 - 24));
			const g = Math.round(24 + t * (63 - 24));
			const b = Math.round(27 + t * (94 - 27));
			return `rgb(${r},${g},${b})`;
		},
		violet: (t: number) => {
			const r = Math.round(24 + t * (167 - 24));
			const g = Math.round(24 + t * (139 - 24));
			const b = Math.round(27 + t * (250 - 27));
			return `rgb(${r},${g},${b})`;
		}
	};

	const scale = $derived.by(() => {
		const interpolator = colorInterpolators[colorScale];
		return scaleSequential(interpolator).domain([minVal, maxVal]);
	});
</script>

<div class="heatmap {className}">
	<div
		class="heatmap-grid"
		style:grid-template-columns="repeat({cols}, 1fr)"
		style:grid-template-rows="repeat({rows}, 1fr)"
	>
		{#each data as row, r (r)}
			{#each row as val, c (c)}
				<div
					class="cell"
					style:background={scale(val)}
					title="({r},{c}): {val.toFixed(3)}"
				>
					{#if showValues}
						<span class="cell-val">{val.toFixed(2)}</span>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>

<style>
	.heatmap {
		width: 100%;
		aspect-ratio: 1;
	}

	.heatmap-grid {
		display: grid;
		width: 100%;
		height: 100%;
		gap: 1px;
		background: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.cell-val {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: rgba(255,255,255,0.7);
		pointer-events: none;
	}
</style>
