export type ColorKey =
  | "brandHighlight4"
  | "brandHighlight3"
  | "brandHighlight2"
  | "brandHighlight1"
  | "brandCore"
  | "brandShadow1"
  | "brandShadow2"
  | "accentHighlight2"
  | "accentHighlight1"
  | "accentCore"
  | "accentShadow1"
  | "greenHighlight2"
  | "greenHighlight1"
  | "greenCore"
  | "greenShadow1"
  | "yellowHighlight2"
  | "yellowHighlight1"
  | "yellowCore"
  | "yellowShadow1"
  | "redHighlight2"
  | "redHighlight1"
  | "redCore"
  | "redShadow1"
  | "blueHighlight2"
  | "blueHighlight1"
  | "blueCore"
  | "blueShadow1"
  | "black"
  | "textPrimary"
  | "supportingText"
  | "textPlaceholder"
  | "textDisabled"
  | "strokes1"
  | "strokes2"
  | "background1"
  | "background2"
  | "white"
  | "whiteTransparent";

// Template palette — indigo/violet brand with a teal accent (matches the shell).
const colorMap: Record<ColorKey, string> = {
  brandHighlight4: "#eef0ff",
  brandHighlight3: "#c7cdff",
  brandHighlight2: "#9aa4ff",
  brandHighlight1: "#6d7bf7",
  brandCore: "#4f46e5",
  brandShadow1: "#3c34c2",
  brandShadow2: "#2e299b",
  accentHighlight2: "#d7f7f4",
  accentHighlight1: "#7fe3db",
  accentCore: "#14b8a6",
  accentShadow1: "#0e8a7c",
  greenHighlight2: "#e8f7f0",
  greenHighlight1: "#78d2a9",
  greenCore: "#17b26a",
  greenShadow1: "#107d4a",
  yellowHighlight2: "#fef4e6",
  yellowHighlight1: "#fabf70",
  yellowCore: "#f79009",
  yellowShadow1: "#ad6506",
  redHighlight2: "#feeceb",
  redHighlight1: "#f6938c",
  redCore: "#f04438",
  redShadow1: "#a83027",
  blueHighlight2: "#eaf4ff",
  blueHighlight1: "#86bffc",
  blueCore: "#2e90fa",
  blueShadow1: "#2065af",
  black: "#000000",
  textPrimary: "#181d27",
  supportingText: "#535862",
  textPlaceholder: "#717680",
  textDisabled: "#a4a7ae",
  strokes1: "#d5d7da",
  strokes2: "#dfe2e6",
  background1: "#f0f0f0",
  background2: "#f7f7f9",
  white: "#ffffff",
  whiteTransparent: "rgba(255,255,255,0.7)",
};

export function getColor(key: ColorKey): string {
  return colorMap[key] ?? "#000000";
}
