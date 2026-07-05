<script lang="ts">
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';
	import ExercisePanel from '$lib/components/narrative/ExercisePanel.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import { getPageByPath, getNextPage, getPrevPage } from '$lib/navigation.js';
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';

	const meta = getPageByPath('/part1/exercises1');
	const prevMeta = $derived(getPrevPage(meta?.index ?? 0));
	const nextMeta = $derived(getNextPage(meta?.index ?? 0));

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
		<h2>Conditions d'un minimum</h2>

		<p>
			Cette section propose vingt exercices couvrant l'ensemble des notions vues dans la leçon :
			minima locaux et globaux, conditions nécessaires et suffisantes du premier et second ordre,
			convexité, et coercivité. Chaque exercice est accompagné d'une solution détaillée, accessible
			en cliquant sur « Voir la solution ».
		</p>

		<ExercisePanel number="2.1" title="Minimum d'une parabole simple">
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

		<ExercisePanel number="2.2" title="Un point critique qui n'est pas un minimum">
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

		<ExercisePanel number="2.3" title="CSSO non nécessaire : Hessien nul en un vrai minimum">
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

		<ExercisePanel number="2.4" title="Minimum en un point non différentiable">
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

		<ExercisePanel number="2.5" title="Minimum global en dimension 2">
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

		<ExercisePanel number="2.6" title="Point-selle malgré la CNO">
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

		<ExercisePanel number="2.7" title="Absence de minimum : domaine non fermé">
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
			number="2.8"
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

		<ExercisePanel number="2.9" title="Convexité par somme">
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

		<ExercisePanel number="2.10" title="Minimum d'un paraboloïde translaté">
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

		<ExercisePanel number="2.11" title="Unicité du minimum pour une fonction strictement convexe">
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

		<ExercisePanel number="2.12" title="Un minimum local qui n'est pas global">
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

		<ExercisePanel number="2.13" title="Coercivité non nécessaire : minimum global sans coercivité">
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

		<ExercisePanel number="2.14" title="Classification de plusieurs points critiques en 2D">
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

		<ExercisePanel number="2.15" title="Coercivité malgré un terme oscillant">
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

		<ExercisePanel number="2.16" title="Double puits symétrique">
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

		<ExercisePanel number="2.17" title="Nécessité de la fermeture du domaine">
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

		<ExercisePanel number="2.18" title="Domaine fermé mais absence de coercivité">
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

		<ExercisePanel number="2.19" title="Classification directe à partir des valeurs propres">
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

		<ExercisePanel number="2.20" title="Une infinité de minima globaux : perte de l'unicité">
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
		<h2>Fonctions en ML</h2>

		<ExercisePanel number="2.5" title="Convexité d'une combinaison linéaire">
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

		<ExercisePanel number="2.6" title="Convexité d'une moyenne empirique">
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

		<ExercisePanel number="2.7" title="Gradient d'une somme">
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

		<ExercisePanel number="2.8" title="Hessienne d'une somme quadratique">
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

		<ExercisePanel number="2.9" title="Composition affine">
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

		<ExercisePanel number="2.10" title="Coercivité">
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

		<ExercisePanel number="2.11" title="Identifier les propriétés conservées">
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
	</TheorySection>
</PageTemplate>
