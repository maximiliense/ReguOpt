<script lang="ts">
	import KatexBlock from '$lib/components/narrative/KatexBlock.svelte';
	import KatexInline from '$lib/components/narrative/KatexInline.svelte';
	import Callout from '$lib/components/narrative/Callout.svelte';
	import Tooltip from '$lib/components/narrative/Tooltip.svelte';
	import ExpertPanel from '$lib/components/narrative/ExpertPanel.svelte';
	import PageTemplate from '$lib/components/layout/PageTemplate.svelte';
	import TheorySection from '$lib/components/narrative/TheorySection.svelte';

	// LaTeX formulas must live in script variables — backslashes in HTML attributes are invalid in Svelte 5
	const feFull = 'F = \\mathbb{E}_q[\\ln q(s) - \\ln p(o, s)]';
	const klFormula = '\\text{KL}[q(s) \\| p(s|o)] = \\int q(s) \\ln \\frac{q(s)}{p(s|o)} \\, ds';
	const lnPo = '-\\ln p(o)';
	const feFormal = 'F = D_{\\text{KL}}[q(s) \\| p(s)] - \\mathbb{E}_q[\\ln p(o|s)]';
	const qS = 'q(s)';
	const pSo = 'p(s|o)';
</script>

<svelte:head>
	<title>Demo — Narrative Components</title>
</svelte:head>

<PageTemplate title="Narrative — Demo" subtitle="Composants textuels et équations.">
	<TheorySection>
		<div>
			<h2>KaTeX Block</h2>
			<KatexBlock formula={feFull} />
			<KatexBlock formula={klFormula} />
		</div>

		<div>
			<h2>KaTeX Inline</h2>
			<p>
				La free energy <KatexInline formula="F" /> est une borne supérieure de la surprise
				<KatexInline formula={lnPo} />. L'agent minimise <KatexInline formula="F" /> pour réduire son
				incertitude.
			</p>
		</div>

		<div>
			<h2>Callouts</h2>
			<div style="display: flex; flex-direction: column; gap: 1rem;">
				<Callout type="insight">
					<p>La Free Energy est toujours supérieure ou égale à la surprise.</p>
				</Callout>
				<Callout type="warning" title="Point délicat">
					<p>La divergence KL n'est pas symétrique : KL(P||Q) != KL(Q||P).</p>
				</Callout>
				<Callout type="definition" title="Entropie">
					<p>L'entropie mesure l'incertitude moyenne d'une distribution.</p>
				</Callout>
				<Callout type="intuition">
					<p>Imaginez un agent qui essaie de deviner où il est dans le monde.</p>
				</Callout>
			</div>
		</div>

		<div>
			<h2>Tooltip</h2>
			<p>
				L'<Tooltip
					term="inférence variationnelle"
					definition="Méthode d'approximation du posterior par optimisation plutôt que par échantillonnage."
				/> est au coeur du Free Energy Principle. La
				<Tooltip
					term="divergence KL"
					definition="Kullback-Leibler divergence : mesure la différence entre deux distributions de probabilité."
				/>
				quantifie l'écart entre les croyances et la réalité.
			</p>
		</div>

		<div>
			<h2>ExpertPanel</h2>
			<p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 0.75rem;">
				Activez le Mode Expert dans la sidebar pour voir ce panneau.
			</p>
			<ExpertPanel title="Dérivation formelle">
				<p>La Free Energy variationnelle est définie comme :</p>
				<KatexBlock formula={feFormal} />
				<p>
					où <KatexInline formula={qS} /> est la distribution d'approximation et
					<KatexInline formula={pSo} /> est le vrai posterior.
				</p>
			</ExpertPanel>
		</div>
	</TheorySection>
</PageTemplate>
