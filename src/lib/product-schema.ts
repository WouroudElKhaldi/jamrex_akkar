import { z } from "zod";

const money = z.coerce.number().min(0).max(1_000_000);

export const editorSchema = z.object({
  id: z.string().optional(),
  slug: z.string().max(90).optional().default(""),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().max(200).default(""),
  shortEn: z.string().max(500).default(""),
  shortAr: z.string().max(500).default(""),
  descEn: z.string().max(8000).default(""),
  descAr: z.string().max(8000).default(""),
  active: z.boolean(),
  featured: z.boolean(),
  isNew: z.boolean(),
  optionKind: z.enum(["SCENT", "COLOR", "TYPE"]),
  sortOrder: z.coerce.number().int().default(0),
  categoryIds: z.array(z.string()),
  images: z.array(z.object({ key: z.string(), id: z.string().optional(), path: z.string().min(1), alt: z.string().max(200).default("") })).max(40),
  sizes: z.array(z.object({ key: z.string(), id: z.string().optional(), labelEn: z.string().trim().min(1).max(60), labelAr: z.string().trim().max(60).default("") })).max(20),
  options: z
    .array(
      z.object({
        key: z.string(),
        id: z.string().optional(),
        labelEn: z.string().trim().min(1).max(80),
        labelAr: z.string().trim().max(80).default(""),
        swatch: z.string().max(20).nullable().default(null),
        imageKey: z.string().nullable().default(null),
      }),
    )
    .max(40),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sizeKey: z.string().nullable(),
        optionKey: z.string().nullable(),
        sku: z.string().max(60).default(""),
        price: money,
        compareAt: z.coerce.number().min(0).nullable().default(null),
        stock: z.coerce.number().int().min(0).max(1_000_000),
        active: z.boolean(),
      }),
    )
    .min(1)
    .max(400),
});

export type EditorPayload = z.infer<typeof editorSchema>;
export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
