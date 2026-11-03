// Spacing, typography, radius and shadows: the same in every theme. Lengths are unitless numbers,
// density-independent pixels for React Native and `px` on the web.

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Text styles. Font families stay with each platform: the web uses its font stack, mobile its system font.
export const typography = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
  headline: { fontSize: 28, lineHeight: 36, fontWeight: 700 },
  // `as const` keeps each weight a literal, the only numbers React Native's fontWeight accepts.
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  // Large enough to round any pill or avatar fully.
  full: 9999,
};

// Border widths; `focus` is also the focus outline's width and offset.
export const borderWidth = {
  thin: 1,
  focus: 2,
};

// React Native style objects; `elevation` is Android's equivalent. The web derives its box-shadow from them.
export const shadows = {
  sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
};
