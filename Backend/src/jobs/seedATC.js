const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { connectDatabase } = require('../config/db');
const ATCCode = require('../models/ATCCode.model');
const atcSeedDocs = require('../data/atc.seed');

const backendRoot = path.resolve(__dirname, '../..');
const defaultCsvPath = path.resolve(__dirname, '../data/atc_codes.csv');

dotenv.config({ path: path.resolve(backendRoot, '.env') });

const SUPPORTED_HEADERS = {
  code: ['atc_code', 'code'],
  name: ['name', 'title'],
  level: ['level'],
  parentCode: ['parent_code', 'parentcode'],
  description: ['description', 'ddd_unit', 'dddunit', 'notes'],
};

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/^\ufeff/, '');
const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const isBlankRow = (row) => row.every((cell) => String(cell || '').trim() === '');

const parseCsvRows = (content) => {
  const rows = [];
  const normalizedContent = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < normalizedContent.length; index += 1) {
    const character = normalizedContent[index];

    if (inQuotes) {
      if (character === '"') {
        if (normalizedContent[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (character === '\n') {
      row.push(field);
      if (!isBlankRow(row)) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += character;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (!isBlankRow(row)) {
      rows.push(row);
    }
  }

  return rows;
};

const resolveColumnIndex = (headers, aliases) => {
  for (const alias of aliases) {
    const headerIndex = headers.findIndex((header) => header === alias);
    if (headerIndex !== -1) {
      return headerIndex;
    }
  }

  return -1;
};

const inferLevel = (code) => {
  switch (code.length) {
    case 1:
      return 1;
    case 3:
      return 2;
    case 4:
      return 3;
    case 5:
      return 4;
    case 7:
      return 5;
    default:
      return null;
  }
};

const parseAtcCsvContent = (content) => {
  const rows = parseCsvRows(content);

  if (rows.length === 0) {
    throw new Error('ATC CSV is empty');
  }

  const headers = rows[0].map(normalizeHeader);
  const columnIndexes = {
    code: resolveColumnIndex(headers, SUPPORTED_HEADERS.code),
    name: resolveColumnIndex(headers, SUPPORTED_HEADERS.name),
    level: resolveColumnIndex(headers, SUPPORTED_HEADERS.level),
    parentCode: resolveColumnIndex(headers, SUPPORTED_HEADERS.parentCode),
    description: resolveColumnIndex(headers, SUPPORTED_HEADERS.description),
  };

  if (columnIndexes.code === -1 || columnIndexes.name === -1) {
    throw new Error('ATC CSV must include code and name columns');
  }

  const docs = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const code = normalizeCode(row[columnIndexes.code]);
    const name = String(row[columnIndexes.name] || '').trim();

    if (!code && !name) {
      continue;
    }

    if (!code || !name) {
      throw new Error(`Invalid ATC row at line ${rowIndex + 1}: code and name are required`);
    }

    const parsedLevel = Number.parseInt(String(row[columnIndexes.level] || '').trim(), 10);
    const level = Number.isInteger(parsedLevel) ? parsedLevel : inferLevel(code);

    if (!level || level < 1 || level > 5) {
      throw new Error(`Invalid ATC level for code ${code} at line ${rowIndex + 1}`);
    }

    const parentCode =
      columnIndexes.parentCode === -1 ? null : normalizeCode(row[columnIndexes.parentCode]) || null;
    const description =
      columnIndexes.description === -1 ? '' : String(row[columnIndexes.description] || '').trim();

    docs.push({
      code,
      name,
      level,
      parentCode,
      description,
    });
  }

  return docs;
};

const loadAtcDocsFromFile = async (csvPath = defaultCsvPath) => {
  const resolvedPath = path.resolve(csvPath);
  const content = await fs.readFile(resolvedPath, 'utf8');
  return parseAtcCsvContent(content);
};

const seedAtcDocsToDatabase = async (docs, { source = 'embedded seed data' } = {}) => {
  const normalizedDocs = Array.isArray(docs) ? docs : [];

  if (normalizedDocs.length === 0) {
    throw new Error('No ATC rows found to seed');
  }

  await connectDatabase();

  const operations = normalizedDocs.map((doc) => ({
    updateOne: {
      filter: { code: doc.code },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await ATCCode.bulkWrite(operations, { ordered: false });

  return {
    source,
    rows: normalizedDocs.length,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
  };
};

const seedAtcCodes = async (csvPath = defaultCsvPath) => {
  const resolvedPath = path.resolve(csvPath);
  const docs = await loadAtcDocsFromFile(resolvedPath);
  return seedAtcDocsToDatabase(docs, { source: resolvedPath });
};

const seedEmbeddedAtcCodes = async () => seedAtcDocsToDatabase(atcSeedDocs);

const run = async () => {
  const inputArg = process.argv[2];

  try {
    const result = inputArg
      ? await seedAtcCodes(path.resolve(inputArg))
      : await seedEmbeddedAtcCodes();
    console.log(`Seeded ${result.rows} ATC rows from ${result.source}`);
    console.log(`Inserted: ${result.inserted}, Updated: ${result.updated}, Matched: ${result.matched}`);
    process.exit(0);
  } catch (error) {
    console.error(`Failed to seed ATC data: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = {
  parseCsvRows,
  parseAtcCsvContent,
  loadAtcDocsFromFile,
  seedAtcCodes,
  seedAtcDocsToDatabase,
  seedEmbeddedAtcCodes
};
