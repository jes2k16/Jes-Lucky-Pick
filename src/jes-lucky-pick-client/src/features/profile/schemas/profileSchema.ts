import { z } from "zod/v4";

export const profileSchema = z.object({
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
