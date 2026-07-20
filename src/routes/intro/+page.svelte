<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import Bibliography from '$lib/components/narrative/bib/Bibliography.svelte';
	import BibElement from '$lib/components/narrative/bib/BibElement.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';
	import { asset } from '$app/paths';

	const meta = getPageByPath('/intro');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));
</script>

<svelte:head>
	<title>{meta?.title ?? 'Introduction'} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Introduction'}
	subtitle="Fondations de l'Apprentissage Statistique"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<p>
			L'apprentissage automatique (Machine Learning) moderne repose sur trois piliers : la <strong
				>modélisation mathématique</strong
			>, l'<strong>optimisation numérique</strong>
			et la <strong>garantie statistique</strong>. Concevoir un modèle performant ne consiste pas
			seulement à écrire une fonction de perte élégante, mais demande également de savoir l'ajuster
			efficacement sur de grands volumes de données, tout en contrôlant sa complexité pour garantir
			sa capacité de généralisation sur des observations futures.
		</p>
		<p>Ce cours est basé sur les notes suivantes :</p>
		<ul>
			<li>
				<a href={asset('/pdf/optim.pdf')} target="_blank" rel="noopener noreferrer">
					<strong>Partie 1 :</strong> Optimisation pour l'Apprentissage (PDF)
				</a>
			</li>
			<li>
				<a href={asset('/pdf/regularization.pdf')} target="_blank" rel="noopener noreferrer">
					<strong>Partie 2 :</strong> Agrégation, Forêts & Régularisation (PDF)
				</a>
			</li>
			<li>
				<a href={asset('/pdf/set_valued.pdf')} target="_blank" rel="noopener noreferrer">
					<strong>Partie 3 :</strong> Évaluation & Prédictions Conformelles (PDF)
				</a>
			</li>
		</ul>

		<h2>Objectifs du cours</h2>

		<p>À l'issue de cet enseignement de Master, vous serez capables de :</p>

		<ul>
			<li>
				<strong>Analyser et modéliser :</strong> Identifier les propriétés mathématiques fondamentales
				d'un problème d'apprentissage (convexité, coercivité, régularité du gradient, forte convexité)
				afin d'en déduire l'existence, l'unicité et la stabilité d'une solution.
			</li>
			<li>
				<strong>Concevoir et optimiser :</strong> Sélectionner l'algorithme de descente de gradient le
				plus adapté à la structure de vos données et à la dimension du problème (descente de gradient
				classique, accélérée, stochastique, par coordonnées ou méthode de Newton).
			</li>
			<li>
				<strong>Maîtriser la complexité :</strong> Appliquer et comparer les méthodes de régularisation
				(Ridge, Lasso, Elastic Net) et de réduction de variance par méthodes d'ensemble (Bagging, Forêts
				Aléatoires, Gradient Boosting) pour résoudre le dilemme Biais-Variance.
			</li>
			<li>
				<strong>Garantir et certifier :</strong> Évaluer précisément la calibration d'un classifieur
				et appliquer la
				<em>Conformal Prediction</em> (prédiction conforme) pour construire des intervalles de prédiction
				garantis à un niveau de confiance choisi, sans hypothèse forte sur la distribution des données.
			</li>
		</ul>
	</TheorySection>

	<Bibliography>
		<!-- PARTIE 1 : Optimisation et fondations -->
		<BibElement
			authors={['Boyd, S.', 'Vandenberghe, L.']}
			year={2004}
			title="Convex Optimization"
			journal="Cambridge University Press."
			link="https://web.stanford.edu/~boyd/cvxbook/"
		/>
		<BibElement
			authors={['Nesterov, Y.']}
			year={1983}
			title="A method for unconstrained convex minimization problem with the rate of convergence O(1/k²)"
			journal="Soviet Mathematics Doklady, Vol. 27, pp. 372-387."
			link="https://doi.org/10.1007/978-1-4419-8853-9"
		/>
		<BibElement
			authors={['Robbins, H.', 'Monro, S.']}
			year={1951}
			title="A Stochastic Approximation Method"
			journal="The Annals of Mathematical Statistics, Vol. 22, No. 3, pp. 400-407."
			link="https://www.jstor.org/stable/2236626"
		/>

		<!-- PARTIE 2 : Régularisation, Bagging, Boosting et Forêts -->
		<BibElement
			authors={['Hastie, T.', 'Tibshirani, R.', 'Friedman, J.']}
			year={2009}
			title="The Elements of Statistical Learning: Data Mining, Inference, and Prediction"
			journal="Springer Science & Business Media, Second Edition."
			link="https://hastie.su.domains/ElemStatLearn/"
		/>
		<BibElement
			authors={['Breiman, L.']}
			year={2001}
			title="Random Forests"
			journal="Machine Learning, Vol. 45, No. 1, pp. 5-32."
			link="https://doi.org/10.1023/A:1010933404324"
		/>
		<BibElement
			authors={['Freund, Y.', 'Schapire, R. E.']}
			year={1997}
			title="A Decision-Theoretic Generalization of On-Line Learning and an Application to Boosting"
			journal="Journal of Computer and System Sciences, Vol. 55, No. 1, pp. 119-139."
			link="https://doi.org/10.1006/jcss.1997.1504"
		/>
		<BibElement
			authors={['Friedman, J. H.']}
			year={2001}
			title="Greedy Function Approximation: A Gradient Boosting Machine"
			journal="The Annals of Statistics, Vol. 29, No. 5, pp. 1189-1232."
			link="https://www.jstor.org/stable/2699986"
		/>

		<!-- PARTIE 3 : Calibration et Prédictions Conformelles -->
		<BibElement
			authors={['Guo, C.', 'Pleshesskich, G.', 'Sun, Y.', 'Weinberger, K. Q.']}
			year={2017}
			title="On Calibration of Modern Neural Networks"
			journal="International Conference on Machine Learning (ICML), PMLR, pp. 1321-1330."
			link="https://arxiv.org/abs/1706.04599"
		/>
		<BibElement
			authors={['Angelopoulos, A. N.', 'Bates, S.']}
			year={2021}
			title="A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification"
			journal="arXiv preprint arXiv:2107.07511."
			link="https://arxiv.org/abs/2107.07511"
		/>
		<BibElement
			authors={['Romano, Y.', 'Patterson, E.', 'Candès, E. J.']}
			year={2019}
			title="Conformalized Quantile Regression"
			journal="Advances in Neural Information Processing Systems (NeurIPS), Vol. 32."
			link="https://arxiv.org/abs/1905.03222"
		/>
	</Bibliography>
</PageTemplate>
