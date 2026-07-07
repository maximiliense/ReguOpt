let active = false;
const queue: (() => void)[] = [];

export function acquireDeferredSlot(): Promise<void> {
	return new Promise((resolve) => {
		if (!active) {
			active = true;
			resolve();
		} else {
			queue.push(resolve);
		}
	});
}

export function releaseDeferredSlot() {
	active = false;

	const next = queue.shift();

	if (next) {
		active = true;
		next();
	}
}
