/**
 * Zoom and pan interaction module
 * Handles zoom controls, drag-to-pan, and zoom transform application
 */

/**
 * Creates and configures zoom behavior for the visualization
 * @param {Object} options - Configuration options
 * @param {Object} options.d3 - D3 library instance
 * @param {string} options.canvasSelector - Selector for the canvas element
 * @param {Object} options.state - Zoom state object (will be mutated)
 * @param {Function} options.redrawAll - Function to redraw all canvas layers
 * @param {number} options.ZOOM_CLICK_SUPPRESS_MS - Milliseconds to suppress clicks after zoom/pan
 * @returns {Object} Zoom behavior object
 */
export function setupZoom(options) {
  const { d3, canvasSelector, state, redrawAll, ZOOM_CLICK_SUPPRESS_MS = 150 } = options;

  // Initialize zoom state
  state.zoomTransform = d3.zoomIdentity;
  state.zoomPanning = false;
  state.zoomLastInteraction = 0;
  state.zoomMoved = false;
  state.zoomMovedAt = 0;
  state.zoomStartTransform = d3.zoomIdentity;

  // Create zoom behavior
  const zoomBehavior = d3
    .zoom()
    .filter((event) => event.type !== "wheel" && event.type !== "dblclick")
    .scaleExtent([0.4, 6])
    .on("start", () => {
      state.zoomPanning = true;
      state.zoomMoved = false;
      state.zoomStartTransform = state.zoomTransform;
    })
    .on("zoom", (event) => {
      state.zoomTransform = event.transform;
      state.zoomLastInteraction = Date.now();
      if (
        state.zoomTransform.k !== state.zoomStartTransform.k ||
        state.zoomTransform.x !== state.zoomStartTransform.x ||
        state.zoomTransform.y !== state.zoomStartTransform.y
      ) {
        state.zoomMoved = true;
      }
      redrawAll();
    })
    .on("end", () => {
      state.zoomPanning = false;
      state.zoomLastInteraction = Date.now();
      if (state.zoomMoved) state.zoomMovedAt = state.zoomLastInteraction;
    });

  // Apply zoom behavior to canvas
  const zoomTarget = d3.select(canvasSelector);
  zoomTarget.call(zoomBehavior);

  // Setup button controls
  const canvasElement = document.querySelector(canvasSelector);
  if (!canvasElement) {
    console.warn('setupZoom: canvas element not found:', canvasSelector);
    return zoomBehavior;
  }

  function getZoomCenter() {
    const rect = canvasElement.getBoundingClientRect();
    return [rect.width / 2, rect.height / 2];
  }

  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomResetBtn = document.getElementById("zoom-reset");

  if (zoomInBtn) {
    zoomInBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.scaleBy, 1.2, getZoomCenter());
    };
  }

  if (zoomOutBtn) {
    zoomOutBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.scaleBy, 1 / 1.2, getZoomCenter());
    };
  }

  if (zoomResetBtn) {
    zoomResetBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.transform, d3.zoomIdentity);
    };
  }

  return zoomBehavior;
}

/**
 * Applies zoom transform to a canvas context
 * @param {CanvasRenderingContext2D} context - Canvas 2D context
 * @param {Object} zoomTransform - D3 zoom transform object
 * @param {number} PIXEL_RATIO - Device pixel ratio
 * @param {number} WIDTH - Canvas width
 * @param {number} HEIGHT - Canvas height
 */
export function applyZoomTransform(context, zoomTransform, PIXEL_RATIO, WIDTH, HEIGHT) {
  context.translate(zoomTransform.x * PIXEL_RATIO, zoomTransform.y * PIXEL_RATIO);
  context.scale(zoomTransform.k, zoomTransform.k);
  context.translate(WIDTH / 2, HEIGHT / 2);
}

/**
 * Checks if a click should be suppressed due to recent zoom/pan activity
 * @param {Object} zoomState - Zoom state object
 * @param {number} ZOOM_CLICK_SUPPRESS_MS - Milliseconds to suppress clicks after zoom/pan
 * @returns {boolean} True if click should be suppressed
 */
export function shouldSuppressClick(zoomState, ZOOM_CLICK_SUPPRESS_MS = 150) {
  return (
    zoomState.zoomPanning ||
    (zoomState.zoomMoved && Date.now() - zoomState.zoomMovedAt < ZOOM_CLICK_SUPPRESS_MS)
  );
}

/**
 * Transforms mouse coordinates to account for zoom transform
 * @param {number} mx - Mouse x coordinate
 * @param {number} my - Mouse y coordinate
 * @param {number} PIXEL_RATIO - Device pixel ratio
 * @param {Object} zoomTransform - D3 zoom transform object
 * @param {number} WIDTH - Canvas width
 * @param {number} HEIGHT - Canvas height
 * @param {number} SF - Scale factor
 * @returns {[number, number]} Transformed [x, y] coordinates
 */
export function transformMouseCoordinates(mx, my, PIXEL_RATIO, zoomTransform, WIDTH, HEIGHT, SF) {
  const mxDevice = mx * PIXEL_RATIO;
  const myDevice = my * PIXEL_RATIO;
  const mxTransformed =
    ((mxDevice - zoomTransform.x * PIXEL_RATIO) / zoomTransform.k - WIDTH / 2) / SF;
  const myTransformed =
    ((myDevice - zoomTransform.y * PIXEL_RATIO) / zoomTransform.k - HEIGHT / 2) / SF;
  return [mxTransformed, myTransformed];
}
