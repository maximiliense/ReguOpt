<script lang="ts">
	import { onDestroy } from 'svelte';
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	let lambda = $state(1.0);
	let playing = $state(false);

	const maxLambda = 5;
	const N_PATH = 200;

	// Eigenvalue spectrum (simulating a dataset with correlated features)
	// Each direction has different "information content" — from well-determined to nearly collinear
	const eigenvalues = [12.0, 6.5, 3.2, 1.8, 0.7, 0.3, 0.1];

	// Ridge shrinkage factor for direction i: S_i(λ) = d_i / (d_i + λ)
	function ridgeShrinkFactor(d: number, lam: number): number {
		return d / (d + lam);
	}

	// Compute shrinkage curves: each eigenvalue gets its own decay curve as λ increases
	const curves = $derived.by(() => {
		const colors = ['#3b82f6', '#06b6d4', '#10b981', '#eab308', '#f97316', '#ef4444', '#dc2626'];
		const result: Array<{
			points: [number, number][];
			stroke?: string;
			strokeWidth?: number;
			opacity?: number;
			fill?: string;
			fillOpacity?: number;
		}> = [];

		// Shrinkage curves — each eigenvalue has its own decay trajectory
		for (let i = 0; i < eigenvalues.length; i++) {
			const d = eigenvalues[i];
			const color = colors[i % colors.length];

			result.push({
				points: Array.from({ length: N_PATH }, (_, j) => {
					const l = maxLambda * (j / (N_PATH - 1));
					return [l, ridgeShrinkFactor(d, l)] as [number, number];
				}),
				stroke: color,
				strokeWidth: i === 0 ? 3 : 2 // highlight the best-determined direction
			});

			// Fill area below to emphasize retained vs lost information
			result.push({
				points: Array.from({ length: N_PATH }, (_, j) => {
					const l = maxLambda * (j / (N_PATH - 1));
					return [l, ridgeShrinkFactor(d, l)] as [number, number];
				}),
				fill: color,
				fillOpacity: 0.06
			});
		}

		// Reference line at shrinkage = 0.5 (half-retained threshold)
		result.push({
			points: [
				[0, 0.5],
				[maxLambda, 0.5]
			],
			stroke: '#94a3b8',
			strokeWidth: 1,
			opacity: 0.4,
			fill: 'none',
			strokeDasharray: '6 4'
		});

		return result;
	});

	const legend = $derived(
		eigenvalues.map((d, i) => ({
			label: `dᵢ = ${d.toFixed(1)}`,
			color: ['#3b82f6', '#06b6d4', '#10b981', '#eab308', '#f97316', '#ef4444', '#dc2626'][i],
			kind: 'line' as const
		}))
	);

	// Current shrinkage factors at selected lambda
	const currentFactors = $derived(eigenvalues.map((d) => ridgeShrinkFactor(d, lambda)));

	// Direction labels based on eigenvalue magnitude
	function directionLabel(d: number): string {
		if (d > 8) return 'très bien déterminée';
		if (d > 4) return 'bien déterminée';
		if (d > 1.5) return 'modérée';
		if (d > 0.5) return 'peu déterminée';
		return 'presque collinéaire';
	}

	// ── Autoplay: sweep lambda back and forth ──
	let rafId: number | null = null;
	let direction = 1;

	function playTick() {
		const speed = 0.008;
		let next = lambda + direction * speed;
		if (next >= maxLambda) {
			next = maxLambda;
			direction = -1;
		} else if (next <= 0) {
			next = 0;
			direction = 1;
		}
		lambda = next;
		rafId = requestAnimationFrame(playTick);
	}

	function togglePlay() {
		playing = !playing;
		if (playing) rafId = requestAnimationFrame(playTick);
		else if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
	});
</script>

<div class="shrink-demo">
	<Figure type="chart">
		<DensityChart
			{curves}
			xDomain={[0, maxLambda]}
			yMax={1.05}
			height={280}
			nTicks={6}
			yAxis
			{legend}
		/>
	</Figure>

	<!-- Shrinkage formula -->
	<p class="formula-block">
		Facteur de rétrécissement par direction :
		<KatexInline formula={'S_i(\\lambda) = \\frac{d_i}{d_i + \\lambda}'} /> — chaque direction est réduite
		selon sa propre quantité d'information.
	</p>

	<!-- Live shrinkage table -->
	<div class="shrink-table">
		<div class="table-header">Direction</div>
		<div class="table-body">
			{#each eigenvalues as d, i (i)}
				{@const sf = currentFactors[i]}
				{@const color = [
					'#3b82f6',
					'#06b6d4',
					'#10b981',
					'#eab308',
					'#f97316',
					'#ef4444',
					'#dc2626'
				][i]}
				<div class="shrink-row">
					<span class="dir-label" style:color>dᵢ = {d.toFixed(1)}</span>
					<span class="dir-desc">{directionLabel(d)}</span>
					<div class="bar-track">
						<div
							class="bar-fill retained"
							style:width={`${sf * 100}%`}
							style:background={color}
						></div>
						<div class="bar-fill lost" style:width={`${(1 - sf) * 100}%`}></div>
					</div>
					<span class="sf-value">{(sf * 100).toFixed(1)}%</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Controls -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Régularisation Ridge</div>
			<Slider bind:value={lambda} min={0} max={maxLambda} step={0.05} label="λ" />
		</div>
	</SliderGrid>

	<button class="play-btn" class:playing onclick={togglePlay}>
		{playing ? '⏸ Pause' : '▶ Balayer λ'}
	</button>

	<p class="cap">
		Ridge n'applique pas un rétrécissement uniforme. Les directions bien déterminées (grand
		<KatexInline formula="d_i" />, en bleu) conservent la plupart de leur information même à fort
		<KatexInline formula="\\lambda" />. Les directions peu déterminées (petit
		<KatexInline formula="d_i" />, en rouge) sont fortement rétrécies — c'est exactement ce qu'on
		veut : réduire le bruit dans les directions instables tout en préservant le signal dans les
		directions fiables.
	</p>
</div>

<style>
	.shrink-demo {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.formula-block {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
		padding: 0.5rem;
		background: var(--color-surface-2, transparent);
		border-radius: var(--radius-sm, 6px);
	}

	/* ─── Shrinkage table ──────────────────────── */
	.shrink-table {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.78rem;
	}

	.table-header {
		text-align: center;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.72rem;
	}

	.shrink-row {
		display: grid;
		grid-template-columns: 6rem minmax(8rem, auto) 1fr 3rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	.dir-label {
		font-weight: 700;
		font-family: 'SF Mono', monospace;
		white-space: nowrap;
	}

	.dir-desc {
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.bar-track {
		height: 10px;
		background: #374151;
		border-radius: 3px;
		overflow: hidden;
		display: flex;
	}
	.bar-fill.retained {
		transition:
			width 0.1s ease,
			height 0.1s ease;
	}
	.bar-fill.lost {
		background: rgba(255, 255, 255, 0.1);
		transition: width 0.1s ease;
	}

	.sf-value {
		font-family: 'SF Mono', monospace;
		text-align: right;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	/* ─── Controls ────────────────────────────── */
	.grp {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.gttl {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}

	.play-btn {
		align-self: center;
		padding: 0.3rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.78rem;
		color: var(--color-text, inherit);
	}
	.play-btn.playing {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}
</style>
