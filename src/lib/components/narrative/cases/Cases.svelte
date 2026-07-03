<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="terms-grid">
	{@render children()}
</div>

<style>
	.terms-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin: 1.5rem 0;
	}

	@media (max-width: 640px) {
		.terms-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
