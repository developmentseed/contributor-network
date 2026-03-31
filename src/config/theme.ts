export const MOBILE_BREAKPOINT = 768;
export const MOBILE_DRAWER_PEEK_HEIGHT = 56;

interface RadiusRange {
  min: number;
  max: number;
}

interface LinkWidthRange {
  min: number;
  mid: number;
  max: number;
}

interface LinkDistanceRange {
  min: number;
  max: number;
}

export interface ColorsConfig {
  grenadier: string;
  aquamarine: string;
  aquamarineLight: string;
  background: string;
  contributor: string;
  repo: string;
  repoMain: string;
  owner: string;
  link: string;
  text: string;
  accent: string;
  highlightFill: string;
  shadow: string;
  shadowDark: string;
}

export interface FontsConfig {
  family: string;
  familyCondensed: string;
  familyMono: string;
  normal: number;
  bold: number;
  baseSizeContributor: number;
  baseSizeRepo: number;
  baseSizeOwner: number;
}

export interface SizesConfig {
  defaultCanvas: number;
  contributorRadius: RadiusRange;
  repoRadius: RadiusRange;
  ownerRadius: RadiusRange;
  linkWidth: LinkWidthRange;
  linkDistance: LinkDistanceRange;
}

export interface LayoutConfig {
  centralRadius: number;
  innerRadiusFactor: number;
  contributorPadding: number;
  maxContributorWidth: number;
  defaultSize: number;
  linkDistanceDomain: [number, number];
  linkWidthExponent: number;
  bboxPadding: number;
  ownerCollideStrength: number;
  ownerRepoCollideExtra: number;
  ownerRepoRepulsion: number;
  collaborationChargeStrength: number;
  collaborationLinkMultiplier: number;
  collaborationCollideStrength: number;
  collaborationRadialStrength: number;
  collaborationRadialFactor: number;
}

export interface TimingConfig {
  hoverDelay: number;
  resizeDebounce: number;
  simulationAlpha: number;
  simulationAlphaDecay: number;
}

export interface ThemeConfig {
  colors: ColorsConfig;
  fonts: FontsConfig;
  sizes: SizesConfig;
  layout: LayoutConfig;
  timing: TimingConfig;
}

export const COLORS: ColorsConfig = {
  grenadier: '#CF3F02',
  aquamarine: '#2E86AB',
  aquamarineLight: '#3A9BBF',

  background: '#f7f7f7',
  contributor: '#3A9BBF',
  repo: '#6B8E9B',
  repoMain: '#CF3F02',
  owner: '#CF3F02',
  link: '#e8e8e8',
  text: '#443F3F',
  accent: '#CF3F02',

  highlightFill: '#CF3F0230',
  shadow: '#f7f7f7',
  shadowDark: '#d4d4d4',
};

export const FONTS: FontsConfig = {
  family: 'Roboto',
  familyCondensed: 'Roboto Condensed',
  familyMono: 'Fira Code',

  normal: 400,
  bold: 700,

  baseSizeContributor: 14,
  baseSizeRepo: 13,
  baseSizeOwner: 15,
};

export const SIZES: SizesConfig = {
  defaultCanvas: 1500,

  contributorRadius: { min: 8, max: 30 },
  repoRadius: { min: 4, max: 20 },
  ownerRadius: { min: 2, max: 30 },

  linkWidth: { min: 1, mid: 2, max: 60 },
  linkDistance: { min: 10, max: 80 },
};

export const LAYOUT: LayoutConfig = {
  centralRadius: 35,
  innerRadiusFactor: 0.85,

  contributorPadding: 20,
  maxContributorWidth: 70,

  defaultSize: 1500,

  linkDistanceDomain: [1, 50],
  linkWidthExponent: 0.75,

  bboxPadding: 4,

  ownerCollideStrength: 0.8,
  ownerRepoCollideExtra: 4,
  ownerRepoRepulsion: -45,

  collaborationChargeStrength: -200,
  collaborationLinkMultiplier: 10,
  collaborationCollideStrength: 0.7,
  collaborationRadialStrength: 0.5,
  collaborationRadialFactor: 0.55,
};

export const TIMING: TimingConfig = {
  hoverDelay: 100,
  resizeDebounce: 300,
  simulationAlpha: 0.3,
  simulationAlphaDecay: 0.02,
};

export const DIM = {
  nodeColor: '#b0b0b0',
  linkColor: '#d5d5d5',
  labelColor: '#b0b0b0',
  nodeOpacity: 0.18,
  linkOpacity: 0.08,
  contributorLabelOpacity: 0.22,
};

export const THEME: ThemeConfig = {
  colors: COLORS,
  fonts: FONTS,
  sizes: SIZES,
  layout: LAYOUT,
  timing: TIMING,
};

export default THEME;
