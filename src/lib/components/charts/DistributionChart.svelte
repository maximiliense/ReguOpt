<script lang="ts">
	import { scaleLinear } from 'd3';
	import { line, curveBasis } from 'd3';
	import { range } from 'd3';

	interface Distribution {
		type: 'gaussian' | 'laplace';
		mu: number;
		sigma2: number;
		color: string;
		label?: string;
	}

	interface Props {
		distributions: Distribution[];
		height?: number;
		xDomain?: [number, number];
	}

	let { distributions, height = 200, xDomain }: Props = $props();

	let containerWidth = $state(0);

	// 1. Set clean, fixed typography and line weights
	const fontSize = 10;
	const labelSize = 13;
	const strokeWidth = 2;
	const tickStroke = 1;
	const axisStroke = 1;

	// 2. Fixed layout padding
	const padding = {
		top: 15,
		right: 20,
		bottom: 35,
		left: 20
	};

	// 3. ViewBox dimensions track the actual pixels 1:1
	const vbWidth = $derived(containerWidth || 560);
	const vbHeight = $derived(height);

	function gaussianPDF(x: number, mu: number, sigma2: number): number {
		const sigma = Math.sqrt(sigma2);
		return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
	}

	function laplacePDF(x: number, mu: number, sigma2: number): number {
		const b = Math.sqrt(sigma2 / 2);
		return (1 / (2 * b)) * Math.exp(-Math.abs(x - mu) / b);
	}

	function pdf(dist: Distribution, x: number): number {
		return dist.type === 'laplace'
			? laplacePDF(x, dist.mu, dist.sigma2)
			: gaussianPDF(x, dist.mu, dist.sigma2);
	}

	const computedXDomain = $derived.by((): [number, number] => {
		if (xDomain) return xDomain;
		if (distributions.length === 0) return [-4, 4];
		const mus = distributions.map((d) => d.mu);
		const sigmas = distributions.map((d) => Math.sqrt(d.sigma2));
		const minX = Math.min(...mus.map((mu, i) => mu - 4 * sigmas[i]));
		const maxX = Math.max(...mus.map((mu, i) => mu + 4 * sigmas[i]));
		return [minX, maxX];
	});

	const xScale = $derived(
		scaleLinear<number>()
			.domain(computedXDomain)
			.range([padding.left, Math.max(padding.left, vbWidth - padding.right)])
	);

	const paths = $derived.by(() => {
		if (!containerWidth) return [];

		const [x0, x1] = computedXDomain;
		const STEPS = 500;
		const step = (x1 - x0) / STEPS;

		const allPts = distributions.map((dist) => {
			const grid = range(x0, x1 + step * 0.5, step).map((x) => ({ x, y: pdf(dist, x) }));
			const peakPt = { x: dist.mu, y: pdf(dist, dist.mu) };
			const pts = [...grid, peakPt].sort((a, b) => a.x - b.x);
			return { dist, pts };
		});

		const globalMaxY = Math.max(...allPts.flatMap(({ pts }) => pts.map((p) => p.y)), 0);

		const yScale = scaleLinear<number>()
			.domain([0, globalMaxY * 1.1])
			.range([vbHeight - padding.bottom, padding.top]);

		const makeLine = () =>
			line<{ x: number; y: number }>()
				.x((d) => xScale(d.x))
				.y((d) => yScale(d.y))
				.curve(curveBasis);

		return allPts.map(({ dist, pts }) => {
			const fillPts = [{ x: x0, y: 0 }, ...pts, { x: x1, y: 0 }];
			const localMaxY = Math.max(...pts.map((p) => p.y));

			return {
				d: makeLine()(pts) ?? '',
				fill: makeLine()(fillPts) ?? '',
				color: dist.color,
				label: dist.label,
				labelX: xScale(dist.mu),
				// Fixed offset above the peak
				labelY: yScale(localMaxY) - 8
			};
		});
	});

	const ticks = $derived(xScale.ticks(5));
</script>

<div class="chart-wrapper" bind:clientWidth={containerWidth}>
	{#if containerWidth > 0}
		<svg
			viewBox={`0 0 ${vbWidth} ${vbHeight}`}
			width="100%"
			height={vbHeight}
			role="img"
			aria-label="Distribution chart"
		>
			{#each ticks as tick (tick)}
				<line
					x1={xScale(tick)}
					y1={padding.top}
					x2={xScale(tick)}
					y2={vbHeight - padding.bottom}
					stroke="var(--color-border)"
					stroke-width={tickStroke}
					opacity="0.4"
				/>
			{/each}

			{#each paths as path, i (path.color + path.label + i)}
				<path d={path.fill} fill={path.color} opacity="0.1" />
			{/each}

			{#each paths as path, i (path.color + path.label + i)}
				<path
					d={path.d}
					fill="none"
					stroke={path.color}
					stroke-width={strokeWidth}
					stroke-linejoin="round"
				/>
				{#if path.label}
					<text
						x={path.labelX}
						y={path.labelY}
						text-anchor="middle"
						fill={path.color}
						font-size={labelSize}
						font-weight="600"
						font-family="var(--font-sans)">{path.label}</text
					>
				{/if}
			{/each}

			<line
				x1={padding.left}
				y1={vbHeight - padding.bottom}
				x2={vbWidth - padding.right}
				y2={vbHeight - padding.bottom}
				stroke="var(--color-border)"
				stroke-width={axisStroke}
			/>

			{#each ticks as tick (tick)}
				<text
					x={xScale(tick)}
					y={vbHeight - padding.bottom + 16}
					text-anchor="middle"
					fill="var(--color-text-muted)"
					font-size={fontSize}
					font-family="var(--font-mono)">{tick}</text
				>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.chart-wrapper {
		width: 100%;
	}

	svg {
		display: block;
		overflow: visible;
	}
</style>
