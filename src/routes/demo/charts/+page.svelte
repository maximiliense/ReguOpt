<script lang="ts">
	import CanvasWrapper from '$lib/components/charts/CanvasWrapper.svelte';
	import DistributionChart from '$lib/components/charts/DistributionChart.svelte';
	import HeatmapGrid from '$lib/components/charts/HeatmapGrid.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';

	// DistributionChart data
	const distributions = [
		{ type: 'gaussian' as const, mu: 0, sigma2: 1, color: '#06b6d4', label: 'Prior q(s)' },
		{
			type: 'gaussian' as const,
			mu: 1.5,
			sigma2: 0.25,
			color: '#f4f4f5',
			label: 'Posterior p(s|o)'
		}
	];

	// HeatmapGrid data — 5x5 random-ish values
	const heatmapData = Array.from({ length: 5 }, (_, r) =>
		Array.from({ length: 5 }, (_, c) => Math.sin(r * 0.8) * Math.cos(c * 0.8) * 0.5 + 0.5)
	);

	// LineChart data
	const lineSeries = [
		{
			values: Array.from({ length: 30 }, (_, i) => Math.exp(-i * 0.1) + Math.random() * 0.05),
			color: '#06b6d4',
			label: 'Free Energy'
		},
		{
			values: Array.from({ length: 30 }, (_, i) => 1 - Math.exp(-i * 0.12) + Math.random() * 0.04),
			color: '#10b981',
			label: 'Précision'
		}
	];

	// Canvas draw function
	function drawCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = '#18181b';
		ctx.fillRect(0, 0, w, h);

		// Draw a simple sine wave
		ctx.beginPath();
		ctx.strokeStyle = '#06b6d4';
		ctx.lineWidth = 2;
		for (let x = 0; x <= w; x++) {
			const y = h / 2 + Math.sin((x / w) * Math.PI * 4) * (h / 4);
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		ctx.fillStyle = '#a1a1aa';
		ctx.font = '12px monospace';
		ctx.fillText('Canvas 2D — ' + w + 'x' + h, 12, 20);
	}
</script>

<svelte:head>
	<title>Demo — Charts</title>
</svelte:head>

<PageTemplate title="Charts — Demo" subtitle="Composants de visualisation.">
	<TheorySection>
		<div>
			<h2>DistributionChart</h2>
			<p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 1rem;">
				Prior (cyan) vs Posterior (white) — deux gaussiennes
			</p>
			<DistributionChart {distributions} height={200} />
		</div>

		<div>
			<h2>HeatmapGrid</h2>
			<div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
				<div style="width: 180px;">
					<p style="color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 0.5rem;">
						Cyan (croyances)
					</p>
					<HeatmapGrid data={heatmapData} colorScale="cyan" showValues />
				</div>
				<div style="width: 180px;">
					<p style="color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 0.5rem;">
						Rose (erreur)
					</p>
					<HeatmapGrid data={heatmapData} colorScale="rose" />
				</div>
				<div style="width: 180px;">
					<p style="color: var(--color-text-muted); font-size: 0.75rem; margin-bottom: 0.5rem;">
						Violet (épistémique)
					</p>
					<HeatmapGrid data={heatmapData} colorScale="violet" />
				</div>
			</div>
		</div>

		<div>
			<h2>LineChart</h2>
			<LineChart
				series={lineSeries}
				xLabel="Temps (ticks)"
				yLabel="Valeur"
				width={500}
				height={200}
			/>
		</div>

		<div>
			<h2>CanvasWrapper</h2>
			<div
				style="height: 120px; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden;"
			>
				<CanvasWrapper draw={drawCanvas} />
			</div>
		</div>
	</TheorySection>
</PageTemplate>
