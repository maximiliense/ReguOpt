<script lang="ts">
	/**
	 * Compares mini-batch SGD vs full Gradient Descent for fitting a simple
	 * linear model y = weight * x + bias, minimizing mean squared error.
	 * dim1 (contour x-axis) = bias, dim2 (contour y-axis) = weight.
	 * Data points are generated around a fixed "true" line, with noise
	 * controlled by the variance of each point's deviation from that line.
	 */
	import { onDestroy } from 'svelte';
	import ContourPlot from '$lib/components/charts/ContourPlot.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';

	const N = 30; // number of data points

	// Fixed "true" line the data is generated around — never changes, only
	// the noise around it does. Deliberately off-center in parameter space so
	// the optimization path is visually interesting.
	const trueBias = 0.4;
	const trueWeight = 1.1;

	// x-positions of the data points are fixed forever (deterministic spread),
	// independent of the noise slider — only each point's y-deviation from the
	// true line changes when noiseStd changes. This isolates "noise" to mean
	// exactly what the prompt asks: variance of individual points around the
	// real line, not a resampling of where points sit on the x-axis.
	const xPositions = Array.from({ length: N }, (_, i) => -3 + (6 * i) / (N - 1));

	function makeRng(seed: number) {
		let s = seed;
		return () => {
			s = (s * 16807) % 2147483647;
			return s / 2147483647;
		};
	}

	// Box-Muller standard normal sample from a uniform RNG.
	function gaussianSample(rng: () => number): number {
		let u = 0,
			v = 0;
		while (u === 0) u = rng();
		while (v === 0) v = rng();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}

	let noiseStd = $state(0.3);

	interface DataPoint {
		x: number;
		y: number;
	}

	// Regenerated whenever noiseStd changes; x-positions and the underlying
	// true line stay fixed, only the noise magnitude around it varies.
	const DATA: DataPoint[] = $derived.by(() => {
		const rng = makeRng(1234); // fixed seed → same noise "shape", only scaled by noiseStd
		return xPositions.map((xi) => {
			const noise = gaussianSample(rng) * noiseStd;
			return { x: xi, y: trueWeight * xi + trueBias + noise };
		});
	});

	// f(bias, weight) — mean squared error of the linear model on the dataset.
	// Matches ContourPlot's expected (x, y) signature, with x = bias, y = weight.
	function loss(bias: number, weight: number): number {
		const data = DATA;
		let s = 0;
		for (const d of data) {
			const r = weight * d.x + bias - d.y;
			s += 0.5 * r * r;
		}
		return s / N;
	}

	function fullGrad(bias: number, weight: number): [number, number] {
		const data = DATA;
		let gBias = 0,
			gWeight = 0;
		for (const d of data) {
			const r = weight * d.x + bias - d.y;
			gBias += r;
			gWeight += r * d.x;
		}
		return [gBias / N, gWeight / N];
	}

	function singleGrad(bias: number, weight: number, i: number): [number, number] {
		const d = DATA[i % N];
		const r = weight * d.x + bias - d.y;
		return [r, r * d.x];
	}

	let containerWidth = $state(420);
	const domain: [[number, number], [number, number]] = [
		[-2, 2],
		[-2, 2]
	];
	const width = $derived(Math.min(containerWidth, 520));
	const height = $derived(width);

	let alphaGD = $state(0.1);
	let alphaSGD = $state(0.15);
	let batchSize = $state(1);
	let speedMs = $state(80);
	let playing = $state(false);
	let animTimer: ReturnType<typeof setInterval> | null = null;

	let idxGD = $state(0);
	let idxSGD = $state(0);

	const startPoint: [number, number] = [-1.5, -1.5]; // [bias, weight] starting guess

	function buildGD(alpha: number, maxIter = 60): { x: number; y: number }[] {
		let [bias, weight] = startPoint;
		const traj: { x: number; y: number }[] = [{ x: bias, y: weight }];
		for (let k = 0; k < maxIter; k++) {
			const [gBias, gWeight] = fullGrad(bias, weight);
			bias -= alpha * gBias;
			weight -= alpha * gWeight;
			traj.push({ x: bias, y: weight });
		}
		return traj;
	}

	function buildSGD(alpha: number, batch: number, maxIter = 300): { x: number; y: number }[] {
		let [bias, weight] = startPoint;
		const traj: { x: number; y: number }[] = [{ x: bias, y: weight }];
		const rng = makeRng(42);
		for (let k = 0; k < maxIter; k++) {
			let gBias = 0,
				gWeight = 0;
			for (let b = 0; b < batch; b++) {
				const i = Math.floor(rng() * N);
				const [sgBias, sgWeight] = singleGrad(bias, weight, i);
				gBias += sgBias;
				gWeight += sgWeight;
			}
			gBias /= batch;
			gWeight /= batch;
			bias -= alpha * gBias;
			weight -= alpha * gWeight;
			traj.push({ x: bias, y: weight });
		}
		return traj;
	}

	const gdTraj = $derived(buildGD(alphaGD));
	const sgdTraj = $derived(buildSGD(alphaSGD, batchSize));

	const maxIdxGD = $derived(gdTraj.length - 1);
	const maxIdxSGD = $derived(sgdTraj.length - 1);
	const sgdRatio = $derived(Math.max(1, Math.round(maxIdxSGD / Math.max(1, maxIdxGD))));

	function projX(x: number): number {
		const pad = 36;
		return pad + ((x - domain[0][0]) / (domain[0][1] - domain[0][0])) * (width - pad * 2);
	}
	function projY(y: number): number {
		const pad = 36;
		return pad + ((domain[1][1] - y) / (domain[1][1] - domain[1][0])) * (height - pad * 2);
	}

	function lines(traj: { x: number; y: number }[], end: number): string {
		let d = '';
		const len = Math.min(end + 1, traj.length);
		for (let i = 1; i < len; i++) {
			d += `M${projX(traj[i - 1].x).toFixed(1)},${projY(traj[i - 1].y).toFixed(1)} L${projX(traj[i].x).toFixed(1)},${projY(traj[i].y).toFixed(1)}`;
		}
		return d;
	}

	const gdPointNow = $derived(gdTraj[Math.min(idxGD, maxIdxGD)]);
	const sgdPointNow = $derived(sgdTraj[Math.min(idxSGD, maxIdxSGD)]);
	const gdLoss = $derived(loss(gdPointNow.x, gdPointNow.y));
	const sgdLoss = $derived(loss(sgdPointNow.x, sgdPointNow.y));

	const bothDone = $derived(idxGD >= maxIdxGD && idxSGD >= maxIdxSGD);

	function reset() {
		stopAnim();
		idxGD = 0;
		idxSGD = 0;
	}

	function stepGD() {
		idxGD = Math.min(idxGD + 1, maxIdxGD);
	}
	function stepSGD() {
		idxSGD = Math.min(idxSGD + sgdRatio, maxIdxSGD);
	}

	function play() {
		if (playing) return;
		if (bothDone) reset();
		playing = true;
		animTimer = setInterval(() => {
			idxGD = Math.min(idxGD + 1, maxIdxGD);
			idxSGD = Math.min(idxSGD + sgdRatio, maxIdxSGD);
			if (idxGD >= maxIdxGD && idxSGD >= maxIdxSGD) stopAnim();
		}, speedMs);
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

	// Changing any parameter — including noise — invalidates the current run.
	$effect(() => {
		void alphaGD;
		void alphaSGD;
		void batchSize;
		void noiseStd;
		reset();
	});

	const gdLossHistory = $derived(gdTraj.map((p) => loss(p.x, p.y)));
	const sgdLossHistory = $derived(sgdTraj.map((p) => loss(p.x, p.y)));

	const sparkW = 460;
	const sparkH = 100;
	const sparkPad = { l: 34, r: 10, t: 8, b: 18 };
	const sparkYMax = $derived(Math.max(...gdLossHistory, ...sgdLossHistory) * 1.1);

	function sparkPath(hist: number[], upTo: number): string {
		const n = Math.min(upTo + 1, hist.length);
		if (n < 2) return '';
		let d = '';
		for (let i = 0; i < n; i++) {
			const px = sparkPad.l + (i / (hist.length - 1)) * (sparkW - sparkPad.l - sparkPad.r);
			const py = sparkPad.t + (1 - hist[i] / sparkYMax) * (sparkH - sparkPad.t - sparkPad.b);
			d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
		}
		return d;
	}

	const gdSparkPath = $derived(sparkPath(gdLossHistory, idxGD));
	const sgdSparkPath = $derived(sparkPath(sgdLossHistory, idxSGD));
</script>

<div class="demo-wrap" bind:clientWidth={containerWidth}>
	<div class="tags">
		<span class="tag" style="color: #3b82f6">● GD (batch complet, n = {N})</span>
		<span class="tag" style="color: #ef4444">● SGD (mini-batch B = {batchSize})</span>
		<span class="tag-model"
			>y = weight·x + bias | vraie droite : bias = {trueBias}, weight = {trueWeight}</span
		>
	</div>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Bruit des données</div>
			<Slider bind:value={noiseStd} min={0} max={1.5} step={0.05} label="écart-type du bruit" />
		</div>
		<div class="grp">
			<div class="gttl">Taux d'apprentissage — GD</div>
			<Slider bind:value={alphaGD} min={0.01} max={0.3} step={0.005} label="α (GD)" />
		</div>
		<div class="grp">
			<div class="gttl">Taux d'apprentissage — SGD</div>
			<Slider bind:value={alphaSGD} min={0.01} max={0.4} step={0.005} label="α (SGD)" />
		</div>
		<div class="grp">
			<div class="gttl">Taille du mini-batch</div>
			<Slider bind:value={batchSize} min={1} max={N} step={1} label="B" />
		</div>
	</SliderGrid>

	<div class="transport">
		<button class="btn" onclick={reset}>⟲ Reset</button>
		<button class="btn" onclick={stepGD} disabled={playing}>GD ▶</button>
		<button class="btn" onclick={stepSGD} disabled={playing}>SGD ▶</button>
		{#if playing}
			<button class="btn btn-warn" onclick={pause}>⏸ Pause</button>
		{:else}
			<button class="btn btn-primary" onclick={play} disabled={bothDone}>⏵ Animer</button>
		{/if}
		<div class="stats">
			GD: MSE = {gdLoss.toFixed(3)} &nbsp;|&nbsp; SGD: MSE = {sgdLoss.toFixed(3)}
		</div>
	</div>

	<div class="chart-container" style:width="{width}px" style:height="{height}px">
		<ContourPlot f={loss} {domain} {width} {height} gridSize={60} numLevels={8} />
		<svg class="overlay" {width} {height} viewBox={`0 0 ${width} ${height}`}>
			<path
				d={lines(gdTraj, idxGD)}
				fill="none"
				stroke="#3b82f6"
				stroke-width="2.5"
				opacity="0.85"
			/>
			<path
				d={lines(sgdTraj, idxSGD)}
				fill="none"
				stroke="#ef4444"
				stroke-width="1.2"
				opacity="0.5"
			/>

			<!-- True (bias, weight) marker -->
			<circle
				cx={projX(trueBias)}
				cy={projY(trueWeight)}
				r="6"
				fill="none"
				stroke="#22c55e"
				stroke-width="2"
				stroke-dasharray="3 2"
			/>
			<text
				x={projX(trueBias) + 9}
				y={projY(trueWeight) - 6}
				font-size="9"
				fill="#22c55e"
				font-weight="600">vraie droite</text
			>

			<circle
				cx={projX(gdPointNow.x)}
				cy={projY(gdPointNow.y)}
				r="5"
				fill="#3b82f6"
				stroke="#fff"
				stroke-width="1.5"
			/>
			<circle
				cx={projX(sgdPointNow.x)}
				cy={projY(sgdPointNow.y)}
				r="5"
				fill="#ef4444"
				stroke="#fff"
				stroke-width="1.5"
			/>
		</svg>
	</div>

	<div class="legend">
		<span class="item"><span class="swatch s-gd"></span>GD (lisse)</span>
		<span class="item"><span class="swatch s-sgd"></span>SGD (bruité)</span>
		<span class="item"><span class="swatch s-true"></span>(bias, weight) réels</span>
	</div>

	<div class="axis-note">Axe horizontal = bias · Axe vertical = weight</div>

	<div class="spark-panel">
		<div class="spark-title">MSE en fonction du nombre d'itérations</div>
		<svg
			viewBox={`0 0 ${sparkW} ${sparkH}`}
			width="100%"
			height={sparkH}
			role="img"
			aria-label="MSE en fonction des itérations"
		>
			<line
				x1={sparkPad.l}
				y1={sparkH - sparkPad.b}
				x2={sparkW - sparkPad.r}
				y2={sparkH - sparkPad.b}
				stroke="var(--color-border)"
				stroke-width="1"
			/>
			<line
				x1={sparkPad.l}
				y1={sparkPad.t}
				x2={sparkPad.l}
				y2={sparkH - sparkPad.b}
				stroke="var(--color-border)"
				stroke-width="1"
			/>
			<path d={gdSparkPath} fill="none" stroke="#3b82f6" stroke-width="2" />
			<path d={sgdSparkPath} fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.85" />
		</svg>
	</div>
</div>

<style>
	.demo-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
	}
	.tags {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		flex-wrap: wrap;
		justify-content: center;
		text-align: center;
	}
	.tag {
		font-weight: 600;
		font-family: var(--font-mono, monospace);
	}
	.tag-model {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
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
		font-size: 0.82rem;
	}
	.btn {
		padding: 0.3rem 0.7rem;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.78rem;
	}
	.btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
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
	.stats {
		margin-left: 0.5rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.chart-container {
		position: relative;
	}
	.overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.legend {
		display: flex;
		gap: 1rem;
		font-size: 0.72rem;
		color: var(--color-text-muted);
		flex-wrap: wrap;
		justify-content: center;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.swatch {
		width: 14px;
		height: 3px;
		border-radius: 2px;
	}
	.s-gd {
		background: #3b82f6;
	}
	.s-sgd {
		background: repeating-linear-gradient(
			90deg,
			#ef4444 0,
			#ef4444 3px,
			transparent 3px,
			transparent 5px
		);
		height: 3px;
		width: 14px;
	}
	.s-true {
		background: repeating-linear-gradient(
			90deg,
			#22c55e 0,
			#22c55e 2px,
			transparent 2px,
			transparent 4px
		);
		height: 3px;
		width: 14px;
	}

	.axis-note {
		font-size: 0.72rem;
		color: var(--color-text-muted);
	}

	.spark-panel {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
	}
	.spark-title {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
