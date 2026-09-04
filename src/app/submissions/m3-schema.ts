import { z } from "zod";

const CATEGORY_SLUGS = [
  "indoors",
  "outdoors",
  "rooftop",
  "underground",
  "on-the-water",
  "underwater",
  "in-the-air",
  "other",
] as const;

const RESERVED_HOSTNAMES = new Set([
  "alt",
  "example",
  "example.com",
  "example.net",
  "example.org",
  "home.arpa",
  "in-addr.arpa",
  "internal",
  "invalid",
  "ip6.arpa",
  "ipv4only.arpa",
  "local",
  "localdomain",
  "localhost",
  "localhost.localdomain",
  "onion",
  "resolver.arpa",
  "test",
]);

function normalizeText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function containsUnsupportedPlainText(value: string) {
  return Array.from(value.normalize("NFKC")).some(
    (character) => /\p{C}/u.test(character) && !/\s/u.test(character)
  );
}

function isReservedHostname(hostname: string) {
  return Array.from(RESERVED_HOSTNAMES).some(
    (reserved) => hostname === reserved || hostname.endsWith(`.${reserved}`)
  );
}

function isValidWebsite(value: string) {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return true;
  if (
    normalized.length > 255 ||
    /[\s\\#]/u.test(normalized) ||
    /%(?![\da-f]{2})/iu.test(normalized) ||
    /%(?:0[\da-f]|1[\da-f]|7f)/iu.test(normalized)
  ) {
    return false;
  }

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/\.$/u, "").toLowerCase();
    const labels = hostname.split(".");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      !url.hash &&
      labels.length >= 2 &&
      hostname.length <= 253 &&
      !labels.at(-1)?.match(/^\d+$/u) &&
      labels.every((label) =>
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)
      ) &&
      !/^\[.*\]$/u.test(hostname) &&
      !/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(hostname) &&
      !isReservedHostname(hostname)
    );
  } catch {
    return false;
  }
}

const normalizedPlainText = z
  .string()
  .refine((value) => !containsUnsupportedPlainText(value), {
    message: "Contains unsupported characters",
  })
  .transform(normalizeText);

const optionalText = (maximum: number) =>
  z
    .string()
    .optional()
    .default("")
    .pipe(normalizedPlainText)
    .pipe(z.string().max(maximum, `Must be ${maximum} characters or fewer`));

const M3SubmissionFields = z.object({
  name: normalizedPlainText.pipe(
    z
      .string()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name must be 100 characters or fewer")
  ),
  categorySlug: z.enum(CATEGORY_SLUGS, {
    errorMap: () => ({ message: "Select a category" }),
  }),
  longitude: z
    .number({ invalid_type_error: "Choose a location on the map" })
    .finite("Longitude must be finite")
    .min(-180)
    .max(180),
  latitude: z
    .number({ invalid_type_error: "Choose a location on the map" })
    .finite("Latitude must be finite")
    .min(-90)
    .max(90),
  addressLabel: optionalText(255),
  tags: z
    .array(normalizedPlainText.pipe(z.string().min(3).max(50)))
    .max(10)
    .optional()
    .default([]),
  description: optionalText(255),
  website: z
    .string()
    .optional()
    .default("")
    .transform((value) => value.normalize("NFKC").trim())
    .refine(isValidWebsite, {
      message:
        "Enter a valid public HTTPS website without credentials, a custom port, or a fragment",
    }),
});

function validateDistinctTags(
  { tags }: { tags: string[] },
  context: z.RefinementCtx
) {
  const canonicalTags = new Set<string>();
  tags.forEach((tag, index) => {
    const canonical = tag.toLocaleLowerCase().normalize("NFKC");
    if (canonicalTags.has(canonical)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tags must be distinct",
        path: ["tags", index],
      });
    }
    canonicalTags.add(canonical);
  });
}

export const M3SubmissionSchema =
  M3SubmissionFields.superRefine(validateDistinctTags);

export type M3SubmissionInput = z.input<typeof M3SubmissionSchema>;
export type ValidatedM3SubmissionInput = z.output<typeof M3SubmissionSchema>;

export const M3FormSchema = M3SubmissionFields.extend({
  consent: z.boolean().refine((value) => value, {
    message: "Accept the privacy policy to continue",
  }),
}).superRefine(validateDistinctTags);

export type M3FormInput = z.input<typeof M3FormSchema>;
export type ValidatedM3FormInput = z.output<typeof M3FormSchema>;
