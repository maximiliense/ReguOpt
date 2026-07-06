<script lang="ts">
	import { onDestroy } from 'svelte';
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import { ellipse } from '$lib/math/test-functions.js';

	// Use the elliptic function to show how momentum helps in narrow valleys
	const f = ellipse.f;
	const grad = ellipse.grad;
	const domain: [[number, number], [number, number]] = [
		[-6, 6],
		[-5, 5]
	];

	const startX = -5;
	const startY = 4;
	let alpha = $state(0.3);
	let beta = $state(0.9);
	let maxSteps = $state(120);
	let playing = $state(false);
	let visibleSteps = $state(0);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	function runGD(maxIter: number): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-8) break;
			x -= alpha * gx;
			y -= alpha * gy;
			if (!isFinite(f(x, y))) break;
			traj.push({ x, y });
		}
		return traj;
	}

	function runMomentum(maxIter: number): { x: number; y: number }[] {
		let x = startX,
			y = startY;
		let vx = 0,
			vy = 0;
		const traj = [{ x, y }];
		for (let k = 0; k < maxIter; k++) {
			const [gx, gy] = grad(x, y);
			if (Math.sqrt(gx * gx + gy * gy) < 1e-8) break;
			vx = beta * vx + gx;
			vy = beta * vy + gy;
			x -= alpha * vx;
			y -= alpha * vy;
			if (!isFinite(f(x, y))) break;
			traj.push({ x, y });
		}
		return traj;
	}

	const gdPoints = $derived(runGD(maxSteps));
	const momPoints = $derived(runMomentum(maxSteps));

	const maxAvailableSteps = $derived(Math.max(gdPoints.length, momPoints.length));

	// Count sign flips of the y-velocity as a crude "oscillation score" —
	// gives a concrete number backing up the visual zig-zag you see for
	// classic GD in a narrow valley.
	function oscillationScore(points: { x: number; y: number }[]): number {
		let flips = 0;
		let prevDy: number | null = null;
		for (let i = 1; i < points.length; i++) {
			const dy = points[i].y - points[i - 1].y;
			if (
				prevDy !== null &&
				Math.sign(dy) !== 0 &&
				Math.sign(prevDy) !== 0 &&
				Math.sign(dy) !== Math.sign(prevDy)
			) {
				flips++;
			}
			if (Math.sign(dy) !== 0) prevDy = dy;
		}
		return flips;
	}
	const gdOscillations = $derived(oscillationScore(gdPoints));
	const momOscillations = $derived(oscillationScore(momPoints));

	// ── Responsive layout: TWO columns share the row's width, not the whole
	// container's — this is what was causing the panels to wrap onto separate
	// rows: chartW was previously min(containerWidth, 340) applied to EACH of
	// the two panels, so two side-by-side 340px charts plus padding/gap easily
	// exceeded the available row width well before 700px viewports. ──
	let rowWidth = $state(680);
	const gapPx = 16;
	const chartW = $derived(Math.max(140, Math.min(320, (rowWidth - gapPx) / 2 - 24)));
	const pad = 30;
	const aspect = (domain[1][1] - domain[1][0]) / (domain[0][1] - domain[0][0]);
	const chartH = $derived(Math.round(chartW * aspect));

	function projX(x: number) {
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (chartW - pad * 2);
	}
	function projY(y: number) {
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (chartH - pad * 2);
	}

	function pathFor(points: { x: number; y: number }[], upTo: number): string {
		const slice = points.slice(0, upTo + 1);
		if (slice.length < 2) return '';
		let d = `M${projX(slice[0].x)},${projY(slice[0].y)}`;
		for (let i = 1; i < slice.length; i++) {
			d += ` L${projX(slice[i].x)},${projY(slice[i].y)}`;
		}
		return d;
	}

	const gdVisible = $derived(Math.min(visibleSteps, gdPoints.length - 1));
	const momVisible = $derived(Math.min(visibleSteps, momPoints.length - 1));

	const gdPathVisible = $derived(pathFor(gdPoints, gdVisible));
	const momPathVisible = $derived(pathFor(momPoints, momVisible));

	const gdCurrent = $derived(gdPoints[gdVisible] ?? gdPoints[0]);
	const momCurrent = $derived(momPoints[momVisible] ?? momPoints[0]);

	const gdEnd = $derived(f(gdCurrent.x, gdCurrent.y));
	const momEnd = $derived(f(momCurrent.x, momCurrent.y));

	const bothSettled = $derived(
		visibleSteps >= gdPoints.length - 1 && visibleSteps >= momPoints.length - 1
	);

	// ── Autoplay: reveal both trajectories simultaneously, step by step ──
	function resetAnim() {
		stopAnim();
		visibleSteps = 0;
	}

	function tick() {
		if (bothSettled) {
			stopAnim();
			return;
		}
		visibleSteps++;
	}

	function play() {
		if (playing) return;
		if (bothSettled) resetAnim();
		playing = true;
		animTimer = setInterval(tick, 40);
	}
	function pause() {
		stopAnim();
	}
	function stopAnim() {
		if (animTimer !== null) clearInterval(animTimer);
		animTimer = null;
		playing = false;
	}

	onDestroy(stopAnim);

	// Any change to alpha/beta/maxSteps invalidates the current animation —
	// restart from the beginning so what's shown always matches the sliders.
	$effect(() => {
		void alpha;
		void beta;
		void maxSteps;
		resetAnim();
	});
