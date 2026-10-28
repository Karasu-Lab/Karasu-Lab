import { vercelAdapter } from '@flags-sdk/vercel';
import { z } from 'zod';
import { createSchemaFlags } from '@Hashibutogarasu/flags/server';

export const appFlagsSchema = z.object({
  testFlag: z.boolean(),
});

export type AppFlags = z.infer<typeof appFlagsSchema>;

export const appFlags = createSchemaFlags(appFlagsSchema, vercelAdapter);
