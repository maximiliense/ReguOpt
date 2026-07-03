<script lang="ts">
	/**
	 * FEPGridworldDemo.svelte
	 *
	 * Auto-playing, scripted 6×6 gridworld animation that visually demonstrates
	 * the Free Energy Principle through an active inference agent.
	 *
	 * Layers (back → front):
	 * 1. Prior heatmap     — green (food nearby) / red (danger nearby) cell tints
	 * 2. Certainty field   — cells fade toward fog as belief precision decays
	 *                        over time since last visited (not a binary reveal)
	 * 3. World objects     — obstacles, food (●), danger (✕)
	 * 4. Prediction ghost  — dashed outline at the agent's predicted next cell,
	 *                        solidifying as the transition approaches — this is
	 *                        the agent's generative model forecasting ahead
	 * 5. Agent + trail     — glowing cyan circle, directional arrow, fading path
	 * 6. Surprise ripple   — expanding ring + label, fires only when free
	 *                        energy actually spikes (a genuine prediction error)

	 */

	interface Props {
		autoplay?: boolean;
		paused?: boolean;
	}

	let { autoplay = true, paused = false }: Props = $props();

	// ── Grid constants ──────────────────────────────────────────────────────────
	const ROWS = 6;
	const COLS = 6;
	const LOOP_DURATION = 10; // seconds
	const CERTAINTY_FADE = 2.6; // seconds for a cell's belief to fade back into fog

	// Obstacles encoded as (row * COLS + col)
	const OBSTACLE_SET = new Set([[2, 2] as const, [2, 3] as const].map(([r, c]) => r * COLS + c));

	// ── Scripted keyframes ──────────────────────────────────────────────────────
	interface KF {
		t: number; // seconds into loop
		r: number; // agent row
		c: number; // agent col
		food: ReadonlyArray<readonly [number, number]>;
		danger: ReadonlyArray<readonly [number, number]>;
		fe: number;
	}

	const KFS: KF[] = [
		{ t: 0.0, r: 4, c: 1, food: [[1, 4]], danger: [], fe: 0.2 },
		{ t: 1.0, r: 4, c: 1, food: [[1, 4]], danger: [[3, 2]], fe: 1.8 },
		{ t: 1.5, r: 4, c: 0, food: [[1, 4]], danger: [[3, 2]], fe: 1.5 },
		{ t: 2.0, r: 3, c: 0, food: [[1, 4]], danger: [[3, 2]], fe: 1.2 },
		{ t: 2.5, r: 2, c: 0, food: [[1, 4]], danger: [[3, 2]], fe: 0.9 },
		{ t: 3.0, r: 1, c: 0, food: [[1, 4]], danger: [[3, 2]], fe: 0.7 },
		{ t: 3.3, r: 1, c: 1, food: [[1, 4]], danger: [[3, 2]], fe: 0.62 },
		{ t: 3.6, r: 1, c: 2, food: [[1, 4]], danger: [[3, 2]], fe: 0.55 },
		{ t: 3.9, r: 1, c: 3, food: [[1, 4]], danger: [[3, 2]], fe: 0.45 },
		{ t: 4.2, r: 1, c: 4, food: [[4, 5]], danger: [[3, 2]], fe: 0.78 },
		{ t: 4.7, r: 1, c: 4, food: [[4, 5]], danger: [[3, 2]], fe: 0.28 },
		{
			t: 5.0,
			r: 1,
			c: 4,
			food: [[4, 5]],
			danger: [
				[3, 2],
				[2, 4]
			],
			fe: 1.6
		},
		{
			t: 5.4,
			r: 1,
			c: 5,
			food: [[4, 5]],
			danger: [
				[3, 2],
				[2, 4]
			],
			fe: 1.4
		},
		{
			t: 5.9,
			r: 2,
			c: 5,
			food: [[4, 5]],
			danger: [
				[3, 2],
				[2, 4]
			],
			fe: 1.05
		},
		{
			t: 6.4,
			r: 3,
			c: 5,
			food: [[4, 5]],
			danger: [
				[3, 2],
				[2, 4]
			],
			fe: 0.62
		},
		{
			t: 6.9,
			r: 4,
			c: 5,
			food: [],
			danger: [
				[3, 2],
				[2, 4]
			],
			fe: 0.22
		},
		{ t: 7.5, r: 4, c: 5, food: [], danger: [], fe: 0.18 },
		{ t: 8.0, r: 4, c: 4, food: [], danger: [], fe: 0.18 },
		{ t: 8.4, r: 4, c: 3, food: [], danger: [], fe: 0.18 },
		{ t: 8.7, r: 4, c: 2, food: [], danger: [], fe: 0.18 },
		{ t: 9.0, r: 4, c: 1, food: [], danger: [], fe: 0.18 },
		{ t: 9.5, r: 4, c: 1, food: [[1, 4]], danger: [], fe: 0.2 },
		{ t: 10.0, r: 4, c: 1, food: [[1, 4]], danger: [], fe: 0.2 }
	];

	// Surprise triggers: keyframes where FE jumps sharply — a genuine
	// prediction error (danger appearing unexpectedly), not a smooth descent.
	// Precomputed once from the script itself, not hand-tagged, so it stays
	// honest if the keyframes above are ever edited.
	const SURPRISE_TRIGGERS: { t: number; r: number; c: number }[] = KFS.slice(1)
		.map((kf, i) => ({ kf, prev: KFS[i] }))
		.filter(({ kf, prev }) => kf.fe - prev.fe > 0.5)
		.map(({ kf }) => ({ t: kf.t, r: kf.r, c: kf.c }));
	const RIPPLE_DURATION = 0.9;

	// ── Certainty field: per-cell "last seen" time, decaying to fog ─────────────
	// This is the one piece of state that genuinely encodes an FEP idea: belief
	// precision is not permanent once acquired — it decays without reconfirming
	// observations, which is why fog creeps back over cells the agent has left.
	let lastSeen = new Float32Array(ROWS * COLS).fill(-Infinity);
	let prevAnimTime = 0;

	function updateCertainty(agentR: number, agentC: number, currentT: number) {
		if (currentT < prevAnimTime) {
			lastSeen.fill(-Infinity);
		}

		prevAnimTime = currentT;

		const roundedR = Math.round(agentR);
		const roundedC = Math.round(agentC);
		const neighbors = [
			[roundedR, roundedC],
			[roundedR - 1, roundedC],
			[roundedR + 1, roundedC],
			[roundedR, roundedC - 1],
			[roundedR, roundedC + 1]
		];
		//console.log(lastSeen[19]);
		for (const [r, c] of neighbors) {
			if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
				lastSeen[r * COLS + c] = currentT;
			}
		}
	}

	function certaintyAt(r: number, c: number, currentT: number): number {
		const seen = lastSeen[r * COLS + c];

		if (seen === -Infinity) return 0;
		let dt = currentT - seen;
		if (Math.abs(dt) < 1e-6) dt = 0; // Float32 quantization noise — treat as equal
		if (dt < 0) dt += LOOP_DURATION; // loop wraparound
		let val = clamp01(1 - dt / CERTAINTY_FADE);
		//if (r * COLS + c === 19) console.log(val + ' ' + seen + ' ' + dt + ' ' + currentT);
		return val;
	}

	// ── Agent trail ──────────────────────────────────────────────────────────
	const TRAIL_LEN = 14;
	let trail: { r: number; c: number }[] = [];
	let trailAccum = 0;

	// ── Interpolation helpers ───────────────────────────────────────────────────
	function clamp01(x: number) {
		return x < 0 ? 0 : x > 1 ? 1 : x;
	}
	function lerp(a: number, b: number, t: number) {
		return a + (b - a) * t;
	}
	function easeInOut(t: number) {
		return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	}

	interface FrameState {
		row: number;
		col: number;
		food: KF['food'];
		danger: KF['danger'];
		fe: number;
		prevKF: KF;
		nextKF: KF;
		segAlpha: number; // 0→1 progress through the current keyframe segment
	}

	function getState(t: number): FrameState {
		let lo = KFS[0];
		let hi = KFS[KFS.length - 1];
		for (let i = 0; i < KFS.length - 1; i++) {
			if (t >= KFS[i].t && t < KFS[i + 1].t) {
				lo = KFS[i];
				hi = KFS[i + 1];
				break;
			}
		}
		const span = hi.t - lo.t;
		const rawAlpha = clamp01(span > 0 ? (t - lo.t) / span : 0);
		const alpha = easeInOut(rawAlpha);
		return {
			row: lerp(lo.r, hi.r, alpha),
			col: lerp(lo.c, hi.c, alpha),
			food: lo.food,
			danger: lo.danger,
			fe: lerp(lo.fe, hi.fe, alpha),
			prevKF: lo,
			nextKF: hi,
			segAlpha: rawAlpha
		};
	}

	// ── CSS variable cache ──────────────────────────────────────────────────────
	let cachedColors: Record<string, string> | null = null;
	let lastColorTs = 0;

	function getColors(): Record<string, string> {
		const now = performance.now();
		if (cachedColors && now - lastColorTs < 1000) return cachedColors;
		const cs = getComputedStyle(document.documentElement);
		const g = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
		cachedColors = {
			bg: g('--color-bg', '#09090b'),
			surface: g('--color-surface', '#18181b'),
			border: g('--color-border', '#3f3f46'),
			text: g('--color-text', '#f4f4f5'),
			muted: g('--color-text-muted', '#a1a1aa'),
			belief: g('--color-belief', '#06b6d4'),
			epistemic: g('--color-epistemic', '#a78bfa'),
			positive: g('--color-positive', '#10b981'),
			surprise: g('--color-surprise', '#f43f5e')
		};
		lastColorTs = now;
		return cachedColors;
	}

	function rrect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	) {
		r = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
	}

	// ── Main draw function ──────────────────────────────────────────────────────
	function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
		const C = getColors();
		const state = getState(t);

		updateCertainty(state.row, state.col, t);

		// sample the trail sparsely so it reads as a path, not a smear
		trailAccum += 1;
		if (trailAccum > 3) {
			trailAccum = 0;
			trail.push({ r: state.row, c: state.col });
			if (trail.length > TRAIL_LEN) trail.shift();
		}
		if (t < prevAnimTime - 0.01) trail = []; // loop restart
		const gridPx = Math.min(W, H);
		const cell = gridPx / COLS;
		const ox = (W - gridPx) / 2;
		const oy = (H - gridPx) / 2;

		ctx.fillStyle = C.bg;
		ctx.fillRect(0, 0, W, H);

		const agR = state.row;
		const agC = state.col;

		// ── 1. Grid cells: prior heatmap + certainty-decay fog, unified ───────
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const id = r * COLS + c;
				const x = ox + c * cell;
				const y = oy + r * cell;
				const p = 1.5;
				const radius = Math.max(2, cell * 0.12);

				if (OBSTACLE_SET.has(id)) {
					ctx.fillStyle = C.border;
					rrect(ctx, x + p, y + p, cell - p * 2, cell - p * 2, radius);
					ctx.fill();
					ctx.save();
					ctx.globalAlpha = 0.2;
					ctx.strokeStyle = C.muted;
					ctx.lineWidth = 0.5;
					ctx.beginPath();
					for (let i = 0; i < 3; i++) {
						const d = cell * 0.2 * (i + 1);
						ctx.moveTo(x + p + d, y + p);
						ctx.lineTo(x + p, y + p + d);
					}
					ctx.stroke();
					ctx.restore();
					continue;
				}

				ctx.fillStyle = C.surface;
				rrect(ctx, x + p, y + p, cell - p * 2, cell - p * 2, radius);
				ctx.fill();

				let foodWeight = 0;
				let dangerWeight = 0;
				for (const [fr, fc] of state.food) {
					const d = Math.abs(r - fr) + Math.abs(c - fc);
					foodWeight = Math.max(foodWeight, Math.max(0, 1 - d * 0.28));
				}
				for (const [dr, dc] of state.danger) {
					const d = Math.abs(r - dr) + Math.abs(c - dc);
					dangerWeight = Math.max(dangerWeight, Math.max(0, 1 - d * 0.28));
				}

				if (foodWeight > 0.02) {
					ctx.globalAlpha = foodWeight * 0.22;
					ctx.fillStyle = C.positive;
					rrect(ctx, x + p, y + p, cell - p * 2, cell - p * 2, radius);
					ctx.fill();
					ctx.globalAlpha = 1;
				}
				if (dangerWeight > 0.02) {
					ctx.globalAlpha = dangerWeight * 0.28;
					ctx.fillStyle = C.surprise;
					rrect(ctx, x + p, y + p, cell - p * 2, cell - p * 2, radius);
					ctx.fill();
					ctx.globalAlpha = 1;
				}

				// Certainty field: recently-visited cells are clear; belief about
				// them fades back toward fog the longer they go unconfirmed. This
				// replaces the old binary "explored" flag with a continuous decay.
				const certainty = certaintyAt(r, c, t);
				const fogAlpha = (1 - certainty) * 0.72;
				if (fogAlpha > 0.02) {
					ctx.globalAlpha = fogAlpha;
					ctx.fillStyle = C.bg;
					rrect(ctx, x + p, y + p, cell - p * 2, cell - p * 2, radius);
					ctx.fill();
					ctx.globalAlpha = 1;
				}

				ctx.strokeStyle = C.border;
				ctx.lineWidth = 0.5;
				rrect(ctx, x + p, y + p, cell - p * 2, cell - p * 2, radius);
				ctx.stroke();
			}
		}

		// ── 2. Food items ─────────────────────────────────────────────────────
		for (const [fr, fc] of state.food) {
			const cx = ox + fc * cell + cell * 0.5;
			const cy = oy + fr * cell + cell * 0.5;
			const r = cell * 0.24;
			ctx.save();
			ctx.fillStyle = C.positive;
			ctx.shadowColor = C.positive;
			ctx.shadowBlur = 8;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// ── 3. Danger items ───────────────────────────────────────────────────
		for (const [dr, dc] of state.danger) {
			const cx = ox + dc * cell + cell * 0.5;
			const cy = oy + dr * cell + cell * 0.5;
			const s = cell * 0.21;
			ctx.save();
			ctx.strokeStyle = C.surprise;
			ctx.lineWidth = Math.max(1.5, cell * 0.065);
			ctx.shadowColor = C.surprise;
			ctx.shadowBlur = 6;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(cx - s, cy - s);
			ctx.lineTo(cx + s, cy + s);
			ctx.moveTo(cx + s, cy - s);
			ctx.lineTo(cx - s, cy + s);
			ctx.stroke();
			ctx.restore();
		}

		// ── 4. Prediction ghost — the agent's forecast of its next state ──────
		// Solidifies as the transition approaches: this is the generative
		// model's prediction, drawn BEFORE the move actually happens.
		if (state.nextKF.r !== state.prevKF.r || state.nextKF.c !== state.prevKF.c) {
			const gx = ox + state.nextKF.c * cell + cell * 0.5;
			const gy = oy + state.nextKF.r * cell + cell * 0.5;
			const ghostAlpha = 0.12 + 0.4 * state.segAlpha;
			ctx.save();
			ctx.globalAlpha = ghostAlpha;
			ctx.strokeStyle = C.belief;
			ctx.setLineDash([3, 3]);
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(gx, gy, cell * 0.26, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}

		// ── 5. Agent trail (fading afterimage of the realised path) ───────────
		for (let i = 0; i < trail.length; i++) {
			const pt = trail[i];
			const tAlpha = ((i + 1) / trail.length) * 0.35;
			const tx = ox + pt.c * cell + cell * 0.5;
			const ty = oy + pt.r * cell + cell * 0.5;
			ctx.save();
			ctx.globalAlpha = tAlpha;
			ctx.fillStyle = C.belief;
			ctx.beginPath();
			ctx.arc(tx, ty, cell * 0.06, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// ── 6. Agent ──────────────────────────────────────────────────────────
		{
			const ax = ox + agC * cell + cell * 0.5;
			const ay = oy + agR * cell + cell * 0.5;
			const r = cell * 0.3;

			ctx.save();
			ctx.fillStyle = C.belief;
			ctx.shadowColor = C.belief;
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.arc(ax, ay, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();

			const dr = state.nextKF.r - state.prevKF.r;
			const dc = state.nextKF.c - state.prevKF.c;
			const mag = Math.sqrt(dr * dr + dc * dc);
			if (mag > 0.01) {
				const angle = Math.atan2(dr, dc);
				const len = r * 1.45;
				ctx.save();
				ctx.strokeStyle = C.bg;
				ctx.lineWidth = Math.max(1.2, cell * 0.055);
				ctx.lineCap = 'round';
				ctx.beginPath();
				ctx.moveTo(ax, ay);
				ctx.lineTo(ax + Math.cos(angle) * len, ay + Math.sin(angle) * len);
				ctx.stroke();
				ctx.restore();
			}
		}

		// ── 7. Surprise ripple — fires only on a genuine FE spike ─────────────
		for (const trig of SURPRISE_TRIGGERS) {
			let dt = t - trig.t;
			if (dt < 0) dt += LOOP_DURATION;
			if (dt < 0 || dt > RIPPLE_DURATION) continue;

			const progress = dt / RIPPLE_DURATION;
			const rx = ox + trig.c * cell + cell * 0.5;
			const ry = oy + trig.r * cell + cell * 0.5;
			const ringR = cell * (0.3 + progress * 0.9);
			const ringAlpha = (1 - progress) * 0.8;

			ctx.save();
			ctx.globalAlpha = ringAlpha;
			ctx.strokeStyle = C.surprise;
			ctx.lineWidth = Math.max(1, cell * 0.05 * (1 - progress * 0.5));
			ctx.beginPath();
			ctx.arc(rx, ry, ringR, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();

			if (progress < 0.55) {
				ctx.save();
				ctx.globalAlpha = (1 - progress / 0.55) * 0.9;
				ctx.fillStyle = C.surprise;
				ctx.font = `600 ${Math.max(8, cell * 0.16)}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText('Surprise', rx, ry - cell * 0.42 - progress * 6);
				ctx.restore();
			}
		}
	}

	// ── Animation loop ────────────────────────────────────────────────────────
	let canvas: HTMLCanvasElement | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let animTime = 0; // plain var — $state() would re-run the effect every frame, killing rAF0);

	$effect(() => {
		if (!canvas || !container) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

		const dpr = window.devicePixelRatio || 1;
		let W = 0,
			H = 0;
		// Pending dimensions, coalesced into a single rAF so that setting
		// canvas.width/height never happens synchronously inside the
		// ResizeObserver callback — that's what causes the loop warning.
		let pendingResize: { w: number; h: number } | null = null;
		let resizeRafId = 0;

		const obs = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width === 0 || height === 0) return;

			// Queue the latest size. If multiple resize events fire before
			// the next rAF, only the last one wins — avoiding layout thrash.
			pendingResize = { w: width, h: height };
			if (!resizeRafId) {
				resizeRafId = requestAnimationFrame(() => {
					resizeRafId = 0;
					const rz = pendingResize!;
					pendingResize = null;

					const newW = Math.round(rz.w * dpr);
					const newH = Math.round(rz.h * dpr);
					canvas!.width = newW;
					canvas!.height = newH;
					W = rz.w;
					H = rz.h;
					ctx.resetTransform();
					ctx.scale(dpr, dpr);
					if (W > 0 && H > 0) draw(ctx, W, H, animTime);
				});
			}
		});
		obs.observe(container);

		let running = true;
		let lastTs: number | null = null;
		const raf = { id: 0 };

		if (reduceMotion) {
			// Freeze on one representative frame: mid-exploration, with fog,
			// the prediction ghost, and the FE split all visible at once.
			animTime = 2.0;
			requestAnimationFrame(() => {
				if (W > 0 && H > 0) draw(ctx, W, H, animTime);
			});
			return () => obs.disconnect();
		}

		function frame(ts: number) {
			if (!running) return;
			if (lastTs === null) lastTs = ts;
			const dt = Math.min((ts - lastTs) / 1000, 0.1);
			lastTs = ts;

			if (autoplay && !paused) {
				animTime = (animTime + dt) % LOOP_DURATION;
			}

			if (W > 0 && H > 0) draw(ctx!, W, H, animTime);
			raf.id = requestAnimationFrame(frame);
		}

		raf.id = requestAnimationFrame(frame);

		return () => {
			running = false;
			cancelAnimationFrame(raf.id);
			if (resizeRafId) cancelAnimationFrame(resizeRafId);
			obs.disconnect();
		};
	});
</script>

<div class="demo-wrap" bind:this={container}>
	<canvas
		bind:this={canvas}
		aria-label="Démonstration du principe d'énergie libre : agent d'inférence active dans une grille, avec prédiction, surprise et mise à jour de croyance"
	></canvas>
</div>

<style>
	.demo-wrap {
		width: 100%;
		aspect-ratio: 1.2;
		max-width: 320px;
		margin: 0 auto;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
