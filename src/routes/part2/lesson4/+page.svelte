<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import InteractiveSection from '$lib/components/narrative/InteractiveSection.svelte';
	import DefinitionBlock from '$lib/components/narrative/DefinitionBlock.svelte';
	import ExercisePanel from '$lib/components/narrative/ExercisePanel.svelte';
	import ExpertPanel from '$lib/components/narrative/ExpertPanel.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';

	// Demo components
	import BiasVarianceDecomposition from '$lib/components/demos/BiasVarianceDecomposition.svelte';
	import RegularizationContour from '$lib/components/demos/RegularizationContour.svelte';
	import LassoPathExplorer from '$lib/components/demos/LassoPathExplorer.svelte';
	import ElasticNetBlend from '$lib/components/demos/ElasticNetBlend.svelte';
	import ShrinkageFactorDemo from '$lib/components/demos/ShrinkageFactorDemo.svelte';
	import CrossValidationSelector from '$lib/components/demos/CrossValidationSelector.svelte';

	import { getPageByPath, getNextPage, getPrevPage, type PageMeta } from '$lib/navigation.js';
	import { createPageTracker } from '$lib/stores/progress.svelte';

	const meta = getPageByPath('/part2/lesson4');
	const tracker = createPageTracker(meta as PageMeta);
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	$effect(() => {
		tracker.trackInteraction();
	});

	// ── Formula variables (stored in script so Svelte never parses backslashes) ──

	// General regularized objective
	const generalObjective = '\\mathcal{L}(w) = \\frac{1}{n}\\|y - Xw\\|^2_2 + \\lambda \\, R(w)';

	// Bias-variance decomposition
	const biasVarianceDecomp =
		'\\mathbb{E}[(y - \\hat{y})^2] = \\operatorname{Bias}^2(\\hat{f}(x)) + \\operatorname{Var}(\\hat{f}(x)) + \\sigma^2';

	// Ridge objective
	const ridgeObjective = '\\min_{w} \\; \\|y - Xw\\|^2_2 + \\lambda \\, \\|w\\|^2_2';

	// Ridge closed-form solution
	const ridgeSolution = 'w^{*}_{\\text{Ridge}} = (X^T X + \\lambda I)^{-1} X^T y';

	// Ridge in eigen-directions
	const ridgeEigenform =
		'\\hat{w}_i^{\\text{Ridge}} = \\frac{d_i}{d_i + \\lambda} \\; \\hat{w}_i^{\\text{OLS}}';

	// Shrinkage factor
	const shrinkageFactor = 'S_i(\\lambda) = \\frac{d_i}{d_i + \\lambda}';

	// Lasso objective
	const lassoObjective = '\\min_{w} \\; \\|y - Xw\\|^2_2 + \\lambda \\, \\|w\\|_1';

	// Soft-thresholding operator
	const softThreshold = 'S(w, \\lambda) = \\operatorname{sign}(w) \\cdot \\max(|w| - \\lambda, 0)';

	// Lasso with orthonormal features
	const lassoOrtho =
		'\\hat{w}_i^{\\text{Lasso}} = \\operatorname{sign}(\\hat{w}_i^{\\text{OLS}}) \\cdot \\max\\bigl(|\\hat{w}_i^{\\text{OLS}}| - \\lambda, 0\\bigr)';

	// Elastic Net objective
	const elasticNetObjective =
		'\\min_{w} \\; \\|y - Xw\\|^2_2 + \\lambda \\alpha \\, \\|w\\|_1 + \\frac{\\lambda(1-\\alpha)}{2}\\|w\\|^2_2';

	// Cross-validation error
	const cvError =
		'\\operatorname{CV}(\\lambda) = \\frac{1}{K} \\sum_{k=1}^{K} \\frac{1}{n_k} \\sum_{i \\in \\text{fold}_k} (y_i - \\hat{f}_{-k}(x_i))^2';

	// Lambda opt
	const lambdaOpt =
		'\\hat{\\lambda}_{\\text{opt}} = \\operatorname*{arg\\,min}_{\\lambda} \\; \\operatorname{CV}(\\lambda)';

	// One standard error rule
	const oneSeRule =
		'\\hat{\\lambda}_{1se} = \\max \\bigl\\{ \\lambda : \\operatorname{CV}(\\lambda) \\leq \\operatorname{CV}(\\hat{\\lambda}_{\\text{opt}}) + s_{\\text{opt}} \\bigr\\}';

	// Ridge constraint geometry
	const ridgeConstraint = '\\sum_{i=1}^{d} w_i^2 \\leq t';

	// Lasso constraint geometry
	const lassoConstraint = '\\sum_{i=1}^{d} |w_i| \\leq t';

	// Coordinate descent update for Lasso
	const coordDescentUpdate = 'w_j^{(k+1)} = \\frac{S\\bigl(z_j, \\lambda\\bigr)}{X_j^T X_j}';

	// z_j in coordinate descent
	const zJ = 'z_j = X_j^T (y - \\sum_{i \\neq j} X_i w_i^{(k)})';

	// Elastic net alpha limits
	const alphaPureLasso = '\\alpha = 1 \\;\\Rightarrow\\; \\text{Lasso pur}';
	const alphaPureRidge = '\\alpha = 0 \\;\\Rightarrow\\; \\text{Ridge pur}';

	// Exercise formulas
	const exW_ols = 'w^{OLS} = \\begin{pmatrix} 3.0 \\\\ -1.5 \\\\ 0.8 \\end{pmatrix}';
	const exLambdaVal = '\\lambda = 1.0';
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Régularisation L1/L2/Elastic Net'}
	subtitle="Partie II — Régularisation"
	prev={prevMeta}
	next={nextMeta}
