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

import { PI, min } from '../utils/helpers';
import { FONTS } from '../config/theme';

const DEFAULT_FONT_FAMILY: string = FONTS.family;

/**
 * Set the font on a canvas context.
 */
export function setFont(
  context: CanvasRenderingContext2D,
  fontSize: number,
  fontWeight: number,
  fontStyle: string = 'normal',
  fontFamily: string = DEFAULT_FONT_FAMILY,
): void {
  context.font = `${fontWeight} ${fontStyle} ${fontSize}px ${fontFamily}`;
}

/**
 * Set font for repository labels.
 */
export function setRepoFont(
  context: CanvasRenderingContext2D,
  SF: number = 1,
  fontSize: number = 15,
): void {
  setFont(context, fontSize * SF, 400, 'normal');
}

/**
 * Set font for central repository label.
 */
export function setCentralRepoFont(
  context: CanvasRenderingContext2D,
  SF: number = 1,
  fontSize: number = 15,
): void {
  setFont(context, fontSize * SF, 700, 'normal');
}

/**
 * Set font for owner labels.
 */
export function setOwnerFont(
  context: CanvasRenderingContext2D,
  SF: number = 1,
  fontSize: number = 15,
): void {
  setFont(context, fontSize * SF, 700, 'normal');
}

/**
 * Set font for contributor labels.
 */
export function setContributorFont(
  context: CanvasRenderingContext2D,
  SF: number = 1,
  fontSize: number = 16,
): void {
  setFont(context, fontSize * SF, 700, 'italic');
}

/**
 * Render text with custom letter spacing.
 *
 * Based on http://jsfiddle.net/davidhong/hKbJ4/
 */
export function renderText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number = 0,
  stroke: boolean = false,
): [number, number] {
  const characters = text.split('');
  let index = 0;
  let current: string = '';
  let currentPosition = x;
  const alignment = context.textAlign;

  let totalWidth = 0;
  for (let i = 0; i < characters.length; i++) {
    totalWidth += context.measureText(characters[i]).width + letterSpacing;
  }

  if (alignment === 'right') {
    currentPosition = x - totalWidth;
  } else if (alignment === 'center') {
    currentPosition = x - totalWidth / 2;
  }

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
 */
export function getLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  balance: boolean = true,
): [string[], number] {
  const words = text.split(' ');
  let lines: string[] = [];
  let currentLine = words[0];

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

  if (balance && lines.length === 2) {
    lines = splitString(text);
  }

  let maxLength = 0;
  lines.forEach((l) => {
    const width = context.measureText(l).width;
    if (width > maxLength) maxLength = width;
  });

  return [lines, maxLength];
}

/**
 * Split a string into two balanced sections at the most central space.
 */
export function splitString(text: string): string[] {
  const len = text.length;

  const indices: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') indices.push(i);
  }

  const diff = indices.map((d) => Math.abs(len / 2 - d));
  const minValue = min(...diff);
  const ind = indices[diff.indexOf(minValue)];

  const str1 = text.substr(0, ind);
  const str2 = text.substr(ind);

  return [str1.trim(), str2.trim()];
}

/**
 * Draw text along a circular arc.
 */
export function drawTextAlongArc(
  context: CanvasRenderingContext2D,
  str: string,
  angle: number,
  radius: number,
  side: 'up' | 'down',
  kerning: number = 0,
): void {
  let startAngle = side === 'up' ? angle : angle - PI;
  let text = str;

  if (side === 'up') {
    text = text.split('').reverse().join('');
  }

  for (let j = 0; j < text.length; j++) {
    const charWid = context.measureText(text[j]).width;
    startAngle += (charWid + (j === text.length - 1 ? 0 : kerning)) / radius / 2;
  }

  context.save();
  context.rotate(startAngle);

  for (let n = 0; n < text.length; n++) {
    const charWid = context.measureText(text[n]).width / 2;
    const y = (side === 'up' ? -1 : 1) * radius;

    context.rotate(-(charWid + kerning) / radius);
    renderText(context, text[n], 0, y, 0);
    context.rotate(-(charWid + kerning) / radius);
  }

  context.restore();
}

/**
 * Measure the width of text with a given font.
 */
export function measureText(context: CanvasRenderingContext2D, text: string): number {
  return context.measureText(text).width;
}

/**
 * Draw multi-line text centered at a position.
 */
export function drawMultilineText(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): void {
  const savedAlign = context.textAlign;
  context.textAlign = 'center';

  lines.forEach((line, i) => {
    context.fillText(line, x, y + i * lineHeight);
  });

  context.textAlign = savedAlign;
}
