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
	import VarianceReductionDemo from '$lib/components/demos/VarianceReductionDemo.svelte';
	import EnsembleBoundaryVisualizer from '$lib/components/demos/EnsembleBoundaryVisualizer.svelte';
	import BootstrapSampler from '$lib/components/demos/BootstrapSampler.svelte';
	import BaggingConvergence from '$lib/components/demos/BaggingConvergence.svelte';
	import OOBErrorTracker from '$lib/components/demos/OOBErrorTracker.svelte';
	import { getPageByPath, getNextPage, getPrevPage, type PageMeta } from '$lib/navigation.js';
	import { createPageTracker } from '$lib/stores/progress.svelte';

	const meta = getPageByPath('/part2/lesson1');
	const tracker = createPageTracker(meta as PageMeta);
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	$effect(() => {
		tracker.trackInteraction();
	});

	// ── Formula variables (stored in script so Svelte never parses backslashes) ──

	// Core objects
	const calX = '\\mathcal{X}';
	const calY = '\\mathcal{Y}';
	const xyInXY = 'X, Y \\in \\mathcal{X} \\times \\mathcal{Y}';
	const PJoint = '\\mathbb{P}';
	const hMap = 'h: \\mathcal{X} \\to \\mathcal{Y}';
	const snDef = 'S_n = \\{(X_i, Y_i)\\}_{i=1}^n \\sim \\mathbb{P}^n';

	// Empirical risk
	const empRiskBlock = 'L_n(h) = \\frac{1}{n}\\sum_{i=1}^{n} \\ell\\bigl(h(X_i), Y_i\\bigr)';
	const ellSym = '\\ell';

	// Theorem 5.1 — Variance reduction
	const predictorsFamily = '\\{y_j\\}_{j=1}^m';
	const aggAvg = '\\hat{y}(x) = \\frac{1}{m}\\sum_{j=1}^{m} y_j(x)';
	const predictorModel = '\\hat{y}_j(x) = y(x) + \\varepsilon_j';
	const epsCentered = '\\mathbb{E}[\\varepsilon_j] = 0';
	const varEq1 =
		'\\mathbb{E}\\Bigl[\\bigl(y(X) - \\tfrac{1}{m}\\sum_{j=1}^{m} \\hat{y}_j(X)\\bigr)^2\\Bigr] = \\mathbb{E}\\Bigl[(\\tfrac{1}{m}\\sum_{j=1}^{m} \\varepsilon_j\\bigr)^2\\Bigr]';
	const epsIndependant = '\\mathbb{E}[\\varepsilon_j \\varepsilon_k] = 0';
	const jneqk = 'j \\neq k';
	const varReduced =
		'\\mathbb{E}\\Bigl[\\bigl(\\tfrac{1}{m}\\sum_{j=1}^{m} \\varepsilon_j\\bigr)^2\\Bigr] = \\frac{1}{m}\\,\\mathbb{E}[\\varepsilon^2]';
	const mSym = 'm';

	// Majority voting
	const modelsFamily = '\\{h_j\\}_{j=1}^m';
	const majorityVoteBlock =
		'\\hat{y}(x) = \\underset{c \\in \\mathcal{Y}}{\\arg\\max}\\; \\sum_{j=1}^{m} \\mathbb{1}[h_j(x) = c]';
	const indicatorFn = '\\mathbb{1}[\\cdot]';

	// Average regression
	const avgRegBlock = '\\hat{y}(x) = \\frac{1}{m}\\sum_{j=1}^{m} h_j(x)';

	// Error threshold exercise
	const errLtHalf = 'e < 0.5';

	// BMA
	const mSymCap = 'M';
	const modelFamilyCal = '\\{\\mathcal{M}_j\\}_{j=1}^M';
	const bmaBlock =
		'p(y|x, \\mathcal{D}) = \\sum_{j=1}^{M} p(y|x, \\mathcal{M}_j, \\mathcal{D})\\; p(\\mathcal{M}_j | \\mathcal{D})';
	const predModelJ = 'p(y|x, \\mathcal{M}_j, \\mathcal{D})';
	const posteriorWeight = 'p(\\mathcal{M}_j | \\mathcal{D})';
	const modelIndex = 'j';
	const bayesPosterior =
		'p(\\mathcal{M}_j | \\mathcal{D}) = \\frac{p(\\mathcal{D} | \\mathcal{M}_j)\\; p(\\mathcal{M}_j)}{\\sum_{k=1}^{M} p(\\mathcal{D} | \\mathcal{M}_k)\\; p(\\mathcal{M}_k)}';
	const likelihoodJ = 'p(\\mathcal{D} | \\mathcal{M}_j)';
	const priorJ = 'p(\\mathcal{M}_j)';
	const logPosteriorBlock =
		'\\log p(\\mathcal{M}_j | \\mathcal{D}) = \\log p(\\mathcal{D} | \\mathcal{M}_j) + \\log p(\\mathcal{M}_j) - \\log\\sum_{k=1}^{M} e^{\\log p(\\mathcal{D} | \\mathcal{M}_k) + \\log p(\\mathcal{M}_k)}';
	const logLikelihood =
		'\\log p(\\mathcal{D} | \\mathcal{M}_j) = \\sum_{i=1}^n \\log p(y_i | x_i, \\mathcal{M}_j)';

	// Bootstrap
	const snDefShort = 'S_n = \\{(X_i, Y_i)\\}_{i=1}^n';
	const nSym = 'n';
	const sBoot = 'S_n^*';
	const inclPct = '(1 - 1/e) \\approx 63.2\\%';
	const oobPct = '1/e \\approx 36.8\\%';
	const oneMinusOneOverN = '1 - 1/n';
	const probNotSelected = '(1 - 1/n)^n \\to e^{-1} \\approx 0.368';

	// Algorithm
	const snShort = 'S_n';
	const algoA = '\\mathcal{A}';
	const jLoop = 'j = 1, \\dots, M';
	const bootSampleJ = 'S_n^{(j)}';
	const modelTrained = 'h_j = \\mathcal{A}(S_n^{(j)})';

	// Theorem 5.2 — Bagging variance
	const sigmaSq = '\\sigma^2';
	const sigmaReduction = '\\sigma^2 / M';

	// OOB
	const xiYi = '(x_i, y_i)';
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Méthodes ensemblistes et Bagging'}
	subtitle="Partie II — Régularisation"
	prev={prevMeta}
	next={nextMeta}
