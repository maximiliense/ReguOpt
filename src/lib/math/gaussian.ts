/**
 * Gaussian distribution utilities.
 * All functions are pure and never return NaN for valid inputs (sigma2 > 0).
 */

/** Gaussian distribution parameterized by mean (mu) and variance (sigma2). */
export interface Gaussian {
	mu: number; // mean
	sigma2: number; // variance σ², must be > 0
}

const LOG_2PI = Math.log(2 * Math.PI);

/**
 * Draw a standard normal sample using the Box-Muller transform.
 * @param rng - Random number generator (default: Math.random)
 */
function standardNormal(rng: () => number = Math.random): number {
	let u = 0;
	let v = 0;
	while (u === 0) u = rng();
	while (v === 0) v = rng();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Gaussian probability density function.
 * p(x | μ, σ²) = (1 / √(2π σ²)) · exp(-(x-μ)² / (2σ²))
 */
export function gaussianPDF(x: number, g: Gaussian): number {
	const { mu, sigma2 } = g;
	return (1 / Math.sqrt(2 * Math.PI * sigma2)) * Math.exp(-((x - mu) ** 2) / (2 * sigma2));
}

/**
 * Gaussian log probability density function (numerically stable).
 * log p(x | μ, σ²) = -½ log(2π σ²) - (x-μ)² / (2σ²)
 */
export function gaussianLogPDF(x: number, g: Gaussian): number {
	const { mu, sigma2 } = g;
	return -0.5 * (LOG_2PI + Math.log(sigma2)) - (x - mu) ** 2 / (2 * sigma2);
}

/**
 * Sample one value from a Gaussian distribution using Box-Muller.
 * @param rng - Optional RNG for deterministic testing
 */
export function gaussianSample(g: Gaussian, rng: () => number = Math.random): number {
	return g.mu + Math.sqrt(g.sigma2) * standardNormal(rng);
}

/**
 * Generate n independent samples from a Gaussian distribution.
 */
export function gaussianSamples(g: Gaussian, n: number, rng: () => number = Math.random): number[] {
	return Array.from({ length: n }, () => gaussianSample(g, rng));
}

/**
 * Differential entropy of a Gaussian: H(N(μ, σ²)) = ½ ln(2πe σ²)
 */
export function gaussianEntropy(g: Gaussian): number {
	return 0.5 * (1 + LOG_2PI + Math.log(g.sigma2));
}

/**
 * Analytic product of two Gaussian densities (result is proportional to a Gaussian).
 * Precision-weighted combination:
 *   1/σ²_new = 1/σ²_1 + 1/σ²_2
 *   μ_new    = σ²_new · (μ_1/σ²_1 + μ_2/σ²_2)
 */
export function gaussianProduct(g1: Gaussian, g2: Gaussian): Gaussian {
	const prec1 = 1 / g1.sigma2;
	const prec2 = 1 / g2.sigma2;
	const precNew = prec1 + prec2;
	const sigma2New = 1 / precNew;
	const muNew = sigma2New * (g1.mu * prec1 + g2.mu * prec2);
	return { mu: muNew, sigma2: sigma2New };
}