>
	<!-- ═══════════════════════════════════════════ -->
	<!-- SECTION 1 : Introduction & Bias-Variance   -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Introduction à la régularisation</h2>

		<p>
			Lorsque le nombre de variables <strong>p</strong> approche ou dépasse celui des observations
			<strong>n</strong>, le modèle risque de s'ajuster à du bruit plutôt qu'au signal réel. On
			observe alors un phénomène d'<em>overfitting</em>, caractérisé par une excellente performance
			sur les données d'entraînement mais une capacité de généralisation très faible. La
			<strong>régularisation</strong> est la technique fondamentale qui permet de contrôler ce compromis
			entre biais et variance.
		</p>

		<h3>Décomposition biais-variance</h3>

		<p>
			Pour comprendre pourquoi la régularisation fonctionne, il faut d'abord rappeler la
			décomposition classique de l'erreur quadratique moyenne attendue :
		</p>

		<KatexBlock formula={biasVarianceDecomp} />

		<p>
			Où <strong>Biais</strong> mesure à quel point notre estimateur est systématiquement éloigné de
			la vérité,
			<strong>Variance</strong> mesure sa sensibilité aux fluctuations des données d'entraînement,
			et
			<KatexInline formula={'\\sigma^2'} /> est le bruit irréductible. La régularisation agit en augmentant
			légèrement le biais pour réduire drastiquement la variance — ce qui, dans l'ensemble, diminue l'erreur
			totale.
		</p>

		<h3>Forme générale d'un problème régularisé</h3>

		<p>
			On ajoute à la perte empirique un terme de pénalité <em>R(w)</em>, pondéré par le paramètre de
			régularisation
			<KatexInline formula={'\\lambda \\geq 0'} /> :
		</p>

		<KatexBlock formula={generalObjective} />

		<p>
			Les choix les plus courants pour R(w) sont la norme L2 (Ridge), la norme L1 (Lasso), ou une
			combinaison des deux (Elastic Net). Le paramètre <KatexInline formula={'\\lambda'} /> contrôle l'intensité
			de la régularisation : plus il est élevé, plus les coefficients sont contraints vers zéro.
		</p>

		<Callout type="intuition" title="Pourquoi régulariser ?">
			<p>
				Penser à la régularisation comme un <strong>prior statistique</strong>. Le terme L2 impose
				implicitement que les coefficients sont petits (a priori gaussiens), tandis que le terme L1
				impose qu'ils sont rares (a priori de Laplace). En limitant l'espace des solutions
				possibles, on réduit la variance sans augmenter trop le biais.
			</p>
		</Callout>

		<InteractiveSection tag="Démo 8.1 — Décomposition biais-variance">
			<BiasVarianceDecomposition />
		</InteractiveSection>
	</TheorySection>

	<!-- ═══════════════════════════════════════════ -->
	<!-- SECTION 2 : Ridge Regression (L2)          -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Ridge Regression (Régularisation L2)</h2>

		<p>
			Introduite par Hoerl &amp; Kennard en 1970, la <strong>Ridge Regression</strong> ajoute une pénalité
			quadratique sur les coefficients. C'est la forme de régularisation la plus classique et elle dispose
			d'une solution fermée élégante.
		</p>

		<DefinitionBlock number="8.1" title="Ridge Regression">
			<p>
				Soit <KatexInline formula={'y \\in \\mathbb{R}^n'} /> le vecteur réponse et
				<KatexInline formula={'X \\in \\mathbb{R}^{n \\times p}'} /> la matrice de design. Le solveur
				Ridge minimise :
			</p>
			<KatexBlock formula={ridgeObjective} />
			<p>
				où <KatexInline formula={'\\lambda > 0'} /> est le paramètre de régularisation. La contrainte
				équivalente en formulation bornée est :
			</p>
			<KatexBlock formula={ridgeConstraint} />
		</DefinitionBlock>

		<h3>Solution fermée</h3>

		<p>Deriver l'objectif par rapport à w et égaliser à zéro donne une solution analytique :</p>

		<KatexBlock formula={ridgeSolution} />

		<p>
			Cette formule est valable même lorsque <KatexInline formula={'X^T X'} /> est singulière (ce qui
			arrive quand p > n). Le terme <KatexInline formula={'\\lambda I'} /> garantit que la matrice à inverser
			est toujours définie positive.
		</p>

		<h3>Interprétation géométrique</h3>

		<p>
			Dans l'espace des coefficients, les courbes de niveau de la fonction MSE sont des ellipses
			centrées sur le solveur OLS. La contrainte Ridge est un <strong>cercle</strong> (en 2D) centré
			à l'origine. La solution Ridge est le point de contact entre l'ellipse de MSE minimale et le
			disque de contrainte. Plus <KatexInline formula={'\\lambda'} /> augmente, plus le cercle rétrécit,
			forçant les coefficients vers zéro sans jamais les atteindre exactement.
		</p>

		<InteractiveSection tag="Démo 8.2 — Contours de régularisation">
			<RegularizationContour />
		</InteractiveSection>

		<h3>Réduction dans les directions propres</h3>

		<p>
			Si on exprime le problème dans la base des vecteurs propres de <KatexInline
				formula={'X^T X'}
			/> avec valeurs propres
			<KatexInline formula={'d_1 \\geq d_2 \\geq \\dots \\geq d_p > 0'} />, chaque direction est
			affectée indépendamment par un facteur de rétrécissement :
		</p>

		<KatexBlock formula={ridgeEigenform} />

		<p>Le facteur de rétrécissement pour la direction i est :</p>

		<KatexBlock formula={shrinkageFactor} />

		<p>
			Ce facteur vaut 1 quand <KatexInline formula={'\\lambda = 0'} /> (solution OLS inchangée) et tend
			vers 0 quand
			<KatexInline formula={'\\lambda \\to +\\infty'} />. Les directions avec de petites valeurs
			propres sont plus fortement réduites, ce qui stabilise l'inversion matricielle.
		</p>

		<InteractiveSection tag="Démo 8.5 — Facteurs de rétrécissement">
			<ShrinkageFactorDemo />
		</InteractiveSection>

		<Callout type="summary" title="Ridge en résumé">
			<ul>
				<li><strong>Solution fermée :</strong> toujours calculable via la formule matricielle</li>
				<li>
					<strong>Rétrécissement uniforme :</strong> réduit tous les coefficients vers zéro mais ne les
					annule jamais
				</li>
				<li>
					<strong>Idéal quand :</strong> beaucoup de variables sont corrélées et toutes contribuent à
					la prédiction
				</li>
			</ul>
		</Callout>
	</TheorySection>

	<!-- ═══════════════════════════════════════════ -->
	<!-- SECTION 3 : Lasso Regression (L1)          -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Lasso Regression (Régularisation L1)</h2>

		<p>
			Proposé par <strong>Tibshirani en 1996</strong>, le Lasso (<em
				>Least Absolute Shrinkage and Selection Operator</em
			>) remplace la norme L2 par une norme L1. Cette modification apparemment mineure change
			radicalement les propriétés de la solution : contrairement à Ridge, le Lasso peut produire des
			coefficients
			<strong>exactement nuls</strong>, offrant ainsi une
			<strong>sélection automatique de variables</strong>.
		</p>

		<DefinitionBlock number="8.2" title="Lasso Regression">
			<p>Le solveur Lasso minimise l'objectif suivant :</p>
			<KatexBlock formula={lassoObjective} />
			<p>La contrainte équivalente en formulation bornée est :</p>
			<KatexBlock formula={lassoConstraint} />
		</DefinitionBlock>

		<h3>L'opérateur de seuillage doux (soft-thresholding)</h3>

		<p>
			Dans le cas où les colonnes de X sont orthonormales, le Lasso se résout analytiquement grâce à
			l'opérateur de soft-thresholding :
		</p>

		<KatexBlock formula={softThreshold} />

		<p>Et la solution Lasso s'écrit :</p>

		<KatexBlock formula={lassoOrtho} />

		<p>
			Contrairement à Ridge qui multiplie par un facteur <KatexInline formula={'S_i(\\lambda)'} />,
			le Lasso <strong>soustrait</strong> une constante <KatexInline formula={'\\lambda'} />. Une
			fois qu'un coefficient franchi le seuil <KatexInline formula={'|w^{OLS}| \\leq \\lambda'} />,
			il devient exactement zéro et reste nul pour tout
			<KatexInline formula={'\\lambda'} /> supérieur. C'est ce mécanisme qui permet la sélection de variables.
		</p>

		<h3>Interprétation géométrique : pourquoi L1 produit-il des zéros ?</h3>

		<Callout type="intuition" title="L'argument géométrique de la sparsité">
			<p>
				La contrainte L1 forme un <strong>diamant</strong> (en 2D) dont les coins sont situés sur
				les axes. Les courbes de niveau du MSE sont des ellipses. Le point d'optimalité est
				l'endroit où l'ellipse touche premièrement le diamant. Comme ce diamant a des
				<em>sommets</em>, il y a une probabilité non nulle que le contact se produise exactement sur
				un sommet, c'est-à-dire sur un coin où un coefficient est exactement zéro. Avec Ridge
				(cercle lisse), cela ne peut pas arriver — le contact se fait toujours sur une arête courbe,
				produisant deux coefficients non nuls.
			</p>
		</Callout>

		<h3>Résolution par descente de coordonnées</h3>

		<p>
			Lorsque les colonnes de X ne sont pas orthonormales, il n'existe pas de solution fermée.
			L'algorithme standard repose sur la <strong>descente de coordonnées</strong>, qui met à jour
			chaque coefficient individuellement en projetant sur l'opérateur de soft-thresholding :
		</p>

		<KatexBlock formula={coordDescentUpdate} />

		<p>
			Où <KatexInline formula={'X_j'} /> est la j-ième colonne de X et z<sub>j</sub> représente la corrélation
			partielle :
		</p>

		<KatexBlock formula={zJ} />

		<p>
			L'algorithme itère sur toutes les coordonnées jusqu'à convergence. À chaque étape, le
			soft-thresholding garantit que les petits coefficients sont éliminés.
		</p>

		<InteractiveSection tag="Démo 8.3 — Parcours des coefficients Lasso">
			<LassoPathExplorer />
		</InteractiveSection>

		<Callout type="warning" title="Quand le Lasso peut faire fausse route">
			<p>
				Si deux variables sont fortement corrélées, le Lasso a tendance à en sélectionner <strong
					>une seule</strong
				> de manière quasi aléatoire. Cela peut rendre la solution instable et peu interprétable. De plus,
				quand p > n, le Lasso ne sélectionne au maximum que n variables.
			</p>
		</Callout>
	</TheorySection>

	<!-- ═══════════════════════════════════════════ -->
	<!-- SECTION 4 : Elastic Net (L1 + L2 blend)    -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Elastic Net (Mélange L1 et L2)</h2>

		<p>
			L'<strong>Elastic Net</strong>, proposé par Zou &amp; Hastie en 2005, combine les avantages de
			Ridge et du Lasso dans un seul modèle. Elle résout deux limites du Lasso : la sélection
			instable face à des variables corrélées, et la limitation à n variables quand p > n.
		</p>

		<DefinitionBlock number="8.3" title="Elastic Net">
			<p>L'objectif Elastic Net est :</p>
			<KatexBlock formula={elasticNetObjective} />
			<p>
				Où <KatexInline formula={'\\lambda \\geq 0'} /> contrôle la force globale de la régularisation
				et
				<KatexInline formula={'\\alpha \\in [0,1]'} /> contrôle le mélange entre L1 et L2 :
			</p>
		</DefinitionBlock>

		<p>Les cas limites correspondent aux méthodes classiques :</p>

		<ul>
			<li><KatexInline formula={alphaPureLasso} /></li>
			<li><KatexInline formula={alphaPureRidge} /></li>
		</ul>

		<h3>Pourquoi combiner L1 et L2 ?</h3>

		<p>Le terme L2 joue deux rôles complémentaires au terme L1 :</p>

		<ol>
			<li>
				<strong>Sélection de variables (L1) :</strong> le composant L1 produit des zéros exacts, offrant
				une sélection automatique et un modèle parcimonieux
			</li>
			<li>
				<strong>Stabilité face à la corrélation (L2) :</strong> le composant L2 groupe les variables fortement
				corrélées avec des coefficients similaires, au lieu de choisir arbitrairement une seule
			</li>
		</ol>

		<p>
			Dans la pratique, l'Elastic Net est souvent préférable aux deux méthodes séparées. Le
			paramètre <KatexInline formula={'\\alpha'} /> permet d'ajuster le compromis en fonction de la structure
			des données : on choisira un <KatexInline formula={'\\alpha'} /> proche de 1 quand les variables
			sont peu corrélées, et plus faible quand elles le sont.
		</p>

		<InteractiveSection tag="Démo 8.4 — Mélange Elastic Net">
			<ElasticNetBlend />
		</InteractiveSection>

		<ExpertPanel title="Conseil pratique : Elastic Net par défaut">
			<p>
				Dans de nombreux cas pratiques, l'Elastic Net avec <KatexInline
					formula={'\\alpha \\approx 0.1'}
				/> est un bon point de départ. La petite composante L2 garantit que la matrice reste bien conditionnée,
				même quand des variables sont fortement corrélées ou redondantes. Le paramètre <KatexInline
					formula={'\\alpha'}
				/> peut ensuite être ajusté par validation croisée.
			</p>
		</ExpertPanel>
	</TheorySection>

	<!-- ═══════════════════════════════════════════ -->
	<!-- SECTION 5 : Sélection de λ                 -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Sélection du paramètre λ par validation croisée</h2>

		<p>
			Les méthodes précédentes admettent un paramètre de régularisation <KatexInline
				formula={'\\lambda'}
			/> qui contrôle l'intensité du biais introduit. Choisir ce paramètre est crucial : une valeur trop
			faible ne réduit pas assez la variance, tandis qu'une valeur trop forte biaise excessivement le
			modèle. La <strong>validation croisée</strong> est la méthode standard pour estimer la
			performance de généralisation et sélectionner le meilleur <KatexInline
				formula={'\\lambda'}
			/>.
		</p>

		<h3>Procédure de validation croisée à K plis</h3>

		<ol>
			<li>
				Partitionner les données en <KatexInline formula={'K'} /> groupes (plis) de taille approximativement
				égale
			</li>
			<li>Pour chaque pli k = 1, ..., K :</li>
			<ul>
				<li>
					Entraîner le modèle sur les K-1 plis restants pour une valeur donnée de <KatexInline
						formula={'\\lambda'}
					/>
				</li>
				<li>Évaluer l'erreur quadratique moyenne sur le pli k</li>
			</ul>
			<li>Faire la moyenne des K erreurs pour obtenir l'estimation croisée :</li>
		</ol>

		<KatexBlock formula={cvError} />

		<p>
			On répète ce processus sur un large gamut de valeurs pour <KatexInline
				formula={'\\lambda'}
			/>, puis on sélectionne :
		</p>

		<KatexBlock formula={lambdaOpt} />

		<h3>La règle du « une écart-type »</h3>

		<p>
			En pratique, on préfère souvent choisir une valeur de <KatexInline formula={'\\lambda'} /> plus
			grande que le minimiseur exact :
		</p>

		<KatexBlock formula={oneSeRule} />

		<p>
			Où <KatexInline formula={'s_{\text{opt}}'} /> est l'écart-type de l'erreur croisée à l'optimum.
			Cette règle produit un modèle parcimonieux (moins de variables non nulles) tout en restant dans
			une marge statistiquement acceptable de performance. C'est un compromis classique entre simplicité
			du modèle et précision.
		</p>

		<InteractiveSection tag="Démo 8.6 — Sélecteur par validation croisée">
			<CrossValidationSelector />
		</InteractiveSection>

		<Callout type="warning" title="Le piège du surajustement de λ">
			<p>
				Si vous utilisez la même validation croisée pour sélectionner <KatexInline
					formula={'\\lambda'}
				/> et évaluer le modèle, votre estimation de performance sera optimiste. L'idéal est d'utiliser
				une validation croisée imbriquée : un cycle extérieur pour évaluer la généralisation, et un cycle
				intérieur pour sélectionner <KatexInline formula={'\\lambda'} />.
			</p>
		</Callout>
	</TheorySection>

	<!-- ═══════════════════════════════════════════ -->
	<!-- EXERCISE                                   -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Exercice d'application</h2>

		<ExercisePanel number="8.1" title="Calcul de facteurs de rétrécissement et seuillage">
			{#snippet solution()}
				<p>
					Pour Ridge : le facteur <KatexInline formula={shrinkageFactor} /> donne les valeurs suivantes
					pour chaque direction propre : S₁ = 5/(5 + 2) ≈ 0,714 ; S₂ = 2/(2 + 2) = 0,5 ; S₃ = 0,5/(0,5
					+ 2) ≈ 0,2. On observe bien que la direction faible (d=0,5) est beaucoup plus réduite.
				</p>
				<p>
					Pour Lasso : S(w₁=3.0, λ=1.0) = 3.0 - 1.0 = <strong>2.0</strong>. S(w₂=−1.5, λ=1.0) =
					sign(−1.5) · max(1.5 − 1.0, 0) = <strong>−0.5</strong>. S(w₃=0.8, λ=1.0) = sign(0.8) ·
					max(0.8 − 1.0, 0) = <strong>0</strong> (le coefficient est annulé !).
				</p>
			{/snippet}

			<p>
				Supposons que vous avez un problème de régression avec 3 caractéristiques. La décomposition
				spectrale de la matrice de design donne les valeurs propres :
				<KatexInline formula={'d_1 = 5'} />, <KatexInline formula={'d_2 = 2'} /> et <KatexInline
					formula={'d_3 = 0,5'}
				/>. Les coefficients OLS estimés sont :
			</p>

			<KatexBlock formula={exW_ols} />

			<p>
				<strong>a)</strong> Calculer les facteurs de rétrécissement Ridge pour <KatexInline
					formula={'\\lambda = 2'}
				/>. Commenter la différence d'amplitude entre directions.
			</p>

			<p>
				<strong>b)</strong> Calculer les coefficients Lasso en utilisant le soft-thresholding avec <KatexInline
					formula={exLambdaVal}
				/>. Quel coefficient est annulé et pourquoi ?
			</p>
		</ExercisePanel>
	</TheorySection>

	<!-- ═══════════════════════════════════════════ -->
	<!-- SYNTHESIS CALLOUT                          -->
	<!-- ═══════════════════════════════════════════ -->

	<TheorySection>
		<h2>Synthèse</h2>

		<Callout type="summary" title="Ridge vs Lasso vs Elastic Net — tableau comparatif">
			<ul>
				<li>
					<strong>Ridge (L2) :</strong> rétrécit uniformément, jamais de zéros exacts. Idéal pour stabiliser
					l'inversion matricielle et gérer la multicolinéarité
				</li>
				<li>
					<strong>Lasso (L1) :</strong> produit des zéros exacts via le soft-thresholding. Permet une
					sélection automatique de variables mais peut être instable avec des corrélations fortes
				</li>
				<li>
					<strong>Elastic Net :</strong> combine les deux approches. Sélection de variables (L1) + stabilité
					pour corrélées (L2). Souvent le meilleur choix en pratique
				</li>
			</ul>
			<p style="margin-top: 0.5rem;">
				Dans tous les cas, la sélection du paramètre <KatexInline formula={'\\lambda'} /> par validation
				croisée est une étape obligatoire et critique pour obtenir un bon compromis biais-variance.
			</p>
		</Callout>

		<Bibliography>
			<BibElement
				authors={['Tibshirani, R.']}
				year={1996}
				title="Regression Shrinkage and Selection via the Lasso"
				journal="Journal of the Royal Statistical Society, Series B, 58(1), 267–288."
				link="https://doi.org/10.1111/j.2517-6161.1996.tb02080.x"
			/>
			<BibElement
				authors={['Zou, H.', 'Hastie, T.']}
				year={2005}
				title="Regularization and Variable Selection via the Elastic Net"
				journal="Journal of the Royal Statistical Society, Series B, 67(2), 301–320."
				link="https://doi.org/10.1111/j.1467-9868.2005.00503.x"
			/>
			<BibElement
				authors={['Hoerl, A.E.', 'Kennard, R.W.']}
				year={1970}
				title="Ridge Regression: Biased Estimation for Nonorthogonal Problems"
				journal="Technometrics, 12(1), 55–67."
				link="https://doi.org/10.1080/00401706.1970.10488634"
			/>
			<BibElement
				authors={['Hastie, T.', 'Tibshirani, R.', 'Friedman, J.']}
				year={2009}
				title="The Elements of Statistical Learning: Data Mining, Inference, and Prediction"
				journal="Springer. 2ᵉ édition."
				link="https://web.stanford.edu/~hastie/ElemStatLearn/"
			/>
		</Bibliography>
	</TheorySection>
</PageTemplate>
