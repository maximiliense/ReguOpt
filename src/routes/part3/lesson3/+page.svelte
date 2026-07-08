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
	import PredictionIntervalVisualizer from '$lib/components/demos/PredictionIntervalVisualizer.svelte';
	import AdaptiveIntervalDemo from '$lib/components/demos/AdaptiveIntervalDemo.svelte';
	import BootstrapUncertainty from '$lib/components/demos/BootstrapUncertainty.svelte';
	import IntervalQualityDashboard from '$lib/components/demos/IntervalQualityDashboard.svelte';
	import { getPageByPath, getNextPage, getPrevPage, type PageMeta } from '$lib/navigation.js';
	import { createPageTracker } from '$lib/stores/progress.svelte';

	const meta = getPageByPath('/part3/lesson3');
	const tracker = createPageTracker(meta as PageMeta);
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	$effect(() => {
		tracker.trackInteraction();
	});

	// ─── Formula constants (avoid Svelte brace-parsing issues) ───
	const F_OBJECTIVE = String.raw`\mathcal\{C\}(x) = [a(x), b(x)]`;
	const F_COVERAGE = String.raw`\mathbb\{P\}(Y \in [a(X), b(X)]) \geq 1 - \alpha`;
	const F_SCORE_CONSTANT = String.raw`s(x, y) = |y - \hat\{f\}(x)|`;
	const F_INTERVAL = String.raw`\mathcal\{C\}(x) = [\hat\{f\}(x) - q, \hat\{f\}(x) + q]`;
	const F_SCORE_ADAPTIVE = String.raw`s(x, y) = \frac{|y - \hat\{f\}(x)|}{\sigma(x) + \varepsilon}`;
	const F_COVERAGE_RATE = String.raw`\frac{1}{n} \sum_{i=1}^{n} \mathbb\{1\}[y_i \in [a(x_i), b(x_i)]]`;
	const F_AVG_WIDTH = String.raw`\frac{1}{n} \sum_{i=1}^{n} (b(x_i) - a(x_i))`;
	const F_SIGMA = String.raw`\sigma(x)`;
	const F_EPSILON = String.raw`\varepsilon > 0`;
</script>

<svelte:head>
	<title>{meta?.title ?? 'Intervalles de prédiction'} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? 'Intervalles de prédiction'}
	subtitle="Partie III — Prédiction d'ensembles"
	prev={prevMeta}
	next={nextMeta}
