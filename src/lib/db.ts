import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Pool } from "pg";
import type { BookingRecord, ExpenseRecord, ImportSource, ImportSummary } from "./types";

type SQLiteDatabase = import("better-sqlite3").Database;
type SQLiteModule = typeof import("better-sqlite3");

type StoredImport = ImportSummary & {
  ownerEmail: string;
};

type StoredBooking = Required<BookingRecord> & {
  ownerEmail: string;
};

type StoredExpense = Required<ExpenseRecord> & {
  ownerEmail: string;
};

type MemoryStore = {
  nextImportId: number;
  nextBookingId: number;
  nextExpenseId: number;
  imports: StoredImport[];
  bookings: StoredBooking[];
  expenses: StoredExpense[];
};

const require = createRequire(import.meta.url);

let sqliteDatabase: SQLiteDatabase | null = null;
let sqliteModule: SQLiteModule | null = null;
let postgresPool: Pool | null = null;
let postgresInitialization: Promise<void> | null = null;

declare global {
  var __homexperienceMemoryStore: MemoryStore | undefined;
}

function isPostgresConfigured() {
  return Boolean(getDatabaseConnectionString());
}

function getDatabaseConnectionString() {
  return process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL ?? "";
}

function shouldUseSQLiteFallback() {
  return !isPostgresConfigured() && process.env.NODE_ENV !== "production";
}

function shouldUseMemoryFallback() {
  return !isPostgresConfigured() && !shouldUseSQLiteFallback();
}

function normalizeOwnerEmail(ownerEmail: string) {
  return ownerEmail.trim().toLowerCase();
}

function getSQLiteModule() {
  if (!sqliteModule) {
    sqliteModule = require("better-sqlite3") as SQLiteModule;
  }

  return sqliteModule;
}

function getMemoryStore() {
  if (!globalThis.__homexperienceMemoryStore) {
    globalThis.__homexperienceMemoryStore = {
      nextImportId: 1,
      nextBookingId: 1,
      nextExpenseId: 1,
      imports: [],
      bookings: [],
      expenses: [],
    };
  }

  return globalThis.__homexperienceMemoryStore;
}

function hasColumn(db: SQLiteDatabase, tableName: string, columnName: string) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  return columns.some((column) => column.name === columnName);
}

function getSQLiteDatabasePath() {
  const directory = path.join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });
  return path.join(directory, "homexperience.sqlite");
}

