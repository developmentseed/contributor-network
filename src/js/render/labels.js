/**
 * Node label rendering
 * @module render/labels
 */

import { setFont, setCentralRepoFont, setContributorFont, setOwnerFont, setRepoFont, renderText } from './text.js';

/**
 * Draws a label for a node
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {Object} d - Node data
 * @param {Object} config - Configuration object:
 *   - SF: Scale factor
 *   - REPO_CENTRAL: ID of central repository
 *   - COLOR_TEXT: Text color
 *   - COLOR_BACKGROUND: Background color
 *   - COLOR_REPO_MAIN: Main repository color
 *   - PI: Math.PI
 * @param {Object} central_repo - Central repository node
 */
export function drawNodeLabel(context, d, config, central_repo, DO_CENTRAL_OUTSIDE = false) {
  const { SF, REPO_CENTRAL, COLOR_TEXT, COLOR_BACKGROUND, COLOR_REPO_MAIN, PI } = config;
  const TAU = PI * 2;
  
  // Draw the name above each node
  context.fillStyle = COLOR_TEXT;
  context.lineWidth = 2 * SF;
  context.textAlign = "center";

  if (d.id === central_repo.id) {
    setCentralRepoFont(context, SF);
  } else if (d.type === "contributor") {
    setContributorFont(context, SF);
  } else if (d.type === "owner") {
    setOwnerFont(context, SF);
  } else {
    setRepoFont(context, SF);
  } // else

  if (d.type === "contributor") {
    context.textBaseline = "middle";

    // Draw the contributor name radiating outward from the contributor's node
    context.save();
    context.translate(d.x * SF, d.y * SF);
    context.rotate(
      d.contributor_angle + (d.contributor_angle > PI / 2 ? PI : 0),
    );
    // Move the max_radius farther away
    context.translate(
      (d.contributor_angle > PI / 2 ? -1 : 1) * (d.max_radius + 14) * SF,
      0,
    );
    // context.textAlign = "center"
    context.textAlign = d.contributor_angle > PI / 2 ? "right" : "left";

    let n = d.data.contributor_lines.length;
    let label_line_height = 1.2;
    let font_size = 13;
    d.data.contributor_lines.forEach((l, i) => {
      let x = 0;
      // Let the y-position be the center of the contributor node
      let y =
        (0 -
          ((n - 1) * font_size * label_line_height) / 2 +
          i * font_size * label_line_height) *
        SF;

      renderText(context, l, x, y, 1.25 * SF);
    }); // forEach

    context.restore();
  } else if (d.id === central_repo.id) {
    context.textBaseline = "middle";
    context.fillStyle = DO_CENTRAL_OUTSIDE
      ? COLOR_REPO_MAIN
      : COLOR_BACKGROUND;
    // If this is drawing the text in the inside of the central circle, clip it to that circle
    if (!DO_CENTRAL_OUTSIDE) {
      context.save();
      context.beginPath();
      context.arc(d.x * SF, d.y * SF, d.r * SF, 0, 2 * PI);
      context.clip();
    } // if
    if (d.data.owner)
      renderText(
        context,
        `${d.data.owner}/`,
        d.x * SF,
        (d.y - 0.6 * 12) * SF,
        1.25 * SF,
      );
    renderText(context, d.label, d.x * SF, (d.y + 0.9 * 12) * SF, 1.25 * SF);
    if (!DO_CENTRAL_OUTSIDE) context.restore();
  } else if (d.type === "repo") {
    context.textBaseline = "bottom";
    context.strokeStyle = COLOR_BACKGROUND;
    context.lineWidth = 4 * SF;
    renderText(
      context,
      `${d.data.owner}/`,
      d.x * SF,
      (d.y - d.r - 3 - 1.1 * 12) * SF,
      1.25 * SF,
      true,
    );
    renderText(
      context,
      d.label,
      d.x * SF,
      (d.y - d.r - 3) * SF,
      1.25 * SF,
      true,
    );
  } else {
    // owner
    context.textBaseline = "bottom";
    context.strokeStyle = COLOR_BACKGROUND;
    context.lineWidth = 4 * SF;
    renderText(
      context,
      `${d.label}/`,
      d.x * SF,
      (d.y - d.r - 3) * SF,
      1.25 * SF,
      true,
    );
  }
}
