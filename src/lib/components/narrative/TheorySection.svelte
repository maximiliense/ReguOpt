<script lang="ts">
	import type { Snippet } from 'svelte';
	let { id, children }: { id?: string; children: Snippet } = $props();
</script>

<section class="page-theory" {id}>
	{@render children()}
</section>

<style>
	section.page-theory > :global(*:first-child) {
		margin-top: 0 !important;
	}
</style>
