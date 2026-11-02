import { PDFDocument, rgb, StandardFonts, type PDFPage } from 'pdf-lib';
import { fmtMiles, getTown } from './routing';
import type { Trip } from './itinerary';
import { appendItinerary } from './itineraryPdf';
import { detectTravelTable, type Span } from './tableGrid';

const getTodayFormatted = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
};

// Fill the Paperwork.pdf template from the trip, then append the itinerary pages from the SAME trip
export async function buildTripPdf(trip: Trip, destinationCity: string): Promise<Uint8Array> {
  if (trip.legs.length === 0) throw new Error('Add at least one route first.');

  const res = await fetch(`Paperwork.pdf`);
  if (!res.ok) throw new Error('Paperwork.pdf template not found in public folder.');

  const pdf = await PDFDocument.load(await res.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [p1, p2] = pdf.getPages();
  const textDark = rgb(0.1, 0.1, 0.1);
  const totalMiles = trip.totalMiles;

  const writeText = (page: PDFPage, text: string, x: number, y: number, size = 9, bold = false) => {
    if (!text || !text.trim()) return;
    page.drawText(text.trim(), { x, y, size, font: bold ? fontBold : font, color: textDark });
  };

  // ---------------- PAGE 1 ----------------
  // Baseline underlines in Paperwork.pdf: Club y=602.6, Destination y=517.6, Miles y=294.7, Date y=183.2
  writeText(p1, 'Binghamton Outdoors Club', 75, 605, 10);

  if (destinationCity) writeText(p1, destinationCity, 150, 520, 9.5);

  // Mode of Transportation -> highlight "Personal Car" (no X)
  p1.drawRectangle({ x: 202, y: 382, width: 70, height: 14, color: rgb(1, 0.94, 0.3), opacity: 0.55 });

  if (totalMiles > 0) writeText(p1, fmtMiles(totalMiles), 195, 297, 9.5, true);

  writeText(p1, getTodayFormatted(), 470, 185, 9);

  // ---------------- PAGE 2 (Mileage Table) ----------------
  // Cell positions come from the lines drawn in the template itself, so text always lands inside its box
  if (p2) {
    const grid = detectTravelTable(pdf, p2);
    if (trip.legs.length > grid.dataRows.length) {
      throw new Error(`Too many legs (${trip.legs.length}). The paperwork only fits ${grid.dataRows.length}.`);
    }
    const [, colFrom, colTo, colMiles] = grid.columns;

    // Draws text inside a cell: vertically centered, shrunk to fit the width, then left- or center-aligned
    const drawInCell = (text: string, col: Span, row: Span, size: number, bold = false, center = false) => {
      const f = bold ? fontBold : font;
      const maxW = col.size - 8;
      let s = size;
      while (s > 6.5 && f.widthOfTextAtSize(text, s) > maxW) s -= 0.5;
      let t = text;
      while (t.length > 1 && f.widthOfTextAtSize(t, s) > maxW) t = t.slice(0, -1);
      if (t !== text) t = t.slice(0, -1) + '...';
      const w = f.widthOfTextAtSize(t, s);
      p2.drawText(t, {
        x: center ? col.pos + (col.size - w) / 2 : col.pos + 4,
        y: row.pos + (row.size - s * 0.72) / 2,
        size: s,
        font: f,
        color: textDark,
      });
    };

    trip.legs.forEach((leg, idx) => {
      const row = grid.dataRows[idx];
      drawInCell(getTown(leg.from), colFrom, row, 10);
      drawInCell(getTown(leg.to), colTo, row, 10);
      drawInCell(leg.miles, colMiles, row, 10, true, true);
    });

    if (totalMiles > 0) drawInCell(fmtMiles(totalMiles), colMiles, grid.totalRow, 11, true, true);
  }

  // ---------------- ITINERARY (appended pages) ----------------
  await appendItinerary(pdf, trip);

  return await pdf.save();
}

const DEFAULT_FILENAME = 'Travel Reimbursement.pdf';

interface SaveHandle {
  createWritable(): Promise<{ write(data: BlobPart): Promise<void>; close(): Promise<void> }>;
}

// Opens the browser's "Save As" dialog so the user picks the location and name.
// Must be called straight from the click handler (before any slow work) so the browser allows it.
// Returns: a handle if the user chose a file, null if they cancelled, undefined if the browser has
// no Save dialog (Firefox/Safari), in which case savePdf falls back to a normal download.
export async function askSaveLocation(suggestedName: string = DEFAULT_FILENAME): Promise<SaveHandle | null | undefined> {
  const picker = (window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<SaveHandle>;
  }).showSaveFilePicker;
  if (!picker) return undefined;
  try {
    return await picker({
      suggestedName,
      types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}

// Writes to the chosen location, or falls back to a regular download with the default name
export async function savePdf(bytes: Uint8Array, target: SaveHandle | undefined, filename: string = DEFAULT_FILENAME) {
  if (target) {
    const writable = await target.createWritable();
    await writable.write(bytes as BlobPart);
    await writable.close();
    return;
  }
  downloadPdf(bytes, filename);
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
