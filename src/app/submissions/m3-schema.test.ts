import { M3SubmissionSchema } from "./m3-schema";

const valid = {
  name: "  Zero\timage place ",
  categorySlug: "outdoors",
  longitude: -77.0365,
  latitude: 38.8977,
  addressLabel: "  Human\tlabel ",
  tags: [" Quiet patio "],
  description: "",
  website: "https://www.smokemap.org/place",
};

it("normalizes valid M3 fields", () => {
  expect(M3SubmissionSchema.parse(valid)).toEqual({
    ...valid,
    name: "Zero image place",
    addressLabel: "Human label",
    tags: ["Quiet patio"],
  });
});

it.each([
  ["name", { name: "x" }],
  ["category", { categorySlug: "7" }],
  ["longitude", { longitude: 181 }],
  ["latitude", { latitude: Number.NaN }],
  ["duplicate tags", { tags: ["Quiet patio", " quiet  PATIO "] }],
  ["website scheme", { website: "http://www.smokemap.org" }],
  ["website host", { website: "https://localhost/path" }],
])("rejects invalid %s before submission", (_case, override) => {
  expect(M3SubmissionSchema.safeParse({ ...valid, ...override }).success).toBe(
    false
  );
});
