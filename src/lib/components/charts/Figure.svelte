<script lang="ts">
	import type { Snippet } from 'svelte';
	type schemaType = 'schema' | 'chart' | 'outline' | 'ghost';

	let {
		children,
		caption,
		type,
		containerWidth = $bindable(0),
		style
	}: {
		children: Snippet;
		caption?: Snippet;
		type: schemaType;
		containerWidth?: number;
		style?: string;
	} = $props();
</script>

<figure class={`${type}-wrap`} {style}>
	<!--
		Measures available width WITHOUT being affected by dynamic content.

		Placed as an absolutely-positioned element outside the document flow so that
		when child SVGs change their viewBox (and thus their rendered height), this
		measuring element reports a STABLE width — breaking the ResizeObserver loop:
		  observe → update width → viewBox changes → layout shifts → observe again

		Width is still accurate because it fills the figure's content box. Height is 0
		and positioned off-screen so it doesn't affect layout or hit-testing at all.
	-->
	<div class="measure-slot" bind:clientWidth={containerWidth}></div>

	<div class="fig-content">
		{@render children()}
	</div>

	{#if caption}
		<figcaption class="fig-caption">
			{@render caption()}
		</figcaption>
	{/if}
</figure>

<style>
	.measure-slot {
		position: absolute;
		top: -1px;
		width: 100%;
		height: 0;
		overflow: hidden;
		pointer-events: none;
		clip-path: inset(50%);
	}

	figure {
		margin: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem; /* Espace entre le graphique et la légende */
		position: relative;
	}

	.schema-wrap,
	.chart-wrap,
	.outline-wrap {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		padding: 1rem 0.5rem;
	}

	.ghost-wrap {
		padding: 1rem 0.5rem;
	}

	.chart-wrap {
		background: var(--color-surface-2);
	}

	.schema-wrap {
		background: var(--color-surface);
	}

	.fig-content :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	.fig-caption {
		padding: 0 0.5rem;
		font-size: 0.875rem; /* txt-small */
		line-height: 1.4;
		color: var(--color-text-muted);

		font-style: italic;
	}
	.ghost .fig-caption {
		border-left: 2px solid var(--color-border);
	}
</style>