>
	<!-- ═══════════ Introduction ═══════════ -->
	<TheorySection>
		<p>
			La prédiction conformelle en classification construit des ensembles de classes. En
			<strong>régression</strong>, le principe est identique mais l'ensemble de prédiction prend la
			forme d'un <em>intervalle continu</em> : au lieu d'obtenir une liste de classes candidates, on
			obtient un <strong>intervalle de prédiction</strong>
			<KatexInline formula={F_OBJECTIVE} /> contenant la valeur vraie de
			<KatexInline formula="Y" /> avec une garantie probabiliste.
		</p>

		<p>
			L'objectif est double : garantir que l'intervalle couvre la valeur réelle avec une probabilité
			suffisante, tout en le rendant le plus <em>étroit possible</em>. Ce compromis entre couverture
			et précision défine toute la richesse de la régression conformelle.
		</p>

		<Callout type="definition" title="Objectif en régression conformelle">
			Construire <KatexInline formula={F_OBJECTIVE} /> tel que :
			<KatexBlock formula={F_COVERAGE} />
			L'intervalle doit être le plus <em>petit possible</em> tout en respectant la contrainte de couverture.
		</Callout>
	</TheorySection>

	<!-- ═══════════ Intervalles de largeur constante ═══════════ -->
	<TheorySection>
		<h2>Intervalles de largeur constante</h2>

		<p>
			L'approche la plus simple utilise un score de conformité basé sur l'<strong
				>erreur absolue</strong
			>
			entre la prédiction du modèle et la valeur observée. L'idée est intuitive : plus une observation
			s'est éloignée de la prédiction, moins elle est « conforme » au modèle.
		</p>

		<Callout type="definition" title="Score de conformité constant">
			Le score de conformité est la valeur absolue du résidu :
			<KatexBlock formula={F_SCORE_CONSTANT} />
			L'ensemble de prédiction devient alors un intervalle symétrique centré sur la prédiction :
			<KatexBlock formula={F_INTERVAL} />
			où <KatexInline formula="q" /> est le quantile d'ordre approprié des résidus absolus sur l'ensemble
			de calibration.
		</Callout>

		<p>
			Ce score produit des intervalles de <strong>largeur constante</strong> — indépendante du point de
			prédiction. En d'autres termes, chaque prédiction bénéficie du même « marge d'erreur », calibrée
			davantage par les pires cas observés sur l'ensemble de calibration. Cette simplicité est à la fois
			un avantage (robustesse, facilité de mise en œuvre) et une limitation (aucune adaptation locale).
		</p>

		<Callout type="intuition" title="Quand les intervalles constants suffisent-ils ?">
			Les intervalles de largeur constante sont appropriés lorsque la variance des erreurs est
			<strong>homoscédastique</strong> — c'est-à-dire que la dispersion des résidus est uniforme dans
			tout l'espace d'entrée. C'est souvent le cas pour des données bien prétraitées ou des modèles linéaires
			sur des variables gaussiennes.
		</Callout>
	</TheorySection>

	<!-- ═══════════ Démo 11.1 — Visualisation des intervalles ═══════════ -->
	<InteractiveSection tag="Démo 11.1">
		<PredictionIntervalVisualizer />
	</InteractiveSection>

	<!-- ═══════════ Implémentation des intervalles constants ═══════════ -->
	<TheorySection>
		<h2>Implémentation des intervalles constants</h2>

		<p>
			L'algorithme se décompose en trois étapes nettes, directement calquées sur le cadre général de
			la prédiction conformelle.
		</p>

		<ExpertPanel title="Algorithme pas à pas">
			<p>
				<strong>Étape 1 — Entraînement :</strong> Apprendre un régresseur
				<KatexInline formula={String.raw`\hat\{f\}`} /> sur les données d'entraînement.
			</p>
			<p>
				<strong>Étape 2 — Calibration :</strong> Sur l'ensemble de calibration, calculer les résidus
				absolus <KatexInline formula={F_SCORE_CONSTANT} /> pour chaque observation, puis extraire le quantile
				<KatexInline formula="q" /> correspondant au niveau de confiance <KatexInline
					formula="1 - \alpha"
				/>.
			</p>
			<p>
				<strong>Étape 3 — Prédiction :</strong> Pour chaque nouvelle observation
				<KatexInline formula="x" />, retourner l'intervalle
				<KatexInline formula={F_INTERVAL} />.
			</p>
		</ExpertPanel>

		<p>
			En pratique, l'implémentation est très compacte. On calcule les résidus sur la calibration, on
			en tire le quantile approprié (avec l'ajustement classique pour garantir la couverture en
			échantillon fini), puis on applique ce seuil uniformément aux prédictions de test. La largeur
			d'intervalle est identique pour tous les points — d'où le nom « largeur constante ».
		</p>
	</TheorySection>

	<!-- ═══════════ Intervalles adaptatifs ═══════════ -->
	<TheorySection>
		<h2>Intervalles adaptatifs</h2>

		<p>
			Les intervalles constants souffrent d'un défaut majeur : ils ne tiennent aucun compte de l'<em
				>incertitude locale</em
			> du modèle. Or, dans la plupart des situations réelles, certaines régions de l'espace d'entrée
			sont naturellement plus difficiles à prédire que d'autres. Un intervalle uniformément large gaspille
			de l'information dans les zones faciles, et reste insuffisant dans les zones difficiles.
		</p>

		<p>
			Les <strong>intervalles adaptatifs</strong> résolvent ce problème en normalisant l'erreur pour chaque
			point par une estimation de son incertitude locale :
		</p>

		<Callout type="definition" title="Score de conformité adaptatif">
			Le score est normalisé par l'incertitude locale :
			<KatexBlock formula={F_SCORE_ADAPTIVE} />
			où <KatexInline formula={F_SIGMA} /> est une estimation de l'incertitude locale et
			<KatexInline formula={F_EPSILON} /> évite la division par zéro.
		</Callout>

		<p>
			Le principe est simple : si le modèle prédit avec précision un point (faible incertitude
			locale), une erreur modérée sera fortement pénalisée et l'intervalle sera étroit. Si le modèle
			est incertain (forte variance locale), la même erreur sera considérée comme attendue et
			l'intervalle s'élargira. L'avantage est clair : les intervalles sont
			<strong>plus étroits dans les régions de forte confiance</strong> et
			<strong>plus larges dans les régions incertaines</strong>.
		</p>

		<Callout type="insight" title="Hétéroscédasticité">
			Lorsque la variance des résidus n'est pas constante — on dit que les données sont
			<strong>hétéroscédastiques</strong> — les intervalles adaptatifs sont nettement plus efficaces que
			les intervalles constants. Ils s'adaptent à la structure locale des erreurs au lieu d'appliquer
			une marge uniforme.
		</Callout>
	</TheorySection>

	<!-- ═══════════ Démo 11.2 — Comparaison constant vs adaptatif ═══════════ -->
	<InteractiveSection tag="Démo 11.2">
		<AdaptiveIntervalDemo />
	</InteractiveSection>

	<!-- ═══════════ Estimation de l'incertitude locale ═══════════ -->
	<TheorySection>
		<h2>Estimation de l'incertitude locale</h2>

		<p>
			L'utilisation du score adaptatif pose la question pratique : comment estimer
			<KatexInline formula={F_SIGMA} /> de manière fiable ? Plusieurs approches sont couramment employées,
			chacune avec ses propres compromis en termes de coût computationnel et de précision.
		</p>

		<ExpertPanel title="Méthodes d'estimation de σ(x)">
			<p>
				<strong>1. Bootstrap :</strong> Entraîner le modèle sur plusieurs échantillons bootstrap (rechantillonnage
				avec remise) et calculer l'écart-type des prédictions pour chaque point. Cette méthode capture
				directement la variabilité induite par les fluctuations de l'ensemble d'entraînement.
			</p>
			<p>
				<strong>2. Bagging :</strong> Variante du bootstrap où l'on average les prédictions d'un ensemble
				de modèles. La variance des prédictions individuelles sert d'estimateur de l'incertitude.
			</p>
			<p>
				<strong>3. Quantile regression :</strong> Entrainement séparé sur les quantiles supérieurs et
				inférieurs (p. ex. 84e et 16e percentiles). La différence entre ces quantiles fournit une estimation
				de la dispersion locale.
			</p>
			<p>
				<strong>4. Réseaux bayésiens :</strong> Dans les modèles probabilistes, la variance a posteriori
				des prédictions offre une estimation directe et cohérente de l'incertitude. Mais le coût computationnel
				est généralement plus élevé.
			</p>
		</ExpertPanel>

		<p>
			Le <strong>bootstrap</strong> est probablement l'approche la plus répandue : elle est non paramétrique,
			facile à mettre en œuvre, et compatible avec n'importe quel algorithme d'apprentissage. Le principe
			est d'observer comment les prédictions varient quand on change légèrement l'ensemble d'entraînement.
		</p>
	</TheorySection>

	<!-- ═══════════ Démo 11.3 — Bootstrap ═══════════ -->
	<InteractiveSection tag="Démo 11.3">
		<BootstrapUncertainty />
	</InteractiveSection>

	<!-- ═══════════ Évaluation des intervalles ═══════════ -->
	<TheorySection>
		<h2>Évaluation des intervalles de prédiction</h2>

		<p>
			La validation d'une méthode d'intervalles de prédiction repose sur plusieurs métriques
			complémentaires. Aucune mesure seule ne suffit : on doit vérifier à la fois que la garantie de
			couverture est respectée et que les intervalles ne sont pas artificiellement larges.
		</p>

		<Callout type="definition" title="Métriques d'évaluation">
			<p>
				<strong>Taux de couverture empirique :</strong> Fraction d'observations de test dont la
				valeur vraie est incluse dans l'intervalle de prédiction :
				<KatexBlock formula={F_COVERAGE_RATE} />
			</p>
			<p>
				<strong>Largeur moyenne :</strong> Moyenne des largeurs d'intervalle sur l'ensemble de test
				:
				<KatexBlock formula={F_AVG_WIDTH} />
			</p>
			<p>
				<strong>Efficacité conditionnelle :</strong> Vérifier que la couverture est homogène à
				travers les différentes régions de l'espace d'entrée, et ne dépend pas excessivement des
				valeurs de <KatexInline formula="X" />.
			</p>
		</Callout>

		<p>
			Un bon système d'intervalles doit atteindre un taux de couverture proche (ou supérieur) de
			<KatexInline formula="1 - \alpha" /> tout en minimisant la largeur moyenne. L'efficacité conditionnelle
			est l'indicateur le plus subtil : si les intervalles couvrent bien globalement mais échouent systématiquement
			dans certaines régions, la méthode est jugée inégale.
		</p>

		<Callout type="warning" title="Exercice 6.3">
			<p>
				Comparez les intervalles constants et adaptatifs sur un jeu de données
				<strong>hétéroscédastique</strong> :
			</p>
			<ol>
				<li>
					Construisez les deux types d'intervalles et vérifiez empiriquement la garantie de
					couverture pour différents niveaux <KatexInline formula="\alpha" />
				</li>
				<li>Analysez l'efficacité (largeur d'intervalle) des deux approches</li>
				<li>
					Évaluez l'efficacité conditionnelle : la couverture est-elle uniforme dans toutes les
					régions ?
				</li>
			</ol>
		</Callout>
	</TheorySection>

	<!-- ═══════════ Démo 11.4 — Dashboard qualité ═══════════ -->
	<InteractiveSection tag="Démo 11.4">
		<IntervalQualityDashboard />
	</InteractiveSection>

	<!-- ═══════════ Synthèse ═══════════ -->
	<TheorySection>
		<h2>Synthèse</h2>

		<p>
			La régression conformelle étend le cadre de la prédiction d'ensembles au cas continu. Le
			passage de classes discrètes à des <strong>intervalles de prédiction</strong> introduit des choix
			de conception importants :
		</p>

		<ul>
			<li>
				<strong>Intervalles constants</strong> — simples et robustes, mais incapables de s'adapter à la
				variabilité locale
			</li>
			<li>
				<strong>Intervalles adaptatifs</strong> — ajustent leur largeur à l'incertitude locale, efficaces
				pour les données hétéroscédastiques
			</li>
			<li>
				<strong>Estimation de l'incertitude</strong> — bootstrap, bagging, quantile regression ou
				méthodes bayésiennes pour estimer <KatexInline formula={F_SIGMA} />
			</li>
		</ul>

		<p>
			L'évaluation rigoureuse combine le taux de couverture (respect de la garantie), la largeur
			moyenne (précision) et l'efficacité conditionnelle (équité). Ensemble, ces indicateurs
			permettent de choisir entre les approches en fonction de la structure des données et des
			exigences applicatives. La garantie de couverture demeure <strong
				>exacte en échantillon fini</strong
			> sous l'hypothèse d'échangeabilité, indépendamment du modèle sous-jacent.
		</p>
	</TheorySection>

	<Bibliography>
		<BibElement
			authors={['Vovk, V.', 'Gammerman, A.', 'Shafer, G.']}
			year={2005}
			title="Algorithmic Learning in a Random World"
			journal="Springer."
			link="https://www.springer.com/gp/book/9780387259945"
		/>
		<BibElement
			authors={['Romano, Y.', 'Candes, E.', 'Van de Geer, S.', 'Sabatti, C.']}
			year={2019}
			title="Conformal Prediction Intervals for Functional Machine Learning"
			journal="Advances in Neural Information Processing Systems (NeurIPS)."
			link="https://arxiv.org/abs/1905.06743"
		/>
		<BibElement
			authors={['Barber, R. F.', 'Candès, E. J.', 'Ramdas, A.', 'Tibshirani, R. J.']}
			year={2020}
			title="Predictive Inference with the Jackknife+"
			journal="Annals of Statistics, 49(1), 486-507."
			link="https://arxiv.org/abs/1812.00533"
		/>
	</Bibliography>
</PageTemplate>
