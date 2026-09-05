'use client';

import { HalftoneFlow, type NeuformCraftEffectProps } from './NeuformCraftEffects';

/**
 * The call site in the integration brief is
 *
 *     <PredictiveArcCanvas variant="halftone-flow" hue={0} ... />
 *
 * The registered source exports no such component and takes no `variant` prop —
 * it exports one component per effect, and this variant is `HalftoneFlow`. This
 * is the thin mapping between the two, so the documented usage compiles without
 * anything in the authored file being rewritten to match it.
 *
 * Only the vendored variant is accepted. Adding another means vendoring its
 * source first; a string that is not `halftone-flow` is a build error rather
 * than a blank frame at runtime.
 */
export type PredictiveArcVariant = 'halftone-flow';

export type PredictiveArcCanvasProps = NeuformCraftEffectProps & {
  variant: PredictiveArcVariant;
};

export function PredictiveArcCanvas({ variant, ...props }: PredictiveArcCanvasProps) {
  if (variant !== 'halftone-flow') return null;
  return <HalftoneFlow {...props} />;
}

export default PredictiveArcCanvas;
