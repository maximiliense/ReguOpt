<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import InteractiveSection from '$lib/components/narrative/InteractiveSection.svelte';
	import DefinitionBlock from '$lib/components/narrative/DefinitionBlock.svelte';
	import TheoremBlock from '$lib/components/narrative/TheoremBlock.svelte';

	import ExercisePanel from '$lib/components/narrative/ExercisePanel.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import DeferredDemo from '$lib/components/layout/DeferredDemo.svelte';

	import { getPageByPath, getNextPage, getPrevPage, type PageMeta } from '$lib/navigation.js';
	import { createPageTracker } from '$lib/stores/progress.svelte';

	const meta = getPageByPath('/part2/lesson2');
	const tracker = createPageTracker(meta as PageMeta);
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	$effect(() => {
		tracker.trackInteraction();
	});

	// ── KaTeX formulas (stored as JS variables to avoid Svelte escape issues) ────
	const mSym = 'm';
	const dSym = 'd';
	const mTreesSym = 'M';
	const nSamples = 'n';
	const pSym = 'P';
	const rhoBar = '\\bar{\\rho}';
	const sigmaSq = '\\sigma^2';
	const sqrtD = '\\sqrt{d}';
	const dOver3 = 'd / 3';
	const jLoop = 'j = 1, \\ldots, M';
	const varAgreeFormula =
		'\\text{Var}_{\\text{agrégé}} = ' +
		rhoBar +
		' \\cdot ' +
		sigmaSq +
		' + (1 - ' +
		rhoBar +
		') \\cdot \\frac{' +
		sigmaSq +
		'}{' +
		mTreesSym +
		'}';
	const errTestFormula =
		'\\text{Erreur}_{\\text{test}} \\approx f(m) \\quad \\text{où } f(m) \\text{ décroît puis se stabilise}';
	const importanceImpurityFormula =
		'\\text{Importance}(x_j) = \\frac{1}{M} \\sum_{k=1}^{M} \\sum_{t \\in T_k : split(t)=j} \\Delta \\text{Impureté}_t';
	const importancePermFormula =
		'\\text{Importance}_{perm}(x_j) = \\frac{1}{P} \\sum_{p=1}^{P} \\bigl( \\text{Score}(X^{orig}) - \\text{Score}(X^{perm, j}_p) \\bigr)';
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Random Forest & sélection de features'}
	subtitle="Partie II — Régularisation"
	prev={prevMeta}
	next={nextMeta}
