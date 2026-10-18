export const colors = {
  bg: '#090A0C',
  canvas: '#000000',
  surface: '#17191F',
  text: '#F4F5F8',
  muted: '#8E95A3',
  subtle: '#B7BDC8',
  line: '#2A2D35',
  section: '#090A0C',
  ink: '#F4F5F8',
  blue: '#7C83FF',
  blueSoft: '#23263A',
  up: '#FF4D5E',
  down: '#2FBF86',
  flat: '#8E95A3',
  banner: '#2A2116',
  bannerText: '#E6C48A',
  chip: '#23262E',
  danger: '#FF6B6B',
};

export function pnlColor(value: number | null | undefined) {
  if (value == null || Math.abs(value) < 0.0000001) return colors.flat;
  return value > 0 ? colors.up : colors.down;
}
