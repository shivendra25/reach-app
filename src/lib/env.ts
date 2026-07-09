import { z } from "zod";

/**
 * Server-side environment variables.
 * Anything read on the server must be declared here so it is validated at
 * boot and typed throughout the app.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // LLM provider (used by the research agent)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Research data sources
  EXA_API_KEY: z.string().optional(),

  // Stripe (wired but disabled at launch)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
    // We don't throw during early scaffolding so `next dev` boots without keys,
    // but every consumer should call `requireEnv` for the keys it actually needs.
    return process.env as unknown as ServerEnv;
  }
  return parsed.data;
}

export const env = loadEnv();

/** Throw a clear error if a required env var is missing at the call site. */
export function requireEnv(name: keyof ServerEnv): string {
  const value = env[name];
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required environment variable: ${String(name)}`);
  }
  return value;
}