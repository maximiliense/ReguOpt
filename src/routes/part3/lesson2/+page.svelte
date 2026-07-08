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
	import ConformalPredictionDemo from '$lib/components/demos/ConformalPredictionDemo.svelte';
	import ConformityScoreComparison from '$lib/components/demos/ConformityScoreComparison.svelte';
	import CoverageVerifier from '$lib/components/demos/CoverageVerifier.svelte';
	import QuantileThresholdVisualizer from '$lib/components/demos/QuantileThresholdVisualizer.svelte';
	import { getPageByPath, getNextPage, getPrevPage, type PageMeta } from '$lib/navigation.js';
	import { createPageTracker } from '$lib/stores/progress.svelte';

	const meta = getPageByPath('/part3/lesson2');
	const tracker = createPageTracker(meta as PageMeta);
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	$effect(() => {
		tracker.trackInteraction();
	});

	// ─── Formula constants (avoid Svelte brace-parsing issues) ───
	const F_SCORE_DEF = String.raw`s: \mathcal\{X\} \times \mathcal\{Y\} \to \mathbb\{R\}`;
	const F_DTRAIN = String.raw`\mathcal\{D\}_\text\{train\}`;
	const F_DCAL = String.raw`\mathcal\{D\}_\text\{cal\} = \{(X_i, Y_i)\}_{i=1}^n`;
	const F_HAT_F = String.raw`\hat\{f\}`;
	const F_SI = String.raw`S_i = s(X_i, Y_i) \quad \text\{pour \} i = 1, \dots, n`;
	const F_PRED_SET = String.raw`\mathcal\{C\}(x) = \big\{ y \in \mathcal\{Y\} \;:\; s(x, y) \leq \hat\{q\} \big\}`;
	const F_HAT_Q = String.raw`\hat\{q\}`;
	const F_K_INDEX = String.raw`\lceil (n+1)(1-\alpha) \rceil`;
	const F_SCORES = String.raw`\{S_i\}`;
	const F_EXCH_DATA = String.raw`(X_1, Y_1), \dots, (X_n, Y_n), (X, Y)`;
	const F_COVERAGE_THEOREM = String.raw`\mathbb\{P\}\big(Y \in \mathcal\{C\}(X)\big) \geq 1 - \alpha`;
	const F_RANK_SCORE = String.raw`s(x, y) = \text\{rang de \} y \text\{ parmi les classes, triées par \} \hat\{p\} \text\{ décroissant\}`;
	const F_1MINUSP = String.raw`s(x, y) = 1 - \hat\{p\}_y(x)`;
	const F_CUMULATIVE = String.raw`s(x, y) = 1 - \sum_{j : \hat\{p\}_j(x) \geq \hat\{p\}_y(x)} \hat\{p\}_j(x)`;
	const F_QUANTILE_BLOCK = String.raw`\hat\{q\} = \text\{sorted_scores\}\big[\, \lceil (n+1)(1-\alpha) \rceil - 1 \,\big]`;
</script>

<svelte:head>
	<title>{meta?.title ?? 'Prédiction conformelle'} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Prédiction conformelle'}
	subtitle="Partie III — Prédiction d'ensembles"
	prev={prevMeta}
	next={nextMeta}
