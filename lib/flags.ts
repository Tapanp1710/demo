/**
 * Build-time feature flags.
 *
 * NEXT_PUBLIC_* is inlined by Next at build, so an unset flag compiles the
 * guarded branch out rather than shipping it disabled.
 */

/**
 * ThreeUI `halftone-flow` behind the Clubhouse carousel. Off unless
 * NEXT_PUBLIC_HALFTONE=1 is set for the build.
 *
 * Scoped to that one section on purpose — it is an iframe running its own
 * WebGL loop, and it is under review against the generated bronze texture it
 * would replace. Nothing else on the site reads this.
 */
export const HALFTONE_FLOW = process.env.NEXT_PUBLIC_HALFTONE === '1';
