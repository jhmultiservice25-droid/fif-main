import { BadRequestException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

export interface IParsedRow {
  line: number;
  reference: string;
  name: string;
  summary: string;
  sector: string;
  city: string;
  teamName: string;
  contactEmail: string | null;
  website: string | null;
}

const MAX_ROWS = 5000;

/** Accepted header names (case, accents and spacing are ignored), FR and EN. */
const ALIASES: Record<keyof Omit<IParsedRow, "line">, string[]> = {
  reference: ["reference", "ref", "id", "code", "numero"],
  name: ["nom", "name", "solution", "titre", "title", "nom de la solution"],
  summary: ["resume", "summary", "description", "desc"],
  sector: ["secteur", "sector", "domaine", "category", "categorie"],
  city: ["ville", "city", "localisation", "province"],
  teamName: ["equipe", "team", "porteur", "owner", "organisation", "structure"],
  contactEmail: ["email_contact", "email", "e-mail", "contact", "contact email", "email contact"],
  website: ["site_web", "site web", "website", "site", "url", "lien"],
};

export const TEMPLATE_CSV =
  "﻿reference,nom,resume,secteur,ville,equipe,email_contact,site_web\n" +
  'FIF-001,"Nom de la solution","Résumé en une ou deux phrases",Agritech,Kinshasa,"Nom de l\'équipe",contact@exemple.cd,https://exemple.cd\n';

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads the admins' CSV/XLSX of selected solutions into validated rows plus per-line errors. */
export async function parseSolutionsFile(buffer: Buffer, filename: string) {
  const table = filename.toLowerCase().endsWith(".xlsx") ? await readXlsx(buffer) : readCsv(buffer);
  if (table.length < 2) throw new BadRequestException("Le fichier est vide ou ne contient que l'en-tête.");
  if (table.length - 1 > MAX_ROWS) throw new BadRequestException(`Le fichier dépasse ${MAX_ROWS} lignes.`);

  const header = table[0].map((cell) => normalize(String(cell ?? "")));
  const column = Object.fromEntries(
    Object.entries(ALIASES).map(([key, names]) => [
      key,
      header.findIndex((cell) => names.some((name) => normalize(name) === cell)),
    ]),
  ) as Record<keyof typeof ALIASES, number>;
  if (column.reference === -1 || column.name === -1) {
    throw new BadRequestException("Colonnes « reference » et « nom » obligatoires (voir le modèle).");
  }

  const rows: IParsedRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const cell = (key: keyof typeof ALIASES) => (column[key] === -1 ? "" : String(cells[column[key]] ?? "").trim());
    if (cells.every((value) => !String(value ?? "").trim())) return;
    const reference = cell("reference");
    const name = cell("name");
    const email = cell("contactEmail");
    if (!reference) return void errors.push({ line, message: "Référence manquante." });
    if (!name) return void errors.push({ line, message: `Nom manquant (${reference}).` });
    if (seen.has(reference)) return void errors.push({ line, message: `Référence en double : ${reference}.` });
    if (email && !EMAIL.test(email)) return void errors.push({ line, message: `E-mail invalide : ${email}.` });
    seen.add(reference);
    rows.push({
      line,
      reference,
      name,
      summary: cell("summary"),
      sector: cell("sector"),
      city: cell("city"),
      teamName: cell("teamName"),
      contactEmail: email ? email.toLowerCase() : null,
      website: cell("website") || null,
    });
  });
  return { rows, errors };
}

function readCsv(buffer: Buffer): string[][] {
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  try {
    return parse(text, { delimiter, relax_column_count: true, skip_empty_lines: true, bom: true }) as string[][];
  } catch (error) {
    throw new BadRequestException(`CSV illisible : ${(error as Error).message}`);
  }
}

async function readXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException("Fichier Excel illisible.");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException("Le classeur ne contient aucune feuille.");
  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1).map((value) => {
      if (value && typeof value === "object") {
        const cell = value as { text?: string; result?: unknown; hyperlink?: string };
        return String(cell.text ?? cell.result ?? cell.hyperlink ?? "");
      }
      return value == null ? "" : String(value);
    });
    table.push(values);
  });
  return table;
}
