// Stand-in for the `server-only` package under Vitest. The real package
// throws when it detects it's been bundled for a client component — a
// check that makes no sense for a plain Node test runner exercising a
// lib/*.ts module's pure logic directly. Aliased in vitest.config.ts.
export {};
