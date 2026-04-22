export {
  THEME,
  COLORS,
  FONTS,
  SIZES,
  LAYOUT,
  TIMING,
} from "./config/theme";

export {
  createAllScales,
  createRepoRadiusScale,
  createOwnerRadiusScale,
  createContributorRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale,
  updateScaleDomains,
} from "./config/scales";

export {
  applyFilters,
  createFilterManager,
  deepClone,
  getRepoOwner,
  filterReposByOrganization,
  filterLinksByRepos,
  filterLinksByContributors,
  filterContributorsByLinks,
} from "./data/filter";

export {
  PI,
  TAU,
  mod,
  sq,
  isInteger,
  clamp,
  lerp,
  distance,
  toRadians,
  toDegrees,
  round,
  cos,
  sin,
  min,
  max,
  sqrt,
  abs,
  floor,
  ceil,
} from "./utils/helpers";

export {
  VALID_NODE_TYPES,
  isValidNode,
  isValidLink,
  getLinkNodeId,
  isPositioned,
  filterValidNodes,
  filterValidLinks,
  resolveLinkReferences,
} from "./utils/validation";

export {
  isDebugEnabled,
  enableDebug,
  disableDebug,
  debugLog,
  debugWarn,
  debugError,
  debugGroup,
  debugTime,
  createLogger,
} from "./utils/debug";

export {
  DATE_FORMATS,
  createDateFormatters,
  createNumberFormatters,
  createFormatters,
  formatDateRange,
  formatCommitCount,
  formatRepoCount,
  formatContributorCount,
} from "./utils/formatters";

export {
  CANVAS_DEFAULTS,
  createCanvas,
  styleCanvas,
  styleBackgroundCanvas,
  styleHoverCanvas,
  styleContainer,
  setCanvasSize,
  scaleContext,
  clearCanvas,
  fillCanvas,
  createCanvasStack,
  resizeCanvasStack,
  getPixelRatio,
} from "./render/canvas";

export {
  setFont,
  setRepoFont,
  setCentralRepoFont,
  setOwnerFont,
  setContributorFont,
  renderText,
  getLines,
  splitString,
  drawTextAlongArc,
  measureText,
  drawMultilineText,
} from "./render/text";

export {
  REPO_CARD_CONFIG,
  getCommunityHealthLabel,
  renderStatsLine,
  renderLanguages,
  renderCommunityMetrics,
  renderLicense,
  renderArchivedBadge,
} from "./render/repoCard";

export type {
  NodeType,
  ContributorData,
  RepoData,
  OwnerData,
  LinkData,
  VisualizationNode,
  InteractionState,
  FilterState,
  DelaunayData,
  ZoomState,
  PreparedData,
} from "./types";

export const VERSION = "2.0.0";
