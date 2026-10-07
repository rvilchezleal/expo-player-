import { colors } from './colors';

export const type = {
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: colors.label },
  headline: { fontSize: 17, fontWeight: '600', color: colors.label },
  body: { fontSize: 16, fontWeight: '400', color: colors.label },
  bodyStrong: { fontSize: 16, fontWeight: '600', color: colors.label },
  subhead: { fontSize: 14, fontWeight: '400', color: colors.secondaryLabel },
  footnote: { fontSize: 13, fontWeight: '500', color: colors.label },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.secondaryLabel },
  caption: { fontSize: 12, fontWeight: '400', color: colors.secondaryLabel },
  micro: { fontSize: 11, fontWeight: '400', color: colors.tertiaryLabel },
  badge: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: colors.onMedia },
  indicator: { fontSize: 12, fontWeight: '500', letterSpacing: 1, color: colors.onMedia },
  mono: { fontSize: 12, fontFamily: 'monospace', color: colors.label },
};