function initializeSQLiteSchema(db: SQLiteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email TEXT NOT NULL DEFAULT 'legacy',
      file_name TEXT NOT NULL,
      source TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      bookings_count INTEGER NOT NULL,
      expenses_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email TEXT NOT NULL DEFAULT 'legacy',
      import_id INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload',
      check_in TEXT NOT NULL,
      checkout TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      guest_count INTEGER NOT NULL,
      channel TEXT NOT NULL,
      rental_period TEXT NOT NULL,
      price_per_night REAL NOT NULL,
      extra_fee REAL NOT NULL,
      discount REAL NOT NULL,
      rental_revenue REAL NOT NULL,
      cleaning_fee REAL NOT NULL,
      total_revenue REAL NOT NULL,
      host_fee REAL NOT NULL,
      payout REAL NOT NULL,
      nights INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email TEXT NOT NULL DEFAULT 'legacy',
      import_id INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload',
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      note TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_imports_owner_email ON imports(owner_email);
    CREATE INDEX IF NOT EXISTS idx_bookings_owner_check_in ON bookings(owner_email, check_in);
    CREATE INDEX IF NOT EXISTS idx_bookings_owner_channel ON bookings(owner_email, channel);
    CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON expenses(owner_email, date);
  `);

  if (!hasColumn(db, "imports", "owner_email")) {
    db.exec("ALTER TABLE imports ADD COLUMN owner_email TEXT NOT NULL DEFAULT 'legacy';");
  }

  if (!hasColumn(db, "bookings", "owner_email")) {
    db.exec("ALTER TABLE bookings ADD COLUMN owner_email TEXT NOT NULL DEFAULT 'legacy';");
  }

  if (!hasColumn(db, "bookings", "source")) {
    db.exec("ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'upload';");
  }

  if (!hasColumn(db, "expenses", "owner_email")) {
    db.exec("ALTER TABLE expenses ADD COLUMN owner_email TEXT NOT NULL DEFAULT 'legacy';");
  }

  if (!hasColumn(db, "expenses", "source")) {
    db.exec("ALTER TABLE expenses ADD COLUMN source TEXT NOT NULL DEFAULT 'upload';");
  }
}

function getSQLiteDatabase() {
  if (!sqliteDatabase) {
    const SQLite = getSQLiteModule();
    sqliteDatabase = new SQLite(getSQLiteDatabasePath());
    sqliteDatabase.pragma("journal_mode = WAL");
    initializeSQLiteSchema(sqliteDatabase);
  }

  return sqliteDatabase;
}

function getPostgresPool() {
  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString: getDatabaseConnectionString(),
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return postgresPool;
}

async function initializePostgresSchema() {
  if (!isPostgresConfigured()) {
    return;
  }

  if (!postgresInitialization) {
    const pool = getPostgresPool();

    postgresInitialization = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS imports (
          id BIGSERIAL PRIMARY KEY,
          owner_email TEXT NOT NULL,
          file_name TEXT NOT NULL,
          source TEXT NOT NULL,
          imported_at TIMESTAMPTZ NOT NULL,
          bookings_count INTEGER NOT NULL,
          expenses_count INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id BIGSERIAL PRIMARY KEY,
          owner_email TEXT NOT NULL,
          import_id BIGINT NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'upload',
          check_in TEXT NOT NULL,
          checkout TEXT NOT NULL,
          guest_name TEXT NOT NULL,
          guest_count INTEGER NOT NULL,
          channel TEXT NOT NULL,
          rental_period TEXT NOT NULL,
          price_per_night DOUBLE PRECISION NOT NULL,
          extra_fee DOUBLE PRECISION NOT NULL,
          discount DOUBLE PRECISION NOT NULL,
          rental_revenue DOUBLE PRECISION NOT NULL,
          cleaning_fee DOUBLE PRECISION NOT NULL,
          total_revenue DOUBLE PRECISION NOT NULL,
          host_fee DOUBLE PRECISION NOT NULL,
          payout DOUBLE PRECISION NOT NULL,
          nights INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id BIGSERIAL PRIMARY KEY,
          owner_email TEXT NOT NULL,
          import_id BIGINT NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'upload',
          date TEXT NOT NULL,
          category TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          description TEXT NOT NULL,
          note TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_imports_owner_email ON imports(owner_email);
        CREATE INDEX IF NOT EXISTS idx_bookings_owner_check_in ON bookings(owner_email, check_in);
        CREATE INDEX IF NOT EXISTS idx_bookings_owner_channel ON bookings(owner_email, channel);
        CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON expenses(owner_email, date);
      `);
    })();
  }

  await postgresInitialization;
}

async function ensureDatabase() {
  if (isPostgresConfigured()) {
    await initializePostgresSchema();
    return;
  }

  if (shouldUseSQLiteFallback()) {
    getSQLiteDatabase();
    return;
  }

  getMemoryStore();
}

function mapImportSummary(row: Record<string, unknown>): ImportSummary {
  const importedAt = getRowValue(row, "importedAt", "importedat");

  return {
    id: Number(getRowValue(row, "id")),
    fileName: String(getRowValue(row, "fileName", "filename")),
    source: String(getRowValue(row, "source")) as ImportSource,
    importedAt:
      importedAt instanceof Date
        ? importedAt.toISOString()
        : String(importedAt),
    bookingsCount: Number(getRowValue(row, "bookingsCount", "bookingscount")),
    expensesCount: Number(getRowValue(row, "expensesCount", "expensescount")),
  };
}

