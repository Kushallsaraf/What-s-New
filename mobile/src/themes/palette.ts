/**
 * The token surface every palette must provide.
 *
 * Both palettes in this folder export exactly these keys, so switching the
 * app between them is a one-line change in src/theme.ts.
 */
export type Palette = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceHi: string;
  border: string;
  borderHi: string;
  text: string;
  textDim: string;
  textFaint: string;
  bull: string;
  bullDim: string;
  bear: string;
  bearDim: string;
  flat: string;
  flatDim: string;
  white: string;
};

export type Radius = {
  sm: number;
  md: number;
  lg: number;
};
