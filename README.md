# Free Energy Principle — Cours Interactif

> Une exploration interactive du Free Energy Principle et de l'Active Inference. Construisez votre intuition avant les mathématiques.

## Abstract

This interactive web course provides a progressive, intuition-first introduction to the **Free Energy Principle **(FEP) and **Active Inference** — a unifying theoretical framework proposed by Karl Friston that accounts for perception, action, and learning across biological and artificial systems.

Rather than presenting the theory as a sequence of abstract derivations, each concept is grounded in **interactive simulations** that let learners manipulate parameters, observe distributions evolve, and build geometric intuition before encountering the formal mathematics. The course is structured in five parts, progressing from foundational probability theory to open questions in neuroscience and artificial intelligence.

## Citation

```bibtex
@misc{fep_interactif_2025,
  author    = {Doe, Jane and Smith, John},
  title     = {Free Energy Principle — Cours Interactif},
  year      = {2025},
  url       = {https://example.com/fep},
  note      = {Interactive web course on the
               Free Energy Principle and Active Inference}
}
```

## Course Structure

### Part I — Probabilistic Tools

| Page | Topic |
|------|-------|
| Distributions | Categorical, Gaussian, and Laplace distributions as representations of belief. Interactive comparison of density shapes, entropy, and sampling behavior. |
| Loi de Bayes | Bayes' theorem as the foundation of belief updating. |
| Apprentissage séquentiel | Sequential Bayesian inference and belief updating over time. |
| Entropie | Shannon entropy as a measure of uncertainty. |
| Divergence KL | Kullback-Leibler divergence as the asymmetry between distributions. |

### Part II — Free Energy

| Page | Topic |
|------|-------|
| Surprise | Self-information and the problem of intractable marginal likelihood. |
| Modèles génératifs | Generative models as probabilistic descriptions of the world. |
| Approximation variationnelle | Variational inference: approximating intractable posteriors with tractable families. |
| Free Energy | Variational free energy as an upper bound on surprise. Decomposition into complexity and accuracy (Carreira-Perpinan) and information and compression (Somerville-Koolhaas). |
| Expected Free Energy | Looking ahead: planning under the free energy principle. |

### Part III — Active Inference

| Page | Topic |
|------|-------|
| Perception | Inferring hidden states by minimizing free energy. |
| Action | Selecting actions to minimize expected free energy. |
| Exploration | The exploration-exploitation trade-off through the lens of information-seeking. |
| Préférences | Encoding goals as priors over outcomes. |
| Planification | Multi-step planning under active inference. |

### Part IV — The Maze

| Page | Topic |
|------|-------|
| Le Labyrinthe | A grid-world maze environment demonstrating active inference in action. |
| T-Maze | The classic T-maze task, highlighting belief updating under ambiguity. |
| RL vs Active Inference | Comparing reinforcement learning and active inference approaches to decision-making. |

### Part V — Open Questions

| Page | Topic |
|------|-------|
| Neurosciences | Neural implementations of predictive processing and hierarchical generative models. |
| IA moderne | Connections between FEP and modern machine learning. |
| Vie et auto-organisation | The free energy principle as a theory of life and self-organization. |
| Prédiction cérébrale | Predictive coding as a neural instantiation of variational inference. |
| Rivalité binoculaire | Binocular rivalry as a model phenomenon for perceptual inference. |
| Architecture de la conscience | Global workspace and predictive architectures of consciousness. |
| Limites et critiques | Critical assessment of the FEP's scope, falsifiability, and empirical status. |

## Pedagogical Approach

The course follows three design principles:

1. **Intuition before formalism**. Every mathematical concept is preceded by an interactive simulation that lets the learner feel the phenomenon before seeing the equation.
2. **Progressive disclosure**. Core ideas are presented first; advanced derivations and formalism are gated behind an "Expert Mode" toggle for readers who want deeper rigor.
3. **Visual mathematics**. All equations are rendered with KaTeX. Key quantities (free energy, KL divergence, entropy) are displayed live as simulation parameters change.

## Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (Svelte 5 with runes) |
| Build | Vite |
| Math rendering | KaTeX |
| Visualization | D3.js |
| Styling | CSS custom properties + scoped styles |
| Package manager | pnpm |
| Testing | Vitest (unit), Playwright (e2e) |

### Project Structure

```
src/
├── lib/
│   ├── active-inference/   # Agent, beliefs, EFE, types
│   ├── components/         # Svelte component library
│   │   ├── charts/         # DensityChart, CategoricalChart, Figure
│   │   ├── controls/       # Slider, Button
│   │   ├── layout/         # PageTemplate, SliderGrid
│   │   └── narrative/      # TheorySection, InteractiveSection, Callout, ExpertPanel, Bibliography
│   ├── math/               # bayes, entropy, kl, gaussian, free-energy, discrete, laplace
│   ├── simulation/         # Simulation utilities
│   ├── stores/             # Progress tracking, settings, simulation state
│   └── styles/             # app.css, semantic color variables
├── routes/
│   ├── +page.svelte        # Home page
│   ├── intro/              # Course introduction
│   ├── part1/              # Probabilistic tools
│   ├── part2/              # Free Energy
│   ├── part3/              # Active Inference
│   ├── part4/              # The Maze
│   └── part5/              # Open Questions
└── app.html
```

### Key Design Patterns

- **PageTemplate**: Every content page uses a consistent layout with navigation breadcrumbs, previous/next links, and progress tracking.
- **TheorySection / InteractiveSection**: Pages alternate between theoretical exposition and interactive exploration.
- **Progress tracking**: A Svelte store tracks page visits and interactions across the session.
- **Expert mode**: Advanced derivations are hidden behind a global toggle in the settings store.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test:unit
pnpm test:e2e
```

## References

The course references and builds upon the following foundational works:

- Friston, K. (2010). The free-energy principle: a unified theory of brain action? *Trends in Cognitive Sciences*
- Friston, K. (2019). Hallucinations and delusions. *Current Opinion in Behavioral Sciences*
- Smith, L., & Boorman, F. (2018). Active inference, autonomy and self-organisation. *Entropy*
- Parr, T., & Friston, K. (2019). Generalised free energy and active inference. *Biological Cybernetics*
- Legrand, N. (2021). A Gentle Introduction to the Free Energy Principle. *arXiv preprint*

---

*This project is affiliated with UMPV and AMIS.*
