<script lang="ts">
	/**
	 * StackedBar — segments fill left→right, each taking a share of the track
	 * proportional to its value. The total track width is normalised to `max`.
	 */
	const {
		values,
		colors = ['var(--color-belief)', 'var(--color-epistemic)'],
		max = 1,
		background = 'var(--color-surface-2)',
		'aria-label': ariaLabel = 'Stacked data distribution bar'
	} = $props<{
		values: number[];
		colors?: string[];
		max?: number;
		background?: string;
		'aria-label'?: string;
	}>();

	interface Seg {
		offset: number;
		width: number;
		color: string;
		rawValue: number;
	}

	const segments: Seg[] = $derived.by(() => {
		let cursor = 0;
		const safeMax = max <= 0 ? 1 : max;

		return values.map((v: number, i: number) => {
			const cleanValue = Math.max(0, v);
			const pct = (cleanValue / safeMax) * 100;
			const offsetPct = (cursor / safeMax) * 100;

			const seg: Seg = {
				offset: Math.min(100, offsetPct),
				width: Math.min(100 - offsetPct, pct),
				color: colors[i % colors.length],
				rawValue: cleanValue
			};

			cursor += cleanValue;
			return seg;
		});
	});

	const a11ySummary = $derived(segments.map((s) => `${s.rawValue.toFixed(2)}`).join(', '));
</script>

<div class="stacked-bar" role="img" aria-label="{ariaLabel}: {a11ySummary}">
	<div class="stacked-bar__track" style:--bg={background}>
		{#each segments as seg}
			<div
				class="stacked-bar__seg"
				style:--seg-offset={`${seg.offset}%`}
				style:--seg-width={`${seg.width}%`}
				style:--seg-color={seg.color}
			></div>
		{/each}
	</div>
</div>

<style>
	.stacked-bar {
		width: 100%;
		height: 1.5rem;
		contain: layout style;
	}

	.stacked-bar__track {
		position: relative;
		width: 100%;
		height: 100%;
		background: var(--bg);
		border-radius: 4px;
		overflow: hidden;
		isolation: isolate;
	}

	.stacked-bar__seg {
		position: absolute;
		top: 0;
		left: var(--seg-offset);
		height: 100%;
		width: var(--seg-width);
		background: var(--seg-color);
		transition:
			left 0.2s ease,
			width 0.2s ease;
	}
</style>
