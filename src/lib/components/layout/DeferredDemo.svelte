<script lang="ts">
	import type { Component } from 'svelte';
	import { acquireDeferredSlot, releaseDeferredSlot } from '$lib/utils/deferredLoader';

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

		await acquireDeferredSlot();

		try {
			const module = await load();

			// let browser paint before mounting
			await new Promise(requestAnimationFrame);

			LoadedComponent = module.default;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		} finally {
			releaseDeferredSlot();
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
				rootMargin: '150px'
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
