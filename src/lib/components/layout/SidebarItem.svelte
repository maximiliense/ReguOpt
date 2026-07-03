<script lang="ts">
	import type { PageMeta } from '$lib/navigation.js';

	interface Props {
		page: PageMeta;
		active: boolean;
		visited: boolean;
		interacted: boolean;
		onClick?: () => void;
	}

	let { page, active, visited, interacted, onClick }: Props = $props();
</script>

<a
	href={page.resolvedPath}
	class="sidebar-item"
	class:active
	class:visited
	onclick={() => onClick?.()}
	aria-current={active ? 'page' : undefined}
>
	<span class="item-title">{page.title}</span>
	{#if visited && interacted}
		<span class="item-check" aria-label="Complété">✓</span>
	{/if}
</a>

<style>
	.sidebar-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		font-size: 0.875rem;
		text-decoration: none;
		transition:
			background 0.15s,
			color 0.15s;
		line-height: 1.4;
	}

	.sidebar-item:hover {
		background: var(--color-surface-2);
		color: var(--color-text);
		text-decoration: none;
	}

	.sidebar-item.active {
		background: var(--color-surface-2);
		color: var(--color-belief);
		font-weight: 500;
	}

	.sidebar-item.visited {
		color: var(--color-text);
	}

	.item-check {
		font-size: 0.75rem;
		color: var(--color-positive);
		flex-shrink: 0;
	}
</style>
