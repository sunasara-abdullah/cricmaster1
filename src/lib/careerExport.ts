import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CareerMatch } from "./career";
import { oversText, strikeRate, economy } from "./cricket";

const PRIMARY: [number, number, number] = [34, 197, 94];

function matchHeader(doc: jsPDF, m: CareerMatch, y: number): number {
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(`${m.team_a} vs ${m.team_b}`, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const meta = [
    new Date(m.played_at).toLocaleDateString(),
    `${m.overs} overs`,
    m.venue,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(meta, 14, y);
  y += 6;
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(11);
  doc.text(m.result || "Result unavailable", 14, y);
  y += 5;
  if (m.man_of_the_match) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text(`Man of the Match: ${m.man_of_the_match}`, 14, y);
    y += 5;
  }
  return y + 2;
}

function inningsTables(doc: jsPDF, m: CareerMatch, startY: number): number {
  let y = startY;
  for (const inn of m.data?.innings ?? []) {
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(
      `${inn.battingTeam}  ${inn.runs}/${inn.wickets} (${oversText(inn.balls)})`,
      14,
      y,
    );
    y += 2;
    autoTable(doc, {
      startY: y + 2,
      head: [["Batter", "R", "B", "4s", "6s", "SR"]],
      body: inn.batters
        .filter((b) => b.balls > 0 || b.runs > 0 || b.out)
        .map((b) => [
          b.name,
          b.runs,
          b.balls,
          b.fours,
          b.sixes,
          strikeRate(b.runs, b.balls),
        ]),
      headStyles: { fillColor: PRIMARY },
      styles: { fontSize: 8 },
      theme: "striped",
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable added by plugin
    y = doc.lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: y,
      head: [["Bowler", "O", "R", "W", "Econ"]],
      body: inn.bowlers
        .filter((b) => b.balls > 0)
        .map((b) => [
          b.name,
          oversText(b.balls),
          b.runs,
          b.wickets,
          economy(b.runs, b.balls),
        ]),
      headStyles: { fillColor: [60, 60, 60] },
      styles: { fontSize: 8 },
      theme: "striped",
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable added by plugin
    y = doc.lastAutoTable.finalY + 8;
  }
  return y;
}

/** Export a single match scorecard as a PDF. */
export function exportMatchPdf(m: CareerMatch) {
  const doc = new jsPDF();
  let y = matchHeader(doc, m, 18);
  inningsTables(doc, m, y);
  doc.save(`${m.team_a}-vs-${m.team_b}.pdf`);
}

/** Export the full career (summary + every match) as a PDF. */
export function exportCareerPdf(matches: CareerMatch[], name: string) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(...PRIMARY);
  doc.text("CricMaster", 14, 20);
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(`${name || "Player"} — Career History`, 14, 30);

  autoTable(doc, {
    startY: 38,
    head: [["Date", "Match", "Result", "MoM"]],
    body: matches.map((m) => [
      new Date(m.played_at).toLocaleDateString(),
      `${m.team_a} vs ${m.team_b}`,
      m.result,
      m.man_of_the_match || "-",
    ]),
    headStyles: { fillColor: PRIMARY },
    styles: { fontSize: 9 },
    theme: "striped",
    margin: { left: 14, right: 14 },
  });

  matches.forEach((m) => {
    doc.addPage();
    const y = matchHeader(doc, m, 18);
    inningsTables(doc, m, y);
  });

  doc.save(`${name || "player"}-career.pdf`);
}