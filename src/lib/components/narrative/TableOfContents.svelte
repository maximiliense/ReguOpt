<script lang="ts">
	export interface TocEntry {
		id: string;
		label: string;
		description?: string;
		color: 'epistemic' | 'positive' | 'neutral' | 'belief' | 'surprise' | 'agent';
	}

	let { entries, title = 'Sommaire' }: { entries: TocEntry[]; title?: string } = $props();

	const colorMap: Record<TocEntry['color'], string> = {
		epistemic: '--color-epistemic',
		positive: '--color-positive',
		neutral: '--color-neutral',
		belief: '--color-belief',
		surprise: '--color-surprise',
		agent: '--color-agent'
	};
</script>

<nav class="toc">
	{#if title}
		<span class="toc-title">{title}</span>
	{/if}

	<ul class="toc-list">
		{#each entries as entry, i}
			<li class="toc-item" style="--toc-accent: var({colorMap[entry.color]})">
				<a href={`#${entry.id}`} class="toc-link">
					<span class="toc-index">{String(i + 1).padStart(2, '0')}</span>
					<div class="toc-text">
						<strong class="toc-label">{entry.label}</strong>
						{#if entry.description}
							<span class="toc-desc">{entry.description}</span>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.toc {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-neutral);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.25rem;
		margin-bottom: 2rem;
	}

	.toc-title {
		display: block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
		color: var(--color-neutral);
		margin-bottom: 0.75rem;
	}

	.toc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.toc-item {
		--toc-accent: var(--color-epistemic);
		border-left: 2px solid transparent; /*color-mix(in srgb, var(--toc-accent) 40%, transparent);*/
		padding-left: 0.5rem;
		transition: border-color 0.15s ease;
	}

	.toc-item:hover {
		border-left-color: var(--toc-accent);
	}

	.toc-link {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		text-decoration: none;
		color: var(--color-text);
		padding: 0.5rem 0.5rem;
		border-radius: var(--radius-sm);
		transition: background 0.15s ease;
	}

	.toc-link:hover {
		background: var(--color-surface-2);
	}

	.toc-index {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--toc-accent);
		background: color-mix(in srgb, var(--toc-accent) 12%, transparent);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono, monospace);
	}

	.toc-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.toc-label {
		font-size: 0.95rem;
		color: var(--color-text);
		line-height: 1.3;
	}

	.toc-link:hover .toc-label {
		color: var(--toc-accent);
	}

	.toc-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}
</style>
