<script lang="ts">
	import { onDestroy } from 'svelte';
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	let lambda = $state(0.5);
	let playing = $state(false);

	const maxLambda = 6;
	const N_PATH = 200;

	// Each feature has its own OLS coefficient. Lasso with orthonormal features
	// applies the soft-thresholding operator independently:
	//   w_i*(λ) = sign(w_i^OLS) · max(|w_i^OLS| − λ, 0)
	// This means coefficients reach EXACTLY zero once |w_i^OLS| ≤ λ — the
	// defining property of L1 regularization that enables automatic feature selection.
	const features = [
		{ wOls: 4.5, color: '#3b82f6', label: 'Feature importante' },
		{ wOls: 2.8, color: '#ef4444', label: 'Feature modérée' },
		{ wOls: -1.5, color: '#10b981', label: 'Feature faible (négative)' }
	];

	function lassoW(wOls: number, lam: number): number {
		return Math.sign(wOls) * Math.max(Math.abs(wOls) - lam, 0);
	}

	const paths = $derived.by(() =>
		features.map((feat) => ({
			...feat,
			points: Array.from({ length: N_PATH }, (_, i) => {
				const l = maxLambda * (i / (N_PATH - 1));
				return [l, lassoW(feat.wOls, l)] as [number, number];
			})
		}))
	);

	// Split each path at the current lambda: solid/opaque "traveled" segment,
	// dashed/faint "remaining" segment.
	const curves = $derived.by(() => {
		const result: {
			points: [number, number][];
			stroke: string;
			strokeWidth: number;
			opacity?: number;
			strokeDasharray?: string;
		}[] = [];

		// zero reference line — important for Lasso to show sparsity
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
			label: `w_OLS = ${p.wOls.toFixed(1)}`,
			color: p.color,
			kind: 'line' as const
		}))
	);

	const yMax = $derived.by(() => {
		const allAbs = paths.flatMap((p) => p.points.map(([, v]) => Math.abs(v)));
		return Math.ceil(Math.max(...allAbs) * 1.3);
	});

	const currentVals = $derived(paths.map((p) => lassoW(p.wOls, lambda)));

	// Which features have been zeroed out by the current lambda?
	const activeCount = $derived(currentVals.filter((v) => v !== 0).length);
	const totalFeatures = features.length;

	// Max |wOls| used to normalize bar widths in the race panel.
	const maxAbsOls = $derived(Math.max(...features.map((f) => Math.abs(f.wOls))));

	// Lambda thresholds at which each feature becomes exactly zero
	const zeroThresholds = $derived(
		features
			.map((f) => ({ label: f.label, threshold: Math.abs(f.wOls), color: f.color }))
			.sort((a, b) => a.threshold - b.threshold)
	);

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

