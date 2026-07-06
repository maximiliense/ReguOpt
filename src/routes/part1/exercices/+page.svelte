<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import ExercisePanel from '$lib/components/narrative/ExercisePanel.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import TableOfContents from '$lib/components/narrative/TableOfContents.svelte';

	const meta = getPageByPath('/part1/exercices');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

	// ── Table of Contents ──
	interface TocEntry {
		id: string;
		label: string;
		description?: string;
		color: 'epistemic' | 'positive' | 'neutral' | 'belief' | 'surprise' | 'agent';
	}

	const tocEntries: TocEntry[] = [
		{
			id: 'conditions-minimum',
			label: "Conditions d'un minimum",
			description: '20 exercices — minima locaux/globaux, CNO, CSSO, convexité, coercivité',
			color: 'epistemic'
		},
		{
			id: 'fonctions-ml',
			label: 'Fonctions en Machine Learning',
			description: '20 exercices — propriétés conservées, Ridge, Lasso, logistique',
			color: 'positive'
		},
		{
			id: 'descente-gradient-acceleration',
			label: 'Descente de gradient et accélération',
			description: '20 exercices — GD, Momentum, Nesterov, taux de convergence',
			color: 'surprise'
		}
	];

	// ── Formula variables (stored in script so Svelte never parses backslashes) ──

	// Ex 2.1
	const f21 = 'f(x) = x^2 - 4x + 3';
	const f21p = "f'(x) = 2x - 4";
	const f21crit = 'x^* = 2';
	const f21pp = "f''(x) = 2 > 0";
	const f21val = 'f(2) = -1';

	// Ex 2.2
	const f22 = 'f(x) = -x^2 + 6x - 5';
	const f22p = "f'(x) = -2x + 6";
	const f22crit = 'x^* = 3';
	const f22pp = "f''(x) = -2 < 0";
	const f22inf = '\\lim_{x \\to \\pm\\infty} f(x) = -\\infty';

	// Ex 2.3
	const f23 = 'f(x) = x^4';
	const f23p = "f'(x) = 4x^3";
	const f23pp = "f''(x) = 12x^2";
	const f23ppZero = "f''(0) = 0";
	const f23ineq = 'f(x) = x^4 \\ge 0 = f(0),\\quad \\forall x';

	// Ex 2.4
	const f24 = 'f(x) = |x|';
	const f24ineq = 'f(x) = |x| \\ge 0 = f(0),\\quad \\forall x';

	// Ex 2.5
	const f25 = 'f(x,y) = x^2 + y^2';
	const f25grad = '\\nabla f(x,y) = (2x, 2y)';
	const f25hess = 'H_f = \\begin{pmatrix} 2 & 0 \\\\ 0 & 2 \\end{pmatrix} \\succ 0';

	// Ex 2.6
	const f26 = 'f(x,y) = x^2 - y^2';
	const f26grad = '\\nabla f(x,y) = (2x, -2y)';
	const f26hess = 'H_f = \\begin{pmatrix} 2 & 0 \\\\ 0 & -2 \\end{pmatrix}';
	const f26eig = '\\lambda_1 = 2 > 0,\\ \\lambda_2 = -2 < 0';

	// Ex 2.7
	const f27 = 'f(x) = 1/x,\\quad x \\in (0, +\\infty)';
	const f27p = "f'(x) = -1/x^2 \\neq 0,\\quad \\forall x > 0";
	const f27inf = '\\inf_{x>0} f(x) = 0,\\ \\text{jamais atteint}';

	// Ex 2.8
	const f28 = 'f(x) = e^x,\\quad x \\in \\mathbb{R}';
	const f28p = "f'(x) = e^x \\neq 0,\\quad \\forall x";
	const f28lim = '\\lim_{x \\to -\\infty} f(x) = 0 \\neq +\\infty';

	// Ex 2.9
	const f29a = 'g(x) = x^2';
	const f29b = 'h(x) = |x|';
	const f29sum = 'f(x) = g(x) + h(x) = x^2 + |x|';

	// Ex 2.10
	const f210 = 'f(x,y) = (x-1)^2 + (y+2)^2';
	const f210crit = '(x^*, y^*) = (1, -2)';
	const f210val = 'f(1,-2) = 0';

	// Ex 2.11
	const f211strict =
		'f(\\lambda x + (1-\\lambda)y) < \\lambda f(x) + (1-\\lambda)f(y),\\quad \\forall x \\neq y,\\ \\lambda \\in (0,1)';
	const f211contra =
		'f\\left(\\tfrac{x_1+x_2}{2}\\right) < \\tfrac{1}{2}f(x_1) + \\tfrac{1}{2}f(x_2) = f^*';

	// Ex 2.12
	const f212 = 'f(x) = x^3 - 3x';
	const f212p = "f'(x) = 3x^2 - 3";
	const f212crit = 'x = \\pm 1';
	const f212ppAt1 = "f''(1) = 6 > 0";
	const f212ppAtNeg1 = "f''(-1) = -6 < 0";
	const f212lim = '\\lim_{x \\to -\\infty} f(x) = -\\infty';

	// Ex 2.13
	const f213 = 'f(x) = \\cos(x),\\quad x \\in \\mathbb{R}';
	const f213min = 'f(\\pi + 2k\\pi) = -1,\\quad \\forall k \\in \\mathbb{Z}';

	// Ex 2.14
	const f214 = 'f(x,y) = x^4 + y^4 - 4xy';
	const f214grad = '\\nabla f(x,y) = (4x^3 - 4y,\\ 4y^3 - 4x)';
	const f214system =
		'x^3 = y,\\quad y^3 = x \\ \\Rightarrow\\ x^9 = x \\ \\Rightarrow\\ x \\in \\{-1, 0, 1\\}';
	const f214hess = 'H_f(x,y) = \\begin{pmatrix} 12x^2 & -4 \\\\ -4 & 12y^2 \\end{pmatrix}';
	const f214hess0 = 'H_f(0,0) = \\begin{pmatrix} 0 & -4 \\\\ -4 & 0 \\end{pmatrix}';
	const f214hess1 =
		'H_f(1,1) = \\begin{pmatrix} 12 & -4 \\\\ -4 & 12 \\end{pmatrix},\\ \\text{valeurs propres } 16, 8 > 0';
	const f214val = 'f(1,1) = f(-1,-1) = -2';

	// Ex 2.15
	const f215 = 'f(x) = x^2 + \\sin(x)';
	const f215bound = 'f(x) \\ge x^2 - 1 \\xrightarrow[|x| \\to \\infty]{} +\\infty';

	// Ex 2.16
	const f216 = 'f(x) = x^4 - 8x^2';
	const f216p = "f'(x) = 4x^3 - 16x = 4x(x^2-4)";
	const f216crit = 'x \\in \\{-2, 0, 2\\}';
	const f216pp = "f''(x) = 12x^2 - 16";
	const f216ppAt0 = "f''(0) = -16 < 0";
	const f216ppAt2 = "f''(\\pm 2) = 32 > 0";
	const f216val = 'f(\\pm 2) = -16';

	// Ex 2.17
	const f217 = 'f(x) = x,\\quad x \\in (0, 1)';
	const f217inf = '\\inf_{x \\in (0,1)} f(x) = 0,\\ \\text{jamais atteint}';

	// Ex 2.18
	const f218 = 'f(x) = e^{-x},\\quad x \\in [0, +\\infty)';
	const f218lim = '\\lim_{x \\to +\\infty} f(x) = 0 \\neq +\\infty';
	const f218inf = '\\inf_{x \\ge 0} f(x) = 0,\\ \\text{jamais atteint}';

	// Ex 2.19
	const f219case1 = '\\lambda_1 = 3,\\ \\lambda_2 = -1';
	const f219case2 = '\\lambda_1 = \\lambda_2 = 5';

	// Ex 2.20
	const f220 = 'f(x,y) = (x^2 + y^2 - 1)^2';
	const f220grad = '\\nabla f(x,y) = \\big(4x(x^2+y^2-1),\\ 4y(x^2+y^2-1)\\big)';
	const f220circle =
		'x^2 + y^2 = 1 \\ \\Rightarrow\\ \\nabla f(x,y) = (0,0)\\ \\text{et}\\ f(x,y) = 0';
</script>

<svelte:head>
	<title>{meta?.title ?? 'Exercices'} — Régularisation et Optimisation</title>
</svelte:head>

<PageTemplate
	title={meta?.title ?? "Exercices — Conditions d'existence d'un minimum"}
	subtitle="Partie I"
	prev={prevMeta}
	next={nextMeta}
