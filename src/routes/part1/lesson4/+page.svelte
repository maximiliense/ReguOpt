<script lang="ts">
	/**
	 * Leçon 4 — SGD, CD & Newton
	 * Partie I : Optimisation (Leçon 4/4)
	 */
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import InteractiveSection from '$lib/components/narrative/InteractiveSection.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import DefinitionBlock from '$lib/components/narrative/DefinitionBlock.svelte';
	import TheoremBlock from '$lib/components/narrative/TheoremBlock.svelte';
	import ExampleBlock from '$lib/components/narrative/ExampleBlock.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';

	// ── Demos ──
	import SGDvsGDComparison from '$lib/components/demos/SGDvsGDComparison.svelte';
	import GradientVarianceDemo from '$lib/components/demos/GradientVarianceDemo.svelte';
	import CoordinateDescentAnim from '$lib/components/demos/CoordinateDescentAnim.svelte';
	import NewtonAnimator from '$lib/components/demos/NewtonAnimator.svelte';
	import ConvergenceRace from '$lib/components/demos/ConvergenceRace.svelte';

	// ── Navigation ──
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';

	const meta = getPageByPath('/part1/lesson4');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	// ── Formules ──
	const sgdUpdate = `x^{(k+1)} = x^{(k)} - \\alpha_k \\nabla f_{i_k}(x^{(k)})`;
	const miniBatchUpdate = `x^{(k+1)} = x^{(k)} - \\alpha_k \\frac{1}{B} \\sum_{i \\in B_k} \\nabla f_i(x^{(k)})`;
	const exactGradMean = `\\nabla f(x) = \\frac{1}{n} \\sum_{i=1}^n \\nabla f_i(x)`;
	const sgdUnbiasedE = `\\mathbb{E}[\\nabla f_i(x)] = \\nabla f(x)`;
	const cdUpdate = `x^{(k+1)}_j = \\arg\\min_{t} f(x^{(k)}_1, \\dots, t, \\dots, x^{(k)}_d)`;
	const newtonStep = `x^{(k+1)} = x^{(k)} - [Hf(x^{(k)})]^{-1} \\nabla f(x^{(k)})`;
	const hessDef = `Hf(x)_{ij} = \\frac{\\partial^2 f}{\\partial x_i \\partial x_j}(x)`;
	const taylor2 = `f(y) \\approx f(x) + \\nabla f(x)^T (y - x) + \\tfrac{1}{2}(y-x)^T Hf(x)(y-x)`;
	const rateQuadric = `\\|e_{k+1}\\| \\leq C \\|e_k\\|^2`;
	const sgdConvergence = `\\mathbb{E}[\\|x^{(k)} - x^*\\|^2] \\to 0`;
	const cdRate = `f(x^{(k)}) - f^* = O(d/k)`;
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'SGD, CD & Newton'}
	subtitle="Partie I — Optimisation"
	prev={prevMeta}
	next={nextMeta}
