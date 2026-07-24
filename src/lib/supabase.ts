import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

type MockRow = Record<string, unknown>;
type QueryResult = {
  data: MockRow[] | MockRow | null;
  count?: number | null;
  error: null | { message: string };
};

type FilterOp =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'in'; column: string; values: unknown[] }
  | { kind: 'or'; raw: string };

const fallbackStore: Record<string, MockRow[]> = {
  logs: [],
  alerts: [],
  blocked_ips: [],
  remediation_actions: [],
};

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

class MockQueryBuilder {
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private filters: FilterOp[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private limitCount?: number;
  private rangeStart?: number;
  private rangeEnd?: number;
  private options?: { count?: 'exact'; head?: boolean };
  private payload?: MockRow | MockRow[];
  private selectColumns?: string;
  private maybeSingleMode = false;

  constructor(private readonly table: string) {}

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.operation = 'select';
    this.selectColumns = columns;
    this.options = options;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: 'eq', column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: 'in', column, values });
    return this;
  }

  or(_raw: string) {
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending };
    return this;
  }

  limit(value: number) {
    this.limitCount = value;
    return this;
  }

  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  maybeSingle() {
    this.maybeSingleMode = true;
    return this;
  }

  head() {
    return this;
  }

  insert(payload: MockRow | MockRow[]) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: MockRow) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  upsert(payload: MockRow, _opts?: { onConflict?: string }) {
    this.operation = 'upsert';
    this.payload = payload;
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onFulfilled, onRejected);
  }

  private execute(): Promise<QueryResult> {
    return Promise.resolve().then(() => {
      const rows = [...fallbackStore[this.table] ?? []];

      if (this.operation === 'insert') {
        const payloadArray = Array.isArray(this.payload)
          ? this.payload
          : this.payload
            ? [this.payload]
            : [];

        const inserted = payloadArray.map((row) => ({
          ...row,
          id: (row.id as string | undefined) ?? makeId(),
          created_at: (row.created_at as string | undefined) ?? nowIso(),
        }));
        fallbackStore[this.table] = [...rows, ...inserted];
        return { data: inserted, count: inserted.length, error: null };
      }

      if (this.operation === 'upsert') {
        const payload = this.payload as MockRow;
        const conflictKey = 'ip';
        const existingIndex = rows.findIndex((row) => row[conflictKey] === payload[conflictKey]);
        if (existingIndex >= 0) {
          const updated = { ...rows[existingIndex], ...payload, updated_at: nowIso() };
          rows.splice(existingIndex, 1, updated);
          fallbackStore[this.table] = rows;
          return { data: updated, count: 1, error: null };
        }

        const inserted = { ...payload, id: makeId(), created_at: nowIso() };
        fallbackStore[this.table] = [...rows, inserted];
        return { data: inserted, count: 1, error: null };
      }

      if (this.operation === 'update') {
        const payload = this.payload as MockRow;
        for (const row of rows) {
          if (this.matchesAllFilters(row)) {
            Object.assign(row, payload);
          }
        }
        fallbackStore[this.table] = rows;
        return { data: this.maybeSingleMode ? rows.find((row) => this.matchesAllFilters(row)) ?? null : rows, count: rows.length, error: null };
      }

      if (this.operation === 'delete') {
        const filtered = rows.filter((row) => !this.matchesAllFilters(row));
        fallbackStore[this.table] = filtered;
        return { data: null, count: filtered.length, error: null };
      }

      let filteredRows = rows.filter((row) => this.matchesAllFilters(row));

      if (this.orderBy) {
        filteredRows = [...filteredRows].sort((a, b) => {
          const av = a[this.orderBy!.column] ?? '';
          const bv = b[this.orderBy!.column] ?? '';
          const direction = this.orderBy!.ascending ? 1 : -1;
          return String(av).localeCompare(String(bv)) * direction;
        });
      }

      if (this.rangeStart !== undefined && this.rangeEnd !== undefined) {
        filteredRows = filteredRows.slice(this.rangeStart, this.rangeEnd + 1);
      }

      if (this.limitCount !== undefined) {
        filteredRows = filteredRows.slice(0, this.limitCount);
      }

      const count = filteredRows.length;
      const hasHeadOnly = this.options?.head && this.options?.count === 'exact';
      if (hasHeadOnly) {
        return { data: null, count, error: null };
      }

      if (this.maybeSingleMode) {
        return { data: filteredRows[0] ?? null, count: filteredRows.length, error: null };
      }

      return {
        data: filteredRows,
        count,
        error: null,
      };
    });
  }

  private matchesAllFilters(row: MockRow) {
    return this.filters.every((filter) => {
      switch (filter.kind) {
        case 'eq':
          return row[filter.column] === filter.value;
        case 'in':
          return (filter.values as unknown[]).includes(row[filter.column]);
        case 'or':
          return true;
      }
    });
  }
}

function createMockSupabaseClient() {
  return {
    from(table: string) {
      return new MockQueryBuilder(table);
    },
  };
}

const fallbackClient = createMockSupabaseClient();

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (fallbackClient as unknown as ReturnType<typeof createClient>);
