import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Trip } from './itinerary';
import { fmtMiles } from './routing';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Standard PDF fonts only cover Latin-1; swap anything else so drawText never throws
const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Appends the itinerary pages (equivalent of the Google Doc from newRosterBackend/itinerary.js
// generateItinerary()) to an existing PDF. Every number printed here comes from the same
// legs that fill the paperwork, so the two cannot disagree.
export async function appendItinerary(pdf: PDFDocument, trip: Trip): Promise<void> {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const heading = rgb(0.17, 0.24, 0.31); // #2c3e50
  const dark = rgb(0.2, 0.2, 0.2); // #333333
  const link = rgb(0.1, 0.45, 0.91); // #1a73e8

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensure = (h: number) => {
    if (y - h < MARGIN) newPage();
  };

  const centered = (text: string, f: PDFFont, size: number, color = dark, gap = 4) => {
    for (const line of wrap(text, f, size, CONTENT_W)) {
      ensure(size + gap);
      y -= size;
      page.drawText(line, { x: MARGIN + (CONTENT_W - f.widthOfTextAtSize(line, size)) / 2, y, size, font: f, color });
      y -= gap;
    }
  };
  const left = (text: string, f: PDFFont, size: number, indent: number, color = dark, gap = 2) => {
    for (const line of wrap(text, f, size, CONTENT_W - indent)) {
      ensure(size + gap);
      y -= size;
      page.drawText(line, { x: MARGIN + indent, y, size, font: f, color });
      y -= gap;
    }
  };
  const rule = () => {
    ensure(10);
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: rgb(0.6, 0.6, 0.6) });
    y -= 8;
  };

  // --- SECTION: GOOGLE MAPS ROUTE PRINTOUT ---
  centered('GOOGLE MAPS ROUTE PRINTOUT', bold, 20, heading, 6);
  rule();

  for (let i = 0; i < trip.legs.length; i++) {
    const leg = trip.legs[i];
    y -= 10;
    left(`${leg.from} to ${leg.to}`, bold, 14, 0, dark, 6);

    centered(`${leg.duration} (${leg.distance})`, italic, 11, dark, 4);

    const b64 = leg.imageDataUrl.split(',')[1];
    if (b64) {
      try {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const img = await pdf.embedPng(bytes);
        const w = 323; // 25% smaller than the Google Doc's 430
        const h = Math.round(w * (350 / 600));
        ensure(h + 6);
        y -= h;
        const imgX = MARGIN + (CONTENT_W - w) / 2;
        page.drawImage(img, { x: imgX, y, width: w, height: h });

        // Google-style route label in the top-left of the map: [car] 1 hr 5 min / 72.4 miles
        // Both values come from the same leg that fills the paperwork.
        const time = leg.duration.replace(/\bhours?\b/g, 'hr').replace(/\bmins?\b/g, 'min');
        const dist = leg.distance.replace(/\bmi\b/g, 'miles');
        const timeSize = 13;
        const distSize = 8.5;
        const pad = 7;
        const iconW = 22;
        const gap = 7;
        const textW = Math.max(bold.widthOfTextAtSize(time, timeSize), font.widthOfTextAtSize(dist, distSize));
        const bw = pad + iconW + gap + textW + pad;
        const bh = 34;
        const bx = imgX + 8;
        const byTop = y + h - 8; // top edge of the badge
        const roundRect = (rx: number, ryTop: number, rw: number, rh: number, r: number, fill: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>) =>
          page.drawSvgPath(
            `M ${r} 0 H ${rw - r} Q ${rw} 0 ${rw} ${r} V ${rh - r} Q ${rw} ${rh} ${rw - r} ${rh} H ${r} Q 0 ${rh} 0 ${rh - r} V ${r} Q 0 0 ${r} 0 Z`,
            { x: rx, y: ryTop, color: fill, borderColor: border, borderWidth: border ? 0.5 : 0 }
          );
        roundRect(bx + 1, byTop - 1.5, bw, bh, 5, rgb(0.75, 0.75, 0.75)); // soft shadow
        roundRect(bx, byTop, bw, bh, 5, rgb(1, 1, 1), rgb(0.82, 0.82, 0.82)); // white box

        // Car icon (vector): roof, body, windows, wheels
        const iconColor = rgb(0.37, 0.39, 0.41); // #5f6368
        const ix = bx + pad;
        const iy = byTop - bh / 2 - 7; // icon bottom
        page.drawSvgPath('M 4 5 L 7 0 H 15 L 18 5 Z', { x: ix, y: iy + 14, color: iconColor });
        page.drawSvgPath('M 8 4.2 L 9.6 1 H 12.4 V 4.2 Z M 13.4 4.2 V 1 H 14.4 L 16 4.2 Z', { x: ix, y: iy + 14, color: rgb(1, 1, 1) });
        page.drawRectangle({ x: ix, y: iy + 3, width: iconW, height: 6, color: iconColor });
        page.drawCircle({ x: ix + 5.5, y: iy + 3, size: 2.6, color: iconColor, borderColor: rgb(1, 1, 1), borderWidth: 1 });
        page.drawCircle({ x: ix + 16.5, y: iy + 3, size: 2.6, color: iconColor, borderColor: rgb(1, 1, 1), borderWidth: 1 });

        const tx = bx + pad + iconW + gap;
        page.drawText(time, { x: tx, y: byTop - 5 - timeSize + 2, size: timeSize, font: bold, color: rgb(0.13, 0.13, 0.13) });
        page.drawText(dist, { x: tx, y: byTop - bh + 7, size: distSize, font, color: iconColor });
        y -= 6;
      } catch {
        // Map image unavailable; the route text and link are still included
      }
    }

    // "Open in Google Maps" link
    const label = 'Open in Google Maps';
    const size = 9;
    const lw = font.widthOfTextAtSize(label, size);
    const lx = MARGIN + (CONTENT_W - lw) / 2;
    ensure(size + 6);
    y -= size;
    page.drawText(label, { x: lx, y, size, font, color: link });
    page.drawLine({ start: { x: lx, y: y - 1.5 }, end: { x: lx + lw, y: y - 1.5 }, thickness: 0.5, color: link });
    const annot = pdf.context.register(
      pdf.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [lx, y - 3, lx + lw, y + size],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(leg.mapsUrl) },
      })
    );
    page.node.addAnnot(annot);
    y -= 6;

    // Fit 2 legs per page
    if (i % 2 === 1 && i < trip.legs.length - 1) newPage();
  }

  // Cross-check line: same total that is written on the paperwork
  y -= 14;
  centered(`TOTAL MILEAGE: ${fmtMiles(trip.totalMiles)} mi`, bold, 12, heading, 4);

}