function mapBookingRecord(row: Record<string, unknown>): BookingRecord {
  return {
    id: Number(getRowValue(row, "id")),
    importId: Number(getRowValue(row, "importId", "importid")),
    source: String(getRowValue(row, "source")) as ImportSource,
    checkIn: String(getRowValue(row, "checkIn", "checkin")),
    checkout: String(getRowValue(row, "checkout")),
    guestName: String(getRowValue(row, "guestName", "guestname")),
    guestCount: Number(getRowValue(row, "guestCount", "guestcount")),
    channel: String(getRowValue(row, "channel")),
    rentalPeriod: String(getRowValue(row, "rentalPeriod", "rentalperiod")),
    pricePerNight: Number(getRowValue(row, "pricePerNight", "pricepernight")),
    extraFee: Number(getRowValue(row, "extraFee", "extrafee")),
    discount: Number(getRowValue(row, "discount")),
    rentalRevenue: Number(getRowValue(row, "rentalRevenue", "rentalrevenue")),
    cleaningFee: Number(getRowValue(row, "cleaningFee", "cleaningfee")),
    totalRevenue: Number(getRowValue(row, "totalRevenue", "totalrevenue")),
    hostFee: Number(getRowValue(row, "hostFee", "hostfee")),
    payout: Number(getRowValue(row, "payout")),
    nights: Number(getRowValue(row, "nights")),
  };
}

function mapExpenseRecord(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: Number(getRowValue(row, "id")),
    importId: Number(getRowValue(row, "importId", "importid")),
    source: String(getRowValue(row, "source")) as ImportSource,
    date: String(getRowValue(row, "date")),
    category: String(getRowValue(row, "category")),
    amount: Number(getRowValue(row, "amount")),
    description: String(getRowValue(row, "description")),
    note: String(getRowValue(row, "note")),
  };
}

function getRowValue(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }

  return undefined;
}

function cloneImportSummary(importSummary: StoredImport): ImportSummary {
  return {
    id: importSummary.id,
    fileName: importSummary.fileName,
    source: importSummary.source,
    importedAt: importSummary.importedAt,
    bookingsCount: importSummary.bookingsCount,
    expensesCount: importSummary.expensesCount,
  };
}

function cloneBookingRecord(booking: StoredBooking): BookingRecord {
  return {
    id: booking.id,
    importId: booking.importId,
    source: booking.source,
    checkIn: booking.checkIn,
    checkout: booking.checkout,
    guestName: booking.guestName,
    guestCount: booking.guestCount,
    channel: booking.channel,
    rentalPeriod: booking.rentalPeriod,
    pricePerNight: booking.pricePerNight,
    extraFee: booking.extraFee,
    discount: booking.discount,
    rentalRevenue: booking.rentalRevenue,
    cleaningFee: booking.cleaningFee,
    totalRevenue: booking.totalRevenue,
    hostFee: booking.hostFee,
    payout: booking.payout,
    nights: booking.nights,
  };
}

function cloneExpenseRecord(expense: StoredExpense): ExpenseRecord {
  return {
    id: expense.id,
    importId: expense.importId,
    source: expense.source,
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    note: expense.note,
  };
}

function normalizeFingerprintValue(value: string) {
  return value.trim().toLowerCase();
}

function formatFingerprintNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function createBookingFingerprint(booking: BookingRecord) {
  return [
    booking.checkIn,
    booking.checkout,
    normalizeFingerprintValue(booking.guestName),
    booking.guestCount,
    normalizeFingerprintValue(booking.channel),
    normalizeFingerprintValue(booking.rentalPeriod),
    formatFingerprintNumber(booking.pricePerNight),
    formatFingerprintNumber(booking.extraFee),
    formatFingerprintNumber(booking.discount),
    formatFingerprintNumber(booking.rentalRevenue),
    formatFingerprintNumber(booking.cleaningFee),
    formatFingerprintNumber(booking.totalRevenue),
    formatFingerprintNumber(booking.hostFee),
    formatFingerprintNumber(booking.payout),
    booking.nights,
  ].join("|");
}

function createExpenseFingerprint(expense: ExpenseRecord) {
  return [
    expense.date,
    normalizeFingerprintValue(expense.category),
    formatFingerprintNumber(expense.amount),
    normalizeFingerprintValue(expense.description),
    normalizeFingerprintValue(expense.note),
  ].join("|");
}

type ImportDataResult = {
  importId: number;
  importedAt: string;
  bookingsCount: number;
  expensesCount: number;
  skippedBookingsCount: number;
  skippedExpensesCount: number;
};

