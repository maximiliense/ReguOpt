<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import InteractiveSection from '$lib/components/narrative/InteractiveSection.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import ExpertPanel from '$lib/components/narrative/ExpertPanel.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import TopKExplorer from '$lib/components/demos/TopKExplorer.svelte';
	import AccuracyKCutoff from '$lib/components/demos/AccuracyKCutoff.svelte';
	import ConfidenceCalibration from '$lib/components/demos/ConfidenceCalibration.svelte';
	import { getPageByPath, getNextPage, getPrevPage, type PageMeta } from '$lib/navigation.js';
	import { createPageTracker } from '$lib/stores/progress.svelte';

	const meta = getPageByPath('/part3/lesson1');
	const tracker = createPageTracker(meta as PageMeta);
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	$effect(() => {
		tracker.trackInteraction();
	});
</script>

<svelte:head>
	<title>{meta?.title ?? 'Classification Top-K'} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Classification Top-K'}
	subtitle="Partie III — Prédiction d'ensembles"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<p>
			La classification usuelle retient une unique prédiction : la classe la plus probable. Cette
			approche, appelée <strong>Top-1</strong>, est simple mais rigide — elle ne donne aucune marge
			de manœuvre lorsqu'une classe alternative est presque aussi vraisemblable que la gagnante. La
			<strong>classification Top-K</strong>
			répond à cette limite en renvoyant un <em>ensemble</em> de K classes candidates, offrant un compromis
			entre coverage et précision.
		</p>

		<p>
			Soit un classificateur qui associe à chaque échantillon <KatexInline formula="x" /> un vecteur de
			probabilités prédites <KatexInline formula={String.raw`\hat{p}(x) = (p_1, \dots, p_C)`} />
			sur C classes. Le <strong>Top-K</strong> de <KatexInline formula="x" /> est :
		</p>

		<KatexBlock
			formula={String.raw`\text{Top}_K(\hat{p}) = \{ c \mid \text{le rang de } p_c \text{ parmi } \{p_1, \dots, p_C\} \leq K \}`}
		/>

		<p>
			Un échantillon est dit <strong>correct</strong> si la vraie étiquette
			<KatexInline formula="y" /> appartient à cet ensemble :
			<KatexInline formula={String.raw`y \in \text{Top}_K(\hat{p})`} />.
		</p>

		<Callout type="definition" title="Exactitude Top-K (Accuracy@K)">
			L'exactitude Top-K est la fraction d'échantillons dont la vraie classe figure dans le Top-K
			prédit :
		</Callout>

		<KatexBlock
			formula={String.raw`\text{Acc@}K = \frac{1}{N} \sum_{i=1}^{N} \mathbb{1}\big(y_i \in \text{Top}_K(\hat{p}_i)\big)`}
		/>

		<p>
			Pour <KatexInline formula="K = 1" />, cette métrique se réduit à l'exactitude usuelle. Pour <KatexInline
				formula="K = C"
			/>, elle vaut toujours 1 (toutes les classes sont incluses). La courbe <KatexInline
				formula={String.raw`K \mapsto \text{Acc@}K`}
			/> est donc monotone croissante et relie l'exactitude Top-1 à 100%.
		</p>
	</TheorySection>

	<InteractiveSection tag="Démo 9.1">
		<TopKExplorer />
	</InteractiveSection>

	<TheorySection>
		<h2>Choix adaptatif de K</h2>

		<p>
			La question pratique est : <em>quel K choisir ?</em> Un K trop petit risque de manquer la
			vraie classe, tandis qu'un K trop grand rend l'ensemble de prédiction peu informatif.
			L'approche la plus courante consiste à fixer un <strong>seuil de précision cible</strong>
			<KatexInline formula={String.raw`\tau`} /> et à rechercher le plus petit K le satisfaisant :
		</p>

		<KatexBlock
			formula={String.raw`K^* = \arg\min_{K} \left\{ K \;\middle|\; \text{Acc@}K \geq \tau \right\}`}
		/>

		<Callout type="intuition" title="Interprétation">
			Ce choix garantit que, sur l'ensemble de référence, au moins une fraction
			<KatexInline formula={String.raw`\tau`} /> des échantillons voit leur vraie classe incluse dans
			l'ensemble de prédiction. C'est un compromis direct entre la taille de l'ensemble (<KatexInline
				formula="K"
			/>) et sa fiabilité (<KatexInline formula={String.raw`\tau`} />).
		</Callout>

		<p>
			Cette règle est particulièrement utile en <strong>diagnostic médical</strong> ou en
			<strong>détection de fraude</strong>, où il est préférable de signaler un petit ensemble de
			suspects plutôt que de passer à côté d'un vrai cas positif.
		</p>
	</TheorySection>

	<InteractiveSection tag="Démo 9.2">
		<AccuracyKCutoff />
	</InteractiveSection>

	<TheorySection>
		<h2>Calibration de la confiance</h2>

		<p>
			La qualité d'un ensemble Top-K dépend de la qualité des probabilités prédites. Un modèle est
			dit <strong>calibré</strong> si, chaque fois qu'il prédit une confiance de <KatexInline
				formula="c"
			/>, sa précision empirique autour de
			<KatexInline formula="c" /> correspond bien à <KatexInline formula="c" />.
		</p>

		<p>
			Un modèle <strong>surconfiant</strong> surestime systématiquement sa certitude (p. ex. prédire
			90% de confiance mais n'avoir raison que dans 70% des cas). À l'inverse, un modèle
			<strong>sous-confiant</strong> sous-estime ses performances.
		</p>

		<Callout type="warning" title="Modèles modernes et calibration">
			Les réseaux de profondeur importante, notamment les ensembles (Random Forest, Boosting), ont
			tendance à produire des scores extrêmes. Sans calibration a posteriori, les seuils dérivés de
			ces scores peuvent être trompeurs.
		</Callout>

		<p>
			La <strong>méthode de Temperature Scaling</strong> (Guo et al., 2017) applique un facteur de
			température <KatexInline formula="T" /> aux logits avant softmax :
		</p>

		<KatexBlock
			formula={String.raw`\sigma\left(\frac{z_i}{T}\right) = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}`}
		/>

		<p>
			Avec <KatexInline formula="T &gt; 1" />, la distribution s'aplatit (le modèle devient moins
			confiant) ; avec <KatexInline formula="T &lt; 1" />, elle se resserre. Le paramètre <KatexInline
				formula="T"
			/> est appris sur un ensemble de calibration pour minimiser l'<strong
				>Error de Calibration Attendue</strong
			> (ECE).
		</p>

		<ExpertPanel title="Expected Calibration Error (ECE)">
			<p>
				L'ECE mesure l'écart moyen entre confiance prédite et précision empirique, pondéré par la
				taille de chaque bin :
			</p>
			<KatexBlock
				formula={String.raw`\text{ECE} = \sum_{b=1}^{B} \frac{|b|}{N} \big| \text{acc}(b) - \text{conf}(b) \big|`}
			/>
			<p>
				Où <KatexInline formula="b" /> désigne chaque bin de confiance,
				<KatexInline formula={String.raw`\text{acc}(b)`} /> est la précision empirique dans ce bin, et
				<KatexInline formula={String.raw`\text{conf}(b)`} /> la confiance moyenne prédite.
			</p>
		</ExpertPanel>
	</TheorySection>

	<InteractiveSection tag="Démo 9.3">
		<ConfidenceCalibration />
	</InteractiveSection>

	<TheorySection>
		<h2>Synthèse</h2>

		<p>
			La classification Top-K généralise la classification standard en renvoyant un ensemble de
			candidats plutôt qu'une unique prédiction. Le choix de K se fait par seuillage d'exactitude,
			et la qualité des ensembles dépend de la calibration des scores de confiance. Ces outils
			forment le socle de la <strong>prédiction d'ensembles</strong>, dont la forme la plus aboutie
			est la <em>prédiction conformelle</em> — abordée dans la leçon suivante.
		</p>
	</TheorySection>

	<Bibliography>
		<BibElement
			authors={['Guo, C.', 'Gill, G. K.', 'Averbeck, T.', 'Kalai, A. T.']}
			year={2017}
			title="On Calibration of Modern Neural Networks"
			journal="Proceedings of the 34th International Conference on Machine Learning (ICML)."
			link="https://arxiv.org/abs/1706.04599"
		/>
		<BibElement
			authors={['Noble, A.']}
			year={2014}
			title="How Not To Evaluate Your Detector"
			journal="Proceedings of the British Machine Vision Conference (BMVC)."
			link="https://www.alexander-noble.com/static/img/Noble-2014-How_Not.pdf"
		/>
	</Bibliography>
</PageTemplate>
