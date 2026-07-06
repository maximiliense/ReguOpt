<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, tag }: { children: Snippet; tag?: string } = $props();
</script>

<section class="page-interactive">
	{#if tag}
		<span class="interactive-title">{tag}</span>
	{/if}
	{@render children()}
</section>

<style>
	.page-interactive {
		background: linear-gradient(to bottom, var(--color-surface), transparent);
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--color-epistemic);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		position: relative;
		margin-bottom: 1em;
	}

	/* The title on the box border */
	.page-interactive :global(.interactive-title) {
		position: absolute;
		top: -12px;
		right: 20px;
		background: var(--color-epistemic);
		color: white;
		font-size: 0.7rem;
		text-transform: uppercase;
		font-weight: 700;
		padding: 2px 10px;
		border-radius: 10px;
		letter-spacing: 0.05em;
	}
</style>