export async function appendImportData({
  ownerEmail,
  fileName,
  source,
  bookings,
  expenses,
}: {
  ownerEmail: string;
  fileName: string;
  source: ImportSource;
  bookings: BookingRecord[];
  expenses: ExpenseRecord[];
}): Promise<ImportDataResult> {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingBookings = await client.query(
        `
          SELECT
            check_in AS checkIn,
            checkout,
            guest_name AS guestName,
            guest_count AS guestCount,
            channel,
            rental_period AS rentalPeriod,
            price_per_night AS pricePerNight,
            extra_fee AS extraFee,
            discount,
            rental_revenue AS rentalRevenue,
            cleaning_fee AS cleaningFee,
            total_revenue AS totalRevenue,
            host_fee AS hostFee,
            payout,
            nights
          FROM bookings
          WHERE owner_email = $1 AND source = 'upload'
        `,
        [normalizedEmail],
      );
      const existingExpenses = await client.query(
        `
          SELECT
            date,
            category,
            amount,
            description,
            note
          FROM expenses
          WHERE owner_email = $1 AND source = 'upload'
        `,
        [normalizedEmail],
      );

      const bookingFingerprints = new Set(
        existingBookings.rows.map((row) => createBookingFingerprint(mapBookingRecord(row))),
      );
      const expenseFingerprints = new Set(
        existingExpenses.rows.map((row) => createExpenseFingerprint(mapExpenseRecord(row))),
      );

      const freshBookings = bookings.filter((booking) => {
        const fingerprint = createBookingFingerprint(booking);
        if (bookingFingerprints.has(fingerprint)) {
          return false;
        }

        bookingFingerprints.add(fingerprint);
        return true;
      });
      const freshExpenses = expenses.filter((expense) => {
        const fingerprint = createExpenseFingerprint(expense);
        if (expenseFingerprints.has(fingerprint)) {
          return false;
        }

        expenseFingerprints.add(fingerprint);
        return true;
      });

      const importedAt = new Date().toISOString();

      const importResult = await client.query(
        `
          INSERT INTO imports (owner_email, file_name, source, imported_at, bookings_count, expenses_count)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [
          normalizedEmail,
          fileName,
          source,
          importedAt,
          freshBookings.length,
          freshExpenses.length,
        ],
      );

      const importId = Number(importResult.rows[0]?.id ?? 0);

      for (const booking of freshBookings) {
        await client.query(
          `
            INSERT INTO bookings (
              owner_email, import_id, source, check_in, checkout, guest_name, guest_count,
              channel, rental_period, price_per_night, extra_fee, discount, rental_revenue,
              cleaning_fee, total_revenue, host_fee, payout, nights
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `,
          [
            normalizedEmail,
            importId,
            source,
            booking.checkIn,
            booking.checkout,
            booking.guestName,
            booking.guestCount,
            booking.channel,
            booking.rentalPeriod,
            booking.pricePerNight,
            booking.extraFee,
            booking.discount,
            booking.rentalRevenue,
            booking.cleaningFee,
            booking.totalRevenue,
            booking.hostFee,
            booking.payout,
            booking.nights,
          ],
        );
      }

      for (const expense of freshExpenses) {
        await client.query(
          `
            INSERT INTO expenses (
              owner_email, import_id, source, date, category, amount, description, note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            normalizedEmail,
            importId,
            source,
            expense.date,
            expense.category,
            expense.amount,
            expense.description,
            expense.note,
          ],
        );
      }

      await client.query("COMMIT");

      return {
        importId,
        importedAt,
        bookingsCount: freshBookings.length,
        expensesCount: freshExpenses.length,
        skippedBookingsCount: bookings.length - freshBookings.length,
        skippedExpensesCount: expenses.length - freshExpenses.length,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  if (shouldUseMemoryFallback()) {
    const store = getMemoryStore();
    const importedAt = new Date().toISOString();
    const importId = store.nextImportId++;

    const bookingFingerprints = new Set(
      store.bookings
        .filter((booking) => booking.ownerEmail === normalizedEmail && booking.source === "upload")
        .map(createBookingFingerprint),
    );
    const expenseFingerprints = new Set(
      store.expenses
        .filter((expense) => expense.ownerEmail === normalizedEmail && expense.source === "upload")
        .map(createExpenseFingerprint),
    );

    const freshBookings = bookings.filter((booking) => {
      const fingerprint = createBookingFingerprint(booking);
      if (bookingFingerprints.has(fingerprint)) {
        return false;
      }

      bookingFingerprints.add(fingerprint);
      return true;
    });
    const freshExpenses = expenses.filter((expense) => {
      const fingerprint = createExpenseFingerprint(expense);
      if (expenseFingerprints.has(fingerprint)) {
        return false;
      }

      expenseFingerprints.add(fingerprint);
      return true;
    });

    store.imports.push({
      id: importId,
      ownerEmail: normalizedEmail,
      fileName,
      source,
      importedAt,
      bookingsCount: freshBookings.length,
      expensesCount: freshExpenses.length,
    });

    for (const booking of freshBookings) {
      store.bookings.push({
        ...booking,
        id: store.nextBookingId++,
        importId,
        ownerEmail: normalizedEmail,
        source,
      });
    }

    for (const expense of freshExpenses) {
      store.expenses.push({
        ...expense,
        id: store.nextExpenseId++,
        importId,
        ownerEmail: normalizedEmail,
        source,
      });
    }

    return {
      importId,
      importedAt,
      bookingsCount: freshBookings.length,
      expensesCount: freshExpenses.length,
      skippedBookingsCount: bookings.length - freshBookings.length,
      skippedExpensesCount: expenses.length - freshExpenses.length,
    };
  }

  const db = getSQLiteDatabase();
  const transaction = db.transaction(() => {
    const existingBookings = db
      .prepare(
        `
          SELECT
            check_in AS checkIn,
            checkout,
            guest_name AS guestName,
            guest_count AS guestCount,
            channel,
            rental_period AS rentalPeriod,
            price_per_night AS pricePerNight,
            extra_fee AS extraFee,
            discount,
            rental_revenue AS rentalRevenue,
            cleaning_fee AS cleaningFee,
            total_revenue AS totalRevenue,
            host_fee AS hostFee,
            payout,
            nights
          FROM bookings
          WHERE owner_email = ? AND source = 'upload'
        `,
      )
      .all(normalizedEmail)
      .map((row) => mapBookingRecord(row as Record<string, unknown>));

    const existingExpenses = db
      .prepare(
        `
          SELECT
            date,
            category,
            amount,
            description,
            note
          FROM expenses
          WHERE owner_email = ? AND source = 'upload'
        `,
      )
      .all(normalizedEmail)
      .map((row) => mapExpenseRecord(row as Record<string, unknown>));

    const bookingFingerprints = new Set(existingBookings.map(createBookingFingerprint));
    const expenseFingerprints = new Set(existingExpenses.map(createExpenseFingerprint));
    const freshBookings = bookings.filter((booking) => {
      const fingerprint = createBookingFingerprint(booking);
      if (bookingFingerprints.has(fingerprint)) {
        return false;
      }

      bookingFingerprints.add(fingerprint);
      return true;
    });
    const freshExpenses = expenses.filter((expense) => {
      const fingerprint = createExpenseFingerprint(expense);
      if (expenseFingerprints.has(fingerprint)) {
        return false;
      }

      expenseFingerprints.add(fingerprint);
      return true;
    });

    const importedAt = new Date().toISOString();

    const result = db
      .prepare(
        `
          INSERT INTO imports (owner_email, file_name, source, imported_at, bookings_count, expenses_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        normalizedEmail,
        fileName,
        source,
        importedAt,
        freshBookings.length,
        freshExpenses.length,
      );

    const importId = Number(result.lastInsertRowid);

    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        owner_email, import_id, source, check_in, checkout, guest_name, guest_count,
        channel, rental_period, price_per_night, extra_fee, discount, rental_revenue,
        cleaning_fee, total_revenue, host_fee, payout, nights
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertExpense = db.prepare(`
      INSERT INTO expenses (
        owner_email, import_id, source, date, category, amount, description, note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const booking of freshBookings) {
      insertBooking.run(
        normalizedEmail,
        importId,
        source,
        booking.checkIn,
        booking.checkout,
        booking.guestName,
        booking.guestCount,
        booking.channel,
        booking.rentalPeriod,
        booking.pricePerNight,
        booking.extraFee,
        booking.discount,
        booking.rentalRevenue,
        booking.cleaningFee,
        booking.totalRevenue,
        booking.hostFee,
        booking.payout,
        booking.nights,
      );
    }

    for (const expense of freshExpenses) {
      insertExpense.run(
        normalizedEmail,
        importId,
        source,
        expense.date,
        expense.category,
        expense.amount,
        expense.description,
        expense.note,
      );
    }

    return {
      importId,
      importedAt,
      bookingsCount: freshBookings.length,
      expensesCount: freshExpenses.length,
      skippedBookingsCount: bookings.length - freshBookings.length,
      skippedExpensesCount: expenses.length - freshExpenses.length,
    };
  });

  return transaction();
}

export async function getLatestImport(ownerEmail: string): Promise<ImportSummary | null> {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const result = await pool.query(
      `
        SELECT
          id,
          file_name AS fileName,
          source,
          imported_at AS importedAt,
          bookings_count AS bookingsCount,
          expenses_count AS expensesCount
        FROM imports
        WHERE owner_email = $1
        ORDER BY imported_at DESC
        LIMIT 1
      `,
      [normalizedEmail],
    );

    return result.rows[0] ? mapImportSummary(result.rows[0]) : null;
  }

  if (shouldUseMemoryFallback()) {
    const store = getMemoryStore();
    const latestImport = store.imports
      .filter((entry) => entry.ownerEmail === normalizedEmail)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))[0];

    return latestImport ? cloneImportSummary(latestImport) : null;
  }

  const db = getSQLiteDatabase();
  const row = db
    .prepare(
      `
        SELECT
          id,
          file_name AS fileName,
          source,
          imported_at AS importedAt,
          bookings_count AS bookingsCount,
          expenses_count AS expensesCount
        FROM imports
        WHERE owner_email = ?
        ORDER BY imported_at DESC
        LIMIT 1
      `,
    )
    .get(normalizedEmail) as Record<string, unknown> | undefined;

  return row ? mapImportSummary(row) : null;
}

