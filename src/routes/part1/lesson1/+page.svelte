<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import DefinitionBlock from '$lib/components/narrative/DefinitionBlock.svelte';
	import TheoremBlock from '$lib/components/narrative/TheoremBlock.svelte';
	import ExampleBlock from '$lib/components/narrative/ExampleBlock.svelte';
	import ExercisePanel from '$lib/components/narrative/ExercisePanel.svelte';
	import InteractiveSection from '$lib/components/narrative/InteractiveSection.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import ContourLandscape from '$lib/components/demos/ContourLandscape.svelte';
	import GradientField from '$lib/components/demos/GradientField.svelte';
	import HessianExplorer from '$lib/components/demos/HessianExplorer.svelte';
	import ConvexityDemo from '$lib/components/demos/ConvexityDemo.svelte';
	import CoercivityVisualizer from '$lib/components/demos/CoercivityVisualizer.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';

	const meta = getPageByPath('/part1/lesson1');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	// ── Formula variables (stored in script so Svelte never parses backslashes) ──

	// Core objects
	const fOmegaR = 'f : \\Omega \\to \\mathbb{R}';
	const omegaSubsetRn = '\\Omega \\subseteq \\mathbb{R}^n';
	const omegaSym = '\\Omega';
	const fSym = 'f';
	const xSym = 'x';
	const xStarSym = 'x^*';
	const epsSym = '\\varepsilon';
	const epsPos = '\\varepsilon > 0';
	const xStarInOmega = 'x^* \\in \\Omega';
	const ballDef = 'B(x^*, \\varepsilon)';
	const xyInOmegaLambda = 'x, y \\in \\Omega,\\ \\lambda \\in [0, 1]';

	// Minima definitions
	const minLocalIneq = 'f(x^*) \\le f(x),\\quad \\forall x \\in B(x^*, \\varepsilon) \\cap \\Omega';
	const minGlobalIneq = 'f(x^*) \\le f(x),\\quad \\forall x \\in \\Omega';

	// Optimality conditions
	const nablaZero = '\\nabla f(x^*) = 0';
	const hessSemiPos = 'H_f(x^*) \\succeq 0';
	const hessDefPos = 'H_f(x^*) \\succ 0';

	// Convexity
	const convexityIneq = 'f(\\lambda x + (1-\\lambda)y) \\le \\lambda f(x) + (1-\\lambda)f(y)';
	const nablaIffGlobal = '\\nabla f(x^*) = 0 \\iff x^* \\text{ est un minimum global de } f';

	// Coercivity
	const hessianMatrix = 'H_f(0,0)=\\begin{pmatrix} 2 & 0 \\\\ 0 & 0 \\end{pmatrix}';
	const coerciveLimit = '\\lim_{\\|x\\|\\to +\\infty} f(x) = +\\infty';
	const sublevelSet = '\\{x \\mid f(x) \\le c\\}';

	// Example 1.8: f(x) = x⁴ − x²
	const fx4mx2 = 'f(x) = x^4 - x^2';
	const gradFx4 = '\\nabla f(x) = 4x^3 - 2x';
	const hessFx4 = "f''(x) = 12x^2 - 2";
	const pmSqrt2 = 'x = \\pm 1/\\sqrt{2}';
	const fxxAtPm = "f''(\\pm 1/\\sqrt{2}) = 4 > 0";
	const xZero = 'x = 0';
	const fppZeroNeg2 = "f''(0) = -2";
	const gradZeroCheck = '4(1/\\sqrt{2})^3 - 2(1/\\sqrt{2}) = 0';
	const hessPositive = '12(1/2) - 2 = 4 > 0';

	// Example 1.9: f(x) = x³
	const fx3 = 'f(x) = x^3';
	const fpx3x2 = "f'(x) = 3x^2";
	const fppx6x = "f''(x) = 6x";
	const yx3 = 'y = x^3';

	// Example 1.10: f(x,y) = x² − x⁴ − y⁴ (two-variable — do NOT reuse fx4mx2 here)
	const fx2y2 = 'f(x,y) = x^2 - x^4 - y^4';
	const eigenvals = '\\lambda_1 = 2 > 0,\\ \\lambda_2 = 0';
	const xAbsLarge = '|x| \\to \\infty';
	const negX4 = '-x^4';
	const fToNegInf = 'f \\to -\\infty';

	// Exercise 1.3
	const fxMy = 'f(x,0) = x^2-x^4';
	const fyx = 'f(0,y)=-y^4';
	const fyxNonPositive = 'f(0,y) = -y^4 \\le 0';
	const fxMyNonNegative = 'f(x,0) = x^2(1-x^2) \\ge 0';
	const originPoint = '(0,0)';

	// Coercivity callout
	const fExpNeg = 'f(x) = e^{-x}';

	// Synthesis table
	const fDiffOmegaOpen = 'f \\text{ différentiable}, \\Omega \\text{ ouvert}';
	const fTwiceDiff = 'f \\text{ deux fois différentiable}';
	const fConvexDiff = 'f \\text{ convexe et différentiable}';
	const fContCoerciveRn = 'f \\text{ continue et coercive sur } \\mathbb{R}^n';