>
	<TheorySection>
		<TableOfContents entries={tocEntries} />

		<h2 id="conditions-minimum">Conditions d'un minimum</h2>

		<p>
			Cette section propose vingt exercices couvrant l'ensemble des notions vues dans la leçon :
			minima locaux et globaux, conditions nécessaires et suffisantes du premier et second ordre,
			convexité, et coercivité. Chaque exercice est accompagné d'une solution détaillée, accessible
			en cliquant sur « Voir la solution ».
		</p>

		<ExercisePanel number="1.1" title="Minimum d'une parabole simple">
			{#snippet solution()}
				<p>
					On annule la dérivée : <KatexInline formula={f21p} /><KatexInline formula={`=0`} /> donne <KatexInline
						formula={f21crit}
					/>. La dérivée seconde <KatexInline formula={f21pp} /> est constante et positive, donc par CSSO,
					<KatexInline formula={`x^*=2`} /> est un minimum local strict. Comme <KatexInline
						formula={f21}
					/>
					d'un terme convexe (<KatexInline formula={`x^2`} />) et d'un terme affine, elle est
					convexe, donc ce minimum est en fait
					<strong>global</strong>. On calcule <KatexInline formula={f21val} />.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f21} />. Trouvez le point critique et montrez qu'il s'agit d'un
				minimum global.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.2" title="Un point critique qui n'est pas un minimum">
			{#snippet solution()}
				<p>
					<KatexInline formula={f22p} /><KatexInline formula={`=0`} /> donne formula={f22crit}
					/>. Or <KatexInline formula={f22pp} />, donc c'est un <strong>maximum local</strong> par
					CSSO (appliquée au signe opposé). De plus, <KatexInline formula={f22inf} /> : la fonction n'est
					pas bornée inférieurement, donc elle n'admet <strong>aucun minimum global</strong>, ni
					même local ailleurs qu'en ce point (qui est un maximum).
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f22} />. Montrez que le point critique est un maximum, et
				discutez de l'existence d'un minimum global.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.3" title="CSSO non nécessaire : Hessien nul en un vrai minimum">
			{#snippet solution()}
				<p>
					<KatexInline formula={f23p} /> s'annule en <KatexInline formula="x=0" />. La dérivée
					seconde <KatexInline formula={f23pp} /> donne <KatexInline formula={f23ppZero} /> : la CSSO
					est <strong>inconclusive</strong>. Pourtant, directement, <KatexInline
						formula={f23ineq}
					/>, donc <KatexInline formula="x=0" /> est bien un minimum global. Cet exercice montre que la
					CSSO est
					<strong>suffisante mais pas nécessaire</strong>
					: un minimum peut exister même quand le Hessien ne le certifie pas.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f23} />. Que dit la CSSO en <KatexInline formula="x=0" /> ? Le point
				est-il malgré tout un minimum ?
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.4" title="Minimum en un point non différentiable">
			{#snippet solution()}
				<p>
					<KatexInline formula={f24} /> n'est pas différentiable en <KatexInline formula="x=0" /> (les
					dérivées à gauche et à droite valent <KatexInline formula="-1" /> et <KatexInline
						formula="+1"
					/>) : la CNO (<KatexInline formula="\nabla f = 0" />) ne s'applique donc
					<strong>pas</strong>
					ici, faute d'hypothèse de différentiabilité. Pourtant <KatexInline formula="x=0" /> est bien
					le minimum global, car
					<KatexInline formula={f24ineq} />. Cela illustre que la différentiabilité est une
					hypothèse essentielle des théorèmes vus en cours : sans elle, il faut d'autres outils
					(sous-différentielle) pour caractériser l'optimalité.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f24} />. Pourquoi la CNO du premier ordre ne s'applique-t-elle
				pas en <KatexInline formula="x=0" /> ? Est-ce tout de même un minimum ?
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.5" title="Minimum global en dimension 2">
			{#snippet solution()}
				<p>
					<KatexInline formula={f25grad} /> s'annule uniquement en <KatexInline formula="(0,0)" />.
					Le Hessien <KatexInline formula={f25hess} /> est défini positif, donc par CSSO <KatexInline
						formula="(0,0)"
					/> est un minimum local strict. Comme <KatexInline formula={f25} /> est convexe (somme de deux
					carrés), c'est aussi un minimum <strong>global</strong>.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f25} />. Trouvez le point critique et classifiez-le à l'aide du
				Hessien.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.6" title="Point-selle malgré la CNO">
			{#snippet solution()}
				<p>
					<KatexInline formula={f26grad} /> s'annule en <KatexInline formula="(0,0)" /> : la CNO est satisfaite.
					Le Hessien <KatexInline formula={f26hess} /> a pour valeurs propres <KatexInline
						formula={f26eig}
					/>. Le signe mixte des valeurs propres signifie que le Hessien est
					<strong>indéfini</strong>
					: <KatexInline formula="(0,0)" /> est un
					<strong>point-selle</strong>, pas un minimum, bien que le gradient s'y annule.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f26} />. Vérifiez que la CNO est satisfaite en <KatexInline
					formula="(0,0)"
				/>, puis classifiez ce point à l'aide du Hessien.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.7" title="Absence de minimum : domaine non fermé">
			{#snippet solution()}
				<p>
					<KatexInline formula={f27p} />, donc <KatexInline formula="f" /> n'a
					<strong>aucun point critique</strong>
					sur
					<KatexInline formula="(0,+\infty)" /> : elle est strictement décroissante. On a <KatexInline
						formula={f27inf}
					/>. L'infimum n'est jamais atteint car il faudrait <KatexInline
						formula="x \to +\infty"
					/>, qui ne fait pas partie du domaine. Cet exemple illustre l'importance de l'hypothèse « <KatexInline
						formula="\Omega"
					/> fermé » dans le théorème de Weierstrass : ici <KatexInline
						formula="\Omega = (0,+\infty)"
					/> n'est pas fermé (il exclut <KatexInline formula="x=0" />), ce qui laisse la porte
					ouverte à une absence de minimum.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f27} />. Montrez qu'elle n'a pas de point critique, puis discutez
				de l'existence d'un minimum.
			</p>
		</ExercisePanel>

		<ExercisePanel
			number="1.8"
			title="Absence de minimum malgré un domaine fermé : défaut de coercivité"
		>
			{#snippet solution()}
				<p>
					<KatexInline formula={f28p} /> ne s'annule jamais : <KatexInline formula="f" /> est strictement
					croissante sur tout
					<KatexInline formula={String.raw`\mathbb{R}`} />. Ici <KatexInline
						formula={String.raw`\Omega = \mathbb{R}`}
					/> est bien fermé, mais <KatexInline formula={f28lim} /> : <KatexInline formula="f" /> n'est
					<strong>pas coercive</strong>
					(la limite doit valoir <KatexInline formula="+\infty" /> dans
					<strong>toutes</strong> les directions, or ici elle vaut <KatexInline formula="0" /> quand <KatexInline
						formula="x \to -\infty"
					/>). L'infimum
					<KatexInline formula="0" /> n'est jamais atteint. Cela montre que même avec un domaine fermé,
					l'absence de coercivité suffit à empêcher l'existence d'un minimum.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f28} />. Montrez qu'elle n'est pas coercive, et discutez de
				l'existence d'un minimum.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.9" title="Convexité par somme">
			{#snippet solution()}
				<p>
					<KatexInline formula={f29a} /> est convexe (c'est une forme quadratique à coefficient positif).
					<KatexInline formula={f29b} /> est convexe (c'est une norme, et toute norme vérifie l'inégalité
					triangulaire, qui implique la convexité). La somme de deux fonctions convexes est convexe (l'inégalité
					de convexité s'additionne terme à terme), donc <KatexInline formula={f29sum} /> est convexe.
				</p>
			{/snippet}
			<p>
				Montrez que <KatexInline formula={f29sum} /> est convexe, en utilisant la convexité de
				<KatexInline formula={f29a} /> et de <KatexInline formula={f29b} /> séparément.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.10" title="Minimum d'un paraboloïde translaté">
			{#snippet solution()}
				<p>
					Le gradient de <KatexInline formula={f210} /> est <KatexInline
						formula="\nabla f(x,y) = (2(x-1), 2(y+2))"
					/>, qui s'annule en <KatexInline formula={f210crit} />. Le Hessien est constant <KatexInline
						formula="2I \succ 0"
					/>, donc c'est un minimum global (fonction convexe), avec <KatexInline
						formula={f210val}
					/>.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f210} />. Trouvez le minimum global sans calcul détaillé, par
				simple lecture de la structure de <KatexInline formula="f" />, puis vérifiez avec le
				gradient.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.11" title="Unicité du minimum pour une fonction strictement convexe">
			{#snippet solution()}
				<p>
					Supposons par l'absurde que <KatexInline formula="f" /> strictement convexe admette deux minimiseurs
					globaux distincts <KatexInline formula="x_1 \neq x_2" />, tous deux de valeur minimale <KatexInline
						formula="f^* = f(x_1) = f(x_2)"
					/>. Par stricte convexité en <KatexInline formula="\lambda = 1/2" /> : <KatexInline
						formula={f211contra}
					/>. Mais <KatexInline formula="f^*" /> est censée être la valeur minimale, donc <KatexInline
						formula={String.raw`f(\frac{x_1 + x_2}{2}) \ge f^*`}
					/> — contradiction. Donc le minimiseur global d'une fonction strictement convexe, s'il existe,
					est
					<strong>unique</strong>.
				</p>
			{/snippet}
			<p>
				Une fonction <KatexInline formula="f" /> est dite <strong>strictement convexe</strong> si <KatexInline
					formula={f211strict}
				/>. Montrez que si <KatexInline formula="f" /> est strictement convexe, elle admet
				<strong>au plus un</strong>
				minimiseur global.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.12" title="Un minimum local qui n'est pas global">
			{#snippet solution()}
				<p>
					<KatexInline formula={f212p} /> s'annule en <KatexInline formula={f212crit} />. On a <KatexInline
						formula={f212ppAt1}
					/>, donc <KatexInline formula="x=1" /> est un minimum local strict (<KatexInline
						formula="f(1)=-2"
					/>), et <KatexInline formula={f212ppAtNeg1} />, donc <KatexInline formula="x=-1" /> est un maximum
					local (<KatexInline formula="f(-1)=2" />). Cependant <KatexInline formula={f212lim} />,
					donc <KatexInline formula="f" /> n'est pas bornée inférieurement : <KatexInline
						formula="x=1"
					/> est un minimum <strong>local</strong>
					mais pas <strong>global</strong>. Cela illustre pourquoi convexité et coercivité sont
					nécessaires pour passer du local au global.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f212} />. Classifiez les deux points critiques, et montrez qu'il
				n'existe pas de minimum global.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.13" title="Coercivité non nécessaire : minimum global sans coercivité">
			{#snippet solution()}
				<p>
					<KatexInline formula={f213} /> est bornée (donc pas coercive : elle ne tend jamais vers <KatexInline
						formula="+\infty"
					/>). Pourtant elle admet une infinité de minima globaux : <KatexInline
						formula={f213min}
					/>. Cela montre que la coercivité est une condition
					<strong>suffisante mais non nécessaire</strong> pour l'existence d'un minimum global — ici l'existence
					vient de la compacité effective du comportement périodique, pas d'une croissance à l'infini.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f213} />. Montrez qu'elle n'est pas coercive, mais qu'elle admet
				tout de même un minimum global.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.14" title="Classification de plusieurs points critiques en 2D">
			{#snippet solution()}
				<p>
					<KatexInline formula={f214grad} />. En annulant, <KatexInline formula={f214system} />. Le
					Hessien général est <KatexInline formula={f214hess} />. En <KatexInline formula="(0,0)" /> :
					<KatexInline formula={f214hess0} />, valeurs propres <KatexInline formula="\pm 4" /> — indéfini,
					donc <strong>point-selle</strong>. En <KatexInline formula="(1,1)" /> : <KatexInline
						formula={f214hess1}
					/> — défini positif, donc <strong>minimum local strict</strong>, avec <KatexInline
						formula={f214val}
					/> (même valeur en <KatexInline formula="(-1,-1)" /> par symétrie).
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f214} />. Trouvez tous les points critiques et classifiez-les à
				l'aide du Hessien.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.15" title="Coercivité malgré un terme oscillant">
			{#snippet solution()}
				<p>
					Comme <KatexInline formula="|\sin(x)| \le 1" /> pour tout <KatexInline formula="x" />, on
					a la minoration <KatexInline formula={f215bound} />. Le terme oscillant <KatexInline
						formula="\sin(x)"
					/> ne peut donc jamais empêcher <KatexInline formula="f" /> de tendre vers <KatexInline
						formula="+\infty"
					/>
					:
					<KatexInline formula={f215} /> est bien <strong>coercive</strong>, malgré une dérivée qui
					change de signe une infinité de fois.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f215} />. Montrez qu'elle est coercive malgré le terme oscillant
				<KatexInline formula="\sin(x)" />.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.16" title="Double puits symétrique">
			{#snippet solution()}
				<p>
					<KatexInline formula={f216p} /> s'annule en <KatexInline formula={f216crit} />. On a <KatexInline
						formula={f216pp}
					/> donc <KatexInline formula={f216ppAt0} /> (maximum local en <KatexInline
						formula={`0`}
					/>) et <KatexInline formula={f216ppAt2} /> (minima locaux stricts en <KatexInline
						formula={String.raw`x=\pm 2`}
					/>). Par symétrie et coercivité de <KatexInline formula={`f`} /> (car <KatexInline
						formula={`x^4`}
					/> domine
					<KatexInline formula={`-8x^2`} /> à l'infini), ces deux points sont en fait des minima
					<strong>globaux</strong>, avec <KatexInline formula={f216val} />.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f216} />. Trouvez tous les points critiques, classifiez-les, et
				identifiez les minima globaux.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.17" title="Nécessité de la fermeture du domaine">
			{#snippet solution()}
				<p>
					<KatexInline formula={f217inf} />, mais <KatexInline formula={`x=0 \notin (0,1)`} />, donc
					l'infimum n'est jamais atteint : <KatexInline formula={`f`} /> n'a
					<strong>pas de minimum</strong>
					sur cet intervalle ouvert. Pourtant <KatexInline formula={`f`} /> est continue et même bornée.
					Cela illustre précisément pourquoi le théorème de Weierstrass exige que <KatexInline
						formula={String.raw`\Omega`}
					/> soit <strong>fermé</strong> : sur <KatexInline formula={`[0,1]`} /> fermé, le même <KatexInline
						formula={`f`}
					/> atteindrait bien son minimum en <KatexInline formula={`x=0`} />.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f217} />. Montrez que <KatexInline formula={`f`} /> n'admet pas de
				minimum sur cet intervalle, bien qu'elle soit continue et bornée.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.18" title="Domaine fermé mais absence de coercivité">
			{#snippet solution()}
				<p>
					Ici <KatexInline formula={String.raw`\Omega = [0, +\infty)`} /> est bien fermé et non vide.
					Mais <KatexInline formula={f218lim} />, donc <KatexInline formula={`f`} /> n'est
					<strong>pas coercive</strong>. On a <KatexInline formula={f218inf} />. Cet exercice
					complète le précédent : même avec un domaine fermé (contrairement à l'exercice 2.17),
					l'absence de coercivité suffit à elle seule à empêcher l'existence d'un minimum — les deux
					hypothèses du théorème de Weierstrass sont indépendantes et toutes deux nécessaires.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f218} />. Montrez que, bien que le domaine soit fermé, <KatexInline
					formula={`f`}
				/> n'admet pas de minimum.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.19" title="Classification directe à partir des valeurs propres">
			{#snippet solution()}
				<p>
					<strong>Cas 1</strong> — <KatexInline formula={f219case1} /> : les valeurs propres sont de signes
					opposés, le Hessien est <strong>indéfini</strong> : c'est un point-selle.
					<br />
					<strong>Cas 2</strong> — <KatexInline formula={f219case2} /> : les deux valeurs propres sont
					strictement positives, le Hessien est <strong>défini positif</strong> : par CSSO, c'est un minimum
					local strict.
				</p>
			{/snippet}
			<p>
				En un point critique d'une fonction de deux variables, le Hessien a pour valeurs propres,
				dans deux cas séparés : (1) <KatexInline formula={f219case1} />, et (2) <KatexInline
					formula={f219case2}
				/>. Classifiez le point critique dans chaque cas.
			</p>
		</ExercisePanel>

		<ExercisePanel number="1.20" title="Une infinité de minima globaux : perte de l'unicité">
			{#snippet solution()}
				<p>
					<KatexInline formula={f220grad} />. Sur le cercle unité, <KatexInline
						formula={f220circle}
					/>
					: le gradient s'annule et <KatexInline formula={`f`} /> y vaut <KatexInline
						formula={`0`}
					/>, qui est bien la valeur minimale possible puisque <KatexInline formula={`f`} /> est un carré.
					Tout point du cercle <KatexInline formula={`x^2+y^2=1`} /> est donc un minimum global. Contrairement
					à l'exercice 2.11, <KatexInline formula={`f`} /> n'est pas strictement convexe (elle est même
					non-convexe), ce qui explique cette perte d'unicité : une <strong>continuité</strong>
					de minimiseurs globaux, et non un point isolé.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={f220} />. Montrez qu'elle admet une infinité de minima globaux,
				et expliquez en quoi cela ne contredit pas le résultat de l'exercice 2.11.
			</p>
		</ExercisePanel>
		<h2 id="fonctions-ml">Fonctions en ML</h2>

		<p>
			Cette section explore vingt exercices sur les propriétés des fonctions rencontrées en Machine
			Learning : conservation de la convexité par somme et moyenne, calcul de gradients et
			Hessiennes, coercivité, et régularisation Ridge/Lasso. Chaque exercice est accompagné d'une
			solution détaillée, accessible en cliquant sur « Voir la solution ».
		</p>

		<ExercisePanel number="2.1" title="Convexité d'une combinaison linéaire">
			<p>
				Soient <KatexInline formula="f_1,f_2" /> deux fonctions convexes sur
				<KatexInline formula="\Omega" />. Soient
				<KatexInline formula="\alpha,\beta \ge 0" />.
			</p>

			<ol>
				<li>
					Montrer que
					<KatexInline formula="g(x)=\alpha f_1(x)+\beta f_2(x)" />
					est convexe.
				</li>
				<li>
					Que se passe-t-il si
					<KatexInline formula="\alpha&lt;0" /> ?
				</li>
			</ol>

			{#snippet solution()}
				<p>
					Pour tout
					<KatexInline formula="x,y\in\Omega" />
					et
					<KatexInline formula="\lambda\in[0,1]" />, la convexité de
					<KatexInline formula="f_1" />
					et
					<KatexInline formula="f_2" />
					donne :
				</p>

				<KatexBlock
					formula={String.raw`\begin{aligned}
g(\lambda x+(1-\lambda)y)
&=\alpha f_1(\lambda x+(1-\lambda)y)+\beta f_2(\lambda x+(1-\lambda)y)\\
&\le
\alpha[\lambda f_1(x)+(1-\lambda)f_1(y)]\\
&\qquad+\beta[\lambda f_2(x)+(1-\lambda)f_2(y)]\\
&=\lambda g(x)+(1-\lambda)g(y).
\end{aligned}`}
				/>

				<p>
					Donc
					<KatexInline formula="g" />
					est convexe. En revanche, si un coefficient est négatif, la preuve ne fonctionne plus : une
					combinaison avec coefficient négatif peut devenir non convexe.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.2" title="Convexité d'une moyenne empirique">
			<p>
				Soient
				<KatexInline formula="n" />
				fonctions convexes
				<KatexInline formula="f_i" />. On définit
			</p>

			<KatexBlock formula={String.raw`F(x)=\frac1n\sum_{i=1}^n f_i(x).`} />

			<ol>
				<li>Montrer que <KatexInline formula="F" /> est convexe.</li>
				<li>Pourquoi cette propriété est-elle essentielle en apprentissage automatique ?</li>
			</ol>

			{#snippet solution()}
				<p>
					La moyenne est une combinaison convexe des fonctions
					<KatexInline formula="f_i" />, car tous les coefficients valent
					<KatexInline formula="1/n" />
					et sont positifs.
				</p>

				<KatexBlock
					formula="F(\lambda x+(1-\lambda)y)
=\frac1n\sum_i f_i(\lambda x+(1-\lambda)y)
\le
\lambda F(x)+(1-\lambda)F(y)."
				/>

				<p>
					Ainsi
					<KatexInline formula="F" />
					est convexe. En Machine Learning, cela garantit que la fonction de perte globale hérite de la
					convexité des pertes individuelles.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.3" title="Gradient d'une somme">
			<p>
				Soient deux fonctions différentiables
				<KatexInline formula="f,g:\mathbb R^d\rightarrow\mathbb R" />.
			</p>

			<ol>
				<li>
					Calculer
					<KatexInline formula="\nabla(f+g)" />.
				</li>
				<li>
					En déduire le gradient de
					<KatexInline formula="\frac1n\sum_i f_i" />.
				</li>
			</ol>

			{#snippet solution()}
				<p>La dérivation est linéaire :</p>

				<KatexBlock formula="\nabla(f+g)=\nabla f+\nabla g." />

				<p>En appliquant cette propriété terme à terme :</p>

				<KatexBlock
					formula={String.raw`\nabla\!\left(\frac1n\sum_{i=1}^n f_i\right)=\frac1n\sum_{i=1}^n\nabla f_i.`}
				/>

				<p>
					Cette formule est utilisée directement dans tous les algorithmes de descente de gradient.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.4" title="Hessienne d'une somme quadratique">
			<p>
				Soit
				<KatexInline formula={String.raw`f(x)=x^\top Ax+x^\top Bx`} />, où
				<KatexInline formula={String.raw`A,B`} />
				sont deux matrices symétriques.
			</p>

			<ol>
				<li>Calculer la Hessienne de <KatexInline formula={String.raw`f`} />.</li>
				<li>
					À quelle condition
					<KatexInline formula={String.raw`f`} />
					est-elle convexe ?
				</li>
			</ol>

			{#snippet solution()}
				<p>On sait que</p>

				<KatexBlock formula={String.raw`H_{x^\top Ax}=2A,\qquad H_{x^\top Bx}=2B.`} />

				<p>Donc</p>

				<KatexBlock formula={String.raw`H_f=2(A+B).`} />

				<p>
					La fonction est convexe si et seulement si
					<KatexInline formula={String.raw`A+B`} />
					est semi-définie positive.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.5" title="Composition affine">
			<p>
				Soit
				<KatexInline formula={String.raw`g(t)=t^2`} />
				et
				<KatexInline formula={String.raw`A(x)=Mx+b`} />.
			</p>

			<ol>
				<li>
					Écrire la fonction composée
					<KatexInline formula={String.raw`f=g\circ A`} />.
				</li>
				<li>Montrer qu'elle est convexe.</li>
			</ol>

			{#snippet solution()}
				<p>On obtient</p>

				<KatexBlock formula={String.raw`f(x)=\|Mx+b\|_2^2.`} />

				<p>
					La fonction
					<KatexInline formula={String.raw`t\mapsto\|t\|_2^2`} />
					est convexe, et
					<KatexInline formula={String.raw`A`} />
					est affine. Le théorème de composition affine implique donc que
					<KatexInline formula={String.raw`f`} />
					est convexe.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.6" title="Coercivité">
			<p>
				Soit
				<KatexInline formula={String.raw`f(x)=x^2+\sin(x).`} />
			</p>

			<ol>
				<li>Montrer que <KatexInline formula={String.raw`x^2`} /> est coercive.</li>
				<li>Montrer que <KatexInline formula={String.raw`\sin(x)`} /> est minorée.</li>
				<li>En déduire que <KatexInline formula={String.raw`f`} /> est coercive.</li>
			</ol>

			{#snippet solution()}
				<p>On a</p>

				<KatexBlock formula={String.raw`\lim_{|x|\to\infty}x^2=+\infty.`} />

				<p>De plus,</p>

				<KatexBlock formula={String.raw`-1\le\sin(x)\le1.`} />

				<p>Ainsi</p>

				<KatexBlock formula={String.raw`f(x)\ge x^2-1.`} />

				<p>
					Le membre de droite tend vers
					<KatexInline formula={String.raw`+\infty`} />, donc
					<KatexInline formula={String.raw`f`} />
					est coercive.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.7" title="Identifier les propriétés conservées">
			<p>
				Pour chacune des affirmations suivantes, répondre par
				<strong>Vrai</strong> ou
				<strong>Faux</strong> en justifiant.
			</p>

			<ol>
				<li>La somme de deux fonctions convexes est toujours convexe.</li>
				<li>La somme de deux fonctions différentiables est différentiable.</li>
				<li>La somme de deux fonctions coercives est coercive.</li>
				<li>La composition d'une fonction convexe avec une application affine est convexe.</li>
				<li>Toute somme de fonctions non convexes est non convexe.</li>
			</ol>

			{#snippet solution()}
				<ol>
					<li><strong>Vrai.</strong> C'est le théorème de conservation de la convexité.</li>
					<li><strong>Vrai.</strong> Les dérivées se somment.</li>
					<li>
						<strong>Vrai.</strong> Plus généralement, il suffit qu'un terme soit coercif et les autres
						soient minorés.
					</li>
					<li>
						<strong>Vrai.</strong> C'est le théorème de composition affine.
					</li>
					<li>
						<strong>Faux.</strong> Deux fonctions non convexes peuvent avoir une somme convexe.
					</li>
				</ol>
			{/snippet}
		</ExercisePanel>
		<ExercisePanel number="2.8" title="Convexité de la régression logistique">
			<p>
				On considère la perte logistique élémentaire
				<KatexInline formula={String.raw`f_i(w)=\log\!\left(1+e^{-y_iw^\top x_i}\right)`} />.
			</p>

			<ol>
				<li>
					Poser
					<KatexInline formula={String.raw`t=y_iw^\top x_i`} />.
				</li>
				<li>
					Montrer que la fonction
					<KatexInline formula={String.raw`t\mapsto\log(1+e^{-t})`} />
					est convexe.
				</li>
				<li>
					En déduire que
					<KatexInline formula={String.raw`f_i`} />
					est convexe en
					<KatexInline formula={String.raw`w`} />.
				</li>
			</ol>

			{#snippet solution()}
				<p>
					On écrit
					<KatexInline formula={String.raw`f_i(w)=g(t)`} />
					avec
					<KatexInline formula={String.raw`t=y_iw^\top x_i`} />
					et
					<KatexInline formula={String.raw`g(t)=\log(1+e^{-t})`} />.
				</p>

				<p>
					La dérivée seconde de
					<KatexInline formula={String.raw`g`} />
					vaut :
				</p>

				<KatexBlock
					formula={String.raw`
g''(t)=
\frac{e^{-t}}{(1+e^{-t})^2}
=
\sigma(t)\bigl(1-\sigma(t)\bigr)\ge0.
`}
				/>

				<p>
					La fonction
					<KatexInline formula={String.raw`g`} />
					est donc convexe. Comme
					<KatexInline formula={String.raw`t=y_iw^\top x_i`} />
					est une application affine de
					<KatexInline formula={String.raw`w`} />, le théorème de composition affine implique que
					<KatexInline formula={String.raw`f_i`} />
					est convexe.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.9" title="Gradient de la perte quadratique">
			<p>Soit la fonction</p>

			<KatexBlock
				formula={String.raw`
f(w)=
\frac12(y-w^\top x)^2.
`}
			/>

			<ol>
				<li>
					Calculer
					<KatexInline formula={String.raw`\nabla f(w)`} />.
				</li>
				<li>
					Calculer
					<KatexInline formula={String.raw`H_f(w)`} />.
				</li>
				<li>
					Conclure sur la convexité de
					<KatexInline formula={String.raw`f`} />.
				</li>
			</ol>

			{#snippet solution()}
				<p>En dérivant :</p>

				<KatexBlock
					formula={String.raw`
\nabla f(w)
=
-(y-w^\top x)x.
`}
				/>

				<p>Une seconde dérivation donne :</p>

				<KatexBlock
					formula={String.raw`
H_f(w)=xx^\top.
`}
				/>

				<p>
					Pour tout vecteur
					<KatexInline formula={String.raw`v`} /> :
				</p>

				<KatexBlock
					formula={String.raw`
v^\top H_fv
=
v^\top xx^\top v
=
(x^\top v)^2
\ge0.
`}
				/>

				<p>
					La Hessienne est donc semi-définie positive et
					<KatexInline formula={String.raw`f`} />
					est convexe.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.10" title="Pourquoi Ridge garantit-il une solution unique ?">
			<p>On considère la fonction Ridge</p>

			<KatexBlock
				formula={String.raw`
f_\lambda(w)
=
\frac1{2n}\|Xw-y\|^2
+
\frac\lambda2\|w\|^2,
\qquad
\lambda>0.
`}
			/>

			<ol>
				<li>Écrire sa Hessienne.</li>
				<li>Montrer qu'elle est définie positive.</li>
				<li>Pourquoi cela implique-t-il l'unicité du minimum ?</li>
			</ol>

			{#snippet solution()}
				<p>La Hessienne vaut</p>

				<KatexBlock
					formula={String.raw`
H=
\frac1nX^\top X+\lambda I.
`}
				/>

				<p>
					Pour tout
					<KatexInline formula={String.raw`v\neq0`} /> :
				</p>

				<KatexBlock
					formula={String.raw`
v^\top Hv
=
\frac1n\|Xv\|^2
+
\lambda\|v\|^2
>
0.
`}
				/>

				<p>
					Ainsi,
					<KatexInline formula={String.raw`H`} />
					est définie positive. La fonction est donc strictement convexe, ce qui garantit l'existence
					d'un unique minimiseur.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.11" title="Identifier une fonction coercive">
			<p>
				Pour chacune des fonctions suivantes, déterminer si elle est coercive. Justifier votre
				réponse.
			</p>

			<ol>
				<li><KatexInline formula={String.raw`f(x)=x^2+5`} /></li>
				<li><KatexInline formula={String.raw`g(x)=\sin(x)`} /></li>
				<li><KatexInline formula={String.raw`h(x)=e^{-x}`} /></li>
				<li><KatexInline formula={String.raw`k(x)=x^4-\cos(x)`} /></li>
			</ol>

			{#snippet solution()}
				<ol>
					<li>
						<strong>Coercive.</strong>
						<KatexInline formula={String.raw`x^2`} />
						tend vers
						<KatexInline formula={String.raw`+\infty`} />
						quand
						<KatexInline formula={String.raw`|x|\to\infty`} />.
					</li>

					<li>
						<strong>Non coercive.</strong>
						<KatexInline formula={String.raw`\sin(x)`} />
						reste comprise entre
						<KatexInline formula={String.raw`-1`} />
						et
						<KatexInline formula={String.raw`1`} />.
					</li>

					<li>
						<strong>Non coercive.</strong>
						Quand
						<KatexInline formula={String.raw`x\to+\infty`} />,
						<KatexInline formula={String.raw`e^{-x}\to0`} />.
					</li>

					<li>
						<strong>Coercive.</strong>
						Le terme dominant est
						<KatexInline formula={String.raw`x^4`} />, et
						<KatexInline formula={String.raw`-\cos(x)`} />
						est borné. Ainsi,
					</li>
				</ol>

				<KatexBlock
					formula={String.raw`
k(x)\ge x^4-1
\xrightarrow[|x|\to\infty]{}
+\infty.
`}
				/>
			{/snippet}
		</ExercisePanel>
		<ExercisePanel number="2.12" title="Composition avec une application affine">
			<p>
				Soit la fonction
				<KatexInline formula={String.raw`g(z)=\|z\|_2`} />, qui est convexe sur
				<KatexInline formula={String.raw`\mathbb{R}^m`} />. On considère l'application affine
				<KatexInline formula={String.raw`A(x)=Mx+b`} />.
			</p>

			<ol>
				<li>
					Écrire la fonction composée
					<KatexInline formula={String.raw`f=g\circ A`} />.
				</li>
				<li>
					Montrer que
					<KatexInline formula={String.raw`f`} />
					est convexe.
				</li>
				<li>Citer un exemple concret en Machine Learning utilisant cette propriété.</li>
			</ol>

			{#snippet solution()}
				<p>On obtient</p>

				<KatexBlock
					formula={String.raw`
f(x)=\|Mx+b\|_2.
`}
				/>

				<p>
					La norme euclidienne est une fonction convexe. L'application
					<KatexInline formula={String.raw`A`} />
					étant affine, le théorème de composition affine montre que
					<KatexInline formula={String.raw`f`} />
					est convexe.
				</p>

				<p>
					Cette propriété intervient par exemple dans les pénalités de type Ridge, les contraintes
					convexes ou encore certaines fonctions de perte utilisées en apprentissage supervisé.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.13" title="Forte convexité du Ridge">
			<p>On considère la fonction Ridge</p>

			<KatexBlock
				formula={String.raw`
f_\lambda(w)
=
\frac1{2n}\|Xw-y\|^2
+
\frac{\lambda}{2}\|w\|^2,
\qquad
\lambda>0.
`}
			/>

			<ol>
				<li>
					Calculer la Hessienne de
					<KatexInline formula={String.raw`f_\lambda`} />.
				</li>
				<li>
					Montrer que toutes ses valeurs propres sont supérieures ou égales à
					<KatexInline formula={String.raw`\lambda`} />.
				</li>
				<li>
					En déduire que
					<KatexInline formula={String.raw`f_\lambda`} />
					est fortement convexe.
				</li>
			</ol>

			{#snippet solution()}
				<p>La Hessienne est</p>

				<KatexBlock
					formula={String.raw`
H=
\frac1nX^\top X+\lambda I.
`}
				/>

				<p>
					Pour tout vecteur
					<KatexInline formula={String.raw`v`} />,
				</p>

				<KatexBlock
					formula={String.raw`
v^\top Hv
=
\frac1n\|Xv\|^2
+
\lambda\|v\|^2
\ge
\lambda\|v\|^2.
`}
				/>

				<p>
					Ainsi, toutes les valeurs propres de
					<KatexInline formula={String.raw`H`} />
					sont supérieures ou égales à
					<KatexInline formula={String.raw`\lambda`} />. La Hessienne est donc uniformément définie
					positive, ce qui montre que
					<KatexInline formula={String.raw`f_\lambda`} />
					est
					<KatexInline formula={String.raw`\lambda`} />
					-fortement convexe.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.14" title="Synthèse des propriétés de conservation">
			<p>
				Compléter le tableau suivant en indiquant si la propriété est conservée par somme de
				fonctions, puis donner une justification en une phrase.
			</p>

			<table>
				<thead>
					<tr>
						<th>Propriété</th>
						<th>Conservée ?</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Convexité</td>
						<td>?</td>
					</tr>
					<tr>
						<td>Différentiabilité</td>
						<td>?</td>
					</tr>
					<tr>
						<td>Coercivité</td>
						<td>?</td>
					</tr>
					<tr>
						<td>Forte convexité</td>
						<td>?</td>
					</tr>
					<tr>
						<td>Gradient Lipschitz</td>
						<td>?</td>
					</tr>
				</tbody>
			</table>

			{#snippet solution()}
				<table>
					<thead>
						<tr>
							<th>Propriété</th>
							<th>Réponse</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Convexité</td>
							<td>
								<strong>Oui.</strong>
								Une combinaison linéaire à coefficients positifs de fonctions convexes est convexe.
							</td>
						</tr>

						<tr>
							<td>Différentiabilité</td>
							<td>
								<strong>Oui.</strong>
								Le gradient d'une somme est la somme des gradients.
							</td>
						</tr>

						<tr>
							<td>Coercivité</td>
							<td>
								<strong>Oui</strong>, dès qu'au moins un terme est coercif et que les autres sont
								minorés.
							</td>
						</tr>

						<tr>
							<td>Forte convexité</td>
							<td>
								<strong>Oui.</strong>
								Le paramètre de forte convexité est conservé lorsque tous les termes ont le même module.
							</td>
						</tr>

						<tr>
							<td>Gradient Lipschitz</td>
							<td>
								<strong>Oui.</strong>
								La constante de Lipschitz de la moyenne est la moyenne des constantes individuelles.
							</td>
						</tr>
					</tbody>
				</table>

				<p>
					Ces résultats expliquent pourquoi les fonctions de perte en Machine Learning sont
					généralement analysées terme par terme avant d'étudier leur moyenne empirique.
				</p>
			{/snippet}
		</ExercisePanel>
		<ExercisePanel number="2.15" title="Gradient Lipschitz d'une moyenne">
			<p>
				Soient
				<KatexInline formula={String.raw`f_1,\ldots,f_n`} />
				des fonctions dont les gradients sont respectivement
				<KatexInline formula={String.raw`L_1,\ldots,L_n`} />
				-Lipschitz.
			</p>

			<ol>
				<li>
					Écrire le gradient de
					<KatexInline formula={String.raw`f(x)=\frac1n\sum_{i=1}^n f_i(x)`} />.
				</li>
				<li>
					Montrer que
					<KatexInline formula={String.raw`\nabla f`} />
					est Lipschitz.
				</li>
				<li>Donner une constante de Lipschitz valable.</li>
			</ol>

			{#snippet solution()}
				<p>On a</p>

				<KatexBlock
					formula={String.raw`
\nabla f(x)
=
\frac1n
\sum_{i=1}^n
\nabla f_i(x).
`}
				/>

				<p>En utilisant l'inégalité triangulaire,</p>

				<KatexBlock
					formula={String.raw`
\begin{aligned}
\|\nabla f(x)-\nabla f(y)\|
&=
\left\|
\frac1n
\sum_i
(\nabla f_i(x)-\nabla f_i(y))
\right\| \\
&\le
\frac1n
\sum_i
\|\nabla f_i(x)-\nabla f_i(y)\| \\
&\le
\frac1n
\sum_i
L_i
\|x-y\|.
\end{aligned}
`}
				/>

				<p>
					Ainsi,
					<KatexInline formula={String.raw`\nabla f`} />
					est
					<KatexInline formula={String.raw`L`} />
					-Lipschitz avec
				</p>

				<KatexBlock
					formula={String.raw`
L=
\frac1n
\sum_{i=1}^n
L_i.
`}
				/>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.16" title="Pourquoi la descente de gradient fonctionne-t-elle ?">
			<p>
				Expliquer le rôle des propriétés suivantes dans la convergence de la descente de gradient :
			</p>

			<ol>
				<li>Convexité.</li>
				<li>Gradient Lipschitz-continu.</li>
				<li>Forte convexité.</li>
			</ol>

			{#snippet solution()}
				<ul>
					<li>
						<strong>Convexité :</strong> elle garantit que tout minimum local est également un minimum
						global.
					</li>

					<li>
						<strong>Gradient Lipschitz :</strong> il permet de choisir un pas de descente suffisamment
						petit pour assurer une diminution de la fonction objectif à chaque itération.
					</li>

					<li>
						<strong>Forte convexité :</strong> elle garantit l'unicité du minimum et une convergence plus
						rapide des méthodes de premier ordre.
					</li>
				</ul>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.17" title="Comparer Ridge et Lasso">
			<p>Compléter le tableau suivant.</p>

			<table>
				<thead>
					<tr>
						<th>Propriété</th>
						<th>Ridge</th>
						<th>Lasso</th>
					</tr>
				</thead>

				<tbody>
					<tr>
						<td>Convexe</td>
						<td>?</td>
						<td>?</td>
					</tr>

					<tr>
						<td>Différentiable</td>
						<td>?</td>
						<td>?</td>
					</tr>

					<tr>
						<td>Produit des poids nuls</td>
						<td>?</td>
						<td>?</td>
					</tr>
				</tbody>
			</table>

			{#snippet solution()}
				<table>
					<thead>
						<tr>
							<th>Propriété</th>
							<th>Ridge</th>
							<th>Lasso</th>
						</tr>
					</thead>

					<tbody>
						<tr>
							<td>Convexe</td>
							<td>Oui</td>
							<td>Oui</td>
						</tr>

						<tr>
							<td>Différentiable</td>
							<td>Oui</td>
							<td>Non en <KatexInline formula={String.raw`0`} /></td>
						</tr>

						<tr>
							<td>Poids exactement nuls</td>
							<td>Rarement</td>
							<td>Oui</td>
						</tr>
					</tbody>
				</table>

				<p>
					Le Ridge rétrécit progressivement les coefficients tandis que le Lasso réalise une
					sélection automatique de variables en annulant certains poids.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel
			number="2.18"
			title="Pourquoi les réseaux de neurones ne sont-ils pas convexes ?"
		>
			<p>
				La perte utilisée pour entraîner un réseau de neurones est souvent la moyenne de pertes
				convexes comme l'erreur quadratique ou la log-perte.
			</p>

			<p>Pourtant, le problème d'optimisation est généralement non convexe. Expliquer pourquoi.</p>

			{#snippet solution()}
				<p>
					Chaque perte élémentaire est effectivement convexe par rapport à son entrée. Cependant, la
					sortie du réseau est une fonction très non linéaire des paramètres
					<KatexInline formula={String.raw`\theta`} />.
				</p>

				<p>
					Le théorème de composition affine ne s'applique plus puisque la fonction calculée par le
					réseau n'est pas affine en
					<KatexInline formula={String.raw`\theta`} />. La fonction objectif contient donc de
					nombreux minima locaux et points-selle, ce qui explique la non-convexité de l'entraînement
					des réseaux de neurones.
				</p>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.19" title="Vrai ou Faux">
			<p>
				Indiquer si chacune des affirmations suivantes est vraie ou fausse, puis justifier
				brièvement.
			</p>

			<ol>
				<li>Une fonction fortement convexe est toujours convexe.</li>

				<li>Toute fonction convexe est fortement convexe.</li>

				<li>Une Hessienne définie positive implique un minimum unique.</li>

				<li>La régularisation Ridge améliore le conditionnement de la Hessienne.</li>

				<li>La moyenne de fonctions différentiables est différentiable.</li>
			</ol>

			{#snippet solution()}
				<ol>
					<li>
						<strong>Vrai.</strong>
						La forte convexité est une propriété plus forte que la convexité.
					</li>

					<li>
						<strong>Faux.</strong>
						Une fonction convexe peut être plate sur certaines directions.
					</li>

					<li>
						<strong>Vrai.</strong>
						Une Hessienne définie positive implique une stricte convexité.
					</li>

					<li>
						<strong>Vrai.</strong>
						L'ajout de
						<KatexInline formula={String.raw`\lambda I`} />
						augmente les plus petites valeurs propres.
					</li>

					<li>
						<strong>Vrai.</strong>
						Le gradient d'une moyenne est la moyenne des gradients.
					</li>
				</ol>
			{/snippet}
		</ExercisePanel>

		<ExercisePanel number="2.20" title="Bilan de la leçon">
			<p>Résumer en quelques phrases les idées essentielles de cette leçon.</p>

			{#snippet solution()}
				<ul>
					<li>
						Les fonctions de perte en Machine Learning sont généralement des moyennes de pertes
						individuelles.
					</li>

					<li>
						La convexité, la différentiabilité, la forte convexité et la Lipschitz-continuité du
						gradient sont conservées par cette moyenne.
					</li>

					<li>La composition avec une application affine préserve également la convexité.</li>

					<li>
						Ces propriétés expliquent pourquoi la régression linéaire, la régression logistique ou
						les SVM conduisent à des problèmes convexes.
					</li>

					<li>
						Les réseaux de neurones profonds échappent à ce cadre car leur paramétrisation est non
						affine, ce qui rend l'optimisation non convexe.
					</li>
				</ul>
			{/snippet}
		</ExercisePanel>
		<h2 id="descente-gradient-acceleration">Descente de gradient et accélération</h2>

		<p>
			Cette section propose vingt exercices couvrant les algorithmes d'optimisation de premier ordre
			: descente de gradient classique, recherche linéaire, Momentum de Polyak, accélération de
			Nesterov (NAG), et analyse des taux de convergence. Chaque exercice est accompagné d'une
			solution détaillée, accessible en cliquant sur « Voir la solution ».
		</p>

		<ExercisePanel number="3.1" title="Calcul explicite d'un pas de descente de gradient en 1D">
			{#snippet solution()}
				<p>
					La fonction est <KatexInline formula={String.raw`f(x) = x^2 - 4x`} />, sa dérivée est <KatexInline
						formula={String.raw`f'(x) = 2x - 4`}
					/>. En <KatexInline formula={String.raw`x^{(0)} = 0`} />, le gradient vaut <KatexInline
						formula={String.raw`f'(0) = -4`}
					/>. L'itération de descente de gradient s'écrit :
				</p>
				<KatexBlock
					formula={String.raw`x^{(1)} = x^{(0)} - \alpha f'(x^{(0)}) = 0 - 0.1 \times (-4) = 0.4.`}
				/>
			{/snippet}
			<p>
				Soit la fonction <KatexInline formula={String.raw`f(x) = x^2 - 4x`} />. À partir du point
				initial <KatexInline formula={String.raw`x^{(0)} = 0`} />, calculez la valeur de l'itéré <KatexInline
					formula={String.raw`x^{(1)}`}
				/> pour un pas constant <KatexInline formula={String.raw`\alpha = 0.1`} />.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.2" title="Condition de convergence sur le pas (cas quadratique 1D)">
			{#snippet solution()}
				<p>
					L'itéré s'écrit <KatexInline
						formula={String.raw`x^{(k+1)} = x^{(k)} - \alpha (2x^{(k)}) = (1 - 2\alpha)x^{(k)}`}
					/>. Par récurrence, <KatexInline
						formula={String.raw`x^{(k)} = (1 - 2\alpha)^k x^{(0)}`}
					/>. La suite converge vers le minimum <KatexInline formula={String.raw`x^* = 0`} /> si et seulement
					si le facteur multiplicatif est strictement compris entre -1 et 1 :
				</p>
				<KatexBlock
					formula={String.raw`-1 < 1 - 2\alpha < 1 \iff -2 < -2\alpha < 0 \iff 0 < \alpha < 1.`}
				/>
			{/snippet}
			<p>
				Soit <KatexInline formula={String.raw`f(x) = x^2`} />. Écrivez la relation de récurrence
				liant <KatexInline formula={String.raw`x^{(k+1)}`} /> à <KatexInline
					formula={String.raw`x^{(k)}`}
				/> lors d'une descente de gradient. Déterminez la condition exacte sur le pas constant <KatexInline
					formula={String.raw`\alpha`}
				/> pour que la suite converge vers le minimum global.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.3" title="Dérivée directionnelle et plus forte descente">
			{#snippet solution()}
				<p>
					La dérivée directionnelle le long de <KatexInline formula={String.raw`d`} /> est donnée par
					le produit scalaire <KatexInline formula={String.raw`\langle \nabla f(x), d \rangle`} />.
					Par l'inégalité de Cauchy-Schwarz, ce produit scalaire est minimal lorsque <KatexInline
						formula={String.raw`d`}
					/> est colinéaire et de signe opposé à <KatexInline formula={String.raw`\nabla f(x)`} />.
					Pour une direction unitaire (<KatexInline formula={String.raw`\|d\| = 1`} />), le choix
					optimal est unique et vaut <KatexInline
						formula={String.raw`d^* = -\frac{\nabla f(x)}{\|\nabla f(x)\|}`}
					/>.
				</p>
			{/snippet}
			<p>
				Montrez géométriquement ou algébriquement pourquoi la direction opposée au gradient <KatexInline
					formula={String.raw`-\nabla f(x)`}
				/> minimise la dérivée directionnelle parmi toutes les directions unitaires <KatexInline
					formula={String.raw`\|d\| = 1`}
				/>.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.4" title="Justification locale par développement de Taylor">
			{#snippet solution()}
				<p>
					Par le développement de Taylor à l'ordre 1, on substitue la mise à jour <KatexInline
						formula={String.raw`x^{(k+1)} = x^{(k)} - \alpha \nabla f(x^{(k)})`}
					/> :
				</p>
				<KatexBlock
					formula={String.raw`f(x^{(k)} - \alpha \nabla f(x^{(k)})) = f(x^{(k)}) - \alpha \|\nabla f(x^{(k)})\|^2 + o(\alpha).`}
				/>
				<p>
					Si <KatexInline formula={String.raw`\nabla f(x^{(k)}) \neq 0`} />, le terme <KatexInline
						formula={String.raw`-\alpha \|\nabla f(x^{(k)})\|^2`}
					/> est strictement négatif pour tout <KatexInline formula={String.raw`\alpha > 0`} />.
					Pour <KatexInline formula={String.raw`\alpha`} /> suffisamment petit, ce terme dominant garantit
					que <KatexInline formula={String.raw`f(x^{(k+1)}) < f(x^{(k)})`} />.
				</p>
			{/snippet}
			<p>
				En utilisant un développement de Taylor à l'ordre 1, justifiez qu'un pas de descente de
				gradient permet toujours de diminuer localement la valeur d'une fonction objectif si le
				gradient est non nul et le pas <KatexInline formula={String.raw`\alpha`} /> est choisi assez petit.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.5" title="Recherche linéaire exacte (Exact Line Search)">
			{#snippet solution()}
				<p>
					On cherche <KatexInline formula={String.raw`\alpha`} /> qui minimise <KatexInline
						formula={String.raw`\phi(\alpha) = f(x - \alpha \nabla f(x))`}
					/>. Ici, <KatexInline formula={String.raw`x = (1, 1)^\top`} /> et <KatexInline
						formula={String.raw`\nabla f(x) = (2x_1, 4x_2)^\top = (2, 4)^\top`}
					/>. L'itéré en fonction de <KatexInline formula={String.raw`\alpha`} /> est <KatexInline
						formula={String.raw`(1 - 2\alpha, 1 - 4\alpha)^\top`}
					/>. On injecte dans <KatexInline formula={String.raw`f`} /> :
				</p>
				<KatexBlock
					formula={String.raw`\phi(\alpha) = (1 - 2\alpha)^2 + 2(1 - 4\alpha)^2 = 1 - 4\alpha + 4\alpha^2 + 2(1 - 8\alpha + 16\alpha^2) = 36\alpha^2 - 20\alpha + 3.`}
				/>
				<p>
					On annule la dérivée <KatexInline
						formula={String.raw`\phi'(\alpha) = 72\alpha - 20 = 0`}
					/>, ce qui donne <KatexInline
						formula={String.raw`\alpha = \frac{20}{72} = \frac{5}{18}`}
					/>.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={String.raw`f(x_1, x_2) = x_1^2 + 2x_2^2`} />. Au point initial <KatexInline
					formula={String.raw`x^{(0)} = (1, 1)^\top`}
				/>, déterminez analytiquement la valeur du pas optimal <KatexInline
					formula={String.raw`\alpha_0`}
				/> si l'on applique une stratégie de recherche linéaire exacte.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.6" title="Phénomène d'oscillation et conditionnement">
			{#snippet solution()}
				<p>
					Le Hessien de la fonction est constant et vaut <KatexInline
						formula={String.raw`H_f = \begin{pmatrix} 2 & 0 \\ 0 & 200 \end{pmatrix}`}
					/>. La plus grande valeur propre (constante de Lipschitz du gradient <KatexInline
						formula={String.raw`L`}
					/>) est 200, et la plus petite (<KatexInline formula={String.raw`\mu`} />) est 2. Le
					conditionnement est <KatexInline formula={String.raw`|\kappa = \frac{L}{\mu} = 100|`} />.
					Un conditionnement élevé implique que la fonction forme une vallée très étirée, forçant la
					descente de gradient classique à osciller fortement d'une paroi à l'autre si le pas est
					adapté à la pente la plus raide (<KatexInline
						formula={String.raw`\alpha \approx 1/L`}
					/>).
				</p>
			{/snippet}
			<p>
				Soit la fonction <KatexInline formula={String.raw`f(x_1, x_2) = x_1^2 + 100x_2^2`} />.
				Calculez le conditionnement de sa matrice Hessienne et expliquez l'impact de ce résultat sur
				le comportement géométrique des trajectoires de la descente de gradient.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.7" title="Gradient de la régression linéaire matricielle">
			{#snippet solution()}
				<p>
					La fonction objectif se réécrit <KatexInline
						formula={String.raw`f(w) = \frac{1}{2n} (Xw - y)^\top(Xw - y)`}
					/>. En développant ou en utilisant les identités de calcul matriciel, on obtient :
				</p>
				<KatexBlock formula={String.raw`\nabla f(w) = \frac{1}{n} X^\top(Xw - y).`} />
				<p>
					L'étape de mise à jour de la descente de gradient prend donc la forme vectorielle suivante
					: <KatexInline
						formula={String.raw`w^{(k+1)} = w^{(k)} - \frac{\alpha}{n} X^\top(Xw^{(k)} - y)`}
					/>.
				</p>
			{/snippet}
			<p>
				Soit la fonction de coût des moindres carrés <KatexInline
					formula={String.raw`f(w) = \frac{1}{2n} \|y - Xw\|^2`}
				/>. Retrouvez par le calcul matriciel l'expression exacte de son gradient <KatexInline
					formula={String.raw`\nabla f(w)`}
				/>.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.8" title="Coût algorithmique par itération">
			{#snippet solution()}
				<p>
					Le calcul de l'itéré nécessite d'abord de calculer la prédiction <KatexInline
						formula={String.raw`Xw^{(k)}`}
					/>, ce qui correspond au produit d'une matrice <KatexInline
						formula={String.raw`n \times d`}
					/> par un vecteur <KatexInline formula={String.raw`d \times 1`} />, soit un coût de <KatexInline
						formula={String.raw`\mathcal{O}(nd)`}
					/>. La soustraction avec <KatexInline formula={String.raw`y`} /> est en <KatexInline
						formula={String.raw`\mathcal{O}(n)`}
					/>. Enfin, la multiplication par <KatexInline formula={String.raw`X^\top`} /> (matrice de taille
					<KatexInline formula={String.raw`d \times n`} /> par un vecteur <KatexInline
						formula={String.raw`n \times 1`}
					/>) demande à nouveau <KatexInline formula={String.raw`\mathcal{O}(nd)`} /> opérations. Le coût
					total par itération est donc dominé par <KatexInline
						formula={String.raw`\mathcal{O}(nd)`}
					/>.
				</p>
			{/snippet}
			<p>
				Pour un problème de régression linéaire avec une matrice de données <KatexInline
					formula={String.raw`X`}
				/> de taille <KatexInline formula={String.raw`n \times d`} />, détaillez le nombre
				d'opérations nécessaires (coût algorithmique) pour effectuer une unique itération de
				descente de gradient batch.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.9">
			{#snippet titleSnippet()}
				Interprétation du taux de convergence <KatexInline formula={String.raw`\mathcal{O}(1/k)`} />
			{/snippet}
			{#snippet solution()}
				<p>
					Le théorème garantit que <KatexInline
						formula={String.raw`f(x^{(k)}) - f(x^*) \le \frac{C}{k}`}
					/> où <KatexInline formula={String.raw`C = \frac{L\|x^{(0)} - x^*\|^2}{2}`} />. Pour
					assurer une erreur inférieure ou égale à <KatexInline formula={String.raw`\epsilon`} />,
					il suffit de choisir <KatexInline formula={String.raw`k`} /> tel que :
				</p>
				<KatexBlock formula={String.raw`\frac{C}{k} \le \epsilon \iff k \ge \frac{C}{\epsilon}.`} />
				<p>
					Le nombre d'itérations requis est donc inversement proportionnel à la précision ciblée, ce
					qui se note <KatexInline formula={String.raw`\mathcal{O}(1/\epsilon)`} />.
				</p>
			{/snippet}
			<p>
				Pour une fonction convexe et $L$-lisse, le taux de convergence de la descente de gradient
				est en <KatexInline formula={String.raw`\mathcal{O}(1/k)`} />. Déterminez le nombre
				d'itérations nécessaires, exprimé en fonction de <KatexInline
					formula={String.raw`\epsilon`}
				/>, pour garantir que l'erreur <KatexInline formula={String.raw`f(x^{(k)}) - f(x^*)`} /> soit
				inférieure à un seuil de tolérance <KatexInline formula={String.raw`\epsilon`} />.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.10" title="Convergence sous forte convexité">
			{#snippet solution()}
				<p>
					Sous l'hypothèse de forte convexité, le taux est géométrique (linéaire) : <KatexInline
						formula={String.raw`f(x^{(k)}) - f(x^*) \le (1 - \frac{\mu}{L})^k (f(x^{(0)}) - f(x^*))`}
					/>. Pour obtenir une précision <KatexInline formula={String.raw`\epsilon`} />, on résout <KatexInline
						formula={String.raw`(1 - \frac{\mu}{L})^k \le \epsilon`}
					/>, ce qui donne par passage au logarithme :
				</p>
				<KatexBlock
					formula={String.raw`k \ge \frac{\log(1/\epsilon)}{-\log(1 - \mu/L)} \approx \frac{L}{\mu} \log(1/\epsilon).`}
				/>
				<p>
					La complexité en itérations est donc en <KatexInline
						formula={String.raw`\mathcal{O}(\log(1/\epsilon))`}
					/>, ce qui est exponentiellement plus rapide qu'un taux en <KatexInline
						formula={String.raw`\mathcal{O}(1/\epsilon)`}
					/>.
				</p>
			{/snippet}
			<p>
				Si une fonction est de surcroît $\mu$-fortement convexe, son taux de convergence devient
				linéaire (au sens de l'analyse numérique), c'est-à-dire en <KatexInline
					formula={String.raw`\mathcal{O}(e^{-k \mu / L})`}
				/>. Expliquez l'avantage de ce taux par rapport au cas purement convexe lors de la recherche
				d'une précision extrêmement fine.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.11" title="Le pas optimal théorique">
			{#snippet solution()}
				<p>
					Pour une fonction quadratique fortement convexe caractérisée par les bornes spectrales <KatexInline
						formula={String.raw`\mu`}
					/> et <KatexInline formula={String.raw`L`} /> sur son Hessien, le pas constant qui maximise
					le taux de contraction de l'erreur à chaque étape est donné par la formule :
				</p>
				<KatexBlock formula={String.raw`\alpha^* = \frac{2}{L + \mu}.`} />
				<p>
					Ce pas réalise le meilleur compromis possible entre la vitesse de progression le long des
					pentes faibles et la stabilité géométrique face aux pentes raides.
				</p>
			{/snippet}
			<p>
				En optimisation quadratique, si une fonction possède un gradient $L$-Lipschitzien et est
				$\mu$-fortement convexe, rappelez l'expression du pas constant optimal <KatexInline
					formula={String.raw`\alpha^*`}
				/> qui minimise le facteur de contraction de l'erreur à chaque itération.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.12" title="Formulation vectorielle du Momentum de Polyak">
			{#snippet solution()}
				<p>Le système complet s'écrit de manière itérative comme suit :</p>
				<KatexBlock
					formula={String.raw`\begin{aligned} v^{(k+1)} &= \beta v^{(k)} + \nabla f(x^{(k)}) \\ x^{(k+1)} &= x^{(k)} - \alpha v^{(k+1)} \end{aligned}`}
				/>
				<p>
					On peut également condenser cette formulation en une unique équation d'ordre 2 ne faisant
					pas intervenir explicitement la variable intermédiaire de vitesse : <KatexInline
						formula={String.raw`x^{(k+1)} = x^{(k)} - \alpha \nabla f(x^{(k)}) + \beta (x^{(k)} - x^{(k-1)})`}
					/>.
				</p>
			{/snippet}
			<p>
				Donnez le système d'équations couplées définissant l'algorithme du Momentum (méthode de la
				boule lourde de Polyak) pour la mise à jour de la position <KatexInline
					formula={String.raw`x^{(k)}`}
				/> et de la vitesse <KatexInline formula={String.raw`v^{(k)}`} />.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.13" title="Déroulement de la récurrence de la vitesse">
			{#snippet solution()}
				<p>
					En partant de <KatexInline formula={String.raw`v^{(0)} = 0`} />, on déroule les premières
					étapes : <KatexInline formula={String.raw`v^{(1)} = \nabla f(x^{(0)})`} />, puis <KatexInline
						formula={String.raw`v^{(2)} = \beta \nabla f(x^{(0)}) + \nabla f(x^{(1)})`}
					/>. Par récurrence immédiate, on obtient la somme pondérée :
				</p>
				<KatexBlock
					formula={String.raw`v^{(k)} = \sum_{i=0}^{k-1} \beta^i \nabla f(x^{(k-1-i)}).`}
				/>
				<p>
					Comme <KatexInline formula={String.raw`\beta \in [0, 1)`} />, les puissances <KatexInline
						formula={String.raw`\beta^i`}
					/> s'estompent exponentiellement, ce qui correspond mathématiquement à une moyenne exponentielle
					mobile des gradients passés.
				</p>
			{/snippet}
			<p>
				En supposant une vitesse initiale nulle (<KatexInline formula={String.raw`v^{(0)} = 0`} />),
				démontrez en déroulant la récurrence du Momentum que la vitesse <KatexInline
					formula={String.raw`v^{(k)}`}
				/> s'exprime comme une moyenne exponentielle pondérée des gradients historiques.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.14" title="Mécanisme d'amortissement du Momentum">
			{#snippet solution()}
				<p>
					Si le gradient change de signe alternativement (oscillations), les contributions
					successives dans la somme <KatexInline
						formula={String.raw`\sum \beta^i \nabla f(x^{(k-1-i)})`}
					/> ont des signes opposés et s'annulent mutuellement, réduisant ainsi l'amplitude de la vitesse
					dans cette direction. À l'inverse, si le gradient garde un signe constant (direction de descente
					stable), les termes se cumulent positivement, provoquant une accélération de la descente.
				</p>
			{/snippet}
			<p>
				En vous basant sur la formule de la vitesse cumulée obtenue à l'exercice précédent,
				expliquez comment le paramètre <KatexInline formula={String.raw`\beta`} /> parvient simultanément
				à amortir les oscillations orthogonales et à accélérer la progression dans les vallées directrices.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.15" title="Distinction conceptuelle entre NAG et Polyak">
			{#snippet solution()}
				<p>
					Le Momentum classique calcule le gradient à la position actuelle <KatexInline
						formula={String.raw`x^{(k)}`}
					/> puis applique la force de friction. Le Gradient Accéléré de Nesterov (NAG) effectue d'abord
					un saut virtuel dans la direction du momentum accumulé pour se placer en un point anticipé <KatexInline
						formula={String.raw`\tilde{x}^{(k)} = x^{(k)} + \beta(x^{(k)} - x^{(k-1)})`}
					/>, et évalue le gradient en ce point prospectif. Cela permet d'anticiper les variations
					de pente et de corriger la trajectoire de manière prédictive.
				</p>
			{/snippet}
			<p>
				Quelle est la différence fondamentale entre l'algorithme du Momentum de Polyak et le
				gradient accéléré de Nesterov (NAG) concernant le point de l'espace où est évalué le
				gradient de la fonction ?
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.16" title="Avantage asymptotique du taux de Nesterov">
			{#snippet solution()}
				<p>
					Le gain est quadratique. Pour atteindre une précision <KatexInline
						formula={String.raw`\epsilon`}
					/>, la descente de gradient classique requiert un nombre d'itérations de l'ordre de <KatexInline
						formula={String.raw`\mathcal{O}(1/\epsilon)`}
					/>, tandis que la méthode accélérée de Nesterov requiert seulement <KatexInline
						formula={String.raw`\mathcal{O}(1/\sqrt{\epsilon})`}
					/> itérations. Pour <KatexInline formula={String.raw`\epsilon = 10^{-4}`} />, on passe
					ainsi de l'ordre de 10 000 itérations à seulement une centaine.
				</p>
			{/snippet}
			<p>
				La méthode de Nesterov atteint le taux de convergence théorique optimal pour les fonctions
				convexes, à savoir <KatexInline formula={String.raw`\mathcal{O}(1/k^2)`} />. Comparez ce
				taux à celui du gradient classique (<KatexInline formula={String.raw`\mathcal{O}(1/k)`} />)
				en matière de nombre d'itérations requises face à une tolérance d'erreur faible.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.17" title="Conséquence d'un pas excessif">
			{#snippet solution()}
				<p>
					Le gradient de <KatexInline formula={String.raw`f`} /> vaut <KatexInline
						formula={String.raw`f'(x) = 10x`}
					/>. La récurrence est <KatexInline
						formula={String.raw`x^{(k+1)} = x^{(k)} - \alpha(10x^{(k)}) = (1 - 10\alpha)x^{(k)}`}
					/>. Si <KatexInline formula={String.raw`\alpha = 0.3`} />, on obtient <KatexInline
						formula={String.raw`1 - 10(0.3) = -2`}
					/>. La suite des itérés devient <KatexInline
						formula={String.raw`x^{(k)} = (-2)^k x^{(0)}`}
					/>. En valeur absolue, <KatexInline
						formula={String.raw`|x^{(k)}| = 2^k |x^{(0)}| \to +\infty`}
					/> quand <KatexInline formula={String.raw`k \to \infty`} />. Les itérés oscillent d'un
					côté à l'autre de l'origine avec une amplitude qui double à chaque étape, provoquant une
					divergence explosive.
				</p>
			{/snippet}
			<p>
				Soit <KatexInline formula={String.raw`f(x) = 5x^2`} />, dont le gradient est
				$10$-Lipschitzien (<KatexInline formula={String.raw`L=10`} />). Si l'on choisit un pas
				inadéquat <KatexInline formula={String.raw`\alpha = 0.3`} /> (supérieur à <KatexInline
					formula={String.raw`2/L`}
				/>), calculez explicitement les premiers itérés à partir de <KatexInline
					formula={String.raw`x^{(0)} = 1`}
				/> et décrivez le comportement asymptotique obtenu.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.18" title="Régime de pas décroissant">
			{#snippet solution()}
				<p>
					La règle <KatexInline formula={String.raw`\alpha_k = \frac{\alpha_0}{k}`} /> satisfait les conditions
					classiques de convergence globale pour l'optimisation stochastique ou non lisse (conditions
					de Robbins-Monro) car la somme des pas diverge (<KatexInline
						formula={String.raw`\sum \frac{1}{k} = +\infty`}
					/>), permettant à l'algorithme de parcourir n'importe quelle distance pour atteindre le
					minimum, tandis que la somme de leurs carrés converge (<KatexInline
						formula={String.raw`\sum \frac{1}{k^2} < +\infty`}
					/>), ce qui assure l'amortissement progressif des bruits et des oscillations en fin de
					parcours.
				</p>
			{/snippet}
			<p>
				Pourquoi utilise-t-col fréquemment des politiques de pas décroissants de type <KatexInline
					formula={String.raw`\alpha_k = \frac{\alpha_0}{k}`}
				/> ? Quelles propriétés mathématiques fondamentales sur la somme de ces pas justifient ce choix
				?
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.19" title="Gradient de la perte logistique globale">
			{#snippet solution()}
				<p>
					En appliquant la linéarité de l'opérateur gradient à la fonction de perte globale <KatexInline
						formula={String.raw`F(w) = \frac{1}{n} \sum_{i=1}^n f_i(w)`}
					/>, on combine les gradients individuels calculés précédemment. On obtient l'expression
					finale suivante :
				</p>
				<KatexBlock
					formula={String.raw`\nabla F(w) = \frac{1}{n} \sum_{i=1}^n \frac{-y_i x_i e^{-y_i w^\top x_i}}{1 + e^{-y_i w^\top x_i}} = \frac{1}{n} \sum_{i=1}^n (\sigma(y_i w^\top x_i) - 1) y_i x_i.`}
				/>
			{/snippet}
			<p>
				En combinant les résultats sur le gradient d'une moyenne empirique et la perte élémentaire
				de la régression logistique vus à la leçon précédente, donnez l'expression complète du
				gradient global <KatexInline formula={String.raw`\nabla F(w)`} /> utilisé lors d'une étape de
				descente de gradient batch sur l'ensemble d'apprentissage.
			</p>
		</ExercisePanel>

		<ExercisePanel number="3.20" title="Synthèse des hyperparamètres">
			{#snippet solution()}
				<p>
					La descente de gradient classique repose sur un unique hyperparamètre critique : le pas
					d'apprentissage <KatexInline formula={String.raw`\alpha`} />. Les méthodes accélérées
					(Polyak et Nesterov) introduisent un second hyperparamètre essentiel : le coefficient de
					friction ou de momentum <KatexInline formula={String.raw`\beta \in [0, 1)`} /> (généralement
					fixé à 0.9). Ajuster <KatexInline formula={String.raw`\beta`} /> permet de contrôler l'inertie
					de l'optimiseur, offrant un compromis entre la vitesse de traversée des zones plates et la capacité
					à freiner à l'approche du point d'optimum.
				</p>
			{/snippet}
			<p>
				Résumez les hyperparamètres requis par chacun des trois algorithmes étudiés (GD classique,
				Momentum, Nesterov) et expliquez brièvement le rôle du paramètre supplémentaire introduit
				par les méthodes accélérées.
			</p>
		</ExercisePanel>
	</TheorySection>
</PageTemplate>