export async function getBookings(ownerEmail: string): Promise<BookingRecord[]> {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const result = await pool.query(
      `
        SELECT
          id,
          import_id AS importId,
          source,
          check_in AS checkIn,
          checkout,
          guest_name AS guestName,
          guest_count AS guestCount,
          channel,
          rental_period AS rentalPeriod,
          price_per_night AS pricePerNight,
          extra_fee AS extraFee,
          discount,
          rental_revenue AS rentalRevenue,
          cleaning_fee AS cleaningFee,
          total_revenue AS totalRevenue,
          host_fee AS hostFee,
          payout,
          nights
        FROM bookings
        WHERE owner_email = $1
        ORDER BY check_in ASC
      `,
      [normalizedEmail],
    );

    return result.rows.map(mapBookingRecord);
  }

  if (shouldUseMemoryFallback()) {
    const store = getMemoryStore();

    return store.bookings
      .filter((booking) => booking.ownerEmail === normalizedEmail)
      .sort((left, right) => left.checkIn.localeCompare(right.checkIn))
      .map(cloneBookingRecord);
  }

  const db = getSQLiteDatabase();
  return db
    .prepare(
      `
        SELECT
          id,
          import_id AS importId,
          source,
          check_in AS checkIn,
          checkout,
          guest_name AS guestName,
          guest_count AS guestCount,
          channel,
          rental_period AS rentalPeriod,
          price_per_night AS pricePerNight,
          extra_fee AS extraFee,
          discount,
          rental_revenue AS rentalRevenue,
          cleaning_fee AS cleaningFee,
          total_revenue AS totalRevenue,
          host_fee AS hostFee,
          payout,
          nights
        FROM bookings
        WHERE owner_email = ?
        ORDER BY check_in ASC
      `,
    )
    .all(normalizedEmail)
    .map((row) => mapBookingRecord(row as Record<string, unknown>));
}

