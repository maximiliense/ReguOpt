<script lang="ts">
	import Slider from '$lib/components/controls/Slider.svelte';
	import Metrics from '$lib/components/layout/Metrics.svelte';

	let m = $state(50);
	let seed = $state(Date.now());

	const sim = $derived.by(() => {
		let h = seed | 0;
		const rand = () => {
			h = (h + 0x6d2b79f5) | 0;
			let t = Math.imul(h ^ (h >>> 15), 1);
			t = (t + Math.imul(t ^ (t >>> 7), 61)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const gauss = () => {
			let u = 0,
				v = 0;
			while (!u) u = rand();
			while (!v) v = rand();
			return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
		};

		const oob: number[] = [],
			test: number[] = [];
		let sum = 0;
		for (let k = 1; k <= m; k++) {
			const e = Math.max(0.05, Math.min(0.8, 0.38 + gauss() * 0.12));
			sum += e;
			test.push(sum / k);
			oob.push(test[k - 1] + ((gauss() * 0.12) / Math.sqrt(k)) * 0.6);
		}
		return { oob, test };
	});

	const finalOOB = $derived(sim.oob.at(-1)!);
	const finalTest = $derived(sim.test.at(-1)!);
	const diff = $derived(Math.abs(finalOOB - finalTest));

	const W = 520,
		H = 260;
	const pad = { t: 30, r: 16, b: 40, l: 48 };
	const pw = W - pad.l - pad.r,
		ph = H - pad.t - pad.b;

	const yMin = $derived(Math.floor(Math.min(...sim.oob, ...sim.test) * 10) / 10);
	const yMax = $derived(Math.ceil(Math.max(...sim.oob, ...sim.test) * 10) / 10);
	const sx = (v: number) => pad.l + ((v - 1) / (m - 1)) * pw;
	const sy = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * ph;

	const testPath = $derived(
		sim.test.map((v, i) => `${i ? 'L' : 'M'}${sx(i + 1).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')
	);
	const oobPath = $derived(
		sim.oob.map((v, i) => `${i ? 'L' : 'M'}${sx(i + 1).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')
	);
	const xTicks = $derived(Array.from({ length: 6 }, (_, i) => Math.round(1 + (i / 5) * (m - 1))));
	const yTicks = $derived(
		Array.from({ length: 5 }, (_, i) => +(yMin + (i / 4) * (yMax - yMin)).toFixed(2))
	);

	function regenerate() {
		seed = Date.now();
	}
</script>

<div class="oob-tracker">
	<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="OOB vs Test Error convergence">
		<path
			d={`M${pad.l},${pad.t} L${pad.l},${H - pad.b} L${W - pad.r},${H - pad.b}`}
			fill="none"
			stroke="var(--color-border)"
		/>
		{#each yTicks as t (t)}
			<text
				x={pad.l - 6}
				y={sy(t)}
				text-anchor="end"
				dominant-baseline="middle"
				fill="var(--color-text-muted)"
				font-size="9"
				font-family="var(--font-mono)">{t.toFixed(2)}</text
			>
		{/each}
		{#each xTicks as t (t)}
			<text
				x={sx(t)}
				y={H - pad.b + 14}
				text-anchor="middle"
				fill="var(--color-text-muted)"
				font-size="9"
				font-family="var(--font-mono)">{t}</text
			>
		{/each}

		<text
			x={(pad.l + W - pad.r) / 2}
			y={H - 4}
			text-anchor="middle"
			fill="var(--color-text-muted)"
			font-size="10"
			font-family="var(--font-sans)">Modèles (k)</text
		>
		<text
			x={12}
			y={(pad.t + H - pad.b) / 2}
			text-anchor="middle"
			transform={`rotate(-90,12,${(pad.t + H - pad.b) / 2})`}
			fill="var(--color-text-muted)"
			font-size="10"
			font-family="var(--font-sans)">Erreur</text
		>

		<path d={testPath} fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" />
		<path
			d={oobPath}
			fill="none"
			stroke="#22c55e"
			stroke-width="2.5"
			stroke-dasharray="6 3"
			stroke-linejoin="round"
		/>

		<rect
			x={pad.l + 8}
			y={pad.t + 4}
			width="12"
			height="3"
			rx="1"
			fill="#22c55e"
			style="stroke-dasharray:6 3"
		/>
		<text
			x={pad.l + 24}
			y={pad.t + 9}
			fill="var(--color-text-muted)"
			font-size="10"
			font-family="var(--font-sans)">OOB Error</text
		>
		<rect x={pad.l + 108} y={pad.t + 6} width="12" height="3" rx="1" fill="#3b82f6" />
		<text
			x={pad.l + 124}
			y={pad.t + 9}
			fill="var(--color-text-muted)"
			font-size="10"
			font-family="var(--font-sans)">True Test Error</text
		>

		<circle cx={sx(m)} cy={sy(finalOOB)} r="4" fill="#22c55e">
			<animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
		</circle>
	</svg>

	<div class="controls">
		<Slider bind:value={m} min={5} max={100} step={1} label="Modèles (M)" />
		<button class="btn-regen" onclick={regenerate}>⟳ Regenerate</button>
	</div>

	<Metrics>
		<div class="cell">
			<span class="label">OOB Error</span>
			<span class="value" style="color:#22c55e">{finalOOB.toFixed(4)}</span>
		</div>
		<div class="cell">
			<span class="label">Test Error</span>
			<span class="value" style="color:#3b82f6">{finalTest.toFixed(4)}</span>
		</div>
		<div class="cell">
			<span class="label">Difference</span>
			<span class="value">{diff.toFixed(5)}</span>
		</div>
		<div class="cell">
			<span class="label">Models</span>
			<span class="value">{m}</span>
		</div>
	</Metrics>
</div>

<style>
	.oob-tracker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}
	.btn-regen {
		padding: 0.35rem 0.85rem;
		font-size: 0.8125rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-surface-2);
		color: var(--color-text);
		cursor: pointer;
		font-family: var(--font-sans);
		white-space: nowrap;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.btn-regen:hover {
		border-color: var(--color-belief);
		background: color-mix(in srgb, var(--color-belief) 12%, transparent);
	}
	svg text {
		user-select: none;
	}
</style>