</script>

<div class="mom-demo">
	<h3 class="section-title">Momentum : amortissement des oscillations</h3>
	<p class="sub-title">Fonction elliptique (x²/4 + y²) — vallée étroite, GD classique oscille</p>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Taux d'apprentissage</div>
			<Slider bind:value={alpha} min={0.01} max={1} step={0.01} label="α" />
		</div>
		<div class="grp">
			<div class="gttl">Momentum</div>
			<Slider bind:value={beta} min={0} max={0.99} step={0.01} label="β" />
		</div>
		<div class="grp">
			<div class="gttl">Nombre d'étapes max</div>
			<Slider bind:value={maxSteps} min={10} max={300} step={5} label="k" />
		</div>
	</SliderGrid>

	<div class="transport">
		<button class="btn" onclick={resetAnim}>⟲ Reset</button>
		<button class="btn" onclick={tick} disabled={playing || bothSettled}>▶ Un pas</button>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play} disabled={bothSettled}
				>⏵ Lancer la course</button
			>
		{/if}
		<div class="stats-inline">k = {visibleSteps} / {maxAvailableSteps - 1}</div>
	</div>

	<div class="panels-row" bind:clientWidth={rowWidth}>
		<!-- GD without momentum -->
		<div class="panel">
			<span class="panel-label" style="--clr: #94a3b8">GD classique (sans momentum)</span>
			<div class="chart-container" style:width="{chartW}px" style:height="{chartH}px">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={6} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<path d={gdPathVisible} fill="none" stroke="#94a3b8" stroke-width="2.5" opacity="0.9" />
					<circle
						cx={projX(startX)}
						cy={projY(startY)}
						r="4"
						fill="#fff"
						stroke="#94a3b8"
						stroke-width="2"
					/>
					<circle cx={projX(gdCurrent.x)} cy={projY(gdCurrent.y)} r="5" fill="#94a3b8" />
				</svg>
			</div>
			<div class="stats">
				k = {gdVisible} | f = {gdEnd.toFixed(4)} | {gdOscillations} oscillation{gdOscillations === 1
					? ''
					: 's'}
			</div>
		</div>

		<!-- Momentum -->
		<div class="panel panel-highlighted">
			<span class="panel-label" style="--clr: #22c55e">GD + Momentum (β = {beta.toFixed(2)})</span>
			<div class="chart-container" style:width="{chartW}px" style:height="{chartH}px">
				<ContourPlot {f} {domain} width={chartW} height={chartH} numLevels={6} />
				<svg class="traj-overlay" width={chartW} height={chartH}>
					<path d={momPathVisible} fill="none" stroke="#22c55e" stroke-width="2.5" opacity="0.9" />
					<circle
						cx={projX(startX)}
						cy={projY(startY)}
						r="4"
						fill="#fff"
						stroke="#22c55e"
						stroke-width="2"
					/>
					<circle cx={projX(momCurrent.x)} cy={projY(momCurrent.y)} r="5" fill="#22c55e" />
				</svg>
			</div>
			<div class="stats">
				k = {momVisible} | f = {momEnd.toFixed(4)} | {momOscillations} oscillation{momOscillations ===
				1
					? ''
					: 's'}
			</div>
		</div>
	</div>

	<div class="race-summary">
		<div class="race-title">Oscillations (sign flips de la vitesse y)</div>
		<div class="race-row">
			<span class="race-label" style="color:#94a3b8">Sans momentum</span>
			<div class="race-track">
				<div
					class="race-bar"
					style:width="{maxAvailableSteps
						? (gdOscillations / Math.max(1, gdOscillations, momOscillations)) * 100
						: 0}%"
					style:background="#94a3b8"
				></div>
			</div>
			<span class="race-value">{gdOscillations}</span>
		</div>
		<div class="race-row">
			<span class="race-label" style="color:#22c55e">Avec momentum</span>
			<div class="race-track">
				<div
					class="race-bar"
					style:width="{maxAvailableSteps
						? (momOscillations / Math.max(1, gdOscillations, momOscillations)) * 100
						: 0}%"
					style:background="#22c55e"
				></div>
			</div>
			<span class="race-value">{momOscillations}</span>
		</div>
	</div>

	<div class="callout-intuition">
		💡 β proche de 0 → comportement du GD classique. β &gt; 0.9 → accélération dans la direction de
		la vallée, oscillations réduites.
	</div>
