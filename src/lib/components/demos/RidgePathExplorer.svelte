<script lang="ts">
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	let lambda = $state(0.1);
	const maxLambda = 3;
	const N_PATH = 200;
	const olsWeights = [2.5, 1.8, -1.2];
	const n = 15;

	function ridgeW(wOls: number, lam: number): number {
		return wOls / (1 + lam * n);
	}

	const colors = ['#3b82f6', '#ef4444', '#10b981'];

	const paths = $derived.by(() =>
		olsWeights.map((wOls, idx) => ({
			wOls,
			points: Array.from({ length: N_PATH }, (_, i) => {
				const l = maxLambda * (i / (N_PATH - 1));
				return [l, ridgeW(wOls, l)] as [number, number];
			}),
			color: colors[idx]
		}))
	);

	const curves = $derived(
		paths.map((p) => ({ points: p.points, stroke: p.color, strokeWidth: 2.5 }))
	);
	const legend = $derived(
		paths.map((p, i) => ({
			label: `w${i + 1}* (OLS=${p.wOls.toFixed(1)})`,
			color: p.color,
			kind: 'line' as const
		}))
	);

	const yMax = $derived.by(() => {
		const allAbs = paths.flatMap((p) => p.points.map(([, v]) => Math.abs(v)));
		return Math.ceil(Math.max(...allAbs) * 1.3);
	});

	const currentVals = $derived(paths.map((p) => ridgeW(p.wOls, lambda)));
</script>

<div class="ridge-path">
	<Figure type="chart">
		<DensityChart {curves} xDomain={[0, maxLambda]} {yMax} height={250} nTicks={6} {legend} />
	</Figure>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Régularisation</div>
			<Slider bind:value={lambda} min={0} max={maxLambda} step={0.05} label="λ" />
		</div>
		<div class="grp">
			<div class="gttl">Coefficients à λ actuel</div>
			{#each currentVals as v, i}
				<div class="rw"><span style="color:{colors[i]}">w{i + 1}</span> ≈ {v.toFixed(3)}</div>
			{/each}
		</div>
	</SliderGrid>

	<p class="cap">
		Les coefficients convergent vers <strong>0</strong> quand <KatexInline
			formula={`\\lambda \\to +\\infty`}
		/>. Ridge garantit que la hessienne reste définie positive.
	</p>
</div>

<style>
	.ridge-path {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}
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
	.rw {
		font-size: 0.82rem;
		font-family: 'SF Mono', 'Fira Code', monospace, system-ui;
		padding: 0.15rem 0;
		display: flex;
		gap: 0.3rem;
	}
	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