export async function getExpenses(ownerEmail: string): Promise<ExpenseRecord[]> {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const result = await pool.query(
      `
        SELECT
          id,
          import_id AS importId,
          source,
          date,
          category,
          amount,
          description,
          note
        FROM expenses
        WHERE owner_email = $1
        ORDER BY date ASC
      `,
      [normalizedEmail],
    );

    return result.rows.map(mapExpenseRecord);
  }

  if (shouldUseMemoryFallback()) {
    const store = getMemoryStore();

    return store.expenses
      .filter((expense) => expense.ownerEmail === normalizedEmail)
      .sort((left, right) => left.date.localeCompare(right.date))
      .map(cloneExpenseRecord);
  }

  const db = getSQLiteDatabase();
  return db
    .prepare(
      `
        SELECT
          id,
          import_id AS importId,
          source,
          date,
          category,
          amount,
          description,
          note
        FROM expenses
        WHERE owner_email = ?
        ORDER BY date ASC
      `,
    )
    .all(normalizedEmail)
    .map((row) => mapExpenseRecord(row as Record<string, unknown>));
}

export async function insertManualBooking({
  ownerEmail,
  booking,
}: {
  ownerEmail: string;
  booking: BookingRecord;
}) {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const result = await pool.query(
      `
        INSERT INTO bookings (
          owner_email, import_id, source, check_in, checkout, guest_name, guest_count,
          channel, rental_period, price_per_night, extra_fee, discount, rental_revenue,
          cleaning_fee, total_revenue, host_fee, payout, nights
        )
        VALUES ($1, 0, 'manual', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `,
      [
        normalizedEmail,
        booking.checkIn,
        booking.checkout,
        booking.guestName,
        booking.guestCount,
        booking.channel,
        booking.rentalPeriod,
        booking.pricePerNight,
        booking.extraFee,
        booking.discount,
        booking.rentalRevenue,
        booking.cleaningFee,
        booking.totalRevenue,
        booking.hostFee,
        booking.payout,
        booking.nights,
      ],
    );

    return Number(result.rows[0]?.id ?? 0);
  }

  if (shouldUseMemoryFallback()) {
    const store = getMemoryStore();
    const id = store.nextBookingId++;

    store.bookings.push({
      ...booking,
      id,
      importId: 0,
      ownerEmail: normalizedEmail,
      source: "manual",
    });

    return id;
  }

  const db = getSQLiteDatabase();
  const result = db
    .prepare(
      `
        INSERT INTO bookings (
          owner_email, import_id, source, check_in, checkout, guest_name, guest_count,
          channel, rental_period, price_per_night, extra_fee, discount, rental_revenue,
          cleaning_fee, total_revenue, host_fee, payout, nights
        )
        VALUES (?, 0, 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      normalizedEmail,
      booking.checkIn,
      booking.checkout,
      booking.guestName,
      booking.guestCount,
      booking.channel,
      booking.rentalPeriod,
      booking.pricePerNight,
      booking.extraFee,
      booking.discount,
      booking.rentalRevenue,
      booking.cleaningFee,
      booking.totalRevenue,
      booking.hostFee,
      booking.payout,
      booking.nights,
    );

  return Number(result.lastInsertRowid);
}

export async function insertManualExpense({
  ownerEmail,
  expense,
}: {
  ownerEmail: string;
  expense: ExpenseRecord;
}) {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const result = await pool.query(
      `
        INSERT INTO expenses (
          owner_email, import_id, source, date, category, amount, description, note
        )
        VALUES ($1, 0, 'manual', $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        normalizedEmail,
        expense.date,
        expense.category,
        expense.amount,
        expense.description,
        expense.note,
      ],
    );

    return Number(result.rows[0]?.id ?? 0);
  }

  if (shouldUseMemoryFallback()) {
    const store = getMemoryStore();
    const id = store.nextExpenseId++;

    store.expenses.push({
      ...expense,
      id,
      importId: 0,
      ownerEmail: normalizedEmail,
      source: "manual",
    });

    return id;
  }

  const db = getSQLiteDatabase();
  const result = db
    .prepare(
      `
        INSERT INTO expenses (
          owner_email, import_id, source, date, category, amount, description, note
        )
        VALUES (?, 0, 'manual', ?, ?, ?, ?, ?)
      `,
    )
    .run(
      normalizedEmail,
      expense.date,
      expense.category,
      expense.amount,
      expense.description,
      expense.note,
    );

  return Number(result.lastInsertRowid);
}