</script>

<svelte:head>
	<title>{meta?.title} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? "Conditions d'existence d'un minimum"}
	subtitle="Partie I"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<h2>Introduction</h2>
		<p>
			L'objectif de ce cours est de comprendre les conditions qui garantissent l'existence d'un
			minimum pour une fonction objectif en optimisation. Nous étudierons successivement les
			définitions fondamentales, les conditions nécessaires et suffisantes du premier et second
			ordre, le rôle de la convexité, et enfin la coercivité comme garantie d'existence globale.
		</p>

		<Callout type="intuition" title="Pourquoi ces conditions ?">
			Tout algorithme d'optimisation doit répondre à deux questions : (1) comment savoir qu'on a
			trouvé un optimum ? et (2) est-on certain que cet optimum existe ? Cette leçon apporte les
			outils théoriques pour y répondre.
		</Callout>

		<h2>Définitions préliminaires</h2>

		<p>
			Soit <KatexInline formula={fOmegaR} /> une fonction définie sur un ensemble <KatexInline
				formula={omegaSubsetRn}
			/>. On distingue deux notions de minimum.
		</p>

		<DefinitionBlock number="1.1" title="Minimum local">
			<p>
				On dit que <KatexInline formula={xStarInOmega} /> est un <strong>minimum local</strong> s'il
				existe <KatexInline formula={epsPos} /> tel que :
			</p>
			<KatexBlock formula={minLocalIneq} />
			<p>
				où <KatexInline formula={ballDef} /> désigne la boule ouverte centrée en <KatexInline
					formula={xStarSym}
				/> de rayon <KatexInline formula={epsSym} />.
			</p>
		</DefinitionBlock>

		<DefinitionBlock number="1.2" title="Minimum global">
			<p>
				On dit que <KatexInline formula={xStarInOmega} /> est un <strong>minimum global</strong> si :
			</p>
			<KatexBlock formula={minGlobalIneq} />
			<p>
				Tout minimum global est automatiquement un minimum local, mais l'inverse est faux en
				général.
			</p>
		</DefinitionBlock>

		<InteractiveSection tag="Explorez">
			<ContourLandscape />
		</InteractiveSection>

		<h2>Conditions nécessaires d'optimalité</h2>

		<p>
			Première question : si on trouve un point candidat au minimum, quelles propriétés doit-il
			vérifier ?
		</p>

		<TheoremBlock number="1.3" title="CNO — Condition nécessaire du premier ordre">
			<p>
				Soit <KatexInline formula={fOmegaR} /> différentiable sur <KatexInline
					formula={omegaSym}
				/>, avec <KatexInline formula={omegaSym} /> ouvert. Si <KatexInline formula={xStarSym} /> est
				un minimum local, alors :
			</p>
			<KatexBlock formula={nablaZero} />
		</TheoremBlock>

		<Callout type="warning" title="Attention !">
			Cette condition est <strong>nécessaire mais pas suffisante</strong>. Un point où le gradient
			s'annule peut être un minimum, un maximum, ou un point-selle. Il faut examiner l'ordre 2 pour
			trancher.
		</Callout>

		<TheoremBlock number="1.4" title="CNSO — Condition nécessaire du second ordre">
			<p>
				Soit <KatexInline formula={fSym} /> deux fois différentiable sur <KatexInline
					formula={omegaSym}
				/>, avec <KatexInline formula={omegaSym} /> ouvert. Si <KatexInline formula={xStarSym} /> est
				un minimum local, alors :
			</p>
			<ol>
				<li><KatexInline formula={nablaZero} /> (gradient nul)</li>
				<li>
					<KatexInline formula={hessSemiPos} />, c'est-à-dire que la matrice hessienne est
					<strong>semi-définie positive</strong>
				</li>
			</ol>
			<p>
				Un point critique avec Hessien semi-défini positif peut encore être un minimum ou un
				point-selle — la condition reste nécessaire.
			</p>
		</TheoremBlock>

		<InteractiveSection tag="Champ de gradient">
			<GradientField />
		</InteractiveSection>

		<h2>Conditions suffisantes d'optimalité</h2>

		<p>
			L'inverse est-il vrai ? Si le Hessien est bien défini positif, peut-on conclure qu'on a un
			minimum ?
		</p>

		<TheoremBlock number="1.5" title="CSSO — Condition suffisante du second ordre">
			<p>
				Soit <KatexInline formula={fSym} /> deux fois différentiable sur <KatexInline
					formula={omegaSym}
				/>, avec <KatexInline formula={omegaSym} /> ouvert. Si en un point <KatexInline
					formula={xStarSym}
				/> :
			</p>
			<ol>
				<li><KatexInline formula={nablaZero} /> (gradient nul)</li>
				<li>
					<KatexInline formula={hessDefPos} />, c'est-à-dire que la matrice hessienne est
					<strong>définie positive</strong>
				</li>
			</ol>
			<p>Alors <KatexInline formula={xStarSym} /> est un <strong>minimum local strict</strong>.</p>
		</TheoremBlock>

		<InteractiveSection tag="Courbure du Hessien">
			<HessianExplorer />
		</InteractiveSection>

		<h2>Convexité et minimum global</h2>

		<p>
			La convexité est la propriété clé qui permet de passer d'un minimum local à un minimum global.
		</p>

		<DefinitionBlock number="1.6" title="Fonction convexe">
			<p>
				Soit <KatexInline formula={omegaSubsetRn} /> un ensemble convexe. Une fonction <KatexInline
					formula={fOmegaR}
				/> est <strong>convexe</strong> si pour tout <KatexInline formula={xyInOmegaLambda} /> :
			</p>
			<KatexBlock formula={convexityIneq} />
			<p>Autrement dit, la corde reliant deux points de la courbe reste au-dessus du graphe.</p>
		</DefinitionBlock>

		<InteractiveSection tag="Visualiser la convexité">
			<ConvexityDemo />
		</InteractiveSection>

		<TheoremBlock
			number="1.7"
			title="Condition nécessaire et suffisante pour les fonctions convexes"
		>
			<p>
				Soit <KatexInline formula={fOmegaR} /> convexe et différentiable, avec <KatexInline
					formula={omegaSym}
				/> convexe ouvert. Alors :
			</p>
			<KatexBlock formula={nablaIffGlobal} />
			<p>
				C'est le résultat fondamental de l'optimisation convexe : en contexte convexe, la CNO
				devient à la fois nécessaire et suffisante, et elle garantit un optimum <strong
					>global</strong
				>.
			</p>
		</TheoremBlock>

		<h2>Contre-exemples et cas limites</h2>

		<p>
			Il est essentiel de comprendre pourquoi chaque hypothèse compte. Voici trois contre-exemples
			classiques.
		</p>

		<ExampleBlock number="1.8" title="f(x) = x⁴ − x² : minima globaux sans convexité">
			<p>
				Soit <KatexInline formula={fx4mx2} />. On a <KatexInline formula={gradFx4} /> et <KatexInline
					formula={hessFx4}
				/>. Les points critiques sont en <KatexInline formula={xZero} /> et <KatexInline
					formula={pmSqrt2}
				/>.
			</p>
			<ul>
				<li><KatexInline formula={fxxAtPm} /> — ce sont des minima locaux (et globaux)</li>
				<li>
					<KatexInline formula={fppZeroNeg2} />, strictement négatif : c'est un maximum local
				</li>
			</ul>
			<p>
				Cette fonction possède donc des minima globaux mais n'est <strong>pas convexe</strong>, car
				sa courbure en <KatexInline formula={xZero} /> est strictement négative. Cela montre que la convexité
				est une condition suffisante, mais non nécessaire, pour l'existence d'un minimum.
			</p>
		</ExampleBlock>

		<ExercisePanel number="1.1" title="Points critiques de x⁴ − x²">
			{#snippet solution()}
				<p>
					Le gradient s'annule : <KatexInline formula={gradZeroCheck} />. La dérivée seconde vaut
					<KatexInline formula={hessPositive} />, donc minimum strict par CSSO.
				</p>
			{/snippet}
			<p>
				Vérifiez manuellement que les points <KatexInline formula={pmSqrt2} /> sont bien des minima en
				évaluant le gradient et la dérivée seconde.
			</p>
		</ExercisePanel>

		<ExampleBlock number="1.9" title="f(x) = x³ : point critique sans optimum">
			<p>
				Soit <KatexInline formula={fx3} />. On a <KatexInline formula={fpx3x2} /> qui s'annule en
				<KatexInline formula={xZero} />, et <KatexInline formula={fppx6x} /> qui vaut aussi $0$ en
				<KatexInline formula={xZero} />. Le point <KatexInline formula={xZero} /> est donc un point critique,
				mais il n'est ni minimum ni maximum — c'est un <strong>point d'inflexion</strong>.
			</p>
			<p>
				Cet exemple montre que l'annulation du gradient seule ne suffit pas, et même un Hessien nul
				laisse le point indécis. Il faut examiner les ordres supérieurs ou changer d'approche.
			</p>
		</ExampleBlock>

		<ExercisePanel number="1.2" title="L'inflexion cubique">
			{#snippet solution()}
				<p>
					La fonction traverse l'horizontale sans rebondir : elle est strictement croissante de part
					et d'autre. Le gradient s'annule mais ne change pas de signe.
				</p>
			{/snippet}
			<p>
				Dessinez la courbe <KatexInline formula={yx3} /> et observez pourquoi le point en <KatexInline
					formula={xZero}
				/> n'est pas un extremum.
			</p>
		</ExercisePanel>

		<ExampleBlock
			number="1.10"
			title="f(x,y) = x² − x⁴ − y⁴ : Hessien semi-défini positif, mais selle"
		>
			<p>
				Soit la fonction <KatexInline formula={fx2y2} /> à deux variables. Le gradient s'annule en l'origine
				et le Hessien vaut :
			</p>
			<KatexBlock formula={hessianMatrix} />
			<p>
				Ce Hessien a les valeurs propres <KatexInline formula={eigenvals} />, donc il est
				<strong>semi-défini positif</strong>. Pourtant, en regardant l'axe <KatexInline
					formula={xSym}
				/> pour <KatexInline formula={xAbsLarge} />, le terme <KatexInline formula={negX4} /> domine et
				fait tendre <KatexInline formula={fToNegInf} />. L'origine n'est pas un minimum — c'est un
				point-selle dégénéré.
			</p>
			<p>
				Cet exemple montre que la CNSO ne suffit pas : semi-défini positif $\neq$ minimum garanti.
				Il faut défini positif pour conclure (CSSO).
			</p>
		</ExampleBlock>

		<ExercisePanel number="1.3" title="Le cas du selle dégénéré">
			{#snippet solution()}
				<p>
					Le long de l'axe des $y$ : <KatexInline formula={fyxNonPositive} />, avec égalité
					uniquement en $y=0$. L'origine est donc un <strong>maximum strict</strong> le long de
					cette direction — ce qui suffit déjà à exclure que ce soit un minimum (local ou global) de <KatexInline
						formula={fSym}
					/>.
				</p>
				<p>
					Pourtant, le long de l'axe des $x$ : <KatexInline formula={fxMyNonNegative} /> près de l'origine,
					donc c'est au contraire un <strong>minimum local</strong> sur cet axe. Le Hessien (valeurs
					propres <KatexInline formula={eigenvals} />) ne voit que la courbure d'ordre 2 et reste
					semi-défini positif — il ne détecte pas la décroissance d'ordre 4 le long de $y$. C'est
					exactement le piège de la CNSO : Hessien PSD $\neq$ minimum garanti.
				</p>
			{/snippet}
			<p>
				Montrez que <KatexInline formula={fyx} /> admet un maximum strict en l'origine (donc que l'origine
				ne peut pas être un minimum de <KatexInline formula={fSym} />), alors que <KatexInline
					formula={fxMy}
				/> admet au contraire un minimum local en l'origine. Que révèle cette contradiction sur ce que
				le Hessien peut ou ne peut pas détecter en <KatexInline formula={originPoint} /> ?
			</p>
		</ExercisePanel>

		<h2>Coercivité et existence d'un minimum global</h2>

		<p>
			La question ultime : existe-t-il au moins un minimum ? La coercivité donne une réponse
			affirmative sous conditions simples.
		</p>

		<DefinitionBlock number="1.11" title="Fonction coercive">
			<p>
				Une fonction <KatexInline formula={fOmegaR} /> est <strong>coercive</strong> si :
			</p>
			<KatexBlock formula={coerciveLimit} />
			<p>Géométriquement, la fonction "remonte à l'infini" dans toutes les directions.</p>
		</DefinitionBlock>

		<InteractiveSection tag="Visualiser la coercivité">
			<CoercivityVisualizer />
		</InteractiveSection>

		<TheoremBlock number="1.12" title="Théorème de Weierstrass généralisé">
			<p>
				Soit <KatexInline formula={fOmegaR} /> continue sur <KatexInline formula={omegaSubsetRn} />.
				Si :
			</p>
			<ol>
				<li><KatexInline formula={omegaSym} /> est <strong>fermé et non vide</strong>, ET</li>
				<li>
					<KatexInline formula={fSym} /> est <strong>coercive</strong> (ou <KatexInline
						formula={omegaSym}
					/> est compact)
				</li>
			</ol>
			<p>Alors <KatexInline formula={fSym} /> admet <strong>au moins un minimum global</strong>.</p>
			<p>
				Ce résultat s'appuie sur le théorème de Weierstrass : une fonction continue atteint ses
				bornes sur un ensemble compact. La coercivité garantit que les sous-niveaux <KatexInline
					formula={sublevelSet}
				/> sont compacts.
			</p>
		</TheoremBlock>

		<Callout type="intuition" title="Pourquoi la coercivité ?">
			Si <KatexInline formula={fSym} /> n'est pas coercive, elle peut s'échapper sans jamais atteindre
			un minimum. Exemple : <KatexInline formula={fExpNeg} /> sur les réels tend vers 0 mais ne l'atteint
			jamais. La coercivité ferme cette porte en forçant la fonction à augmenter loin de l'origine.
		</Callout>

		<h2>Synthèse — Hiérarchie des conditions</h2>

		<p>Le tableau suivant récapitule les résultats vus dans cette leçon.</p>

		<div class="synthesis-table">
			<table>
				<thead>
					<tr>
						<th>Type</th>
						<th>Hypothèse</th>
						<th>Résultat</th>
						<th>Garantie</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Nécessaire (1er ordre)</td>
						<td><KatexInline formula={fDiffOmegaOpen} /></td>
						<td><KatexInline formula={nablaZero} /></td>
						<td>Critique</td>
					</tr>
					<tr>
						<td>Nécessaire (2ᵉ ordre)</td>
						<td><KatexInline formula={fTwiceDiff} /></td>
						<td><KatexInline formula={nablaZero} />, <KatexInline formula={hessSemiPos} /></td>
						<td>Critique + courbure ≥ 0</td>
					</tr>
					<tr>
						<td>Suffisant (2ᵉ ordre)</td>
						<td><KatexInline formula={fTwiceDiff} /></td>
						<td><KatexInline formula={nablaZero} />, <KatexInline formula={hessDefPos} /></td>
						<td>Minimum local strict</td>
					</tr>
					<tr>
						<td>Convexité + CNO</td>
						<td><KatexInline formula={fConvexDiff} /></td>
						<td><KatexInline formula={nablaIffGlobal} /></td>
						<td>Minimum global</td>
					</tr>
					<tr>
						<td>Coercivité + continuité</td>
						<td><KatexInline formula={fContCoerciveRn} /></td>
						<td>Existence d'un minimum global</td>
						<td>Global garanti</td>
					</tr>
				</tbody>
			</table>
		</div>

		<Callout type="summary" title="Retenir">
			L'ordre logique pour analyser un problème d'optimisation est : (1) chercher les points
			critiques (gradient nul), (2) classifier avec le Hessien, (3) vérifier la convexité pour
			garantir l'optimalité globale, et (4) vérifier la coercivité si on veut s'assurer qu'un
			minimum existe bel et bien.
		</Callout>
	</TheorySection>
</PageTemplate>

<style>
	.synthesis-table {
		margin: 1.5rem 0;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	th,
	td {
		padding: 0.6rem 0.8rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	th {
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		background: var(--color-surface-2);
	}

	tbody tr:hover {
		background: var(--color-surface-1, transparent);
	}
</style>
