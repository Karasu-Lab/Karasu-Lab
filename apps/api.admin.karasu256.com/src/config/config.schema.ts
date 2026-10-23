import { z } from 'zod';

export const AppConfigSchema = z.object({
  server: z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3006),
    corsOrigin: z.string().default('http://localhost:3003'),
  }),
  docker: z.object({
    socket: z.object({
      win32: z.string().default('//./pipe/docker_engine'),
      default: z.string().default('/var/run/docker.sock'),
    }),
  }),
  cloudflare: z
    .object({
      teamDomain: z.string(),
      audTag: z.string(),
    })
    .optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
