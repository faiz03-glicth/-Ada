/**
 * The brand green. Defined once, used as `colors.accent` in BOTH schemes, so switching theme changes the
 * surroundings, never the brand. Accessibility is solved around it, not by changing it:
 * - text and icons ON the green use a dark ink (`onAccent`, 5.2:1);
 * - green TEXT on light surfaces uses `accentText`, a legibility tone (the green itself is 3.3–3.6:1 on
 *   light, fine for icons and fills but below AA for small text);
 * - as an icon or fill it clears the 3:1 non-text minimum on every surface.
 */
export const BRAND_GREEN = '#1E9A52';

/** Dark ink for text and icons on the brand green (5.2:1). */
export const ON_BRAND = '#06140C';
