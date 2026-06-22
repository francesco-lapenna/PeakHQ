import { z } from 'zod';

const EnvSchema = z.object({
  VITE_COGNITO_DOMAIN: z.string().min(1),
  VITE_COGNITO_CLIENT_ID: z.string().min(1),
  VITE_COGNITO_REDIRECT_URI: z.string().url(),
  VITE_API_BASE_URL: z.string().url(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  return EnvSchema.parse(import.meta.env);
}

export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    return (import.meta.env as Record<string, unknown>)[prop];
  },
});
