<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';

	const meta = getPageByPath('/intro');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Introduction'}
	subtitle="Présentation du cours"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<p>
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
			labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
			laboris nisi ut aliquip ex ea commodo consequat.
		</p>

		<h2>Objectifs du cours</h2>

		<p>
			Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
			pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
			mollit anim id est laborum.
		</p>

		<Callout type="intuition" title="À propos">
			Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
			laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto
			beatae vitae dicta sunt explicabo.
		</Callout>

		<h2>Plan du cours</h2>

		<p>
			Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
			consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam
			est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
		</p>

		<p>
			Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi
			ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea
			voluptate velit esse quam nihil molestiae consequatur.
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
