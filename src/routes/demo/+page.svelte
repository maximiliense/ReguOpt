<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import { getPageByPath } from '$lib/navigation.js';

	const meta = getPageByPath('/demo');
</script>

<svelte:head>
	<title>{meta?.title ?? 'FEP'} — Free Energy Principle</title>
</svelte:head>

<PageTemplate title="Demo" subtitle="Contenu en cours de développement.">
	<TheorySection>
		<p>Ce module sera complété dans les phases suivantes du projet.</p>
	</TheorySection>
</PageTemplate>
