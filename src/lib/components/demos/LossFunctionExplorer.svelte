<script lang="ts">
	/**
	 * Explore common ML loss functions: MSE, log-loss, hinge.
	 * Shows each curve on a 1D chart with interactive coefficient control,
	 * plus a live gradient-descent ball that continuously chases the minimum
	 * of whatever loss landscape is currently configured.
	 */

	import { onMount, onDestroy } from 'svelte';
	import DensityChart from '$lib/components/charts/DensityChart.svelte';
	import Figure from '$lib/components/charts/Figure.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import SliderGrid from '$lib/components/layout/SliderGrid.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	type LossKind = 'mse' | 'logloss' | 'hinge';

	interface LossOption {
		key: LossKind;
		label: string;
		color: string;
		formula: string;
		yIsBinary: boolean;
	}

	const lossOptions: LossOption[] = [
		{
			key: 'mse',
			label: 'Moindres carrés',
			color: '#3b82f6',
			formula: '\\ell(z) = \\tfrac12(y-z)^2',
			yIsBinary: false
		},
		{
			key: 'logloss',
			label: 'Log-perte',
			color: '#f59e0b',
			formula: '\\ell(z) = -\\log(\\sigma(yz))',
			yIsBinary: true
		},
		{
			key: 'hinge',
			label: 'Hinge',
			color: '#ec4899',
			formula: '\\ell(z) = \\max(0, 1-yz)',
			yIsBinary: true
		}
	];

	let kind = $state<LossKind>('mse');
	let yVal = $state(1.0);
	let lambda = $state(0.5);

	const xDomain: [number, number] = [-3, 3];
	const N = 200;

	const currentOption = $derived(lossOptions.find((o) => o.key === kind) ?? lossOptions[0]);

	// When switching into a binary-label loss, snap y to the nearest valid class
	// so the formula always receives a meaningful label instead of an arbitrary real number.
	function selectKind(next: LossKind) {
		const opt = lossOptions.find((o) => o.key === next);
		if (opt?.yIsBinary) {
			yVal = yVal >= 0 ? 1 : -1;
		}
		kind = next;
	}

	function mse(x: number): number {
		return 0.5 * Math.pow(yVal - x, 2) + lambda * x * x;
	}
	function logloss(x: number): number {
		const sigm = 1 / (1 + Math.exp(-x));
		const clamped = yVal >= 0 ? Math.max(1e-7, sigm) : Math.max(1e-7, 1 - sigm);
		return -Math.log(clamped) + lambda * x * x;
	}
	function hinge(x: number): number {
		return Math.max(0, 1 - yVal * x) + lambda * x * x;
	}

	function lossFn(x: number): number {
		if (kind === 'mse') return mse(x);
		if (kind === 'logloss') return logloss(x);
		return hinge(x);
	}

	// Numerical derivative — avoids maintaining a separate closed-form gradient per loss.
	// This is a plain function (not memoized), so every call reads whatever kind/yVal/lambda
	// are current at call time — that's what lets the animation loop react to slider drags
	// without needing to be restarted by an $effect.
	function gradAt(x: number): number {
		const h = 1e-4;
		return (lossFn(x + h) - lossFn(x - h)) / (2 * h);
	}

	// ── Raw curve values (unclamped) — used both for plotting and for auto-scaling the y-axis ──
	const rawValues = $derived.by(() =>
		Array.from({ length: N }, (_, i) => {
			const z = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
			return lossFn(z);
		})
	);

	// Auto-scaled y-axis max: true maximum over the domain, with 10% headroom,
	// floored so near-flat curves (e.g. lambda ≈ 0) don't look like a razor-thin sliver.
	const yMax = $derived.by(() => {
		const finite = rawValues.filter((v) => Number.isFinite(v));
		const maxV = finite.length ? Math.max(...finite) : 1;
		return Math.max(1, maxV * 1.1);
	});

	const curves = $derived([
		{
			points: rawValues.map((v, i) => {
				const z = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
				return [z, Math.min(v, yMax)] as [number, number];
			}),
			stroke: currentOption.color,
			fill: currentOption.color,
			fillOpacity: 0.15
		}
	]);

	const legend = $derived([
		{ label: `${currentOption.label} + Ridge`, color: currentOption.color, kind: 'line' as const }
	]);

	// ── Minimum location (numeric search, reusing rawValues) ──
	const zStar = $derived.by(() => {
		let bestZ = xDomain[0];
		let bestV = Infinity;
		rawValues.forEach((v, i) => {
			if (v < bestV) {
				bestV = v;
				bestZ = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / (N - 1));
			}
		});
		return bestZ;
	});

	// ── Continuous gradient-descent ball ──
	// Runs in ONE animation loop started on mount and never restarted by reactive
	// state changes. Each frame reads the *current* gradient (via gradAt, which
	// closes over live kind/yVal/lambda) so dragging a slider makes the ball
	// visibly re-chase the new minimum instead of resetting to a fixed start point.
	const START_Z = xDomain[1] - 0.6;

	let ballZ = $state(START_Z);
	let trail: number[] = $state([START_Z]);
	let settled = $state(false);
	let rafId: number | null = null;

	const ETA = 0.15; // fixed step size; stable for the curvature range used by these losses + ridge term

	function tick() {
		const g = gradAt(ballZ);
		if (Math.abs(g) < 0.01) {
			settled = true;
		} else {
			settled = false;
			const next = ballZ - ETA * g;
			ballZ = Math.max(xDomain[0], Math.min(xDomain[1], next));
			trail = [...trail.slice(-40), ballZ];
		}
		rafId = requestAnimationFrame(tick);
	}

	function restartBall() {
		ballZ = START_Z;
		trail = [START_Z];
		settled = false;
	}

	// Discrete restart on loss-kind change only — switching MSE/log-loss/hinge
	// changes the landscape's identity enough that a fresh run reads better.
	// Slider drags on yVal/lambda deliberately do NOT trigger this.
	$effect(() => {
		void kind;
		restartBall();
	});

	onMount(() => {
		rafId = requestAnimationFrame(tick);
	});
	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
	});

	// ── Mini number-line projection (independent of DensityChart internals) ──
	const lineWidth = 320;
	const linePad = 16;
	function projZ(z: number): number {
		return linePad + ((z - xDomain[0]) / (xDomain[1] - xDomain[0])) * (lineWidth - linePad * 2);
	}
