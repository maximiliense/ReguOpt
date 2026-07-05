<script lang="ts">
	/** 1D function to test convexity */
	interface Func1D {
		label: string;
		f: (x: number) => number;
	}

	const funcs: Func1D[] = [
		{ label: 'Convexe : f(x) = x²', f: (x) => x * x },
		{ label: 'Convexe : f(x) = eˣ', f: (x) => Math.exp(x) },
		{ label: 'Non convexe : f(x) = sin(2πx)', f: (x) => Math.sin(2 * Math.PI * x) },
		{ label: 'Non convexe : f(x) = x⁴ − x²', f: (x) => x ** 4 - x ** 2 }
	];

	let selectedIndex = $state(0);
	let ptX = $state(-1.2);
	let ptY = $state(0.8);
	let lambda = $state(0.5);

	const cur = $derived(funcs[selectedIndex]);

	// Compute convexity inequality values
	const f_x = $derived(cur.f(ptX));
	const f_y = $derived(cur.f(ptY));

	const interpPt = $derived(lambda * ptX + (1 - lambda) * ptY);
	const chordVal = $derived(lambda * f_x + (1 - lambda) * f_y); // value on the chord
	const funcAtInterp = $derived(cur.f(interpPt)); // actual function value

	const isConvex = $derived(funcAtInterp <= chordVal + 1e-6);
	const diff = $derived(chordVal - funcAtInterp); // positive = convex, negative = not convex

	// SVG layout
	const svgW = 480;
	const svgH = 260;
	const padL = 50,
		padR = 16,
		padT = 16,
		padB = 32;
	const plotW = svgW - padL - padR;
	const plotH = svgH - padT - padB;

	const xMin = -2,
		xMax = 2;
	const N = 400;

	const points = $derived.by(() => {
		const pts: [number, number][] = [];
		for (let i = 0; i <= N; i++) {
			const x = xMin + (i / N) * (xMax - xMin);
			pts.push([x, cur.f(x)]);
		}
		return pts;
	});

	const yVals = $derived(points.map((p) => p[1]));
	const yRange: [number, number] = $derived.by(() => {
		let mn = Math.min(...yVals),
			mx = Math.max(...yVals);
		const pad = (mx - mn) * 0.1 || 1;
		return [mn - pad, mx + pad];
	});

	function projX(x: number): number {
		return padL + ((x - xMin) / (xMax - xMin)) * plotW;
	}
	function projY(y: number): number {
		const span = yRange[1] - yRange[0];
		return padT + ((yRange[1] - y) / span) * plotH;
	}

	const curvePath = $derived.by(() => {
		let d = '';
		for (const [x, y] of points) {
			d += `${d ? 'L' : 'M'}${projX(x).toFixed(1)},${projY(y).toFixed(1)} `;
		}
		return d.trim();
	});

	// Chord segment between f(x) and f(y) projected onto SVG
	const chordA_x = $derived(projX(ptX));
	const chordA_y = $derived(projY(f_x));
	const chordB_x = $derived(projX(ptY));
	const chordB_y = $derived(projY(f_y));

	// Interpolation point on curve and on chord
	const interpSvgX = $derived(projX(interpPt));
	const interpOnCurve_y = $derived(projY(funcAtInterp));
	const interpOnChord_y = $derived(projY(chordVal));

	function sliderHandler(name: string, e: Event) {
		const target = e.target as HTMLInputElement;
		const v = parseFloat(target.value);
		if (name === 'x') ptX = v;
		else if (name === 'y') ptY = v;
		else lambda = v;
	}
</script>

