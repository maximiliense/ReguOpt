<script lang="ts">
	// 1. Define strict TypeScript interfaces for our props
	interface Props {
		/** The drawing function called every time the canvas or container resizes */
		draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
	}

	// 2. Destructure props using the Svelte 5 $props rune
	let { draw }: Props = $props();

	// 3. We only need ONE reference to the outer container element
	let container: HTMLDivElement | undefined = $state();

	// 4. Manage the rendering and resizing lifecycle safely inside an effect
	$effect(() => {
		if (!container) return;

		// Grab the canvas element directly from the container
		const canvas = container.querySelector('canvas');
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Use ResizeObserver to monitor the wrapper's dimensions seamlessly
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				// Get the container's true bounding box size
				const { width, height } = entry.contentRect;

				// Account for High-DPI / Retina displays to prevent blurriness
				const dpr = window.devicePixelRatio || 1;
				canvas.width = width * dpr;
				canvas.height = height * dpr;

				// Scale the canvas context contextually so your drawing function
				// can just use standard CSS pixel values natively
				ctx.resetTransform();
				ctx.scale(dpr, dpr);

				// Execute the user-provided drawing logic
				draw(ctx, width, height);
			}
		});

		resizeObserver.observe(container);

		// Clean up the observer automatically if the component unmounts
		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div bind:this={container} class="canvas-container">
	<canvas></canvas>
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
