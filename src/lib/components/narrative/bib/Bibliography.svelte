<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<section class="page-bibliography">
	<h2>Références & Bibliographie</h2>
	<ul class="bib-list">
		{@render children()}
	</ul>
</section>

<style>
	/* ── Style de la section bibliographique ── */
	.page-bibliography {
		border-top: 1px dashed var(--color-border);
		padding-top: 2rem;
		margin-top: 1rem;
	}

	.page-bibliography h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin: 0 0 1rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.bib-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
