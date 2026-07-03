<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';

	const meta = getPageByPath('/part2/lesson3');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Boosting (AdaBoost, Gradient Boosting)'}
	subtitle="Partie II — Régularisation"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<p>
			[Contenu à intégrer depuis le cours Typst : AdaBoost, perte exponentielle, margin, Gradient
			Boosting]
		</p>
	</TheorySection>

	<Bibliography>
		<BibElement
			authors={['Auteur, A.', 'Auteur, B.']}
			year={2024}
			title="Titre de référence"
			journal="Nom du journal."
			link="https://example.com"
		/>
	</Bibliography>
</PageTemplate>
