<script lang="ts">
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import { paraboloid, saddle } from '$lib/math/test-functions.js';

	interface FuncOption {
		key: string;
		label: string;
		func: typeof paraboloid;
	}

	const funcOptions: FuncOption[] = [
		{ key: 'paraboloid', label: 'Paraboloïde (x² + 4y²)', func: paraboloid },
		{ key: 'saddle', label: 'Selle (x² − y²)', func: saddle }
	];

	let selectedKey = $state('paraboloid');
	let cLevel = $state(5);
	let touchesBoundary = $state(false);

	const currentOption = $derived(funcOptions.find((o) => o.key === selectedKey) ?? funcOptions[0]);
	const currentFunc = $derived(currentOption.func);
	const domain = $derived<[[number, number], [number, number]]>(
		currentFunc.domain ?? [
			[-3, 3],
			[-3, 3]
		]
	);
</script>

<div class="demo-wrap">
	<ContourPlot
		f={currentFunc.f}
		{domain}
		width={400}
		height={350}
		gridSize={90}
		numLevels={12}
		sublevel={cLevel}
		bind:sublevelTouchesBoundary={touchesBoundary}
	/>

	<div class="controls">
		<label for="func-select">Fonction :</label>
		<select id="func-select" bind:value={selectedKey}>
			{#each funcOptions as opt}
				<option value={opt.key}>{opt.label}</option>
			{/each}
		</select>

		<div class="level-control">
			<label for="c-level">Sous-niveau c = {cLevel.toFixed(1)}</label>
			<input id="c-level" type="range" min="-2" max="20" step="0.5" bind:value={cLevel} />
		</div>
	</div>

	<div class="info-panel">
		<span class={`badge ${touchesBoundary ? 'non-coercive' : 'coercive'}`}>
			{touchesBoundary ? '✗ Non borné' : '✓ Borné'}
		</span>
		<p class="description">
			L'ensemble sous-niveau <code>{`{x | f(x) ≤ ${cLevel.toFixed(1)}}`}</code> — en vert sur le
			graphique — {#if touchesBoundary}
				<strong>s'échappe du domaine visible</strong>, signe qu'il n'est pas borné : rien ne
				garantit ici l'existence d'un minimum global.
			{:else}
				reste <strong>entièrement contenu</strong> dans le domaine : c'est exactement ce que garantit
				la coercivité, quel que soit le niveau $c$ choisi.
			{/if}
		</p>
	</div>
</div>

<style>
	.demo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	.controls {
		font-size: 0.875rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		max-width: 400px;
	}
	select {
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: var(--color-surface-2, transparent);
		color: inherit;
	}
	.level-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}
	input[type='range'] {
		flex: 1;
	}
	.info-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
		width: 100%;
		max-width: 400px;
	}
	.badge {
		font-weight: 700;
		padding: 0.3rem 1rem;
		border-radius: var(--radius-sm, 4px);
		font-size: 0.9rem;
	}
	.coercive {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}
	.non-coercive {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}
	.description {
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		text-align: center;
		margin: 0;
	}
	code {
		background: rgba(0, 0, 0, 0.06);
		padding: 0.1em 0.3em;
		border-radius: 3px;
		font-size: 0.85rem;
	}
</style>
