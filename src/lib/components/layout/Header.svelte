<script lang="ts">
	export type Props = {
		title: string;
		authors?: string;
		subtitle: string;
	};
	let { title, authors, subtitle }: Props = $props();
</script>

<h1>{title}</h1>
{#if authors}
	<p class="page-authors">{authors}</p>
{/if}
<p class="subtitle">{subtitle}</p>