>
	<!-- ═══════════════════════════════════════ -->
	<!-- INTRODUCTION                            -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<p>
			Les trois leçons précédentes ont établi les fondements de l'optimisation sans contrainte :
			conditions d'optimalité, propriétés des fonctions convexes, et la descente de gradient
			standard. Nous abordons maintenant trois familles d'algorithmes essentiels en apprentissage
			automatique, chacun adapté à une échelle ou une structure différente du problème.
		</p>

		<ul>
			<li>
				<strong>SGD (Stochastic Gradient Descent)</strong> — Quand n est trop grand pour calculer le gradient
				exact.
			</li>
			<li>
				<strong>Coordinate Descent (CD)</strong> — Quand la fonction se décompose naturellement selon
				des coordonnées.
			</li>
			<li>
				<strong>Méthode de Newton</strong> — Quand l'information Hessienne est accessible et exploitable.
			</li>
		</ul>

		<Callout type="intuition" title="Pourquoi trois méthodes ?">
			Aucun algorithme ne domine tous les autres. Le choix dépend du coût par évaluation, de la
			dimension du problème, et de la structure de la fonction objectif. Cette leçon montre comment
			chaque méthode exploite une propriété différente pour converger efficacement.
		</Callout>
	</TheorySection>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 1 — SGD (Stochastic GD)         -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h2>1. Descente de gradient stochastique (SGD)</h2>

		<p>Supposons que la fonction objectif s'écrive comme une moyenne empirique :</p>

		<KatexBlock formula={`f(x) = \\frac{1}{n} \\sum_{i=1}^{n} f_i(x)`} />

		où chaque <KatexInline formula={`f_i`} /> représente la perte sur un échantillon de données. C'est
		le cas typique en apprentissage automatique : les <KatexInline formula={`f_i`} /> sont convexes mais
		<KatexInline formula={`f`} /> peut être très difficile à optimiser si n est de l'ordre du million
		ou plus.
	</TheorySection>

	<TheorySection>
		<h3>1.1 L'idée centrale : remplacer le gradient exact par une estimation</h3>

		<p>Plutôt que de calculer le gradient complet :</p>

		<KatexBlock formula={exactGradMean} />

		on choisit un indice aléatoire <KatexInline formula={`i_k`} /> à chaque itération et on utilise :
	</TheorySection>

	<DefinitionBlock number="4.1" title="Plein-gradient Stochastique (SGD)">
		Soit <KatexInline formula={`f(x) = \\frac{1}{n}\\sum_{i=1}^n f_i(x)`} /> avec chaque <KatexInline
			formula={`f_i`}
		/> différentiable. L'algorithme SGD itère :

		<KatexBlock formula={sgdUpdate} />

		où <KatexInline formula={`i_k`} /> est tiré uniformément dans <KatexInline
			formula="{`\\{1, \\dots, n\\}`},"
		/> et
		<KatexInline formula={`(\\alpha_k)_{k \\geq 0}`} /> est une suite de pas positifs.
	</DefinitionBlock>

	<TheoremBlock number="4.2" title="L'estimateur SGD est sans biais">
		Pour tout <KatexInline formula={`x`} />, l'espérance du gradient stochastique coïncide avec le
		gradient exact :

		<KatexBlock formula={sgdUnbiasedE} />

		<Callout type="proof" title="Esquisse de démonstration">
			Puisque <KatexInline formula={`i_k`} /> est uniforme sur <KatexInline
				formula="{`\\{1, \\dots, n\\}`},"
			/> :

			<KatexBlock
				formula={`\\mathbb{E}[\\nabla f_{i_k}(x)] = \\sum_{i=1}^n \\frac{1}{n} \\nabla f_i(x) = \\nabla f(x)`}
			/>
		</Callout>

		Ce résultat justifie que SGD suit globalement la bonne direction, malgré le bruit.
	</TheoremBlock>

	<InteractiveSection tag="Comparer">
		<SGDvsGDComparison />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 1.2 — Mini-batch SGD            -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h3>1.2 Mini-batch : le compromis pratique</h3>

		<p>
			Le SGD pur (B=1) est très bruité. À l'inverse, le gradient exact (B=n) est trop coûteux. La
			solution standard consiste à utiliser des mini-lots :
		</p>

		<DefinitionBlock number="4.3" title="Mini-batch Gradient Descent">
			Soit <KatexInline formula={`B_k`} /> un sous-ensemble aléatoire de taille B tiré de <KatexInline
				formula="{`\\{1, \\dots, n\\}`},"
			/> l'itération est :

			<KatexBlock formula={miniBatchUpdate} />
		</DefinitionBlock>

		<Callout type="intuition" title="Le compromis coût / variance">
			Cette formule interpole entre SGD pur (B=1) et le gradient exact (B=n). En pratique, B ∈ [8,
			256] donne le meilleur rapport précision/coût. Augmenter B réduit la variance du bruit mais
			augmente proportionnellement le coût d'un pas.
		</Callout>
	</TheorySection>

	<InteractiveSection tag="Explorer">
		<GradientVarianceDemo />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 1.3 — Convergence du SGD        -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h3>1.3 Convergence asymptotique du SGD</h3>

		<p>
			Pour garantir la convergence, le pas <KatexInline formula={`\\alpha_k`} /> doit décroître suffisamment
			vite pour amortir le bruit, mais assez lentement pour permettre l'exploration de l'espace.
		</p>
	</TheorySection>

	<TheoremBlock number="4.4" title="Convergence du SGD — conditions Robbins-Monro">
		Soit <KatexInline formula={`f`} /> convexe et <KatexInline formula={`L`} />-lipschitzienne. Si :

		<KatexBlock
			formula={`\\sum_{k=0}^{\\infty} \\alpha_k = +\\infty, \\quad \\sum_{k=0}^{\\infty} \\alpha_k^2 < +\\infty`}
		/>

		alors <KatexInline formula={sgdConvergence} /> (convergence en espérance).
	</TheoremBlock>

	<ExampleBlock number="4.5" title="Plans de décroissance classiques">
		<ul>
			<li>
				<strong>Pas constant :</strong>
				<KatexInline formula={`\\alpha_k = \\alpha`} /> — converge vers un voisinage de l'optimum, pas
				exactement.
			</li>
			<li>
				<strong>Décroissance polynomiale :</strong>
				<KatexInline formula={`\\alpha_k = \\frac{\\alpha_0}{1 + \\gamma k}`} /> — satisfait Robbins-Monro
				pour tout <KatexInline formula={`\\gamma > 0`} />.
			</li>
			<li>
				<strong>Cosine annealing :</strong>
				<KatexInline
					formula={`\\alpha_k = \\frac{\\alpha_{min}}{2} + \\frac{\\alpha_0 - \\alpha_{min}}{2} (1 + \\cos(\\pi k / K))`}
				/> — populaire en deep learning.
			</li>
		</ul>
	</ExampleBlock>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 2 — Coordinate Descent          -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h2>2. Coordinate Descent (Descente coordonnée)</h2>

		<p>
			La descente coordonnée est une stratégie itérative qui, à chaque pas, ne modifie qu'une seule
			composante de la variable d'optimisation. Elle est particulièrement efficace lorsque :
		</p>
		<ul>
			<li>Le calcul du gradient complet est coûteux</li>
			<li>
				La fonction se décompose naturellement en coordonnées (ex : <KatexInline
					formula={`f(x) = \\sum g_j(x_j)`}
				/>)
			</li>
			<li>
				La régularisation L1 induit des solutions creuses — CD exploite cette structure
				explicitement
			</li>
		</ul>

		<DefinitionBlock number="4.6" title="Coordinate Descent cyclique">
			Soit <KatexInline formula={`f : \\mathbb{R}^d \\to \\mathbb{R}`} />. À chaque itération k, on
			choisit une coordonnée <KatexInline formula={`j_k`} /> (par cycle : 1,2,...,d,1,2,...) et on met
			à jour :

			<KatexBlock formula={cdUpdate} />
		</DefinitionBlock>
	</TheorySection>

	<InteractiveSection tag="Animer">
		<CoordinateDescentAnim />
	</InteractiveSection>

	<TheorySection>
		<h3>2.1 Analyse théorique</h3>
	</TheorySection>

	<TheoremBlock number="4.7" title="Convergence du CD cyclique">
		Soit <KatexInline formula={`f`} /> convexe, <KatexInline formula={`C^1`} />-lipschitzienne par
		coordonnée avec constante L_j. Alors :

		<KatexBlock formula={cdRate} />

		Le taux dépend linéairement de la dimension d — c'est le prix à payer pour optimiser une seule
		coordonnée à la fois.
	</TheoremBlock>

	<Callout type="intuition" title="Pourquoi CD marche bien en pratique">
		Dans les problèmes de régression Lasso (L1), chaque mise à jour coordonnée a une forme explicite
		: un seuillage mou (soft-thresholding). Cela rend CD non seulement efficace, mais aussi
		interprétable — on voit exactement quelles variables deviennent nulles.
	</Callout>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 3 — Méthode de Newton           -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h2>3. La méthode de Newton-Raphson</h2>

		<p>
			La descente de gradient n'utilise que l'information du premier ordre (gradient). La méthode de
			Newton exploite la structure locale de la fonction via son développement de Taylor d'ordre 2 :
		</p>

		<KatexBlock formula={taylor2} />
	</TheorySection>

	<TheorySection>
		<p>
			L'idée est simple : approximer <KatexInline formula={`f`} /> par un quadratique localement, puis
			en trouver le minimum exact.
		</p>

		<p>Le minimum du modèle quadratique satisfait :</p>

		<KatexBlock formula={`\\nabla q(y) = 0 \\iff Hf(x)(y - x) + \\nabla f(x) = 0`} />

		Ce qui donne directement la direction de Newton :
	</TheorySection>

	<DefinitionBlock number="4.8" title="Méthode de Newton (sans amortissement)">
		Soit <KatexInline formula="{`f \\in C^2`}," /> strictement convexe avec Hessienne inversible. L'itération
		est :

		<KatexBlock formula={newtonStep} />

		où l'Hessienne est la matrice des dérivées secondes :

		<KatexBlock formula={hessDef} />
	</DefinitionBlock>

	<InteractiveSection tag="Animer">
		<NewtonAnimator />
	</InteractiveSection>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 3.2 — Convergence quadratique   -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h3>3.1 Propriété fondamentale : convergence quadratique</h3>
	</TheorySection>

	<TheoremBlock number="4.9" title="Convergence quadratique locale">
		Soit <KatexInline formula="{`f \\in C^2`}," /> strictement convexe, avec <KatexInline
			formula={`x^*`}
		/> minimum global. Si l'Hessienne est <KatexInline formula={`L_H`} />-lipschitzienne autour de <KatexInline
			formula={String.raw`x^*`}
		/>, alors pour tout point initial suffisamment proche :

		<KatexBlock formula={rateQuadric} />

		Cela signifie que le nombre de chiffres significatifs corrects double à chaque itération.
	</TheoremBlock>

	<Callout type="intuition" title="Newton sur un quadratique pur">
		Si <KatexInline formula={`f(x) = \\tfrac{1}{2}x^T Q x - b^T x`} />, le modèle de Taylor d'ordre
		2 est exact : <KatexInline formula="{`q(y) \\equiv f(y)`}," />. Newton converge donc en un seul
		pas — l'Hessienne est constante et l'approximation quadratique est parfaite.
	</Callout>

	<TheorySection>
		<h3>3.2 Amortissement et recherche de ligne</h3>

		<p>
			Lorsque <KatexInline formula={`x^{(k)}`} /> n'est pas proche du minimum, la direction de Newton
			peut être mal conditionnée ou ne pas être une direction de descente. On utilise alors :
		</p>
	</TheorySection>

	<DefinitionBlock number="4.10" title="Newton amorti (Damped Newton)">
		Calculer la direction <KatexInline formula={`d_k = -[Hf(x^{(k)})]^{-1}\\nabla f(x^{(k)})`} />,
		puis chercher un pas <KatexInline formula={`\\alpha_k > 0`} /> satisfaisant la condition d'Armijo
		:

		<KatexBlock
			formula={`f(x^{(k)} + \\alpha_k d_k) \\leq f(x^{(k)}) + c_1 \\alpha_k \\nabla f(x^{(k)})^T d_k`}
		/>
	</DefinitionBlock>

	<Callout type="warning" title="Limites de Newton en grande dimension">
		L'Hessienne est une matrice d × d. Son inversion coûte O(d³). En apprentissage automatique où d
		peut dépasser 10⁶, la méthode de Newton exacte est inapplicable. On utilise alors des variantes
		: Quasi-Newton (BFGS), Newton conjugué, ou des approximations diagonales de l'Hessienne.
	</Callout>

	<!-- ═══════════════════════════════════════ -->
	<!-- SECTION 4 — SYNTHÈSE COMPARATIVE        -->
	<!-- ═══════════════════════════════════════ -->

	<TheorySection>
		<h2>4. Synthèse : quelle méthode choisir ?</h2>

		<p>Nous avons vu quatre méthodes d'optimisation au cours de cette partie :</p>

		<div class="synthesis-table">
			<table>
				<thead>
					<tr>
						<th>Méthode</th>
						<th>Coût/itération</th>
						<th>Taux</th>
						<th>Cas d'usage</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>GD</strong></td>
						<td>O(d × n)</td>
						<td>Linéaire (si convexe fortement)</td>
						<td>Fonctions lisses, petit dataset</td>
					</tr>
					<tr>
						<td><strong>SGD</strong></td>
						<td>O(d) — mini-batch O(B×d)</td>
						<td>O(1/√k) en espérance</td>
						<td>Grand dataset, deep learning</td>
					</tr>
					<tr>
						<td><strong>CD</strong></td>
						<td>O(d) par coordonnée</td>
						<td>O(d/k)</td>
						<td>Lasso, fonctions séparables</td>
					</tr>
					<tr>
						<td><strong>Newton</strong></td>
						<td>O(d³)</td>
						<td>Quadratique local</td>
						<td>Fonctions C², d modérée</td>
					</tr>
				</tbody>
			</table>
		</div>

		<InteractiveSection tag="Comparer">
			<ConvergenceRace />
		</InteractiveSection>

		<div class="synthesis-note">
			<h3>Note sur le compromis coût/précision</h3>
			<p>
				Dans la course ci-dessus, Newton atteint l'optimum en quelques itérations. Mais chaque
				itération coûte O(d³). Pour d = 10⁶ variables, GD ou SGD sont les seuls choix viables, même
				s'ils nécessitent beaucoup plus d'itérations pour converger.
			</p>
		</div>

		<Callout type="summary" title="Retenir de cette leçon">
			<ul>
				<li>
					<strong>SGD</strong> remplace un gradient exact coûteux par une estimation sans biais — idéal
					pour les grands datasets.
				</li>
				<li>
					<strong>Mini-batch SGD</strong> réduit la variance tout en restant O(B×d) par itération. B ∈
					[8, 256] est le standard.
				</li>
				<li>
					<strong>Coordinate Descent</strong> optimise une coordonnée à la fois — efficace pour les fonctions
					séparables et les problèmes L1.
				</li>
				<li>
					<strong>Méthode de Newton</strong> exploite l'Hessienne pour une convergence quadratique locale,
					mais coûte O(d³) par itération.
				</li>
				<li>
					Aucune méthode ne domine universellement : le choix dépend du coût d'évaluation, de la
					dimension et de la structure du problème.
				</li>
			</ul>
		</Callout>
	</TheorySection>

	<!-- ═══════════════════════════════════════ -->
	<!-- BIBLIOGRAPHIE                           -->
	<!-- ═══════════════════════════════════════ -->

	<Bibliography>
		<BibElement
			authors={['Bottou, L.']}
			year={2010}
			title="Large-scale machine learning with stochastic gradient descent"
			journal="Proceedings of COMPSTAT'2010."
			link="https://hal.inria.fr/inria-00577394/document"
		/>

		<BibElement
			authors={['Nesterov, Y.']}
			year={2004}
			title="Introductory Lectures on Convex Optimization: A Basic Course"
			journal="Kluwer Academic Publishers."
			link="https://doi.org/10.1007/978-1-4615-1437-7"
		/>

		<BibElement
			authors={['Shalev-Shwartz, S.', 'Ben-David, S.']}
			year={2014}
			title="Understanding Machine Learning: From Theory to Algorithms"
			journal="Cambridge University Press."
			link="https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/"
		/>

		<BibElement
			authors={['Boyd, S.', 'Candes, E.']}
			year={2019}
			title="Introductory Lectures on Convex Optimization: A Basic Course"
			journal="EE364a Lecture Notes."
			link="https://web.stanford.edu/~boyd/cvxbook/bv_opt_cookbook.pdf"
		/>

		<BibElement
			authors={['Bubeck, S.']}
			year={2015}
			title="Convex Optimization: Algorithms and Complexity"
			journal="Foundations and Trends® in Machine Learning."
			link="https://arxiv.org/abs/1405.4980"
		/>
	</Bibliography>
</PageTemplate>

<style>
	.synthesis-table {
		margin: 1rem 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}

	th,
	td {
		padding: 0.5rem 0.6rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	th {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 600;
	}

	tbody tr:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.synthesis-note {
		padding: 1rem;
		margin: 1rem 0;
		border-radius: var(--radius-md, 8px);
		background: rgba(125, 125, 125, 0.06);
	}

	.synthesis-note h3 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.synthesis-note p {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
	}

	@media (max-width: 700px) {
		table,
		thead,
		tbody,
		th,
		td,
		tr {
			display: block;
		}

		tr {
			margin-bottom: 0.75rem;
			padding: 0.5rem;
			border: 1px solid var(--color-border);
			border-radius: 6px;
		}

		th,
		td {
			border: none;
			text-align: right;
			padding: 0.2rem 0;
		}

		td::before {
			content: attr(data-label);
			float: left;
			font-weight: 600;
			color: var(--color-text-muted);
		}
	}
</style>
