<script lang="ts">
	import { onDestroy } from 'svelte';
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import { generateSyntheticData } from '$lib/math/bias-variance.js';

	// ─── Controls ──────────────────────────────────────────────
	let degree = $state(3);
	let numSamples = $state(50);
	let noiseStd = $state(0.2);
	let playing = $state(false);

	const maxDegree = 10;
	const minSamples = 15;
	const maxSamples = 200;
	const NUM_FITS = 20;
	const SUBSAMPLE_FRAC = 0.6;

	// ─── Synthetic data (regenerate when samples or noise change) ──
	let synthData = $derived.by(() => generateSyntheticData(numSamples, noiseStd));

	// Evaluation domain [0..1] at fine resolution for smooth curves
	const NUM_EVAL = 100;
	const evalXs = $derived(Array.from({ length: NUM_EVAL }, (_, i) => i / (NUM_EVAL - 1)));

	// ─── Curve type matching DensityChart's CurveLayer interface ──────────
	interface CurveLayer {
		points: [number, number][];
		stroke?: string;
		strokeWidth?: number;
		opacity?: number;
		fill?: string;
		fillOpacity?: number;
	}

	// ─── Matrix helpers (duplicated from bias-variance.ts to fit polynomials inline) ──
	function transpose(M: number[][], m: number, n: number): number[][] {
		const T = Array.from({ length: n }, () => new Array(m).fill(0));
		for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) T[j][i] = M[i][j];
		return T;
	}

	function matMul(A: number[][], B: number[][]): number[][] {
		const ma = A.length,
			na = A[0].length,
			pb = B[0].length;
		const C = Array.from({ length: ma }, () => new Array(pb).fill(0));
		for (let i = 0; i < ma; i++)
			for (let k = 0; k < na; k++) for (let j = 0; j < pb; j++) C[i][j] += A[i][k] * B[k][j];
		return C;
	}

	function matVec(M: number[][], v: number[]): number[] {
		const r = new Array(M.length);
		for (let i = 0; i < M.length; i++) {
			let s = 0;
			for (let j = 0; j < M[0].length; j++) s += M[i][j] * v[j];
			r[i] = s;
		}
		return r;
	}

	function solveLinearSystem(A: number[][], b: number[]): number[] {
		const n = A.length;
		const aug = Array.from({ length: n }, (_, i) => [...A[i], b[i]]);
		for (let col = 0; col < n; col++) {
			let mxRow = col,
				mxVal = Math.abs(aug[col][col]);
			for (let row = col + 1; row < n; row++)
				if (Math.abs(aug[row][col]) > mxVal) {
					mxVal = Math.abs(aug[row][col]);
					mxRow = row;
				}
			[aug[col], aug[mxRow]] = [aug[mxRow], aug[col]];
			if (Math.abs(aug[col][col]) < 1e-12) continue;
			for (let row = col + 1; row < n; row++) {
				const f = aug[row][col] / aug[col][col];
				for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
			}
		}
		const x = new Array(n);
		for (let i = n - 1; i >= 0; i--) {
			let s = aug[i][n];
			for (let j = i + 1; j < n; j++) s -= aug[i][j] * x[j];
			x[i] = Math.abs(aug[i][i]) > 1e-12 ? s / aug[i][i] : 0;
		}
		return x;
	}

	function polyEval(coeffs: number[], x: number): number {
		let r = 0,
			p = 1;
		for (let i = 0; i < coeffs.length; i++) {
			r += coeffs[i] * p;
			p *= x;
		}
		return r;
	}

	function polyFit(xs: number[], ys: number[], d: number): number[] {
		const n = xs.length,
			dc = d + 1;
		const X = Array.from({ length: n }, () => new Array(dc).fill(0));
		for (let i = 0; i < n; i++) {
			let p = 1;
			for (let j = 0; j <= d; j++) {
				X[i][j] = p;
				p *= xs[i];
			}
		}
		const Xt = transpose(X, n, dc);
		return solveLinearSystem(matMul(Xt, X), matVec(Xt, ys));
	}

	// ─── Bootstrap decomposition: bias² + variance at each eval point ──
	let decomp = $derived.by(() => {
		const xsT = synthData.xs,
			ysT = synthData.ys;
		const nT = xsT.length,
			subSz = Math.max(degree + 2, Math.floor(SUBSAMPLE_FRAC * nT));

		const predAcc: number[][] = evalXs.map(() => new Array(NUM_FITS).fill(0));
		for (let r = 0; r < NUM_FITS; r++) {
			const subIdx = Array.from({ length: subSz }, () => Math.floor(Math.random() * nT));
			const xsS = subIdx.map((i) => xsT[i]);
			const ysS = subIdx.map((i) => ysT[i]);
			const coefs = polyFit(xsS, ysS, degree);
			for (let p = 0; p < NUM_EVAL; p++) predAcc[p][r] = polyEval(coefs, evalXs[p]);
		}

		return evalXs.map((x, p) => {
			const preds = predAcc[p];
			const meanP = preds.reduce((a, b) => a + b, 0) / NUM_FITS;
			const yTrue = synthData.trueFunc(x);
			let biasSq = (meanP - yTrue) ** 2;
			let variance = 0;
			for (const pv of preds) variance += (pv - meanP) ** 2;
			variance /= NUM_FITS;
			return { x, biasSq, variance };
		});
	});

	// ─── Individual bootstrap fits for the empirical scatter panel ──
	let bootstrapFits = $derived.by(() => {
		const xsT = synthData.xs,
			ysT = synthData.ys;
		const nT = xsT.length,
			subSz = Math.max(degree + 2, Math.floor(SUBSAMPLE_FRAC * nT));

		return Array.from({ length: NUM_FITS }, () => {
			const subIdx = Array.from({ length: subSz }, () => Math.floor(Math.random() * nT));
			const xsS = subIdx.map((i) => xsT[i]);
			const ysS = subIdx.map((i) => ysT[i]);
			const coefs = polyFit(xsS, ysS, degree);
			return Array.from(
				{ length: NUM_EVAL },
				(_, i) => [evalXs[i], polyEval(coefs, evalXs[i])] as [number, number]
			);
		});
	});

	// ─── Main stacked chart curves ──
	const noiseStdSq = $derived(noiseStd * noiseStd);

	let chartCurves = $derived.by(() => {
		const pts: CurveLayer[] = [];

		// 1. Noise floor (constant gray band)
		pts.push({
			points: evalXs.map((x, i) => [decomp[i].x, noiseStdSq]),
			fill: '#6b7280',
			fillOpacity: 0.35
		});

		// 2. Cumulative bias² + noise (red area sits on top of noise floor)
		const biasCumulative = decomp.map((d) => [d.x, d.biasSq + noiseStdSq] as [number, number]);
		pts.push({ points: biasCumulative, fill: '#ef4444', fillOpacity: 0.25 });

		// 3. Cumulative total = bias² + variance + noise (blue area on top)
		const totalCumulative = decomp.map(
			(d) => [d.x, d.biasSq + d.variance + noiseStdSq] as [number, number]
		);
		pts.push({ points: totalCumulative, fill: '#3b82f6', fillOpacity: 0.2 });

		// 4. Total error line (stroke on top of all fills)
		const strokePoints = decomp.map(
			(d) => [d.x, d.biasSq + d.variance + noiseStdSq] as [number, number]
		);
		pts.push({ points: strokePoints, stroke: '#1f2937', strokeWidth: 2.5 });

		return pts;
	});

	const chartLegend = $derived([
		{ label: 'Biais²', color: '#ef4444', kind: 'fill' as const },
		{ label: 'Variance', color: '#3b82f6', kind: 'fill' as const },
		{ label: 'σ²(bruit)', color: '#6b7280', kind: 'fill' as const },
		{ label: 'Erreur totale', color: '#1f2937', kind: 'line' as const }
	]);

	// ─── Metrics (average across x-axis) ──
	const avgBiasSq = $derived(decomp.reduce((s, d) => s + d.biasSq, 0) / NUM_EVAL);
	const avgVariance = $derived(decomp.reduce((s, d) => s + d.variance, 0) / NUM_EVAL);
	const avgTotal = $derived(avgBiasSq + avgVariance + noiseStdSq);

	// ─── Diagnostic label ──
	const diagnostic = $derived.by(() => {
		if (degree <= 2) return 'Sous-ajustement';
		if (degree >= 7) return 'Sur-ajustement';
		return 'Ajustement équilibré';
	});

	// ─── Empirical scatter panel curves ──
	const trueFuncCurve = $derived(evalXs.map((x) => [x, synthData.trueFunc(x)] as [number, number]));

	let fitPanelCurves = $derived.by(() => {
		const pts: CurveLayer[] = [];
		for (const curve of bootstrapFits) {
			pts.push({ points: curve, stroke: '#6366f1', strokeWidth: 1.2, opacity: 0.3 });
		}
		// True function on top
		pts.push({ points: trueFuncCurve, stroke: '#22c55e', strokeWidth: 2.5, opacity: 0.9 });
		return pts;
	});

	const fitPanelLegend = $derived([
		{ label: 'Ajustements bootstrap (N=20)', color: '#6366f1', kind: 'line' as const },
		{ label: 'Fonction vraie f(x)', color: '#22c55e', kind: 'line' as const }
	]);

	// ─── Compute Y max for the scatter panel to clip wild extrapolations ──
	const fitPanelYMax = $derived.by(() => {
		const allVals = bootstrapFits.flat().map(([, y]) => Math.abs(y));
		return Math.min(Math.max(...allVals) * 1.15, 20); // cap at 20 to avoid extreme scales
	});

	// ─── Autoplay: sweep degree from 1 → maxDegree and back ──
	let rafId: number | null = null;
	let direction = 1;
	let frameCount = 0;
	const FRAMES_PER_TICK = 60; // ~1 second between ticks at 60fps

	function playTick() {
		frameCount++;
		if (frameCount % FRAMES_PER_TICK === 0) {
			degree += direction;
			if (degree >= maxDegree) {
				degree = maxDegree;
				direction = -1;
			} else if (degree <= 1) {
				degree = 1;
				direction = 1;
			}
		}
		rafId = requestAnimationFrame(playTick);
	}

	function togglePlay() {
		playing = !playing;
		if (playing) rafId = requestAnimationFrame(playTick);
		else if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function stopAutoplay() {
		if (playing) {
			playing = false;
			if (rafId) cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
	});
</script>

<div class="bv-wrap">
	<!-- ═══ Main stacked error chart ═══════════════════════════ -->
	<Figure type="chart">
		<DensityChart
			curves={chartCurves}
			xDomain={[0, 1]}
			height={230}
			nTicks={6}
			yAxis
			legend={chartLegend}
			chartLabel="Erreur quadratique"
		/>
	</Figure>

	<!-- ═══ Metrics cards ═════════════════════════════════════ -->
	<div class="metrics">
		<div class="metric-card bias-card">
			<span class="metric-label">Biais² moy.</span>
			<span class="metric-val">{avgBiasSq.toFixed(4)}</span>
		</div>
		<div class="metric-card var-card">
			<span class="metric-label">Variance moy.</span>
			<span class="metric-val">{avgVariance.toFixed(4)}</span>
		</div>
		<div class="metric-card noise-card">
			<span class="metric-label">σ²(bruit)</span>
			<span class="metric-val">{noiseStdSq.toFixed(4)}</span>
		</div>
		<div class="metric-card total-card">
			<span class="metric-label">Erreur totale</span>
			<span class="metric-val">{avgTotal.toFixed(4)}</span>
		</div>
	</div>

	<!-- ═══ Diagnostic label ═════════════════════════════════ -->
	<div class="diagnostic">
		Degré {degree} — <strong>{diagnostic}</strong>
	</div>

	<!-- ═══ Empirical scatter: multiple bootstrap fits ══════════════ -->
	<Figure type="chart">
		<DensityChart
			curves={fitPanelCurves}
			xDomain={[0, 1]}
			yMax={fitPanelYMax}
			height={200}
			nTicks={6}
			yAxis
			legend={fitPanelLegend}
			chartLabel="Ajustements empiriques"
		/>
	</Figure>

	<p class="scatter-cap">
		Chaque courbe semi-transparente est un polynôme de degré <strong>{degree}</strong> ajusté sur un
		sous-échantillon bootstrap. Lorsque le degré est élevé, les modèles divergent fortement — c'est
		la manifestation visuelle de
		<strong>la variance</strong>. À bas degré, ils restent regroupés mais peuvent ne pas capturer la
		fonction vraie (biais).
	</p>

	<!-- ═══ Controls ═════════════════════════════════════════ -->
	<SliderGrid variant="outline">
		<div class="grp">
			<div class="gttl">Complexité du modèle</div>
			<Slider
				bind:value={degree}
				min={1}
				max={maxDegree}
				step={1}
				label="Degré"
				onchange={stopAutoplay}
			/>
		</div>
		<div class="grp">
			<div class="gttl">Données d'entraînement</div>
			<Slider
				bind:value={numSamples}
				min={minSamples}
				max={maxSamples}
				step={5}
				label="Échantillons"
				unit="pts"
			/>
		</div>
	</SliderGrid>

	<!-- ═══ Autoplay + noise slider row ══════════════════════ -->
	<div class="controls-row">
		<button class="play-btn" class:playing onclick={togglePlay}>
			{playing ? '⏸ Pause' : '▶ Balayer les degrés'}
		</button>

		<Slider bind:value={noiseStd} min={0.05} max={1.5} step={0.05} label="σ (bruit)" logarithmic />
	</div>

	<!-- ═══ Caption / formula ════════════════════════════════ -->
	<p class="cap">
		Décomposition biais-variance : <KatexInline
			formula={'E[(y - \\hat{f}(x))^2] = \\text{Biais}[\\hat{f}]^2 + \\text{Var}(\\hat{f}) + \\sigma^2_{\\text{bruit}}'}
		/> — L'erreur de prédiction se décompose en trois composantes. Le biais diminue quand le modèle devient
		plus flexible, mais la variance augmente d'autant : ce compromis fondamental dicte le choix du degré
		optimal généralement situé entre sous-ajustement et sur-ajustement. La régularisation (Ridge/Lasso)
		déplace ce compromis en pénalisant explicitement les coefficients, réduisant la variance au prix d'un
		biais supplémentaire.
	</p>
</div>

<style>
	.bv-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	/* ─── Metrics cards ──────────────────────────────────── */
	.metrics {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		font-size: 0.78rem;
	}

	.metric-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.4rem 0.5rem;
		border-radius: var(--radius-sm, 6px);
		border: 1px solid var(--color-border);
	}

	.metric-label {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.metric-val {
		font-family: 'SF Mono', 'Fira Code', monospace, system-ui;
		font-weight: 700;
		font-size: 0.85rem;
	}

	.bias-card .metric-val {
		color: #ef4444;
	}
	.var-card .metric-val {
		color: #3b82f6;
	}
	.noise-card .metric-val {
		color: #6b7280;
	}
	.total-card .metric-val {
		color: var(--color-text, inherit);
	}

	/* ─── Diagnostic label ───────────────────────────────── */
	.diagnostic {
		text-align: center;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		padding: 0.25rem 0;
	}

	.diagnostic strong {
		color: inherit;
	}

	/* ─── Scatter panel caption ──────────────────────────── */
	.scatter-cap {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--color-text-muted);
		text-align: justify;
		padding: 0 0.25rem;
	}

	.scatter-cap strong {
		color: inherit;
	}

	/* ─── Controls row (play + noise slider) ─────────────── */
	.controls-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.play-btn {
		flex-shrink: 0;
		padding: 0.35rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.78rem;
		color: var(--color-text, inherit);
	}

	.play-btn.playing {
		background: #f97316;
		color: white;
		border-color: #f97316;
	}

	/* ─── Slider group title (inside SliderGrid) ─────────── */
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

	/* ─── Caption with formula ───────────────────────────── */
	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}

	/* .cap inherits color naturally — no explicit strong rule needed */

	@media (max-width: 540px) {
		.metrics {
			grid-template-columns: repeat(2, 1fr);
		}

		.controls-row {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
