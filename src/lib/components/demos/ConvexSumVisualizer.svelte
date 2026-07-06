<script lang="ts">
	/**
	 * Visualize that sum of convex functions is convex.
	 * Shows two individual curves and their sum, with a chord to illustrate convexity.
	 */

	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';

	let a = $state(2);

	const xDomain: [number, number] = [-4, 4];
	const N = 300;

	function f1(x: number): number {
		return x * x;
	}
	function f2(x: number): number {
		return (x - a) ** 2;
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
			const y = (f1(x) + f2(x)) / 2;
			return [x, y] as [number, number];
		})
	);

	// Chord endpoints — sliders can overlap in range, so we don't assume chordA < chordB.
	let chordA = $state(-1.5);
	let chordB = $state(1.5);

	function lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	// Build the chord as its OWN short point list spanning only [lo, hi] — no NaN
	// placeholders, so the path string DensityChart builds is always fully valid.
	const chordPoints = $derived.by(() => {
		const lo = Math.min(chordA, chordB);
		const hi = Math.max(chordA, chordB);
		const steps = 40;
		const yLo = (f1(lo) + f2(lo)) / 2;
		const yHi = (f1(hi) + f2(hi)) / 2;
		return Array.from({ length: steps + 1 }, (_, i) => {
			const t = i / steps;
			return [lerp(lo, hi, t), lerp(yLo, yHi, t)] as [number, number];
		});
	});

	const yMax = $derived(
		Math.max(
			...curveA.map(([, v]) => v),
			...curveB.map(([, v]) => v),
			...curveSum.map(([, v]) => v)
		) * 1.05
	);

	const curves = $derived([
		{ points: curveA, stroke: '#8b5cf6', strokeWidth: 1.5, opacity: 0.5 },
		{ points: curveB, stroke: '#f97316', strokeWidth: 1.5, opacity: 0.5 },
		{ points: curveSum, stroke: '#3b82f6', strokeWidth: 2.5, fill: '#3b82f6', fillOpacity: 0.1 },
		{ points: chordPoints, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '6 3' }
	]);

	// Legend/slider labels: real unicode characters passed as JS expressions
	// (curly-brace attributes), not backslash-escape sequences inside plain
	// quoted attributes — the latter never gets interpreted by Svelte and
	// renders literally as "\u03b1₁" etc.
	const labelF1 = 'f\u2081(x) = x²';
	const labelF2 = 'f\u2082(x) = (x − a)²';
	const labelSum = '\u00bd(f\u2081 + f\u2082)';

	const legend = $derived([
		{ label: labelF1, color: '#8b5cf6', kind: 'line' as const },
		{ label: labelF2, color: '#f97316', kind: 'line' as const },
		{ label: labelSum, color: '#3b82f6', kind: 'line' as const },
		{ label: 'Cordes (convexité)', color: '#ef4444', kind: 'dashed-line' as const }
	]);
</script>

<div class="convex-sum">
	<Figure type="chart">
		<DensityChart {curves} {xDomain} {yMax} height={380} nTicks={6} yAxis {legend} />
	</Figure>

	<SliderGrid>
		<div class="group">
			<div class="group-title">Cordes de convexité</div>
			<Slider bind:value={chordA} min={-4} max={3.5} step={0.1} label="a" />
			<Slider bind:value={chordB} min={-3.5} max={4} step={0.1} label="b" />
		</div>
		<div class="group">
			<div class="group-title">Fonctions</div>
			<Slider bind:value={a} min={-4} max={4} step={0.1} label="décalage a" />
		</div>
	</SliderGrid>

	<p class="caption">
		La courbe <strong style="color: #3b82f6">bleue</strong> (moyenne) reste toujours en dessous de
		la corde
		<strong style="color: #ef4444">rouge pointillée</strong>, illustrant que la moyenne de deux
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
