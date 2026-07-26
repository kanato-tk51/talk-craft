import type { drizzle } from "drizzle-orm/d1";

type D1DatabaseBinding = Parameters<typeof drizzle>[0];

declare global {
  interface CloudflareEnv {
    DB: D1DatabaseBinding;
  }
}