</script>

<div class="loss-explorer">
	<Figure type="chart">
		<DensityChart {curves} {xDomain} {yMax} height={220} nTicks={6} {legend} />
	</Figure>

	<div class="options-row">
		{#each lossOptions as opt}
			<button
				class:active={kind === opt.key}
				style:--opt-color={opt.color}
				onclick={() => selectKind(opt.key)}
			>
				<span class="dot" style:background={opt.color}></span>
				{opt.label}
			</button>
		{/each}
	</div>

	<SliderGrid>
		<div class="group">
			<div class="group-title">Paramètres</div>

			{#if currentOption.yIsBinary}
				<div class="y-radio-group">
					<span class="y-radio-label">Classe y :</span>
					<label class="y-radio">
						<input
							type="radio"
							name="yVal"
							value={1}
							checked={yVal === 1}
							onchange={() => (yVal = 1)}
						/>
						<span>+1</span>
					</label>
					<label class="y-radio">
						<input
							type="radio"
							name="yVal"
							value={-1}
							checked={yVal === -1}
							onchange={() => (yVal = -1)}
						/>
						<span>−1</span>
					</label>
				</div>
			{:else}
				<Slider bind:value={yVal} min={-2} max={2} step={0.1} label="valeur y" />
			{/if}

			<Slider bind:value={lambda} min={0} max={2} step={0.05} label="Ridge λ" />
		</div>
	</SliderGrid>

	<div class="formula-bar">
		<KatexInline formula={currentOption.formula} /> + <KatexInline formula="\lambda z^2" />
	</div>

	<div class="descent-panel" style:--opt-color={currentOption.color}>
		<div class="descent-header">
			<span class="descent-title">Descente de gradient en direct</span>
			<div class="descent-right">
				<span class="descent-status">
					{#if settled}
						✓ Stable en z* ≈ {zStar.toFixed(2)}
					{:else}
						En mouvement…
					{/if}
				</span>
				<button class="restart-btn" onclick={restartBall}>↺ Relancer</button>
			</div>
		</div>
		<svg
			viewBox={`0 0 ${lineWidth} 56`}
			width="100%"
			height="56"
			role="img"
			aria-label="Trajectoire de descente de gradient"
		>
			<line
				x1={linePad}
				y1="28"
				x2={lineWidth - linePad}
				y2="28"
				stroke="var(--color-border)"
				stroke-width="2"
			/>

			<!-- target minimum marker -->
			<line
				x1={projZ(zStar)}
				y1="14"
				x2={projZ(zStar)}
				y2="42"
				stroke={currentOption.color}
				stroke-width="2"
				opacity="0.4"
			/>
			<text
				x={projZ(zStar)}
				y="10"
				text-anchor="middle"
				font-size="9"
				fill="var(--color-text-muted)">z*</text
			>

			<!-- trail -->
			{#each trail as t, i (i)}
				<circle
					cx={projZ(t)}
					cy="28"
					r="2"
					fill={currentOption.color}
					opacity={0.08 + 0.5 * (i / trail.length)}
				/>
			{/each}

			<!-- rolling ball -->
			<circle
				cx={projZ(ballZ)}
				cy="28"
				r="7"
				fill={currentOption.color}
				stroke="#fff"
				stroke-width="2"
				class:settled
			/>
		</svg>
	</div>
</div>

<style>
	.loss-explorer {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-surface, transparent);
	}

	.options-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: transparent;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-text, inherit);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}
	button .dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}
	button.active {
		background: var(--opt-color);
		color: white;
		border-color: var(--opt-color);
	}
	button.active .dot {
		background: white !important;
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

	.y-radio-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
	}
	.y-radio-label {
		color: var(--color-text-muted);
	}
	.y-radio {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
	}
	.y-radio input {
		accent-color: var(--opt-color, #3b82f6);
	}

	.formula-bar {
		text-align: center;
		padding: 0.5rem;
		font-size: 0.9rem;
	}

	.descent-panel {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		padding: 0.6rem 0.75rem;
		background: color-mix(in srgb, var(--opt-color) 5%, transparent);
	}
	.descent-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.78rem;
		margin-bottom: 0.25rem;
		gap: 0.5rem;
	}
	.descent-title {
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.descent-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.descent-status {
		color: var(--opt-color);
		font-weight: 600;
		white-space: nowrap;
	}
	.restart-btn {
		font-size: 0.72rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}

	circle.settled {
		filter: drop-shadow(0 0 4px var(--opt-color));
	}
</style>
