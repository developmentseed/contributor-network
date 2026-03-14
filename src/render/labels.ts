/**
 * Node label rendering
 * @module render/labels
 */

import { setContributorFont, setOwnerFont, setRepoFont, renderText } from './text';
import type { VisualizationNode } from '../types';

interface LabelConfig {
  SF: number;
  COLOR_TEXT: string;
  COLOR_BACKGROUND: string;
  COLOR_REPO_MAIN: string;
  PI: number;
}

/**
 * Draws a label for a node.
 */
export function drawNodeLabel(
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
  config: LabelConfig,
  central_repo: VisualizationNode | null,
  DO_CENTRAL_OUTSIDE: boolean = false,
): void {
  const { SF, COLOR_TEXT, COLOR_BACKGROUND, COLOR_REPO_MAIN, PI } = config;

  if ((d.type === 'repo' || d.type === 'owner') && window.innerWidth <= 768) {
    return;
  }

  context.fillStyle = COLOR_TEXT;
  context.lineWidth = 2 * SF;
  context.textAlign = 'center';

  if (d.type === 'contributor') {
    setContributorFont(context, SF);
  } else if (d.type === 'owner') {
    setOwnerFont(context, SF);
  } else {
    setRepoFont(context, SF);
  }

  const nodeData = d.data as Record<string, any>;

  if (d.type === 'contributor') {
    context.textBaseline = 'middle';

    const contributor_angle = d.contributor_angle!;
    const max_radius = d.max_radius!;

    context.save();
    context.translate(d.x * SF, d.y * SF);
    context.rotate(contributor_angle + (contributor_angle > PI / 2 ? PI : 0));
    context.translate(
      (contributor_angle > PI / 2 ? -1 : 1) * (max_radius + 14) * SF,
      0,
    );
    context.textAlign = contributor_angle > PI / 2 ? 'right' : 'left';

    let n = nodeData.contributor_lines.length;
    let label_line_height = 1.2;
    let font_size = 13;
    nodeData.contributor_lines.forEach((l: string, i: number) => {
      let x = 0;
      let y =
        (0 -
          ((n - 1) * font_size * label_line_height) / 2 +
          i * font_size * label_line_height) *
        SF;

      renderText(context, l, x, y, 1.25 * SF);
    });

    context.restore();
  } else if (d.type === 'repo') {
    context.textBaseline = 'bottom';
    context.strokeStyle = COLOR_BACKGROUND;
    context.lineWidth = 4 * SF;
    renderText(
      context,
      `${nodeData.owner}/`,
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
    context.textBaseline = 'bottom';
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
