<script lang="ts">
	/** 1D function with analytical derivatives */
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

	const cur = $derived(funcs[selectedIndex]);

	const xMin = -2;
	const xMax = 2;
	const N = 400;

	const points = $derived.by(() => {
		const pts: [number, number][] = [];
		for (let i = 0; i <= N; i++) {
			const x = xMin + (i / N) * (xMax - xMin);
			pts.push([x, cur.f(x)]);
		}
		return pts;
	});

	const yRange = $derived.by(() => [
		Math.min(...points.map((p) => p[1])),
		Math.max(...points.map((p) => p[1]))
	]);
	const yPad = $derived((yRange[1] - yRange[0]) * 0.1 || 1);

	const fx = $derived(cur.f(xPos));
	const fpx = $derived(cur.df(xPos));
	const d2fx = $derived(cur.d2f(xPos));

	/** Tangent line: y = f(x*) + f'(x*)(x - x*) */
	const tangentPts = $derived.by(() => {
		const pts: [number, number][] = [];
		for (let i = 0; i <= N / 4; i++) {
			const x = xPos - 1.5 + (i / (N / 4)) * 3;
			const y = fx + fpx * (x - xPos);
			if (y >= yRange[0] - yPad && y <= yRange[1] + yPad) {
				pts.push([x, y]);
			}
		}
		return pts;
	});

	const curvatureColor = $derived.by(() => {
		const c = d2fx;
		if (c > 0.1) return '#22c55e'; // green — minimum
		if (c < -0.1) return '#ef4444'; // red — maximum
		return '#f59e0b'; // orange — inconclusive
	});

	const curvatureLabel = $derived.by(() => {
		const c = d2fx;
		if (c > 0.1) return 'Convexe (minimum local)';
		if (c < -0.1) return 'Concave (maximum local)';
		return "Indécis (f'' ≈ 0)";
	});

	const isCritical = $derived(Math.abs(fpx) < 0.2);

	// SVG layout
	const svgW = 480;
	const svgH = 260;
	const padL = 50,
		padR = 16,
		padT = 16,
		padB = 32;
	const plotW = svgW - padL - padR;
	const plotH = svgH - padT - padB;

	function projX(x: number): number {
		return padL + ((x - xMin) / (xMax - xMin)) * plotW;
	}
	function projY(y: number): number {
		return padT + ((yRange[1] + yPad - y) / (yRange[1] - yRange[0] + 2 * yPad)) * plotH;
	}

	const curvePath = $derived.by(() => {
		let d = '';
		for (const [x, y] of points) {
			d += `${d ? 'L' : 'M'}${projX(x).toFixed(1)},${projY(y).toFixed(1)} `;
		}
		return d.trim();
	});

	const tangentPath = $derived.by(() => {
		if (tangentPts.length < 2) return '';
		let d = 'M';
		for (const [x, y] of tangentPts) {
			d += `${projX(x).toFixed(1)},${projY(y).toFixed(1)} L `;
		}
		return d.trim();
	});

	const pxPos = $derived(projX(xPos));
	const pyFx = $derived(projY(fx));

	function sliderHandler(e: Event) {
		const target = e.target as HTMLInputElement;
		xPos = parseFloat(target.value);
	}
</script>

<div class="demo-wrap">
	<!-- SVG chart -->
	<svg
		viewBox={`0 0 ${svgW} ${svgH}`}
		width="100%"
		height={svgH}
		role="img"
		aria-label="Explorateur du Hessien"
	>
		<!-- Grid -->
		{#each [-2, -1, 0, 1, 2] as tick}
			<line
				x1={projX(tick)}
				y1={padT}
				x2={projX(tick)}
				y2={plotH + padT}
				stroke="var(--color-border)"
				opacity="0.3"
			/>
			<text
				x={projX(tick)}
				y={svgH - 8}
				text-anchor="middle"
				fill="var(--color-text-muted)"
				font-size="10">{tick}</text
			>
		{/each}

		<!-- Curve -->
		<path d={curvePath} fill="none" stroke="var(--color-belief)" stroke-width="2" />

		<!-- Tangent line -->
		{#if tangentPath}
			<path d={tangentPath} fill="none" stroke={curvatureColor} stroke-width="1.5" opacity="0.7" />
		{/if}

		<!-- Marker at x* -->
		<circle
			cx={pxPos}
			cy={pyFx}
			r="6"
			fill={curvatureColor}
			stroke="var(--color-bg)"
			stroke-width="2"
		/>
		<line
			x1={pxPos}
			y1={padT + plotH}
			x2={pxPos}
			y2={pyFx}
			stroke={curvatureColor}
			stroke-width="1"
			stroke-dasharray="3 2"
			opacity="0.5"
		/>

		<!-- Gradient indicator -->
		<text x={svgW - padR - 4} y="14" text-anchor="end" fill="var(--color-text-muted)" font-size="9"
			>f'(x*) = {fpx.toFixed(3)}</text
		>
	</svg>

	<!-- Controls & info -->
	<div class="panel">
		<div class="row">
			<span class="label">Fonction :</span>
			<select
				value={selectedIndex}
				onchange={(e) => (selectedIndex = parseInt((e.target as HTMLSelectElement).value))}
			>
				{#each funcs as fn, i}
					<option value={i}>{fn.label}</option>
				{/each}
			</select>
		</div>

		<div class="row">
			<span class="label">x* = <strong>{xPos.toFixed(3)}</strong></span>
			<input type="range" min={xMin} max={xMax} step="0.01" value={xPos} oninput={sliderHandler} />
		</div>

		<div class="info">
			<span class="badge" style:background-color={curvatureColor}>
				f''(x*) = {d2fx.toFixed(3)} — {curvatureLabel}
			</span>
			{#if isCritical}
				<span class="badge critical">∇f ≈ 0 (point critique)</span>
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
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.label {
		min-width: fit-content;
	}

	select {
		padding: 0.2rem 0.4rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: transparent;
		color: inherit;
	}

	input[type='range'] {
		flex: 1;
	}

	.info {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.badge {
		color: #fff;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-sm, 4px);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.badge.critical {
		background: #a855f7 !important;
	}
</style>
