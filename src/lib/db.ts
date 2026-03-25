import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Pool } from "pg";
import type { BookingRecord, ExpenseRecord, ImportSource, ImportSummary } from "./types";

let sqliteDatabase: Database.Database | null = null;
let postgresPool: Pool | null = null;
let postgresInitialization: Promise<void> | null = null;

function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function normalizeOwnerEmail(ownerEmail: string) {
  return ownerEmail.trim().toLowerCase();
}

function hasColumn(db: Database.Database, tableName: string, columnName: string) {
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

function initializeSQLiteSchema(db: Database.Database) {
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
    sqliteDatabase = new Database(getSQLiteDatabasePath());
    sqliteDatabase.pragma("journal_mode = WAL");
    initializeSQLiteSchema(sqliteDatabase);
  }

  return sqliteDatabase;
}

function getPostgresPool() {
  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
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

  getSQLiteDatabase();
}

function mapImportSummary(row: Record<string, unknown>): ImportSummary {
  const importedAt = row.importedat;

  return {
    id: Number(row.id),
    fileName: String(row.filename),
    source: String(row.source) as ImportSource,
    importedAt:
      importedAt instanceof Date
        ? importedAt.toISOString()
        : String(importedAt),
    bookingsCount: Number(row.bookingscount),
    expensesCount: Number(row.expensescount),
  };
}

function mapBookingRecord(row: Record<string, unknown>): BookingRecord {
  return {
    id: Number(row.id),
    importId: Number(row.importid),
    source: String(row.source) as ImportSource,
    checkIn: String(row.checkin),
    checkout: String(row.checkout),
    guestName: String(row.guestname),
    guestCount: Number(row.guestcount),
    channel: String(row.channel),
    rentalPeriod: String(row.rentalperiod),
    pricePerNight: Number(row.pricepernight),
    extraFee: Number(row.extrafee),
    discount: Number(row.discount),
    rentalRevenue: Number(row.rentalrevenue),
    cleaningFee: Number(row.cleaningfee),
    totalRevenue: Number(row.totalrevenue),
    hostFee: Number(row.hostfee),
    payout: Number(row.payout),
    nights: Number(row.nights),
  };
}

function mapExpenseRecord(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: Number(row.id),
    importId: Number(row.importid),
    source: String(row.source) as ImportSource,
    date: String(row.date),
    category: String(row.category),
    amount: Number(row.amount),
    description: String(row.description),
    note: String(row.note),
  };
}

export async function replaceImportData({
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
}) {
  await ensureDatabase();
  const normalizedEmail = normalizeOwnerEmail(ownerEmail);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM bookings WHERE owner_email = $1 AND source != 'manual'",
        [normalizedEmail],
      );
      await client.query(
        "DELETE FROM expenses WHERE owner_email = $1 AND source != 'manual'",
        [normalizedEmail],
      );
      await client.query("DELETE FROM imports WHERE owner_email = $1", [
        normalizedEmail,
      ]);

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
          bookings.length,
          expenses.length,
        ],
      );

      const importId = Number(importResult.rows[0]?.id ?? 0);

      for (const booking of bookings) {
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

      for (const expense of expenses) {
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
        bookingsCount: bookings.length,
        expensesCount: expenses.length,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const db = getSQLiteDatabase();
  const transaction = db.transaction(() => {
    db.prepare(
      "DELETE FROM bookings WHERE owner_email = ? AND source != 'manual'",
    ).run(normalizedEmail);
    db.prepare(
      "DELETE FROM expenses WHERE owner_email = ? AND source != 'manual'",
    ).run(normalizedEmail);
    db.prepare("DELETE FROM imports WHERE owner_email = ?").run(normalizedEmail);

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
        bookings.length,
        expenses.length,
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

    for (const booking of bookings) {
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

    for (const expense of expenses) {
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
      bookingsCount: bookings.length,
      expensesCount: expenses.length,
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
