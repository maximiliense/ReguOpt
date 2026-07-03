<script lang="ts">
	import Button from './Button.svelte';

	let {
		value,
		label,
		groupValue = $bindable(),
		size = 'sm'
	}: {
		value: string | number;
		label: string;
		groupValue: string | number;
		size?: 'sm' | 'md';
	} = $props();

	const selected = $derived(groupValue === value);

	function click() {
		groupValue = value;
	}
</script>

<Button {size} variant="outline" {selected} onclick={click}>
	{label}
</Button>
