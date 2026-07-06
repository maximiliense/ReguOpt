<script lang="ts">
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';

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
	let showTaylor = $state(true);
	let playing = $state(false);

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

	function curvatureColorFor(d2: number): string {
		if (d2 > 0.1) return '#22c55e';
		if (d2 < -0.1) return '#ef4444';
		return '#f59e0b';
	}

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

		// curve path
		const curvePath = points
			.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${projX(x).toFixed(1)},${projY(y).toFixed(1)}`)
			.join(' ');

		// ── Continuous curvature strip: one thin rect per sample, colored by sign of f'' ──
		const stripSegments = points.map(([x]) => {
			const d2 = cur.d2f(x);
			return { x1: projX(x), color: curvatureColorFor(d2) };
		});

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

		// ── Second-order Taylor approximation: f(x*) + f'(x*)(x-x*) + f''(x*)/2 (x-x*)² ──
		// This is the exact parabola used in the CSSO proof sketch — visualizing it
		// makes the "local quadratic model" argument tangible instead of abstract.
		const taylorPts = Array.from({ length: N / 3 + 1 }, (_, i): [number, number] => {
			const x = xPos - 1.2 + (i / (N / 3)) * 2.4;
			const dx = x - xPos;
			return [x, fx + fpx * dx + 0.5 * d2fx * dx * dx];
		}).filter(([, y]) => y >= yMin - yPad && y <= yMax + yPad) as [number, number][];

		const taylorPath =
			taylorPts.length < 2
				? ''
				: taylorPts
						.map(
							([x, y], i) => `${i === 0 ? 'M' : 'L'}${projX(x).toFixed(1)},${projY(y).toFixed(1)}`
						)
						.join(' ');

		const curvatureColor = curvatureColorFor(d2fx);

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
			taylorPath,
			stripSegments,
			curvatureColor,
			curvatureLabel,
			isCritical,
			fx,
			fpx,
			d2fx,
			px: projX(xPos),
			py: projY(fx),
			plotTop: padT,
			plotBottom: padT + plotH
		};
	});

	// ── Autoplay: sweep x* across the domain so the curvature strip and badge
	// visibly narrate the whole function's convex/concave regions in sequence ──
	let rafId: number | null = null;
	let direction = 1;

	function playTick() {
		const speed = 0.012;
		let next = xPos + direction * speed;
		if (next >= xMax) {
			next = xMax;
			direction = -1;
		} else if (next <= xMin) {
			next = xMin;
			direction = 1;
		}
		xPos = next;
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
	<svg
		viewBox={`0 0 ${svgW} ${svgH}`}
		width="100%"
		height={svgH}
		role="img"
		aria-label="Explorateur du Hessien"
	>
		<!-- curvature strip: continuous background showing sign of f'' across the whole domain -->
		{#each graph.stripSegments as seg, i (i)}
			<rect
				x={seg.x1 - 0.7}
				y={graph.plotBottom - 6}
				width="1.4"
				height="6"
				fill={seg.color}
				opacity="0.55"
			/>
		{/each}

		<!-- grid -->
		{#each [-2, -1, 0, 1, 2] as tick}
			<line
				x1={padL + ((tick - xMin) / (xMax - xMin)) * plotW}
				y1={padT}
				x2={padL + ((tick - xMin) / (xMax - xMin)) * plotW}
				y2={graph.plotBottom}
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

		<!-- Taylor quadratic approximation (dashed, drawn first so tangent/curve sit on top) -->
		{#if showTaylor && graph.taylorPath}
			<path
				d={graph.taylorPath}
				fill="none"
				stroke={graph.curvatureColor}
				stroke-width="2"
				stroke-dasharray="5 4"
				opacity="0.55"
			/>
		{/if}

		<!-- curve -->
		<path d={graph.curvePath} fill="none" stroke="var(--color-belief)" stroke-width="2" />

		<!-- tangent -->
		{#if graph.tangentPath}
			<path
				d={graph.tangentPath}
				fill="none"
				stroke={graph.curvatureColor}
				stroke-width="1.5"
				opacity="0.85"
			/>
		{/if}

		<!-- point -->
		<circle
			cx={graph.px}
			cy={graph.py}
			r="7"
			fill={graph.curvatureColor}
			stroke="var(--color-bg)"
			stroke-width="2.5"
		/>
		<circle
			cx={graph.px}
			cy={graph.py}
			r="7"
			fill="none"
			stroke="#fff"
			stroke-width="1.5"
			opacity="0.5"
		/>

		<text x={svgW - padR} y="14" text-anchor="end" font-size="9" fill="var(--color-text-muted)">
			f'(x*) = {graph.fpx.toFixed(3)}
		</text>
	</svg>

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
				<div class="group-title">Position</div>
				<Slider bind:value={xPos} min={xMin} max={xMax} step={0.01} label="x*" />
			</div>
		</SliderGrid>

		<div class="controls-row">
			<button class="play-btn" class:playing onclick={togglePlay}>
				{playing ? '⏸ Pause' : '▶ Balayer automatiquement'}
			</button>
			<label class="taylor-toggle">
				<input type="checkbox" bind:checked={showTaylor} />
				<span>Approximation quadratique (Taylor)</span>
			</label>
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
		gap: 0.6rem;
	}

	svg {
		max-width: 480px;
		width: 100%;
		user-select: none;
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
		border-radius: 8px;
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

	.controls-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.play-btn {
		padding: 0.3rem 0.75rem;
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

	.taylor-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	.info {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge {
		color: white;
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.badge.critical {
		background: #a855f7 !important;
	}
</style>