>
	<!-- SECTION 1: INTRODUCTION -->
	<TheorySection>
		<h2>Introduction aux méthodes ensemblistes</h2>
		<p>
			Les méthodes ensemblistes constituent l'une des approches les plus efficaces en apprentissage
			automatique. L'idée fondamentale est simple : <strong
				>combiner plusieurs modèles pour obtenir de meilleures performances qu'avec un modèle unique</strong
			>.
		</p>

		<h3>Cadre théorique</h3>
		Soit <KatexInline formula={calX} /> notre espace d'entrée et <KatexInline formula={calY} /> notre
		espace de sortie. Soit <KatexInline formula={xyInXY} /> deux variables aléatoires et soit <KatexInline
			formula={PJoint}
		/> leur mesure jointe. Notre objectif est de trouver une application <KatexInline
			formula={hMap}
		/> qui minimise une certaine erreur que nous noterons <KatexInline formula="L" />.
		<p>
			N'ayant pas accès aux variables aléatoires, nous collectons un jeu de données <KatexInline
				formula={snDef}
			/> et construisons le risque empirique :
		</p>
		<KatexBlock formula={empRiskBlock} />
		<p>
			où <KatexInline formula={ellSym} /> définit une erreur élémentaire pour une unique prédiction.
		</p>

		<h3>Motivation théorique — Réduction de variance</h3>
		<TheoremBlock number="5.1" title="Réduction de variance par agrégation">
			<p>
				Considérons une famille de prédicteurs <KatexInline formula={predictorsFamily} /> et leur agrégation
				:
			</p>
			<KatexBlock formula={aggAvg} />
			<p>
				Si chaque prédicteur vérifie <KatexInline formula={predictorModel} /> où <KatexInline
					formula="\varepsilon_j"
				/> est un bruit centré (<KatexInline formula={epsCentered} />), alors :
			</p>
			<KatexBlock formula={varEq1} />
			<p>
				Si de plus les erreurs sont indépendantes (<KatexInline formula={epsIndependant} /> pour <KatexInline
					formula={jneqk}
				/>), alors :
			</p>
			<KatexBlock formula={varReduced} />
			<p>La variance est <strong>réduite d'un facteur <KatexInline formula={mSym} /></strong> !</p>
		</TheoremBlock>

		<Callout type="warning" title="Remarque cruciale">
			<p>
				Cette réduction de variance n'est effective que si les modèles font des erreurs <strong
					>complémentaires</strong
				>. Si tous les modèles se trompent de la même manière, l'agrégation n'apporte rien.
			</p>
		</Callout>

		<InteractiveSection tag="Variance par agrégation">
			<VarianceReductionDemo />
		</InteractiveSection>
	</TheorySection>

	<!-- SECTION 2: APPROCHE NAÏVE -->
	<TheorySection>
		<h2>L'approche naïve : combiner plusieurs modèles</h2>
		<p>
			L'approche la plus simple pour combiner plusieurs modèles consiste à moyenner leurs
			prédictions ou à prendre le vote majoritaire.
		</p>

		<DefinitionBlock number="5.1" title="Vote majoritaire">
			<p>
				Pour un problème de classification avec <KatexInline formula={mSym} /> modèles <KatexInline
					formula={modelsFamily}
				/>, la prédiction finale est :
			</p>
			<KatexBlock formula={majorityVoteBlock} />
			<p>où <KatexInline formula={indicatorFn} /> est la fonction indicatrice.</p>
		</DefinitionBlock>

		<InteractiveSection tag="Frontières de décision">
			<EnsembleBoundaryVisualizer />
		</InteractiveSection>

		<DefinitionBlock number="5.2" title="Moyenne pour la régression">
			<p>
				Pour un problème de régression avec <KatexInline formula={mSym} /> modèles <KatexInline
					formula={modelsFamily}
				/>, la prédiction finale est :
			</p>
			<KatexBlock formula={avgRegBlock} />
		</DefinitionBlock>

		<h3>Conditions de succès</h3>
		<p>L'agrégation naïve fonctionne bien si trois conditions sont satisfaites :</p>
		<ol>
			<li><strong>Diversité</strong> : Les modèles font des erreurs différentes.</li>
			<li><strong>Qualité individuelle</strong> : Chaque modèle est meilleur que le hasard.</li>
			<li><strong>Indépendance</strong> : Les erreurs sont décorrélées.</li>
		</ol>

		<Callout type="warning" title="Attention">
			<p>
				Si tous les modèles se trompent sur les mêmes exemples, l'agrégation n'améliore rien ! Le
				défi principal est donc de <strong>créer de la diversité</strong> entre les modèles.
			</p>
		</Callout>

		<ExercisePanel number="5.1" title="Majorité vs Individu">
			{#snippet solution()}
				<p>
					Implémentez une classe qui combine plusieurs classifieurs par vote majoritaire et comparez
					son accuracy avec celle du meilleur individu.
				</p>
			{/snippet}
			<p>
				Démontrez que le vote majoritaire améliore la précision quand chaque classifieur individuel
				a un taux d'erreur <KatexInline formula={errLtHalf} /> et que les erreurs sont indépendantes.
			</p>
		</ExercisePanel>
	</TheorySection>

	<!-- SECTION 3: BAYESIAN MODEL AVERAGING -->
	<TheorySection>
		<h2>Bayesian Model Averaging (BMA)</h2>
		<p>
			L'approche bayésienne permet de pondérer les modèles selon leur vraisemblance a posteriori
			plutôt que de leur donner tous le même poids.
		</p>

		<DefinitionBlock number="5.3" title="Bayesian Model Averaging">
			<p>
				Soit une famille de <KatexInline formula={mSymCap} /> modèles probabilistes <KatexInline
					formula={modelFamilyCal}
				/>. Pour une nouvelle observation <KatexInline formula="x" />, la prédiction BMA est :
			</p>
			<KatexBlock formula={bmaBlock} />
			<p>où :</p>
			<ul>
				<li>
					<KatexInline formula={predModelJ} /> : prédiction du modèle <KatexInline
						formula={modelIndex}
					/> conditionnellement aux données
				</li>
				<li>
					<KatexInline formula={posteriorWeight} /> : probabilité a posteriori du modèle <KatexInline
						formula={modelIndex}
					/>
				</li>
			</ul>
		</DefinitionBlock>

		<h3>Calcul des poids a posteriori</h3>
		<p>La probabilité a posteriori de chaque modèle se calcule via la règle de Bayes :</p>
		<KatexBlock formula={bayesPosterior} />
		<p>
			où <KatexInline formula={likelihoodJ} /> est la vraisemblance des données sous le modèle <KatexInline
				formula={modelIndex}
			/>, et <KatexInline formula={priorJ} /> la probabilité a priori (souvent uniforme).
		</p>

		<Callout type="intuition" title="Implémentation pratique">
			<p>
				En pratique, on travaille avec les log-probabilités pour éviter les problèmes numériques :
			</p>
			<KatexBlock formula={logPosteriorBlock} />
		</Callout>

		<ExercisePanel number="5.2" title="BMA pour la classification">
			{#snippet solution()}
				<p>
					Pour un modèle probabiliste, la log-vraisemblance est <KatexInline
						formula={logLikelihood}
					/>.
				</p>
			{/snippet}
			<p>
				Implémentez un classifieur BMA qui pondère les prédictions de plusieurs modèles selon leur
				log-vraisemblance sur les données d'entraînement.
			</p>
		</ExercisePanel>

		<Callout type="summary" title="Avantages et limites du BMA">
			<ul>
				<li><strong>✓</strong> Prise en compte rigoureuse de l'incertitude sur les modèles</li>
				<li><strong>✓</strong> Poids adaptatifs selon les performances</li>
				<li>
					<strong>✗</strong> Nécessite des modèles probabilistes (qui sortent des distributions)
				</li>
				<li><strong>✗</strong> Sensible au choix des a priori</li>
			</ul>
		</Callout>
	</TheorySection>

	<!-- SECTION 4: BAGGING -->
	<TheorySection>
		<h2>Bagging (Bootstrap Aggregating)</h2>
		<p>
			La difficulté principale avec l'agrégation naïve est que pour une classe de modèles donnée, un
			même jeu d'apprentissage produit la même solution. Le <strong>bagging</strong> résout ce problème
			en créant de la variabilité via des échantillons bootstrap.
		</p>

		<DefinitionBlock number="5.4" title="Échantillon Bootstrap">
			<p>
				Soit <KatexInline formula={snDefShort} /> un jeu de données de taille <KatexInline
					formula={nSym}
				/>. Un échantillon bootstrap <KatexInline formula={sBoot} /> est obtenu en tirant <KatexInline
					formula={nSym}
				/> points aléatoirement <strong>avec remise</strong> dans <KatexInline formula={snShort} />.
			</p>
			<p><strong>Propriétés clés :</strong></p>
			<ul>
				<li>Certains points apparaissent plusieurs fois</li>
				<li>Environ <KatexInline formula={inclPct} /> des points originaux sont présents</li>
				<li>Environ <KatexInline formula={oobPct} /> des points sont absents (out-of-bag)</li>
			</ul>
		</DefinitionBlock>

		<InteractiveSection tag="Échantillonnage Bootstrap">
			<BootstrapSampler />
		</InteractiveSection>

		<Callout type="intuition" title="Pourquoi 63.2% ?">
			<p>
				La probabilité qu'un point donné ne soit pas sélectionné lors d'un tirage est <KatexInline
					formula={oneMinusOneOverN}
				/>. Après <KatexInline formula={nSym} /> tirages indépendants, cette probabilité devient <KatexInline
					formula={probNotSelected}
				/>. Donc environ 63.2% des points sont inclus au moins une fois.
			</p>
		</Callout>

		<div class="algo-block">
			<h3>Algorithme du Bagging</h3>
			<p>
				<strong>Entrée :</strong> Jeu de données <KatexInline formula={snShort} />, algorithme
				d'apprentissage <KatexInline formula={algoA} />, nombre de modèles <KatexInline
					formula={mSymCap}
				/>
			</p>
			<ol>
				<li>Pour chaque <KatexInline formula={jLoop} /> :</li>
				<ul>
					<li>
						Générer un échantillon bootstrap <KatexInline formula={bootSampleJ} /> à partir de <KatexInline
							formula={snShort}
						/>
					</li>
					<li>Entraîner un modèle <KatexInline formula={modelTrained} /></li>
				</ul>
				<li>
					<strong>Sortie :</strong> Prédiction agrégée par moyenne (régression) ou vote majoritaire (classification)
				</li>
			</ol>
		</div>

		<InteractiveSection tag="Convergence du Bagging">
			<BaggingConvergence />
		</InteractiveSection>

		<TheoremBlock number="5.2" title="Réduction de variance par bagging">
			<p>
				Si les modèles de base ont une variance <KatexInline formula={sigmaSq} /> et sont décorrélés,
				alors le modèle baggé a une variance <KatexInline formula={sigmaReduction} />
			</p>
			<p>
				En pratique, les modèles ne sont pas totalement décorrélés, mais le bagging réduit
				significativement la variance pour les modèles <strong>instables</strong> (arbres de décision,
				réseaux de neurones).
			</p>
		</TheoremBlock>

		<Callout type="intuition" title="Intuition clé">
			<p>
				Le bagging stabilise les algorithmes <strong>instables</strong> — ceux qui changent beaucoup avec
				de petites variations des données. Il n'aide en revanche pas les algorithmes déjà stables (comme
				la régression linéaire).
			</p>
		</Callout>

		<h3>Out-of-Bag (OOB) Error</h3>
		<DefinitionBlock number="5.5" title="Out-of-Bag Error">
			<p>
				Pour chaque exemple <KatexInline formula={xiYi} />, on peut évaluer la prédiction en
				utilisant seulement les modèles pour lesquels cet exemple n'était pas dans l'échantillon
				bootstrap correspondant.
			</p>
			<p>
				L'erreur OOB fournit une estimation non biaisée de l'erreur de généralisation <strong
					>sans ensemble de validation séparé</strong
				>.
			</p>
		</DefinitionBlock>

		<InteractiveSection tag="Erreur Out-of-Bag">
			<OOBErrorTracker />
		</InteractiveSection>

		<ExercisePanel number="5.3" title="Bagging vs Arbre seul">
			{#snippet solution()}
				<p>
					Avec 100 arbres baggés, on observe typiquement une réduction significative de la variance
					des prédictions comparée à un arbre unique.
				</p>
			{/snippet}
			<p>
				Comparez les performances d'un arbre de décision seul vs un modèle baggé avec 100 arbres.
				Observez la différence de variance et de précision.
			</p>
		</ExercisePanel>

		<Callout type="summary" title="Retenir">
			<ul>
				<li>
					Le <strong>bagging</strong> crée de la diversité via le bootstrap (échantillonnage avec remise)
				</li>
				<li>
					Il est particulièrement efficace pour les modèles <strong>instables</strong> à haute variance
				</li>
				<li>L'erreur OOB offre une estimation gratuite de la généralisation</li>
				<li>Le gain dépend du degré de <strong>décorrélation</strong> entre les modèles de base</li>
			</ul>
		</Callout>
	</TheorySection>

	<!-- BIBLIOGRAPHY -->
	<Bibliography>
		<BibElement
			authors={['Breiman, L.']}
			year={1996}
			title="Bagging Predictors"
			journal="Machine Learning."
			link="https://doi.org/10.1007/BF00058655"
		/>
		<BibElement
			authors={['Breiman, L.']}
			year={2001}
			title="Random Forests"
			journal="Machine Learning."
			link="https://doi.org/10.1023/A:1010933404324"
		/>
		<BibElement
			authors={['Hastie, T., Tibshirani, R., Friedman, J.']}
			year={2009}
			title="The Elements of Statistical Learning"
			journal="Springer."
			link="https://hastie.su.domains/Papers/ESLII.pdf"
		/>
	</Bibliography>
</PageTemplate>

<style>
	.algo-block {
		background: var(--color-surface-raised);
		border-left: 3px solid var(--color-belief);
		padding: 1rem 1.25rem;
		margin: 1rem 0;
		border-radius: 4px;
	}

	.algo-block h3 {
		margin-top: 0;
	}

	.algo-block ol {
		padding-left: 1.5rem;
	}
</style>
