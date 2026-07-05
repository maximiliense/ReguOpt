<script lang="ts">
	interface Func1D {
		label: string;
		f: (x: number) => number;
		df: (x: number) => number;
		d2f: (x: number) => number;
	}

	const funcs: Func1D[] = [
		{
			label: 'f(x) = x⁴ − x²',
			f: (x) => x ** 4 - x ** 2,
			df: (x) => 4 * x ** 3 - 2 * x,
			d2f: (x) => 12 * x ** 2 - 2
		},
		{
			label: 'f(x) = x³',
			f: (x) => x ** 3,
			df: (x) => 3 * x ** 2,
			d2f: (x) => 6 * x
		},
		{
			label: 'f(x) = x² + sin(10x)',
			f: (x) => x * x + Math.sin(10 * x),
			df: (x) => 2 * x + 10 * Math.cos(10 * x),
			d2f: (x) => 2 - 100 * Math.sin(10 * x)
		},
		{
			label: 'f(x) = eˣ · cos(x)',
			f: (x) => Math.exp(x) * Math.cos(x),
			df: (x) => Math.exp(x) * (Math.cos(x) - Math.sin(x)),
			d2f: (x) => -2 * Math.exp(x) * Math.sin(x)
		}
	];

	let selectedIndex = $state(0);
	let xPos = $state(0);

	const xMin = -2;
	const xMax = 2;
	const N = 400;

	const svgW = 480;
	const svgH = 260;
	const padL = 50,
		padR = 16,
		padT = 16,
		padB = 32;

	const plotW = svgW - padL - padR;
	const plotH = svgH - padT - padB;

	const graph = $derived.by(() => {
		const cur = funcs[selectedIndex];

		// sample curve
		const points: [number, number][] = Array.from({ length: N + 1 }, (_, i) => {
			const x = xMin + (i / N) * (xMax - xMin);
			return [x, cur.f(x)];
		});

		// safe y-range
		const ys = points.map(([, y]) => y);
		let yMin = Math.min(...ys);
		let yMax = Math.max(...ys);

		if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) {
			yMin = -1;
			yMax = 1;
		}

		const yPad = Math.max((yMax - yMin) * 0.1, 1);

		// projections
		const projX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;

		const projY = (y: number) => padT + ((yMax + yPad - y) / (yMax - yMin + 2 * yPad)) * plotH;

		// curve path (SAFE: no trailing SVG syntax issues possible)
		const curvePath = points
			.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${projX(x).toFixed(1)},${projY(y).toFixed(1)}`)
			.join(' ');

		// derivatives at x*
		const fx = cur.f(xPos);
		const fpx = cur.df(xPos);
		const d2fx = cur.d2f(xPos);

		// tangent line sample
		const tangentPts = Array.from({ length: N / 4 + 1 }, (_, i): [number, number] => {
			const x = xPos - 1.5 + (i / (N / 4)) * 3;
			return [x, fx + fpx * (x - xPos)];
		}).filter(([, y]) => y >= yMin - yPad && y <= yMax + yPad) as [number, number][];

		const tangentPath =
			tangentPts.length < 2
				? ''
				: tangentPts
						.map(
							([x, y], i) => `${i === 0 ? 'M' : 'L'}${projX(x).toFixed(1)},${projY(y).toFixed(1)}`
						)
						.join(' ');

		// curvature
		const curvatureColor = d2fx > 0.1 ? '#22c55e' : d2fx < -0.1 ? '#ef4444' : '#f59e0b';

		const curvatureLabel =
			d2fx > 0.1
				? 'Convexe (minimum local)'
				: d2fx < -0.1
					? 'Concave (maximum local)'
					: "Indécis (f'' ≈ 0)";

		const isCritical = Math.abs(fpx) < 0.2;

		return {
			cur,
			curvePath,
			tangentPath,
			curvatureColor,
			curvatureLabel,
			isCritical,
			fx,
			fpx,
			d2fx,
			px: projX(xPos),
			py: projY(fx)
		};
	});

	function sliderHandler(e: Event) {
		xPos = parseFloat((e.target as HTMLInputElement).value);
	}
</script>

<div class="demo-wrap">
	<svg
		viewBox={`0 0 ${svgW} ${svgH}`}
		width="100%"
		height={svgH}
		role="img"
		aria-label="Explorateur du Hessien"
	>
		<!-- grid -->
		{#each [-2, -1, 0, 1, 2] as tick}
			<line
				x1={padL + ((tick - xMin) / (xMax - xMin)) * plotW}
				y1={padT}
				x2={padL + ((tick - xMin) / (xMax - xMin)) * plotW}
				y2={padT + plotH}
				stroke="var(--color-border)"
				opacity="0.3"
			/>
			<text
				x={padL + ((tick - xMin) / (xMax - xMin)) * plotW}
				y={svgH - 8}
				text-anchor="middle"
				font-size="10"
				fill="var(--color-text-muted)"
			>
				{tick}
			</text>
		{/each}

		<!-- curve -->
		<path d={graph.curvePath} fill="none" stroke="var(--color-belief)" stroke-width="2" />

		<!-- tangent -->
		{#if graph.tangentPath}
			<path
				d={graph.tangentPath}
				fill="none"
				stroke={graph.curvatureColor}
				stroke-width="1.5"
				opacity="0.7"
			/>
		{/if}

		<!-- point -->
		<circle
			cx={graph.px}
			cy={graph.py}
			r="6"
			fill={graph.curvatureColor}
			stroke="var(--color-bg)"
			stroke-width="2"
		/>

		<text x={svgW - padR} y="14" text-anchor="end" font-size="9" fill="var(--color-text-muted)">
			f'(x*) = {graph.fpx.toFixed(3)}
		</text>
	</svg>

	<div class="panel">
		<div class="row">
			<span>Fonction :</span>
			<select
				value={selectedIndex}
				onchange={(e) => (selectedIndex = +(e.target as HTMLSelectElement).value)}
			>
				{#each funcs as fn, i}
					<option value={i}>{fn.label}</option>
				{/each}
			</select>
		</div>

		<div class="row">
			<span>x* = {xPos.toFixed(3)}</span>
			<input type="range" min={xMin} max={xMax} step="0.01" value={xPos} oninput={sliderHandler} />
		</div>

		<div class="info">
			<span class="badge" style:background-color={graph.curvatureColor}>
				f''(x*) = {graph.d2fx.toFixed(3)} — {graph.curvatureLabel}
			</span>

			{#if graph.isCritical}
				<span class="badge critical">point critique</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.demo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	svg {
		max-width: 480px;
		width: 100%;
		user-select: none;
	}

	.panel {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	input[type='range'] {
		flex: 1;
	}

	.badge {
		color: white;
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
	}

	.badge.critical {
		background: #a855f7 !important;
	}
</style>
