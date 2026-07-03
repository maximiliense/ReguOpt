<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		color: 'color1' | 'color2' | 'color3' | 'color4' | string;
		name: Snippet; // Snippet for the title/math formula
		desc: Snippet; // Snippet for the description block
	}

	let { color, name, desc }: Props = $props();
</script>

<div class="case border-{color}">
	<div class="case-name {color}-color">
		{@render name()}
	</div>
	<div class="case-desc">
		{@render desc()}
	</div>
</div>

<style>
	.case {
		background: var(--color-surface-2);
		border-left: 4px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 1rem;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.case:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.border-color1 {
		border-left-color: var(--color-text-muted);
	}
	.border-color2 {
		border-left-color: var(--color-positive);
	}
	.border-color3 {
		border-left-color: var(--color-belief);
	}
	.border-color4 {
		border-left-color: var(--color-epistemic);
	}

	.color1-color {
		color: var(--color-text-muted);
	}
	.color2-color {
		color: var(--color-positive);
	}
	.color3-color {
		color: var(--color-belief);
	}
	.color4-color {
		color: var(--color-epistemic);
	}

	.case-name {
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.case-desc {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.6;
	}
</style>
