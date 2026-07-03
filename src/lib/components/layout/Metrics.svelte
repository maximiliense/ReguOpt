<script lang="ts">
	import type { Snippet } from 'svelte';

	type Alignment = 'left' | 'center' | 'right';
	type VAlignment = 'top' | 'horizon' | 'bottom';

	interface Props {
		children: Snippet;
		align?: Alignment;
		valign?: VAlignment; // Optional vertical alignment parameter
		style?: string; // Optional custom style string
	}

	let { children, align = 'left', valign = 'horizon', style = '' }: Props = $props();
</script>

<div class="metrics-row align-{align} valign-{valign}" {style}>
	{@render children()}
</div>

<style>
	div.metrics-row {
		margin-top: 1.5rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: row;
		padding: 0.875rem 1rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		flex-wrap: wrap;
		gap: 0.5rem;

		/* ── Force row container to span full layout width ── */
		width: 100%;
		box-sizing: border-box;
	}

	/* ── Vertical Alignment Modifiers ── */
	.valign-top {
		align-items: flex-start;
	}
	.valign-horizon {
		align-items: center;
	}
	.valign-bottom {
		align-items: flex-end;
	}

	/* Base styles for the cell layout */
	div :global(.cell:not(.style-operator)) {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 90px;
	}

	:global(.cell.style-operator) {
		width: 0.2rem;
	}

	/* CSS Alignment maps based on the parent modifier class */
	.align-left :global(.cell) {
		text-align: left;
		align-items: flex-start;
	}

	.align-center :global(.cell) {
		text-align: center;
		align-items: center;
	}

	.align-right :global(.cell) {
		text-align: right;
		align-items: flex-end;
	}

	/* ── Responsive Stack Update ── */
	@media (max-width: 600px) {
		div.metrics-row {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
			width: 100%; /* Guarantees container block alignment on small screens */
		}

		div :global(.cell) {
			flex: none;
			width: 100%;
		}
	}

	/* Global element styles remain untouched */
	div :global(.label) {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--font-mono);
	}
	div :global(.value) {
		font-family: var(--font-mono);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text);
		transition: color 0.2s;
	}
	div :global(.unit) {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
	}
</style>
