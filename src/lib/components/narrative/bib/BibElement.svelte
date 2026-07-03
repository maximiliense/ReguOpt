<script lang="ts">
	interface Props {
		authors: string | string[];
		year: number;
		title: string;
		journal: string;
		link?: string;
	}

	let { authors, year, title, journal, link }: Props = $props();
</script>

<li class="bib-item">
	<span class="bib-author">
		{#if Array.isArray(authors)}
			{authors.join(', ')}
		{:else}
			{authors}
		{/if}
	</span>
	({year}).
	<span class="bib-title">{title}</span>.
	{journal}
	{#if link}
		<a href={link} target="_blank" rel="noopener noreferrer" class="bib-link">
			[{link.includes('doi.org/') ? `doi:${link.split('doi.org/')[1]}` : 'link'}]
		</a>
	{/if}
</li>

<style>
	.bib-item {
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		padding-left: 1.5rem;
		text-indent: -1.5rem;
	}

	.bib-author {
		font-weight: 600;
		color: var(--color-text);
	}

	.bib-title {
		font-style: italic;
	}

	.bib-link {
		font-size: 0.75rem;
		font-family: var(--font-mono, monospace);
		color: var(--color-epistemic, #3b82f6);
		text-decoration: none;
		word-break: break-all;
		margin-left: 0.25rem;
	}

	.bib-link:hover {
		text-decoration: underline;
	}
</style>
