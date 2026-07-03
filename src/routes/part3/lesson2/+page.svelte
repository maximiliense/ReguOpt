<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';

	const meta = getPageByPath('/part3/lesson2');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Prédiction conformelle'}
	subtitle="Partie III — Prédiction d'ensembles"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<p>
			[Contenu à intégrer depuis le cours Typst : Score de conformité, algorithme conformel,
			garantie de couverture]
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
