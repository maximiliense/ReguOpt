<script lang="ts">
  import { onDestroy } from 'svelte';
  import DensityChart from '$lib/components/charts/DensityChart.svelte';
  import Figure from '$lib/components/charts/Figure.svelte';
  import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
  import Slider from '$lib/components/controls/Slider.svelte';
  import KatexInline from '$lib/components/narrative/KatexInline.svelte';

  let alpha = $state(0.5); // Elastic net mixing: 0=Ridge, 1=Lasso
  let lambda = $state(1.0);
  let playing = $state(false);

  const maxLambda = 6;
  const N_PATH = 200;

  // Feature definitions (same as RidgePathExplorer/LassoPathExplorer for consistency)
  const features = [
    { wOls: 4.5, d: 8.0, color: '#3b82f6', label: 'Feature importante' },
    { wOls: 2.8, d: 3.0, color: '#ef4444', label: 'Feature modérée' },
    { wOls: -1.5, d: 1.0, color: '#10b981', label: 'Feature faible (négative)' }
  ];

  // Elastic net coefficient path: blend of Ridge shrinkage and Lasso soft-thresholding
  function elasticNetW(wOls: number, d: number, lam: number, a: number): number {
    if (a === 0) {
      // Pure Ridge
      return (d / (d + lam)) * wOls;
    }
    if (a === 1) {
      // Pure Lasso (soft-thresholding with eigenvalue correction for non-orthonormal case)
      const threshold = lam / d;
      return Math.sign(wOls) * Math.max(Math.abs(wOls) - threshold, 0);
    }
    // Elastic net blend: weighted combination of shrinkage factors
    const ridgeShrink = d / (d + lam * (1 - a));
    const lassoThreshold = lam * a / d;
    const afterRidge = ridgeShrink * wOls;
    return Math.sign(afterRidge) * Math.max(Math.abs(afterRidge) - lassoThreshold, 0);
  }

  // Compute all paths at current alpha
  const paths = $derived.by(() =>
    features.map((feat) => ({
      ...feat,
      points: Array.from({ length: N_PATH }, (_, i) => {
        const l = maxLambda * (i / (N_PATH - 1));
        return [l, elasticNetW(feat.wOls, feat.d, l, alpha)] as [number, number];
      })
    }))
  );

  // Chart curves with traveled/remaining split at current lambda
  const curves = $derived.by(() => {
    const result: Array<{ points: [number, number][]; stroke?: string; strokeWidth?: number; opacity?: number; strokeDasharray?: string }> = [];

    // Zero reference line
    result.push({
      points: [[0, 0], [maxLambda, 0]],
      stroke: 'var(--color-text-muted, #94a3b8)',
      strokeWidth: 1, opacity: 0.4, strokeDasharray: '3 3'
    });

    for (const p of paths) {
      const traveled = p.points.filter(([l]) => l <= lambda);
      const remaining = p.points.filter(([l]) => l >= lambda);
      if (traveled.length >= 2) result.push({ points: traveled, stroke: p.color, strokeWidth: 2.75 });
      if (remaining.length >= 2) result.push({ points: remaining, stroke: p.color, strokeWidth: 1.5, opacity: 0.3, strokeDasharray: '5 4' });
    }
    return result;
  });

  const legend = $derived(paths.map(p => ({ label: `w_OLS = ${p.wOls.toFixed(1)}`, color: p.color, kind: 'line' as const })));

  const yMax = $derived.by(() => {
    const allAbs = paths.flatMap(p => p.points.map(([, v]) => Math.abs(v)));
    return Math.ceil(Math.max(...allAbs) * 1.3);
  });

  const currentVals = $derived(paths.map(p => elasticNetW(p.wOls, p.d, lambda, alpha)));
  const activeCount = $derived(currentVals.filter(v => v !== 0).length);

  // Max |wOls| for normalizing bar widths
  const maxAbsOls = $derived(Math.max(...features.map(f => Math.abs(f.wOls))));

  // Alpha blend label
  const alphaLabel = $derived.by(() => {
    if (alpha < 0.05) return 'Ridge pur';
    if (alpha > 0.95) return 'Lasso pur';
    return `Elastic Net (α=${alpha.toFixed(2)})`;
  });

  // ── Autoplay: sweep lambda back and forth ──
  let rafId: number | null = null;
  let direction = 1;

  function playTick() {
    const speed = 0.012;
    let next = lambda + direction * speed;
    if (next >= maxLambda) { next = maxLambda; direction = -1; }
    else if (next <= 0) { next = 0; direction = 1; }
    lambda = next;
    rafId = requestAnimationFrame(playTick);
  }

  function togglePlay() {
    playing = !playing;
    if (playing) rafId = requestAnimationFrame(playTick);
    else if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  onDestroy(() => { if (rafId) cancelAnimationFrame(rafId); });
</script>

<div class="en-blend">
  <!-- Main path chart -->
  <Figure type="chart">
    <DensityChart curves={curves} xDomain={[0, maxLambda]} yMax={yMax} height={250} nTicks={6} yAxis legend={legend}/>
  </Figure>

  <!-- Alpha blend slider (primary control) -->
  <SliderGrid variant="outline">
    <div class="grp">
      <div class="gttl">Mélange Ridge ↔ Lasso</div>
      <Slider bind:value={alpha} min={0} max={1} step={0.02} label="α" />
    </div>
    <div class="grp">
      <div class="gttl">Régularisation</div>
      <Slider bind:value={lambda} min={0} max={maxLambda} step={0.05} label="λ" />
    </div>
  </SliderGrid>

  <!-- Alpha mode indicator -->
  <div class="alpha-indicator">{alphaLabel}</div>

  <button class="play-btn" class:playing onclick={togglePlay}>
    {playing ? '⏸ Pause' : '▶ Balayer λ'}
  </button>

  <!-- Sparsity bar -->
  <div class="sparsity-bar">
    <span class="sp-label">Sparsité :</span>
    <div class="sp-track"><div class="sp-fill" style:width={`${((features.length - activeCount) / features.length) * 100}%`}></div></div>
    <span class="sp-value">{activeCount}/{features.length} actif{activeCount !== 1 ? 's' : ''}</span>
  </div>

  <!-- Live coefficient bars -->
  <div class="race-panel">
    {#each paths as p, i (i)}
      {@const val = currentVals[i]}
      {@const widthPct = (Math.abs(val) / maxAbsOls) * 100}
      <div class="race-row">
        <span class="race-label" style:color={p.color}>{p.label}</span>
        <div class="race-track">
          <div class="race-bar" style:width="{widthPct}%" style:background={p.color}
               style:margin-left={val < 0 ? `${100 - widthPct}%` : '0'} class:zeroed={val === 0}></div>
        </div>
        <span class="race-value">{val === 0 ? '<strong>0</strong>' : `w ≈ ${val.toFixed(3)}`}</span>
      </div>
    {/each}
  </div>

  <p class="cap">
    L'Elastic Net combine Ridge et Lasso via le paramètre <KatexInline formula="\\alpha" />.
    Quand <KatexInline formula="\\alpha = 0" />, on obtient un rétrécissement doux (Ridge).
    Quand <KatexInline formula="\\alpha = 1" />, les coefficients sont seuillés exactement à zéro (Lasso).
    Un <KatexInline formula="\\alpha \\in ]0, 1[" /> donne le meilleur des deux mondes :
    sélection de variables ET groupage stable pour features corrélées.
  </p>
</div>

<style>
  .en-blend {
    display: flex; flex-direction: column; gap: 0.75rem;
    padding: 1rem; border: 1px solid var(--color-border); border-radius: 8px;
  }
  .grp { display: flex; flex-direction: column; gap: 0.5rem; }
  .gttl { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }

  .alpha-indicator {
    text-align: center; font-weight: 600; font-size: 0.82rem;
    padding: 0.3rem; border-radius: var(--radius-sm, 6px);
    background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(249,115,22,0.1));
    color: var(--color-text);
  }

  .play-btn {
    align-self: center; padding: 0.3rem 0.85rem; border-radius: 999px;
    border: 1px solid var(--color-border); background: transparent; cursor: pointer;
    font-size: 0.78rem; color: var(--color-text, inherit);
  }
  .play-btn.playing { background: #f59e0b; color: white; border-color: #f59e0b; }

  .sparsity-bar { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; padding: 0.4rem 0.75rem; border-radius: var(--radius-sm, 6px); background: var(--color-surface-2, transparent); }
  .sp-label { color: var(--color-text-muted); font-weight: 600; min-width: 5rem; text-align: right; }
  .sp-track { flex: 1; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden; }
  .sp-fill { height: 100%; background: #f59e0b; border-radius: 4px; transition: width 0.08s linear; }
  .sp-value { font-family: 'SF Mono', monospace, system-ui; color: var(--color-text-muted); min-width: 3rem; text-align: right; }

  .race-panel { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: var(--radius-md, 8px); background: var(--color-surface-2, transparent); }
  .race-row { display: grid; grid-template-columns: minmax(9rem, auto) 1fr minmax(8rem, auto); align-items: center; gap: 0.6rem; font-size: 0.78rem; }
  .race-label { font-weight: 600; white-space: nowrap; }
  .race-track { position: relative; height: 14px; background: var(--color-border); border-radius: 4px; overflow: hidden; }
  .race-bar { height: 100%; border-radius: 4px; transition: width 0.08s linear, margin-left 0.08s linear; }
  .race-bar.zeroed { opacity: 0.25; }
  .race-value { font-family: 'SF Mono', monospace, system-ui; white-space: nowrap; text-align: right; color: var(--color-text-muted); font-size: 0.78rem; }

  .cap { margin: 0; font-size: 0.82rem; line-height: 1.6; color: var(--color-text-muted); text-align: justify; }
</style>
