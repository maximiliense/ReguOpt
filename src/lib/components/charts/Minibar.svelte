<script lang="ts">
	interface Props {
		label: string;
		labelStyle?: string;
		barStyle?: string;
		value: number;
		max?: number;
		unit?: string;
		color?: string; // e.g. 'var(--color-surprise)'
		valueClass?: string;
		showValue?: boolean;
		style?: string;
		backgroundColor?: string;
	}

	let {
		label,
		labelStyle = '',
		barStyle = '',
		value,
		max = 1,
		unit = '',
		color = 'var(--color-belief)',
		valueClass = '',
		showValue = true,
		style = '',
		backgroundColor = 'var(--color-surface-2)'
	}: Props = $props();

	// percentage from 0 → max (clamped)
	let percentage = $derived(() => {
		if (max <= 0) return 0;
		const pct = (Math.abs(value) / max) * 100;
		return Math.max(0, Math.min(100, pct));
	});
</script>

<div class="metric-bar-group" {style}>
	<span class="metric-bar-label" style={labelStyle}>{label}</span>

	<div class="metric-bar-track" style:background={backgroundColor} style={barStyle}>
		<div class="metric-bar-fill" style:width={`${percentage()}%`} style:background={color}></div>
	</div>
	{#if showValue}
		<span class="metric-bar-value {valueClass}" style:color>
			{value.toFixed(2)}{unit}
		</span>
	{/if}
</div>

<style>
	.metric-bar-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.metric-bar-label {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		/*min-width: 30px;*/
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.metric-bar-track {
		flex: 1;
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
	}

	.metric-bar-fill {
		height: 100%;
		border-radius: 4px;
		transition:
			width 0.2s ease,
			background 0.2s ease;
	}

	.metric-bar-value {
		font-size: 0.75rem;
		font-family: var(--font-mono, monospace);
		min-width: 45px;
		text-align: right;
	}
</style>