>
	<!-- ═══════════════════════════════════════════════ -->
	<!-- Section 1 : Motivation — Pourquoi Random Forest ? -->
	<!-- ═══════════════════════════════════════════════ -->
	<TheorySection>
		<h2>Motivation du Random Forest</h2>

		<p>
			Dans la leçon précédente, nous avons vu que le <strong>bagging</strong> réduit la variance
			d'un estimateur en agrégeant plusieurs modèles entraînés sur des échantillons bootstrap.
			Pourtant, le bagging pur présente une limitation fondamentale : lorsque certaines features
			sont très prédictives, elles dominent systématiquement les divisions aux nœuds racines,
			faisant que les arbres construits restent <strong>fortement corrélés</strong>.
		</p>

		<Callout type="warning" title="Problème du bagging pur">
			<p>
				Même avec des échantillons bootstrap différents, les arbres peuvent être très corrélés si :
			</p>
			<ul>
				<li>Quelques features sont très prédictives</li>
				<li>Ces features dominent toujours les divisions aux nœuds racines</li>
				<li>Les arbres résultants ont des structures similaires</li>
			</ul>
		</Callout>

		<p>
			L'idée clé du <strong>Random Forest</strong>, introduite par Breiman (2001), est d'introduire
			une source supplémentaire de diversité : à chaque nœud, on ne considère qu'un
			<strong>sous-ensemble aléatoire de features</strong> pour choisir la meilleure division. Cette contrainte
			force les arbres à explorer différentes dimensions du problème et réduit fortement la corrélation
			entre modèles — ce qui amplifie l'effet de réduction de variance.
		</p>

		<KatexBlock formula={varAgreeFormula} />

		<p>
			Où <KatexInline formula={mTreesSym} /> est le nombre d'arbres,
			<KatexInline formula={rhoBar} /> la corrélation moyenne entre paires de modèles, et
			<KatexInline formula={sigmaSq} /> la variance individuelle. Le Random Forest agit en réduisant directement
			<KatexInline formula={rhoBar} />, là où le bagging pur ne réduit que par effet du bootstrap.
		</p>
	</TheorySection>

	<InteractiveSection tag="Stump de décision">
		<DeferredDemo load={() => import('$lib/components/demos/DecisionTreeStump.svelte')} />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════════════ -->
	<!-- Section 2 : Algorithme Random Forest -->
	<!-- ═══════════════════════════════════════════════ -->
	<TheorySection>
		<h2>Algorithme du Random Forest</h2>

		<p>
			Le Random Forest combine deux mécanismes aléatoires : le <strong>bootstrap des données</strong
			>
			(comme le bagging classique) et la <strong>sélection aléatoire de features</strong>. Voici
			l'algorithme complet :
		</p>

		<div class="algo-block">
			<h3>Algorithme 4.2 — Random Forest</h3>
			<p>
				<strong>Paramètres :</strong>
				<KatexInline formula={mTreesSym} /> = nombre d'arbres,
				<KatexInline formula={mSym} /> = nombre de features à considérer par division.
			</p>
			<ol>
				<li>Pour chaque arbre <KatexInline formula={jLoop} /> :</li>
				<ul>
					<li>Générer un échantillon bootstrap de taille <KatexInline formula={nSamples} /></li>
					<li>
						Construire un arbre en appliquant la modification suivante :
						<ul>
							<li>
								À chaque nœud, sélectionner aléatoirement <KatexInline formula={mSym} /> features parmi
								les <KatexInline formula={dSym} /> disponibles
							</li>
							<li>
								Choisir la meilleure division parmi ces <KatexInline formula={mSym} /> features seulement
							</li>
						</ul>
					</li>
				</ul>
				<li>
					<strong>Sortie :</strong> Prédiction agrégée des <KatexInline formula={mTreesSym} /> arbres
					(vote majoritaire ou moyenne)
				</li>
			</ol>
		</div>

		<p>
			La différence cruciale avec le bagging pur est que chaque arbre n'a accès qu'à un
			sous-ensemble aléatoire de features pour chaque décision. Cette contrainte locale force une <strong
				>décorrélation structurelle</strong
			> : même si toutes les arbres voient les mêmes données, ils explorent des espaces de partition différents.
		</p>

		<Callout type="intuition" title="Intuition">
			<p>
				Pensez-y comme un panel d'experts : le bagging donne à chaque expert une partie différente
				des documents (bootstrap), tandis que le Random Forest fait en plus que chaque expert ne
				consulte qu'un sous-ensemble aléatoire de sources (sélection de features). Les conclusions
				sont donc plus diversifiées et l'agrégation plus robuste.
			</p>
		</Callout>

		<ExercisePanel number="6.1" title="Impact de la sélection aléatoire">
			{#snippet solution()}
				<p>
					Avec <KatexInline formula={mSym} /> = 1, chaque division ne considère qu'une seule feature choisie
					au hasard — les arbres sont très divers mais faibles. Avec <KatexInline formula={mSym} /> =
					<KatexInline formula={dSym} />, on retrouve le bagging pur (toutes features visibles). La
					valeur optimale se situe entre les deux, typiquement autour de <KatexInline
						formula={sqrtD}
					/>.
				</p>
			{/snippet}
			<p>
				Que se passe-t-il si on prend <KatexInline formula={mSym} /> = 1 (une seule feature par division)
				? Et si <KatexInline formula={mSym} /> = <KatexInline formula={dSym} /> (toutes les features)
				? Justifiez.
			</p>
		</ExercisePanel>
	</TheorySection>

	<InteractiveSection tag="Croissance d'une forêt">
		<DeferredDemo load={() => import('$lib/components/demos/ForestGrowthAnimation.svelte')} />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════════════ -->
	<!-- Section 3 : Choix des hyperparamètres m → √d -->
	<!-- ═══════════════════════════════════════════════ -->
	<TheorySection>
		<h2>Choix du nombre de features par division</h2>

		<p>
			L'hyperparamètre <KatexInline formula={mSym} /> est le levier principal du Random Forest. Il contrôle
			directement le compromis entre la qualité individuelle des arbres et leur diversité. Les règles
			empiriques suivantes sont largement adoptées :
		</p>

		<DefinitionBlock number="6.1" title="Règles empiriques pour m">
			<ul>
				<li>
					<strong>Classification :</strong>
					<KatexInline formula={mSym} /> = <KatexInline formula={sqrtD} />, où <KatexInline
						formula={dSym}
					/> est le nombre total de features
				</li>
				<li>
					<strong>Régression :</strong>
					<KatexInline formula={mSym} /> ≈ <KatexInline formula={dOver3} />
				</li>
			</ul>

			<p>
				Ces valeurs offrent un bon compromis entre diversité (plus petite <KatexInline
					formula={mSym}
				/>) et qualité individuelle des divisions (plus grande <KatexInline formula={mSym} />). La
				règle <KatexInline formula={sqrtD} /> pour la classification vient du fait que dans un problème
				à <KatexInline formula={dSym} /> features, le nombre de combinaisons significatives croît environ
				comme <KatexInline formula={sqrtD} />, et on souhaite échantillonner suffisamment de
				sous-espaces pour capturer les interactions pertinentes.
			</p>
		</DefinitionBlock>

		<Callout type="insight" title="Pourquoi √d ?">
			<p>
				L'idée heuristique est que <KatexInline formula={sqrtD} /> donne à chaque nœud suffisamment de
				choix pour trouver une bonne division, mais assez peu de features pour forcer la diversité entre
				arbres. Quand les features sont corrélées, réduire <KatexInline formula={mSym} /> amplifie encore
				plus l'effet décorrélation : sélectionner un petit sous-ensemble augmente la probabilité que différentes
				combinaisons soient retenues d'un arbre à l'autre.
			</p>
		</Callout>

		<KatexBlock formula={errTestFormula} />
	</TheorySection>

	<InteractiveSection tag="Exploration des sous-ensembles">
		<DeferredDemo load={() => import('$lib/components/demos/FeatureSubsetExplorer.svelte')} />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════════════ -->
	<!-- Section 4 : Importance des features -->
	<!-- ═══════════════════════════════════════════════ -->
	<TheorySection>
		<h2>Estimation de l'importance des variables</h2>

		<p>
			L'un des atouts majeurs du Random Forest est sa capacité à fournir une mesure d'<strong
				>importance des features</strong
			>
			de manière naturelle. Deux méthodes principales sont utilisées :
		</p>

		<h3>Diminution moyenne de l'impureté (Mean Decrease Impurity)</h3>

		<p>
			Pour chaque arbre, on enregistre la réduction d'impureté (Gini pour la classification, MSE
			pour la régression) apportée par chaque division. En moyennant cette contribution sur tous les
			arbres de la forêt et en la regroupant par feature, on obtient un score :
		</p>

		<KatexBlock formula={importanceImpurityFormula} />

		<p>
			Cette méthode est rapide car elle utilise les informations déjà calculées pendant
			l'entraînement. Elle est toutefois biaisée en faveur des features avec beaucoup de modalités
			ou celles utilisées dans les nœuds hauts (qui voient plus d'échantillons).
		</p>

		<h3>Importance par permutation</h3>

		<p>
			Pour chaque feature, on permuté aléatoirement ses valeurs sur un ensemble de validation et on
			mesure la dégradation de performance :
		</p>

		<KatexBlock formula={importancePermFormula} />

		<p>
			Où <KatexInline formula={pSym} /> est le nombre de permutations. Cette méthode est plus honnête
			car elle mesure directement l'impact de chaque feature sur la performance finale, indépendamment
			du processus de construction des arbres. Les features véritablement informatives verront leur permutation
			dégrader fortement les prédictions.
		</p>

		<Callout type="warning" title="Attention au biais">
			<p>
				L'importance par impureté surévalue systématiquement les features continues et celles avec
				de nombreuses modalités. L'importance par permutation est plus fiable mais coûteuse en
				calcul — privilégiez-la pour la sélection de features critique.
			</p>
		</Callout>
	</TheorySection>

	<InteractiveSection tag="Importance des features">
		<DeferredDemo load={() => import('$lib/components/demos/FeatureImportanceChart.svelte')} />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════════════ -->
	<!-- Section 5 : Avantages et synthèse -->
	<!-- ═══════════════════════════════════════════════ -->
	<TheorySection>
		<h2>Avantages des Random Forest</h2>

		<p>
			Le Random Forest est l'un des algorithmes les plus utilisés en pratique grâce à plusieurs
			avantages majeurs :
		</p>

		<div class="advantages-grid">
			<div class="advantage-card">
				<strong>✓ Performance prête à l'emploi</strong>
				Peu d'hyperparamètres à tuner. La valeur par défaut <KatexInline formula={mSym} /> = <KatexInline
					formula={sqrtD}
				/> fonctionne bien dans la plupart des cas.
			</div>
			<div class="advantage-card">
				<strong>✓ Robuste au surajustement</strong>
				L'agrégation de nombreux arbres décorrélatés rend le modèle naturellement régularisé, même avec
				des arbres profonds non-prunés.
			</div>
			<div class="advantage-card">
				<strong>✓ Données mixtes</strong>
				Gère simultanément variables catégorielles et numériques sans normalisation préalable.
			</div>
			<div class="advantage-card">
				<strong>✓ Importance des variables</strong>
				Fournit automatiquement un classement d'importance, utile pour la sélection de features et l'interprétabilité.
			</div>
			<div class="advantage-card">
				<strong>✓ Estimation OOB</strong>
				Les échantillons hors-bag (environ 37% de chaque itération bootstrap) fournissent une estimation
				gratuite de la performance sans validation croisée.
			</div>
			<div class="advantage-card">
				<strong>✓ Parallélisation naturelle</strong>
				Chaque arbre s'entraîne indépendamment — l'entraînement se parallélise parfaitement sur plusieurs
				cœurs.
			</div>
		</div>

		<TheoremBlock number="6.1" title="Convergence asymptotique du Random Forest">
			<p>
				Sous des hypothèses raisonnables (arbres complètement croissants, <KatexInline
					formula={mSym}
				/> &lt; <KatexInline formula={dSym} />, données i.i.d.), l'erreur de généralisation du
				Random Forest converge vers 0 quand le nombre d'arbres tend vers l'infini et la taille des
				données augmente.
			</p>
			<p>
				Ce résultat, démontré par Breiman (2001), repose sur deux propriétés : la consistance des
				estimateurs individuels et la décorrélation induite par la sélection aléatoire de features.
			</p>
		</TheoremBlock>

		<ExercisePanel number="6.2" title="Random Forest vs Bagging pur">
			{#snippet solution()}
				<p>
					Avec <KatexInline formula={mSym} /> = 3 (≈√9), chaque division ne voit que 3 features parmi
					9 — la diversité entre arbres est maximale, réduisant fortement la corrélation moyenne. Avec
					<KatexInline formula={mSym} /> = 9, les meilleurs features dominent systématiquement et les
					arbres sont corrélés comme en bagging pur.
				</p>
			{/snippet}
			<p>
				On dispose d'un jeu de données avec 9 features. Pourquoi <KatexInline formula={mSym} /> = 3 est-il
				préférable à <KatexInline formula={mSym} /> = 9 ? Que se passe-t-il pour la corrélation entre
				arbres dans les deux cas ?
			</p>
		</ExercisePanel>

		<Callout type="summary" title="Retenir">
			<ul>
				<li>
					<strong>Motivation :</strong> Le bagging pur laisse les arbres corrélés — la sélection aléatoire
					de features résout ce problème.
				</li>
				<li>
					<strong>Algorithme :</strong> Bootstrap + sélection de <KatexInline formula={mSym} /> features
					aléatoires à chaque nœud → agrégation par vote/moyenne.
				</li>
				<li>
					<strong>Règle pratique :</strong>
					<KatexInline formula={sqrtD} /> pour la classification, <KatexInline formula={dOver3} /> pour
					la régression.
				</li>
				<li>
					<strong>Valeur ajoutée :</strong> Importance des features (impurity-based ou permutation), estimation
					OOB, robustesse naturelle.
				</li>
			</ul>
		</Callout>
	</TheorySection>

	<!-- ═══════════════════════════════════════════════ -->
	<!-- Bibliographie -->
	<!-- ═══════════════════════════════════════════════ -->
	<Bibliography>
		<BibElement
			authors={['Breiman, L.']}
			year={2001}
			title="Random Forests"
			journal="Machine Learning, 45(1), 5–32."
			link="https://doi.org/10.1023/A:1010933404324"
		/>
		<BibElement
			authors={['Geurts, P.', 'Ernst, D.', 'Wehenkel, L.']}
			year={2006}
			title="Extremely randomized trees"
			journal="Machine Learning, 63(1), 3–42."
			link="https://doi.org/10.1007/s10994-006-6226-1"
		/>
		<BibElement
			authors={['Louppe, G.', 'et al.']}
			year={2013}
			title="Understanding Random Forests: From Theory to Practice"
			journal="arXiv preprint arXiv:1407.7502."
			link="https://arxiv.org/abs/1407.7502"
		/>
	</Bibliography>
</PageTemplate>

<style>
	.algo-block {
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		padding: 1rem 1.25rem;
		margin: 1.25rem 0;
	}

	.algo-block h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		color: var(--color-belief);
	}

	.algo-block ol,
	.algo-block ul {
		padding-left: 1.25rem;
	}

	/* ─── Advantages grid ────────────── */
	.advantages-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.75rem;
		margin: 1rem 0;
	}

	.advantage-card {
		padding: 0.75rem 1rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.advantage-card strong {
		display: block;
		color: var(--color-positive);
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
	}

	@media (max-width: 640px) {
		.advantages-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
