import { PDFArray, decodePDFRawStream, type PDFDocument, type PDFPage, type PDFRawStream } from 'pdf-lib';

export interface Span {
  /** left edge (columns) or bottom edge (rows), in PDF points */
  pos: number;
  /** width (columns) or height (rows) */
  size: number;
}

export interface TravelTable {
  /** DATE, FROM, TO, MILES columns, left to right */
  columns: Span[];
  /** Blank data rows, top to bottom (below the header and the two "i.e." example rows) */
  dataRows: Span[];
  /** The "TOTAL MILES TRAVELED" row at the bottom */
  totalRow: Span;
}

const mul = (a: number[], b: number[]) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];

// Merge values that are within `tol` of each other (a drawn rule is several overlapping edges)
function cluster(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: { sum: number; n: number; last: number }[] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (g && v - g.last <= tol) {
      g.sum += v;
      g.n++;
      g.last = v;
    } else {
      groups.push({ sum: v, n: 1, last: v });
    }
  }
  return groups.map(g => g.sum / g.n);
}

// Reads the grid lines the template actually draws on the page (no hand-measured coordinates).
// The template is a flattened PDF with no form fields, so the table is just vector lines in the page's
// content stream; we replay the path operators with the transform matrix and collect straight segments.
export function detectTravelTable(pdf: PDFDocument, page: PDFPage): TravelTable {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray
    ? contents.asArray().map(ref => pdf.context.lookup(ref))
    : contents ? [contents] : [];
  const decoder = new TextDecoder('latin1');
  const tokens = streams
    .map(s => decoder.decode(decodePDFRawStream(s as PDFRawStream).decode()))
    .join('\n')
    .split(/\s+/)
    .filter(Boolean);

  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  let nums: number[] = [];
  let path: [number, number][] = [];
  let hasCurve = false;
  const segs: [number, number, number, number][] = [];
  const pt = (x: number, y: number): [number, number] => [
    ctm[0] * x + ctm[2] * y + ctm[4],
    ctm[1] * x + ctm[3] * y + ctm[5],
  ];

  for (const t of tokens) {
    if (/^[-+]?[\d.]+$/.test(t)) {
      nums.push(parseFloat(t));
      continue;
    }
    switch (t) {
      case 'q': stack.push(ctm.slice()); break;
      case 'Q': ctm = stack.pop() ?? ctm; break;
      case 'cm': ctm = mul(nums.slice(-6), ctm); break;
      case 'm':
      case 'l': path.push(pt(nums[nums.length - 2], nums[nums.length - 1])); break;
      case 'c': hasCurve = true; break; // curves are glyph outlines, not table lines
      case 'f':
      case 'f*':
      case 'S':
      case 'n':
        if (!hasCurve && path.length >= 2) {
          for (let i = 0; i < path.length - 1; i++) segs.push([...path[i], ...path[i + 1]]);
        }
        path = [];
        hasCurve = false;
        break;
    }
    nums = [];
  }

  // Long horizontal rules = row boundaries; they also give the table's left/right edges
  const hSegs = segs.filter(s => Math.abs(s[1] - s[3]) < 0.6 && Math.abs(s[0] - s[2]) > 400);
  const rowLines = cluster(hSegs.map(s => s[1]), 1.2).sort((a, b) => b - a);
  const left = Math.min(...hSegs.map(s => Math.min(s[0], s[2])));
  const right = Math.max(...hSegs.map(s => Math.max(s[0], s[2])));
  // Tall vertical rules = column dividers
  const dividers = cluster(
    segs.filter(s => Math.abs(s[0] - s[2]) < 0.8 && Math.abs(s[1] - s[3]) > 40).map(s => s[0]),
    1.5
  ).filter(x => x > left + 5 && x < right - 5);

  const edges = [left, ...dividers, right];
  if (rowLines.length < 6 || edges.length !== 5) {
    throw new Error('Could not detect the mileage table on page 2 of Paperwork.pdf.');
  }

  const columns: Span[] = edges.slice(0, -1).map((x, i) => ({ pos: x, size: edges[i + 1] - x }));
  // Bands between consecutive rules, top to bottom: [header, example 1, example 2, ...blank rows..., total]
  const bands: Span[] = rowLines.slice(0, -1).map((top, i) => ({ pos: rowLines[i + 1], size: top - rowLines[i + 1] }));
  return {
    columns,
    dataRows: bands.slice(3, -1),
    totalRow: bands[bands.length - 1],
  };
}