</div>

<style>
	.mom-demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		font-size: 0.875rem;
	}

	.section-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
	}

	.sub-title {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		text-align: center;
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

	.transport {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.btn {
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border);
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.btn:hover:not(:disabled) {
		background: var(--color-surface-3, rgba(255, 255, 255, 0.1));
	}
	.btn-primary {
		border-color: #3b82f6;
		color: #3b82f6;
	}
	.btn-warn {
		border-color: #f59e0b;
		color: #f59e0b;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.stats-inline {
		font-family: var(--font-mono, monospace);
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Two fixed, equal columns — this is the actual fix for "same row":
	   each panel's chart is sized from THIS row's own measured width, split
	   in half, not from the whole widget's width applied to each panel. */
	.panels-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
		justify-items: center;
	}

	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.65rem;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border);
		width: 100%;
	}

	.panel-highlighted {
		border-color: rgba(34, 197, 94, 0.3);
		box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
	}

	.panel-label {
		font-size: 0.72rem;
		color: var(--clr, inherit);
		font-weight: 600;
		text-align: center;
	}

	.chart-container {
		position: relative;
	}

	.traj-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.stats {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	.race-summary {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
	}
	.race-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		text-align: center;
	}
	.race-row {
		display: grid;
		grid-template-columns: 8rem 1fr 2rem;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.76rem;
	}
	.race-label {
		font-weight: 600;
		white-space: nowrap;
	}
	.race-track {
		height: 10px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}
	.race-bar {
		height: 100%;
		border-radius: 4px;
		transition: width 0.1s linear;
	}
	.race-value {
		font-family: var(--font-mono, monospace);
		text-align: right;
		color: var(--color-text-muted);
	}

	.callout-intuition {
		background: rgba(245, 158, 11, 0.1);
		border-left: 3px solid #f59e0b;
		color: var(--color-text-muted);
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		max-width: 600px;
		text-align: center;
		line-height: 1.4;
	}
</style>
