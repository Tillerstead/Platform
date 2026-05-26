/**
 * JSON File-Based Data Store
 * Provides CRUD operations backed by JSON files in admin/data/
 *
 * Each collection is a separate JSON file containing an array of records.
 * All mutations are atomic (write temp → rename) to prevent corruption.
 */

import fs from 'fs/promises';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Create a data store for a named collection.
 * @param {string} collection — name of the collection (e.g., 'jobs', 'estimates')
 * @returns {object} CRUD interface
 */
export function createStore(collection) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);

  // Validate collection name (prevent path traversal)
  if (!/^[a-z][a-z0-9_-]*$/.test(collection)) {
    throw new Error(`Invalid collection name: ${collection}`);
  }

  /** Read all records */
  async function getAll() {
    if (!existsSync(filePath)) return [];
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  /** Get a single record by ID */
  async function getById(id) {
    const records = await getAll();
    return records.find(r => r.id === id) || null;
  }

  /** Create a new record. Auto-generates id, created_at, updated_at. */
  async function create(data) {
    const records = await getAll();
    const record = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    records.push(record);
    await writeAll(records);
    return record;
  }

  /** Update a record by ID. Merges provided fields. */
  async function update(id, updates) {
    const records = await getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    records[index] = {
      ...records[index],
      ...updates,
      id, // Prevent ID mutation
      created_at: records[index].created_at, // Preserve creation time
      updated_at: new Date().toISOString(),
    };
    await writeAll(records);
    return records[index];
  }

  /** Delete a record by ID. Returns the deleted record or null. */
  async function remove(id) {
    const records = await getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    const [deleted] = records.splice(index, 1);
    await writeAll(records);
    return deleted;
  }

  /** Query records with a filter function. */
  async function query(filterFn) {
    const records = await getAll();
    return records.filter(filterFn);
  }

  /** Count records, optionally with a filter. */
  async function count(filterFn) {
    const records = await getAll();
    return filterFn ? records.filter(filterFn).length : records.length;
  }

  /** Atomic write: write to temp file, then rename. */
  async function writeAll(records) {
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(records, null, 2), 'utf8');
    await fs.rename(tmpPath, filePath);
  }

  return { getAll, getById, create, update, remove, query, count };
}
