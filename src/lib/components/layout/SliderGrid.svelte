<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'ghost' | 'outline';
		children?: Snippet;
	}

	let { variant = 'ghost', children }: Props = $props();
</script>

<div class="sliders-grid grid-{variant}">
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.sliders-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		margin-bottom: 1.25rem;
		margin-top: 0.5rem;
		width: 100%;
		border-radius: var(--radius-md, 8px);
		transition:
			border-color 0.15s,
			padding 0.15s;
	}

	/* ── Variant Styling ── */
	.grid-ghost {
		border: 1px solid transparent;
		padding: 0;
	}

	.grid-outline {
		border: 1px solid var(--color-border);
		padding: 1.25rem;
	}

	/* ── Multi-Column Group Rules ── */
	.sliders-grid > :global(.multi-col-group) {
		grid-column: 1 / -1; /* Spans across both main grid columns */
		display: grid;
		grid-template-columns: 1fr 1fr; /* Creates its own 2-column layout */
		gap: 0.1rem 0.75rem;
	}

	/* Allow individual sliders inside the multi-col-group to span 2 columns if needed */
	.sliders-grid > :global(.multi-col-group .span-2) {
		grid-column: span 2;
	}

	/* ── Fix: Spans full width if it's the only group present ── */
	.sliders-grid > :global(*:only-child) {
		grid-column: span 2;
	}

	/* ── Title directly inside the grid spans full width (row 1) ── */
	.sliders-grid > :global(.title) {
		grid-column: 1 / -1;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 660px) {
		.sliders-grid {
			grid-template-columns: 1fr;
		}

		/* Fallback for the multi-column group on mobile */
		.sliders-grid > :global(.multi-col-group) {
			grid-template-columns: 1fr;
			gap: 0.75rem; /* Keeps its unique layout stacking behavior */
		}

		/* Reset the column span logic on mobile stacking layouts */
		.sliders-grid > :global(*:only-child) {
			grid-column: auto;
		}

		/* Reset title span on mobile too */
		.sliders-grid > :global(.title) {
			grid-column: auto;
		}

		/* Reset individual multi-col item spans on mobile */
		.sliders-grid > :global(.multi-col-group .span-2) {
			grid-column: auto;
		}
	}

	.sliders-grid :global(.slider-container) {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.sliders-grid :global(.group-title) {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
