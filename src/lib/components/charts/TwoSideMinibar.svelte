<script lang="ts">
	interface Props {
		labelLeft: string;
		valueLeft: number;
		labelRight: string;
		valueRight: number;
		unit?: string;
		colorLeft?: string; /* Defaults to your theme's surprise color */
		colorRight?: string; /* Defaults to your muted/secondary track color */
		showPercentage?: boolean; /* Option to append calculated proportional % to labels */
		showValue?: boolean;
		numberOfDigit?: number;
	}

	let {
		labelLeft,
		valueLeft,
		labelRight,
		valueRight,
		unit = '',
		colorLeft = 'var(--color-surprise)',
		colorRight = 'color-mix(in srgb, var(--color-text-muted) 45%, transparent)',
		showPercentage = true,
		showValue = true,
		numberOfDigit = 2
	}: Props = $props();

	// Calculate absolute proportions for layout flexing
	const total = $derived(valueLeft + valueRight || 1);
	const percentLeft = $derived((valueLeft / total) * 100);
	const percentRight = $derived((valueRight / total) * 100);
</script>

<div class="decomp-wrapper">
	<div class="decomp-labels">
		<span class="label-left" style:color={colorLeft}>
			{labelLeft}{#if showValue}
				: {valueLeft.toFixed(numberOfDigit)}{unit}{/if}
			{#if showPercentage}({percentLeft.toFixed(0)}%){/if}
		</span>
		<span class="label-right" style:color={colorRight}>
			{labelRight}{#if showValue}
				: {valueRight.toFixed(numberOfDigit)}{unit}{/if}
			{#if showPercentage}({percentRight.toFixed(0)}%){/if}
		</span>
	</div>

	<div class="decomp-bar">
		<div class="bar-left" style:flex={percentLeft} style:background={colorLeft}></div>
		<div class="bar-right" style:flex={percentRight} style:background={colorRight}></div>
	</div>
</div>

<style>
	.decomp-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.decomp-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.decomp-bar {
		display: flex;
		height: 12px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
	}

	.bar-left {
		transition: flex 0.15s ease;
		min-width: 2px;
		opacity: 0.7;
	}

	.bar-right {
		transition: flex 0.15s ease;
		min-width: 2px;
		opacity: 0.7;
	}
</style>
