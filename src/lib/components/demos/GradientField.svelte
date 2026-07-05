<script lang="ts">
	import VectorFieldChart from '$lib/components/charts/VectorFieldChart.svelte';
	import { paraboloid, rosenbrock, saddle } from '$lib/math/test-functions.js';

	interface FuncOption {
		key: string;
		label: string;
		func: typeof paraboloid;
	}

	const funcOptions: FuncOption[] = [
		{ key: 'paraboloid', label: 'Paraboloïde (x² + 4y²)', func: paraboloid },
		{ key: 'rosenbrock', label: 'Rosenbrock', func: rosenbrock },
		{ key: 'saddle', label: 'Selle (x² − y²)', func: saddle }
	];

	let selectedKey = $state('paraboloid');

	const currentFunc = $derived(funcOptions.find((o) => o.key === selectedKey)?.func ?? paraboloid);
</script>

<div class="demo-wrap">
	<VectorFieldChart
		field={(x, y) => {
			const [gx, gy] = currentFunc.grad(x, y);
			return [-gx, -gy]; // descent direction (steepest descent)
		}}
		domain={currentFunc.domain ?? [
			[-3, 3],
			[-3, 3]
		]}
		width={400}
		height={350}
		gridSize={10}
		maxArrowLength={20}
		showLabels
	/>

	<div class="controls">
		<label>
			Fonction :
			<select bind:value={selectedKey}>
				{#each funcOptions as opt}
					<option value={opt.key}>{opt.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<p class="description">
		Les flèches indiquent la direction de la <strong>décroissance la plus rapide</strong> (−∇f). Elles
		convergent vers le minimum pour une fonction convexe, et forment un champ divergent autour d'un point-selle.
	</p>
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
		align-items: center;
		gap: 0.5rem;
	}

	select {
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: var(--color-surface-2, transparent);
		color: inherit;
	}

	.description {
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		max-width: 400px;
		text-align: center;
		margin: 0;
	}
</style>