<div class="demo-wrap">
	<!-- SVG chart -->
	<svg
		viewBox={`0 0 ${svgW} ${svgH}`}
		width="100%"
		height={svgH}
		role="img"
		aria-label="Démo de convexité"
	>
		<!-- Grid ticks -->
		{#each [-2, -1, 0, 1, 2] as tick}
			<text
				x={projX(tick)}
				y={svgH - 8}
				text-anchor="middle"
				fill="var(--color-text-muted)"
				font-size="10">{tick}</text
			>
		{/each}

		<!-- Function curve -->
		<path d={curvePath} fill="none" stroke="var(--color-belief)" stroke-width="2.5" />

		<!-- Chord line (λf(x) + (1-λ)f(y)) -->
		<line
			x1={chordA_x}
			y1={chordA_y}
			x2={chordB_x}
			y2={chordB_y}
			stroke="#a855f7"
			stroke-width="1.5"
			stroke-dasharray="6 3"
		/>

		<!-- Vertical line at interpolation point -->
		<line
			x1={interpSvgX}
			y1={interpOnChord_y}
			x2={interpSvgX}
			y2={interpOnCurve_y}
			stroke="#f59e0b"
			stroke-width="2"
		/>

		<!-- Point f(x) -->
		<circle
			cx={chordA_x}
			cy={chordA_y}
			r="5"
			fill="#ef4444"
			stroke="var(--color-bg)"
			stroke-width="1.5"
		/>
		<text x={chordA_x} y={chordA_y - 10} text-anchor="middle" font-size="9" fill="#ef4444"
			>f(x)</text
		>

		<!-- Point f(y) -->
		<circle
			cx={chordB_x}
			cy={chordB_y}
			r="5"
			fill="#3b82f6"
			stroke="var(--color-bg)"
			stroke-width="1.5"
		/>
		<text x={chordB_x} y={chordB_y - 10} text-anchor="middle" font-size="9" fill="#3b82f6"
			>f(y)</text
		>

		<!-- Interpolation on chord -->
		<circle cx={interpSvgX} cy={interpOnChord_y} r="4" fill="#a855f7" />

		<!-- Actual function value at interpolation -->
		<circle
			cx={interpSvgX}
			cy={interpOnCurve_y}
			r="4"
			fill="#22c55e"
			stroke="var(--color-bg)"
			stroke-width="1.5"
		/>
	</svg>

	<!-- Badge showing convexity verdict -->
	<div class="badge-wrap">
		<span class={`verdict ${isConvex ? 'convex' : 'non-convex'}`}>
			{isConvex ? '✓ Convexe' : '✗ Pas convexe'} en cet intervalle
		</span>
		<span class="formula"
			>f(λx+(1−λ)y) = {funcAtInterp.toFixed(3)} vs λf(x)+(1−λ)f(y) = {chordVal.toFixed(3)}</span
		>
		<span class="diff" style:color={isConvex ? '#22c55e' : '#ef4444'}>Δ = {diff.toFixed(3)}</span>
	</div>

	<!-- Controls -->
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
			<span class="label">x = {ptX.toFixed(2)}</span>
			<input
				type="range"
				min={xMin}
				max={xMax}
				step="0.01"
				value={ptX}
				oninput={(e) => sliderHandler('x', e)}
			/>
		</div>

		<div class="row">
			<span class="label">y = {ptY.toFixed(2)}</span>
			<input
				type="range"
				min={xMin}
				max={xMax}
				step="0.01"
				value={ptY}
				oninput={(e) => sliderHandler('y', e)}
			/>
		</div>

		<div class="row">
			<span class="label">λ = {lambda.toFixed(2)}</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={lambda}
				oninput={(e) => sliderHandler('λ', e)}
			/>
		</div>
	</div>

	<!-- Legend -->
	<div class="legend">
		<span><span class="swatch" style="background:var(--color-belief)"></span> f(x)</span>
		<span><span class="swatch" style="background:#a855f7"></span> Corde λf(x)+(1-λ)f(y)</span>
		<span
			><span
				class="swatch"
				style="background:#22c55e;border-radius:50%;width:8px;height:8px;display:inline-block;"
			></span> f(λx+(1-λ)y) — valeur réelle</span
		>
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

	.badge-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.85rem;
	}

	.verdict {
		font-weight: 700;
		padding: 0.3rem 1rem;
		border-radius: var(--radius-sm, 4px);
		font-size: 0.9rem;
	}
	.convex {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}
	.non-convex {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.formula {
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}
	.diff {
		font-weight: 700;
	}

	.panel {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
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

	.legend {
		display: flex;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		flex-wrap: wrap;
		justify-content: center;
	}

	.swatch {
		display: inline-block;
		width: 12px;
		height: 3px;
		border-radius: 2px;
		vertical-align: middle;
	}
</style>
