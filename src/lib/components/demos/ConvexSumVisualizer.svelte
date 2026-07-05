<script lang="ts">
	/**
	 * Visualize that sum of convex functions is convex.
	 * Shows two individual curves and their sum, with a chord to illustrate convexity.
	 */

	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';

	let alpha1 = $state(0.5);
	let alpha2 = $state(0.5);
	let offset1 = $state(0);
	let offset2 = $state(2);

	const xDomain: [number, number] = [-4, 4];
	const N = 300;

	// f1(x) = exp(alpha1 * x^2 / 2)  — always convex
	function f1(x: number): number {
		return Math.exp((alpha1 * x * x + offset1) / 2);
	}
	// f2(x) = cosh(alpha2 * (x - offset2)) — always convex
	function f2(x: number): number {
		return Math.cosh(alpha2 * (x - offset2));
	}

	const curveA = $derived(
		Array.from({ length: N }, (_, i) => {
			const x = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
			return [x, f1(x)] as [number, number];
		})
	);

	const curveB = $derived(
		Array.from({ length: N }, (_, i) => {
			const x = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
			return [x, f2(x)] as [number, number];
		})
	);

	const curveSum = $derived(
		Array.from({ length: N }, (_, i) => {
			const x = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
			return [x, f1(x) + f2(x)] as [number, number];
		})
	);

	// Chord between two points on sum curve — always above the curve for convex functions
	let chordA = $state(-1.5);
	let chordB = $state(1.5);

	const yMax = $derived.by(() => {
		const vals = curveSum.map(([, v]) => v);
		return Math.ceil((Math.max(...vals) * 1.1) / 10) * 10;
	});

	function lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	const chordPoints = $derived(
		Array.from({ length: N }, (_, i) => {
			const x = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
			if (x < chordA || x > chordB) return [x, NaN] as [number, number];
			const t = (x - chordA) / (chordB - chordA);
			const yA = f1(chordA) + f2(chordA);
			const yB = f1(chordB) + f2(chordB);
			return [x, lerp(yA, yB, t)] as [number, number];
		})
	);

	const curves = $derived([
		{ points: curveA, stroke: '#8b5cf6', strokeWidth: 1.5, opacity: 0.5 },
		{ points: curveB, stroke: '#f97316', strokeWidth: 1.5, opacity: 0.5 },
		{ points: curveSum, stroke: '#3b82f6', strokeWidth: 2.5, fill: '#3b82f6', fillOpacity: 0.1 },
		{ points: chordPoints, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '6 3' }
	]);

	const legend = $derived([
		{ label: String.raw`f₁(x)`, color: '#8b5cf6', kind: 'line' as const },
		{ label: String.raw`f₂(x)`, color: '#f97316', kind: 'line' as const },
		{ label: String.raw`f₁ + f₂`, color: '#3b82f6', kind: 'line' as const },
		{ label: 'Cordes (convexité)', color: '#ef4444', kind: 'dashed-line' as const }
	]);
</script>

<div class="convex-sum">
	<Figure type="chart">
		<DensityChart {curves} {xDomain} {yMax} height={250} nTicks={6} {legend} />
	</Figure>

	<SliderGrid>
		<div class="group">
			<div class="group-title">Cordes de convexité</div>
			<Slider bind:value={chordA} min={-4} max={3.5} step={0.1} label="a" />
			<Slider bind:value={chordB} min={-3.5} max={4} step={0.1} label="b" />
		</div>
		<div class="group">
			<div class="group-title">Formes des fonctions</div>
			<Slider bind:value={alpha1} min={0.1} max={2} step={0.05} label="\u03b1₁" />
			<Slider bind:value={alpha2} min={0.1} max={2} step={0.05} label="\u03b1₂" />
			<Slider bind:value={offset2} min={-4} max={4} step={0.1} label="décalage f₂" />
		</div>
	</SliderGrid>

	<p class="caption">
		La courbe <strong style="color: #3b82f6">bleue</strong> (somme) reste toujours en dessous de la
		corde
		<strong style="color: #ef4444">rouge pointillée</strong>, illustrant que la somme de deux
		fonctions convexes est convexe.
	</p>
</div>

<style>
	.convex-sum {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface, transparent);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.group-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}

	.caption {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		text-align: center;
		padding-top: 0.25rem;
	}

	.caption strong {
		color: inherit;
	}
</style>
