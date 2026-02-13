/**
 * Text Rendering Utilities
 *
 * Functions for rendering text on canvas, including:
 * - Font configuration
 * - Letter-spaced text rendering
 * - Text wrapping/line breaking
 * - Curved text along arcs
 *
 * @module render/text
 */

import { PI, min } from '../utils/helpers.js';
import { FONTS } from '../config/theme.js';

/**
 * Default font family for the visualization.
 * Can be overridden by passing fontFamily parameter.
 */
const DEFAULT_FONT_FAMILY = FONTS.family;

/**
 * Set the font on a canvas context.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} fontSize - Font size in pixels
 * @param {number} fontWeight - Font weight (400, 700, etc.)
 * @param {string} fontStyle - Font style ('normal', 'italic')
 * @param {string} fontFamily - Font family name
 */
export function setFont(context, fontSize, fontWeight, fontStyle = 'normal', fontFamily = DEFAULT_FONT_FAMILY) {
  context.font = `${fontWeight} ${fontStyle} ${fontSize}px ${fontFamily}`;
}

/**
 * Set font for repository labels.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} SF - Scale factor
 * @param {number} fontSize - Base font size
 */
export function setRepoFont(context, SF = 1, fontSize = 15) {
  setFont(context, fontSize * SF, 400, 'normal');
}

/**
 * Set font for central repository label.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} SF - Scale factor
 * @param {number} fontSize - Base font size
 */
export function setCentralRepoFont(context, SF = 1, fontSize = 15) {
  setFont(context, fontSize * SF, 700, 'normal');
}

/**
 * Set font for owner labels.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} SF - Scale factor
 * @param {number} fontSize - Base font size
 */
export function setOwnerFont(context, SF = 1, fontSize = 15) {
  setFont(context, fontSize * SF, 700, 'normal');
}

/**
 * Set font for contributor labels.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} SF - Scale factor
 * @param {number} fontSize - Base font size
 */
export function setContributorFont(context, SF = 1, fontSize = 16) {
  setFont(context, fontSize * SF, 700, 'italic');
}

/**
 * Render text with custom letter spacing.
 *
 * Based on http://jsfiddle.net/davidhong/hKbJ4/
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {string} text - The text to render
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} letterSpacing - Space between letters in pixels
 * @param {boolean} stroke - Whether to also stroke the text
 * @returns {[number, number]} Start and end x positions
 */
export function renderText(context, text, x, y, letterSpacing = 0, stroke = false) {
  const characters = String.prototype.split.call(text, '');
  let index = 0;
  let current;
  let currentPosition = x;
  const alignment = context.textAlign;

  // Calculate total width for alignment
  let totalWidth = 0;
  for (let i = 0; i < characters.length; i++) {
    totalWidth += context.measureText(characters[i]).width + letterSpacing;
  }

  // Adjust start position based on alignment
  if (alignment === 'right') {
    currentPosition = x - totalWidth;
  } else if (alignment === 'center') {
    currentPosition = x - totalWidth / 2;
  }

  // Render characters
  context.textAlign = 'left';
  const startPosition = currentPosition;

  while (index < text.length) {
    current = characters[index++];
    if (stroke) context.strokeText(current, currentPosition, y);
    context.fillText(current, currentPosition, y);
    currentPosition += context.measureText(current).width + letterSpacing;
  }

  const endPosition = currentPosition - context.measureText(current).width / 2;
  context.textAlign = alignment;

  return [startPosition, endPosition];
}

/**
 * Split text into lines that fit within a maximum width.
 *
 * From: https://stackoverflow.com/questions/2936112
 *
 * @param {CanvasRenderingContext2D} context - The canvas context (for measuring)
 * @param {string} text - The text to wrap
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {boolean} balance - Whether to balance 2-line splits
 * @returns {[string[], number]} Array of [lines, maxLineWidth]
 */
export function getLines(context, text, maxWidth, balance = true) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  // Build lines by adding words until width exceeded
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = context.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  // Balance two-line splits for better appearance
  if (balance && lines.length === 2) {
    lines = splitString(text);
  }

  // Calculate maximum line width
  let maxLength = 0;
  lines.forEach((l) => {
    const width = context.measureText(l).width;
    if (width > maxLength) maxLength = width;
  });

  return [lines, maxLength];
}

/**
 * Split a string into two balanced sections at the most central space.
 *
 * @param {string} text - The text to split
 * @returns {string[]} Array of two balanced strings
 */
export function splitString(text) {
  const len = text.length;

  // Find indices of all spaces
  const indices = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') indices.push(i);
  }

  // Find the space closest to the middle
  const diff = indices.map((d) => Math.abs(len / 2 - d));
  const minValue = min(...diff);
  const ind = indices[diff.indexOf(minValue)];

  // Split at the most-middle space
  const str1 = text.substr(0, ind);
  const str2 = text.substr(ind);

  return [str1.trim(), str2.trim()];
}

/**
 * Draw text along a circular arc.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {string} str - The text to render
 * @param {number} angle - Center angle of the arc (radians)
 * @param {number} radius - Radius of the arc
 * @param {'up'|'down'} side - Which side of the arc to render on
 * @param {number} kerning - Additional space between characters
 */
export function drawTextAlongArc(context, str, angle, radius, side, kerning = 0) {
  let startAngle = side === 'up' ? angle : angle - PI;
  let text = str;

  // Reverse letters for "up" side
  if (side === 'up') {
    text = text.split('').reverse().join('');
  }

  // Calculate total angle for center alignment
  for (let j = 0; j < text.length; j++) {
    const charWid = context.measureText(text[j]).width;
    startAngle += (charWid + (j === text.length - 1 ? 0 : kerning)) / radius / 2;
  }

  context.save();
  context.rotate(startAngle);

  // Render each character
  for (let n = 0; n < text.length; n++) {
    const charWid = context.measureText(text[n]).width / 2;
    const y = (side === 'up' ? -1 : 1) * radius;

    // Rotate half letter
    context.rotate(-(charWid + kerning) / radius);

    // Render character
    renderText(context, text[n], 0, y, 0);

    // Rotate another half letter
    context.rotate(-(charWid + kerning) / radius);
  }

  context.restore();
}

/**
 * Measure the width of text with a given font.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {string} text - The text to measure
 * @returns {number} Width in pixels
 */
export function measureText(context, text) {
  return context.measureText(text).width;
}

/**
 * Draw multi-line text centered at a position.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {string[]} lines - Array of text lines
 * @param {number} x - Center x position
 * @param {number} y - Top y position
 * @param {number} lineHeight - Height of each line
 */
export function drawMultilineText(context, lines, x, y, lineHeight) {
  const savedAlign = context.textAlign;
  context.textAlign = 'center';

  lines.forEach((line, i) => {
    context.fillText(line, x, y + i * lineHeight);
  });

  context.textAlign = savedAlign;
}