<div class="lasso-path">
	<Figure type="chart">
		<DensityChart {curves} xDomain={[0, maxLambda]} {yMax} height={250} nTicks={6} yAxis {legend} />
	</Figure>

	<SliderGrid>
		<div class="grp">
			<div class="gttl">Régularisation L1</div>
			<Slider bind:value={lambda} min={0} max={maxLambda} step={0.02} label="λ" />
		</div>
	</SliderGrid>

	<button class="play-btn" class:playing onclick={togglePlay}>
		{playing ? '⏸ Pause' : '▶ Balayer λ automatiquement'}
	</button>

	<!-- Sparsity indicator -->
	<div class="sparsity-bar">
		<span class="sp-label">Sparsité :</span>
		<div class="sp-track">
			<div
				class="sp-fill"
				style:width={`${((totalFeatures - activeCount) / totalFeatures) * 100}%`}
			></div>
		</div>
		<span class="sp-value">{activeCount}/{totalFeatures} actif{activeCount !== 1 ? 's' : ''}</span>
	</div>

	<!-- Live shrinkage race: bar panel animating coefficient magnitudes -->
	<div class="race-panel">
		<div class="race-title">Coefficients en direct — seuil λ = {lambda.toFixed(2)}</div>
		{#each paths as p, i (i)}
			{@const val = currentVals[i]}
			{@const widthPct = (Math.abs(val) / maxAbsOls) * 100}
			<div class="race-row">
				<span class="race-label" style:color={p.color}>{p.label}</span>
				<div class="race-track">
					<div
						class="race-bar"
						style:width="{widthPct}%"
						style:background={p.color}
						style:margin-left={val < 0 ? `${100 - widthPct}%` : '0'}
						class:zeroed={val === 0}
					></div>
				</div>
				<span class="race-value">
					{#if val === 0}
						<strong>0 (seuilé)</strong>
					{:else}
						w ≈ {val.toFixed(3)}
					{/if}
				</span>
			</div>
		{/each}
	</div>

	<!-- Zero-thresholds table showing when each feature becomes zero -->
	<div class="threshold-panel">
		{#each zeroThresholds as t (t.label)}
			<div class="thresh-row" class:zeroed={lambda >= t.threshold}>
				<span class="thresh-label" style:color={t.color}>{t.label}</span>
				<KatexInline formula={String.raw`\lambda_{\text{seuil}} = ${t.threshold.toFixed(1)}`} />
				{#if lambda < t.threshold}
					<span class="thresh-status active">actif</span>
				{:else}
					<span class="thresh-status zeroed">éliminé ✓</span>
				{/if}
			</div>
		{/each}
	</div>

	<p class="cap">
		L'opérateur de seuillage doux <KatexInline
			formula={'w_i^*(\\lambda) = \\text{sign}(w_i^{\\text{OLS}}) · \\max(|w_i^{\\text{OLS}}| - \\lambda, 0)'}
		/> annule <strong>exactement</strong> les coefficients dont la magnitude est inférieure à
		<KatexInline formula={'\\lambda'} />. Contrairement au Ridge (qui rétrécit mais n'annule
		jamais), le Lasso réalise une
		<strong>sélection automatique de variables</strong> — chaque feature franchit un seuil
		<KatexInline formula={`= |w_i^{\\text{OLS}}|`} /> puis devient strictement nulle. C'est la propriété
		fondamentale du L1 : il produit des modèles <strong>sparse</strong>, idéaux pour
		l'interprétabilité et les jeux de données à grand nombre de features.
	</p>
</div>

<style>
	.lasso-path {
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
		background: #f97316;
		color: white;
		border-color: #f97316;
	}

	/* ── Sparsity bar ─────────────────────── */
	.sparsity-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.82rem;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-sm, 6px);
		background: var(--color-surface-2, transparent);
	}

	.sp-label {
		color: var(--color-text-muted);
		font-weight: 600;
		min-width: 5rem;
		text-align: right;
	}

	.sp-track {
		flex: 1;
		height: 8px;
		background: var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-fill {
		height: 100%;
		background: #f97316;
		border-radius: 4px;
		transition: width 0.08s linear;
	}

	.sp-value {
		font-family: 'SF Mono', 'Fira Code', monospace, system-ui;
		color: var(--color-text-muted);
		min-width: 3rem;
		text-align: right;
	}

	/* ── Race panel ─────────────────────── */
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

	.race-bar.zeroed {
		opacity: 0.25;
	}

	.race-value {
		font-family: 'SF Mono', 'Fira Code', monospace, system-ui;
		white-space: nowrap;
		text-align: right;
		color: var(--color-text-muted);
		font-size: 0.78rem;
	}

	/* ── Thresholds panel ─────────────── */
	.threshold-panel {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface-2, transparent);
	}

	.thresh-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		padding: 0.2rem 0;
	}

	.thresh-label {
		font-weight: 600;
		min-width: 9rem;
	}

	.thresh-status {
		margin-left: auto;
		font-size: 0.75rem;
		padding: 0.1em 0.4em;
		border-radius: var(--radius-sm, 4px);
	}

	.thresh-status.active {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.thresh-status.zeroed {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		font-weight: 700;
	}

	.thresh-row.zeroed .thresh-label {
		text-decoration: line-through;
		opacity: 0.5;
	}

	/* ── Caption ─────────────────────────── */
	.cap {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: var(--color-text-muted);
		text-align: justify;
	}

	.cap strong {
		color: inherit;
	}
</style>
