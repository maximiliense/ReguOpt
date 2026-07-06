<script lang="ts">
	import { onDestroy } from 'svelte';
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	let lambda = $state(0.1);
	let playing = $state(false);

	const maxLambda = 3;
	const N_PATH = 200;

	// Each feature has its own OLS coefficient AND its own eigenvalue d_i of
	// X^T X / n — the amount of "information" the data carries along that
	// direction. Ridge's actual shrinkage formula in the eigenbasis is:
	//   w_i*(λ) = (d_i / (d_i + λ)) · w_i^OLS
	// This is what makes directions with SMALL d_i (poorly-determined,
	// low-variance) shrink much faster than directions with large d_i — the
	// real geometric reason Ridge helps with ill-conditioned or collinear data.
	const features = [
		{ wOls: 2.5, d: 6.0, color: '#3b82f6', label: 'Direction bien déterminée' },
		{ wOls: 1.8, d: 1.5, color: '#ef4444', label: 'Direction modérée' },
		{ wOls: -1.2, d: 0.4, color: '#10b981', label: 'Direction peu déterminée' }
	];

	function ridgeW(wOls: number, d: number, lam: number): number {
		return (d / (d + lam)) * wOls;
	}

	const paths = $derived.by(() =>
		features.map((feat) => ({
			...feat,
			points: Array.from({ length: N_PATH }, (_, i) => {
				const l = maxLambda * (i / (N_PATH - 1));
				return [l, ridgeW(feat.wOls, feat.d, l)] as [number, number];
			})
		}))
	);

	// Split each path at the current lambda: solid/opaque "traveled" segment,
	// dashed/faint "remaining" segment — gives a live sense of progress along
	// the regularization path without needing any marker API from the chart.
	const curves = $derived.by(() => {
		const result: {
			points: [number, number][];
			stroke: string;
			strokeWidth: number;
			opacity?: number;
			strokeDasharray?: string;
		}[] = [];

		// zero reference line
		result.push({
			points: [
				[0, 0],
				[maxLambda, 0]
			],
			stroke: 'var(--color-text-muted, #94a3b8)',
			strokeWidth: 1,
			opacity: 0.4,
			strokeDasharray: '3 3'
		});

		for (const p of paths) {
			const traveled = p.points.filter(([l]) => l <= lambda);
			const remaining = p.points.filter(([l]) => l >= lambda);
			if (traveled.length >= 2) {
				result.push({ points: traveled, stroke: p.color, strokeWidth: 2.75 });
			}
			if (remaining.length >= 2) {
				result.push({
					points: remaining,
					stroke: p.color,
					strokeWidth: 1.5,
					opacity: 0.3,
					strokeDasharray: '5 4'
				});
			}
		}
		return result;
	});

	const legend = $derived(
		paths.map((p) => ({
			label: `w = ${p.wOls.toFixed(1)} (d = ${p.d.toFixed(1)})`,
			color: p.color,
			kind: 'line' as const
		}))
	);

	const yMax = $derived.by(() => {
		const allAbs = paths.flatMap((p) => p.points.map(([, v]) => Math.abs(v)));
		return Math.ceil(Math.max(...allAbs) * 1.3);
	});

	const currentVals = $derived(paths.map((p) => ridgeW(p.wOls, p.d, lambda)));
	const shrinkFactors = $derived(paths.map((p) => p.d / (p.d + lambda)));

	// Max |wOls| used to normalize bar widths in the race panel.
	const maxAbsOls = $derived(Math.max(...features.map((f) => Math.abs(f.wOls))));

	// ── Autoplay: sweep lambda back and forth ──
	let rafId: number | null = null;
	let direction = 1;

	function playTick() {
		const speed = 0.012;
		let next = lambda + direction * speed;
		if (next >= maxLambda) {
			next = maxLambda;
			direction = -1;
		} else if (next <= 0) {
			next = 0;
			direction = 1;
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

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
	});
</script>

<div class="ridge-path">
	<Figure type="chart">
		<DensityChart {curves} xDomain={[0, maxLambda]} {yMax} height={250} nTicks={6} {legend} />
	</Figure>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Régularisation</div>
			<Slider bind:value={lambda} min={0} max={maxLambda} step={0.02} label="λ" />
		</div>
	</SliderGrid>

	<button class="play-btn" class:playing onclick={togglePlay}>
		{playing ? '⏸ Pause' : '▶ Balayer λ automatiquement'}
	</button>

	<!-- Live shrinkage race: a self-contained bar panel that animates in sync
	     with lambda, making the differential shrinkage across directions
	     immediately visible without depending on the chart's internals. -->
	<div class="race-panel">
		<div class="race-title">Rétrécissement en direct par direction</div>
		{#each paths as p, i (i)}
			{@const val = currentVals[i]}
			{@const widthPct = (Math.abs(val) / maxAbsOls) * 100}
			{@const shrinkPct = shrinkFactors[i] * 100}
			<div class="race-row">
				<span class="race-label" style:color={p.color}>{p.label}</span>
				<div class="race-track">
					<div
						class="race-bar"
						style:width="{widthPct}%"
						style:background={p.color}
						style:margin-left={val < 0 ? `${100 - widthPct}%` : '0'}
					></div>
					<span class="race-zero-line"></span>
				</div>
				<span class="race-value">w ≈ {val.toFixed(3)} ({shrinkPct.toFixed(0)}%)</span>
			</div>
		{/each}
	</div>

	<p class="cap">
		Chaque direction se rétrécit selon <KatexInline
			formula={'w_i^*(\\lambda) = \\dfrac{d_i}{d_i + \\lambda}\\, w_i^{\\text{OLS}}'}
		/>, où <KatexInline formula={'d_i'} /> est la quantité d'information portée par cette direction. Les
		directions <strong>peu déterminées</strong> (petit <KatexInline formula={'d_i'} />, en
		<span style="color:#10b981">vert</span>) se rétrécissent bien plus vite que les directions
		<strong>bien déterminées</strong>
		(grand <KatexInline formula={'d_i'} />, en <span style="color:#3b82f6">bleu</span>) — c'est la
		vraie raison géométrique pour laquelle Ridge stabilise les problèmes mal conditionnés. Tous les
		coefficients tendent vers <strong>0</strong> quand <KatexInline
			formula={'\\lambda \\to +\\infty'}
		/>, mais jamais exactement, contrairement au Lasso.
	</p>
</div>

<style>
	.ridge-path {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
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

	.race-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
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
		grid-template-columns: minmax(9rem, auto) 1fr minmax(8rem, auto);
		align-items: center;
		gap: 0.6rem;
		font-size: 0.78rem;
	}
	.race-label {
		font-weight: 600;
		white-space: nowrap;
	}
	.race-track {
		position: relative;
		height: 14px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}
	.race-bar {
		height: 100%;
		border-radius: 4px;
		transition:
			width 0.08s linear,
			margin-left 0.08s linear;
	}
	.race-zero-line {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--color-text-muted);
		opacity: 0.3;
	}
	.race-value {
		font-family: 'SF Mono', 'Fira Code', monospace, system-ui;
		white-space: nowrap;
		text-align: right;
		color: var(--color-text-muted);
	}

	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
