import PDFJSAnnotate from '../PDFJSAnnotate';
import appendChild from './appendChild';
import {
  pointIntersectsRect,
  scaleUp
} from '../UI/utils'; 

/**
 * Render the response from PDFJSAnnotate.StoreAdapter.getAnnotations to SVG
 *
 * @param {SVGElement} svg The SVG element to render the annotations to
 * @param {Object} viewport The page viewport data
 * @param {Object} data The response from PDFJSAnnotate.StoreAdapter.getAnnotations
 * @return {SVGElement} The SVG element that was rendered to
 */
export default function render(svg, viewport, data) {
  // Reset the content of the SVG
  svg.innerHTML = ''; 
  svg.setAttribute('data-pdf-annotate-container', true);
  svg.setAttribute('data-pdf-annotate-viewport', JSON.stringify(viewport));
  svg.removeAttribute('data-pdf-annotate-document');
  svg.removeAttribute('data-pdf-annotate-page');

  // If there's no data nothing can be done
  if (!data) {
    return svg;
  }

  svg.setAttribute('data-pdf-annotate-document', data.documentId);
  svg.setAttribute('data-pdf-annotate-page', data.pageNumber);
  
  // Make sure annotations is an array
  if (!Array.isArray(data.annotations) || data.annotations.length === 0) {
    return svg;
  }

  // Append annotation to svg
  data.annotations.forEach((a) => {
    appendChild(svg, a, viewport);
  });

  // Enable a11y
  // TODO this should def not use timeout, but is needed to wait for PDFJSText.render
  setTimeout(function () {
    insertScreenReaderHints(data.pageNumber, data.annotations);
  }, 5000);

  return svg;
}

/**
 * Insert hints into the DOM for screen readers.
 *
 * @param {Number} pageNumber The page number that hints are inserted for
 * @param {Array} annotations The annotations that hints are inserted for
 */
function insertScreenReaderHints(pageNumber, annotations) {
  let count = {};
  annotations.forEach((a) => {
    // Keep count of each hinted annotation to make it more clear to screen reader
    if (!count[a.type]) {
      count[a.type] = 0;
    }
    count[a.type]++;

    if (['highlight', 'strikeout'].includes(a.type)) {
      let rects = a.rectangles;
      let startNode = elementsFromPoint(rects[0].x, rects[0].y, pageNumber)[0];
      let endNode = elementsFromPoint(rects[rects.length - 1].x, rects[rects.length - 1].y, pageNumber)[0];
      startNode.insertBefore(createScreenReaderOnly(`Begin ${a.type} ${count[a.type]}`), startNode.firstChild);
      endNode.appendChild(createScreenReaderOnly(`End ${a.type} ${count[a.type]}`));
    }
  });
}

/**
 * Get all text layer elements at a given point on a page
 *
 * @param {Number} x The x coordinate of the point
 * @param {Number} y The y coordinate of the point
 * @param {Number} pageNumber The page to limit elements to
 * @return {Array} An array of all text layer elements found at the point
 */
function elementsFromPoint(x, y, pageNumber) {
  let svg = document.querySelector(`svg[data-pdf-annotate-page="${pageNumber}"]`);
  let rect = svg.getBoundingClientRect();
  y = scaleUp(svg, {y: y + 2}).y;
  x = scaleUp(svg, {x: x + 2}).x;
  return [...svg.parentNode.querySelectorAll('.textLayer [data-canvas-width]')].filter((el) => {
    return pointIntersectsRect(x + rect.left, y + rect.top, el.getBoundingClientRect());
  });
}

/**
 * Create a node that is only visible to screen readers
 *
 * @param {String} content The text content that should be read by screen reader
 * @return {Element} An Element that is only visible to screen readers
 */
function createScreenReaderOnly(content) {
  let node = document.createElement('div');
  let text = document.createTextNode(content);
  node.appendChild(text);
  node.style.position = 'absolute';
  node.style.left = '-10000px';
  node.style.top = 'auto';
  node.style.width = '1px';
  node.style.height = '1px';
  node.style.overflow = 'hidden';
  return node;
}
