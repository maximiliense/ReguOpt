<script lang="ts">
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';

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
	let playing = $state(false);

	const cur = $derived(funcs[selectedIndex]);

	// Compute convexity inequality values at the current lambda
	const f_x = $derived(cur.f(ptX));
	const f_y = $derived(cur.f(ptY));

	const interpPt = $derived(lambda * ptX + (1 - lambda) * ptY);
	const chordVal = $derived(lambda * f_x + (1 - lambda) * f_y); // value on the chord
	const funcAtInterp = $derived(cur.f(interpPt)); // actual function value

	const isConvex = $derived(funcAtInterp <= chordVal + 1e-6);
	const diff = $derived(chordVal - funcAtInterp); // positive = convex, negative = not convex

	// ── Whole-segment verdict: convexity requires the inequality for EVERY λ ∈ [0,1],
	// not just the one currently selected. Sample densely across the segment. ──
	const M = 60;
	const segmentSamples = $derived.by(() => {
		return Array.from({ length: M + 1 }, (_, i) => {
			const t = i / M; // this is "1 - lambda" in the standard parametrization below
			const x = ptX + t * (ptY - ptX);
			const chord = (1 - t) * f_x + t * f_y;
			const actual = cur.f(x);
			return { t, x, chord, actual, gap: chord - actual };
		});
	});

	const segmentHoldsEverywhere = $derived(segmentSamples.every((s) => s.gap >= -1e-6));

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

	// ── Fill polygon: chord edge forward + curve edge backward, split into
	// green (convex-holding) and red (violation) bands based on local gap sign ──
	const fillBands = $derived.by(() => {
		const bands: { path: string; color: string }[] = [];
		let currentSign: number | null = null;
		let bandPoints: { xSvg: number; chordY: number; curveY: number }[] = [];

		function flush() {
			if (bandPoints.length < 2) return;
			const top = bandPoints
				.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.xSvg.toFixed(1)},${p.chordY.toFixed(1)}`)
				.join(' ');
			const bottom = [...bandPoints]
				.reverse()
				.map((p) => `L${p.xSvg.toFixed(1)},${p.curveY.toFixed(1)}`)
				.join(' ');
			bands.push({
				path: `${top} ${bottom} Z`,
				color: currentSign! >= 0 ? '#22c55e' : '#ef4444'
			});
		}

		for (const s of segmentSamples) {
			const sign = s.gap >= 0 ? 1 : -1;
			if (currentSign !== null && sign !== currentSign) {
				// close out previous band, start new one sharing this point for continuity
				flush();
				bandPoints = [bandPoints[bandPoints.length - 1]];
			}
			currentSign = sign;
			bandPoints.push({
				xSvg: projX(s.x),
				chordY: projY(s.chord),
				curveY: projY(s.actual)
			});
		}
		flush();
		return bands;
	});

	// ── Autoplay: sweep lambda back and forth ──
	let rafId: number | null = null;
	let direction = -1; // moves lambda downward first (t upward)

	function playTick() {
		const speed = 0.01;
		let next = lambda + direction * speed;
		if (next <= 0) {
			next = 0;
			direction = 1;
		} else if (next >= 1) {
			next = 1;
			direction = -1;
		}
		lambda = next;
		rafId = requestAnimationFrame(playTick);
	}

	function togglePlay() {
		playing = !playing;
		if (playing) {
			rafId = requestAnimationFrame(playTick);
		} else if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function stopPlay() {
		if (rafId) cancelAnimationFrame(rafId);
		rafId = null;
		playing = false;
	}

	function selectFunc(i: number) {
		stopPlay();
		selectedIndex = i;
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
		<!-- Fill bands: green where chord >= curve (convexity holds), red where it fails -->
		{#each fillBands as band, i (i)}
			<path d={band.path} fill={band.color} opacity="0.18" stroke="none" />
		{/each}

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
			{isConvex ? '✓ Convexe' : '✗ Pas convexe'} en λ = {lambda.toFixed(2)}
		</span>
		<span class="formula"
			>f(λx+(1−λ)y) = {funcAtInterp.toFixed(3)} vs λf(x)+(1−λ)f(y) = {chordVal.toFixed(3)}</span
		>
		<span class="diff" style:color={isConvex ? '#22c55e' : '#ef4444'}>Δ = {diff.toFixed(3)}</span>

		<span class={`segment-verdict ${segmentHoldsEverywhere ? 'convex' : 'non-convex'}`}>
			{segmentHoldsEverywhere
				? '✓ La corde reste au-dessus de la courbe pour tout λ ∈ [0,1] sur ce segment'
				: '✗ La courbe dépasse la corde pour au moins un λ sur ce segment (zone rouge)'}
		</span>
	</div>

	<!-- Controls -->
	<div class="options-row">
		{#each funcs as fn, i}
			<button class:active={selectedIndex === i} onclick={() => selectFunc(i)}>
				{fn.label}
			</button>
		{/each}
	</div>

	<div class="panel">
		<SliderGrid>
			<div class="group">
				<div class="group-title">Segment [x, y]</div>
				<Slider bind:value={ptX} min={xMin} max={xMax} step={0.01} label="x" />
				<Slider bind:value={ptY} min={xMin} max={xMax} step={0.01} label="y" />
			</div>
			<div class="group">
				<div class="group-title">Interpolation</div>
				<Slider bind:value={lambda} min={0} max={1} step={0.01} label="λ" />
			</div>
		</SliderGrid>

		<button class="play-btn" class:playing onclick={togglePlay}>
			{playing ? '⏸ Pause' : '▶ Balayer λ automatiquement'}
		</button>
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
		<span
			><span class="swatch fill-swatch" style="background:#22c55e"></span> Convexité respectée</span
		>
		<span><span class="swatch fill-swatch" style="background:#ef4444"></span> Convexité violée</span
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
		text-align: center;
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

	.segment-verdict {
		font-size: 0.78rem;
		font-weight: 600;
		padding: 0.2rem 0.7rem;
		border-radius: var(--radius-sm, 4px);
	}

	.formula {
		font-family: var(--font-mono);
		font-size: 0.78rem;
	}
	.diff {
		font-weight: 700;
	}

	.options-row {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.options-row button {
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.78rem;
		color: var(--color-text, inherit);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.options-row button.active {
		background: var(--color-belief, #3b82f6);
		color: white;
		border-color: var(--color-belief, #3b82f6);
	}

	.panel {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
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
	.fill-swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		opacity: 0.5;
	}
</style>
