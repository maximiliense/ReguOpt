<script lang="ts">
	import { tick } from 'svelte';
	import type { Component } from 'svelte';

	interface Props {
		load: () => Promise<{ default: Component }>;
		placeholder?: string;
	}

	let { load, placeholder = 'Chargement…' }: Props = $props();

	let sentinelEl = $state<HTMLDivElement | null>(null);
	let LoadedComponent = $state<Component | null>(null);
	let errorMessage = $state<string | null>(null);

	let started = false;

	async function loadComponent() {
		if (started) return;

		started = true;

		try {
			const module = await load();

			// allow browser to finish current rendering work
			await new Promise(requestAnimationFrame);

			LoadedComponent = module.default;

			// allow Svelte to flush after mount
			await tick();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		}
	}

	$effect(() => {
		if (!sentinelEl || started) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;

				observer.disconnect();
				loadComponent();
			},
			{
				rootMargin: '100px'
			}
		);

		observer.observe(sentinelEl);

		return () => observer.disconnect();
	});
</script>

<div class="deferred-demo" bind:this={sentinelEl}>
	{#if LoadedComponent}
		<LoadedComponent />
	{:else if errorMessage}
		<p class="load-error">
			Erreur de chargement : {errorMessage}
		</p>
	{:else}
		<div class="loading-placeholder">
			{placeholder}
		</div>
	{/if}
</div>