>
	<!-- ═══════════ Introduction ═══════════ -->
	<TheorySection>
		<p>
			La classification Top-K précédente retourne un ensemble de taille fixe. La
			<strong>prédiction conformelle</strong> va plus loin : elle construit des ensembles de
			prédiction avec une <em>garantie théorique rigoureuse</em> sur la couverture de la vraie
			étiquette, et ce <strong>sans hypothèse paramétrique</strong> sur le modèle sous-jacent.
		</p>

		<p>
			L'idée centrale est simple : utiliser un ensemble de calibration pour mesurer à quel point
			chaque paire (prédiction, étiquette) est « conforme » au modèle appris, puis employer cette
			mesure pour décider quelles classes inclure dans l'ensemble de prédiction d'un nouvel
			échantillon.
		</p>

		<Callout type="definition" title="Score de conformité">
			Un <strong>score de conformité</strong> est une fonction
			<KatexInline formula={F_SCORE_DEF} />
			qui mesure à quel point une paire <KatexInline formula="(x, y)" /> est cohérente avec le modèle
			appris. Plus le score est <em>faible</em>, plus la paire est conforme.
		</Callout>
	</TheorySection>

	<!-- ═══════════ Algorithme ═══════════ -->
	<TheorySection>
		<h2>Algorithme de prédiction conformelle</h2>

		<p>
			Soit un modèle entraîné sur
			<KatexInline formula={F_DTRAIN} />, et un ensemble indépendant de calibration
			<KatexInline formula={F_DCAL} />.
		</p>

		<ExpertPanel title="Algorithme pas à pas">
			<p>
				<strong>Étape 1 — Entraînement :</strong> Apprendre un classificateur
				<KatexInline formula={F_HAT_F} /> sur <KatexInline formula={F_DTRAIN} />.
			</p>
			<p>
				<strong>Étape 2 — Calibration :</strong> Calculer les scores de conformité sur
				<KatexInline formula={F_DCAL} /> :
			</p>
			<KatexBlock formula={F_SI} />
			<p>
				<strong>Étape 3 — Prédiction :</strong> Pour un nouvel échantillon
				<KatexInline formula="x" />, construire l'ensemble de prédiction :
			</p>
			<KatexBlock formula={F_PRED_SET} />
			<p>
				où <KatexInline formula={F_HAT_Q} /> est le quantile d'ordre
				<KatexInline formula={F_K_INDEX} /> des scores <KatexInline formula={F_SCORES} />.
			</p>
		</ExpertPanel>
	</TheorySection>

	<!-- ═══════════ Démo 10.1 — Pipeline animé ═══════════ -->
	<InteractiveSection tag="Démo 10.1">
		<ConformalPredictionDemo />
	</InteractiveSection>

	<!-- ═══════════ Garantie théorique ═══════════ -->
	<TheorySection>
		<h2>Garantie de couverture</h2>

		<Callout type="definition" title="Théorème — Garantie de couverture">
			Sous l'hypothèse
			<strong>d'échangeabilité</strong> (plus faible que i.i.d.) des données
			<KatexInline formula={F_EXCH_DATA} />, la prédiction conformelle garantit :
		</Callout>

		<KatexBlock formula={F_COVERAGE_THEOREM} />

		<p>
			Cette garantie est <strong>exacte en échantillon fini</strong> et
			<strong>model-free</strong> : elle ne repose sur aucune hypothèse sur la forme du classificateur.
			L'hypothèse d'échangeabilité signifie que la distribution jointe est invariante par permutation
			des observations.
		</p>

		<Callout type="intuition" title="Quand l'échangeabilité tient-elle ?">
			Les données i.i.d. sont toujours échangeables. L'échangeabilité est également satisfaite dans
			certains cas de séries temporelles (permutation sans changement de distribution) ou pour des
			échantillons provenant de la même population. En pratique, on considère souvent l'hypothèse
			satisfied si les données de calibration et de test proviennent d'une même distribution.
		</Callout>
	</TheorySection>

	<!-- ═══════════ Démo 10.3 — Vérification de la couverture ═══════════ -->
	<InteractiveSection tag="Démo 10.3">
		<CoverageVerifier />
	</InteractiveSection>

	<!-- ═══════════ Score de rang ═══════════ -->
	<TheorySection>
		<h2>Score de conformité par rang</h2>

		<p>
			Le choix le plus naturel en classification est le <strong>rang de la vraie classe</strong>
			dans le classement par probabilité décroissante :
		</p>

		<KatexBlock formula={F_RANK_SCORE} />

		<Callout type="insight" title="Lien avec le Top-K">
			Avec ce score, la prédiction conformelle redonne exactement le <strong>Top-K validé</strong>
			de la leçon précédente. Si <KatexInline formula={F_HAT_Q} /> est le quantile choisi, alors
			<KatexInline formula={F_PRED_SET} /> contient les classes de rang
			<KatexInline formula={String.raw`\leq \hat\{q\}`} />.
		</Callout>

		<p>
			Ce score produit des ensembles discrets : la taille de
			<KatexInline formula={String.raw`\mathcal\{C\}(x)`} /> est un entier entre 1 et le nombre de classes.
			Il est particulièrement simple à interpréter mais peut être trop grossier quand les probabilités
			prédites contiennent plus d'information que le seul ordre.
		</p>
	</TheorySection>

	<!-- ═══════════ Scores probabilistes ═══════════ -->
	<TheorySection>
		<h2>Scores de conformité probabilistes</h2>

		<p>
			Pour exploiter l'information quantitative des probabilités, on peut utiliser des scores plus
			raffinés :
		</p>

		<Callout type="definition" title="Score 1-p̂">
			<KatexInline formula={F_1MINUSP} /> — Plus la probabilité de la vraie classe est élevée, plus le
			score est faible (plus conforme).
		</Callout>

		<Callout type="definition" title="Score cumulatif">
			<KatexInline formula={F_CUMULATIVE} /> — Somme des probabilités des classes au moins aussi probables
			que
			<KatexInline formula="y" />, puis complément à 1.
		</Callout>

		<p>
			Ces scores produisent des ensembles de taille variable pour chaque échantillon. Ils permettent
			une adaptation fine : les échantillons pour lesquels le modèle est confiant auront des
			ensembles petits, tandis que les échantillons ambigus recevront des ensembles plus larges.
		</p>
	</TheorySection>

	<!-- ═══════════ Démo 10.2 — Comparaison des scores ═══════════ -->
	<InteractiveSection tag="Démo 10.2">
		<ConformityScoreComparison />
	</InteractiveSection>

	<!-- ═══════════ Le quantile ═══════════ -->
	<TheorySection>
		<h2>Le seuil quantile</h2>

		<p>
			Le paramètre critique de la méthode est le <strong>quantile</strong>
			<KatexInline formula={F_HAT_Q} /> des scores de calibration. Il détermine directement la taille
			des ensembles de prédiction : un seuil élevé inclut plus de classes, un seuil bas les restreint.
		</p>

		<KatexBlock formula={F_QUANTILE_BLOCK} />

		<p>
			Le niveau de signification
			<KatexInline formula="\alpha" /> contrôle le compromis :
			<KatexInline formula="\alpha = 0.1" /> garantit une couverture d'au moins 90 %, mais produit des
			ensembles plus larges. Un
			<KatexInline formula="\alpha" /> plus petit (p. ex. 0.01) fournit une garantie plus forte (99 %)
			mais au prix d'ensembles souvent triviaux.
		</p>

		<Callout type="warning" title="Petits échantillons de calibration">
			Lorsque l'ensemble de calibration est petit, la garantie théorique reste exacte mais les
			ensembles de prédiction peuvent être plus larges que nécessaire. La précision empirique
			converge vers la garantie théorique lorsque la taille de calibration augmente.
		</Callout>
	</TheorySection>

	<!-- ═══════════ Démo 10.4 — Visualisation du quantile ═══════════ -->
	<InteractiveSection tag="Démo 10.4">
		<QuantileThresholdVisualizer />
	</InteractiveSection>

	<!-- ═══════════ Synthèse ═══════════ -->
	<TheorySection>
		<h2>Synthèse</h2>

		<p>
			La prédiction conformelle transforme un classificateur standard en un dispositif de
			<strong>prédiction d'ensembles</strong> avec garantie probabiliste. Les trois ingrédients essentiels
			sont :
		</p>

		<ul>
			<li>Un <strong>score de conformité</strong> qui mesure la cohérence d'une paire (x, y)</li>
			<li>Un <strong>ensemble de calibration</strong> indépendant pour estimer le seuil</li>
			<li>Un <strong>quantile</strong> qui garantit la couverture à un niveau choisi</li>
		</ul>

		<p>
			Le choix du score influence la taille des ensembles : le score de rang produit des ensembles
			discrets (Top-K), tandis que les scores probabilistes adaptent la taille à chaque échantillon.
			La méthode s'étend naturellement à la régression, où elle produit des
			<strong>intervalles de prédiction</strong> — comme nous le verrons dans la prochaine leçon.
		</p>
	</TheorySection>

	<Bibliography>
		<BibElement
			authors={['Vovk, V.', 'Gammerman, A.', 'Sawyer, R.']}
			year={2005}
			title="Algorithmic Learning in a Random World"
			journal="Springer."
			link="https://www.springer.com/gp/book/9780387259945"
		/>
		<BibElement
			authors={['Sadinle, M.', 'Natekin-Arroyo, T.', 'Barber, R. F.']}
			year={2019}
			title="Lessons from Conformal Prediction"
			journal="arXiv preprint arXiv:1911.09974."
			link="https://arxiv.org/abs/1911.09974"
		/>
		<BibElement
			authors={['Romano, Y.', 'Candes, E.', 'Catoni, O.', 'Tsybakov, A.']}
			year={2020}
			title="Classification with Valid and Adaptive Coverage"
			journal="International Conference on Learning Representations (ICLR)."
			link="https://arxiv.org/abs/1905.09108"
		/>
	</Bibliography>
</PageTemplate>
