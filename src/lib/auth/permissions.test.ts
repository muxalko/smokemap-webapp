import { canHardDelete, canModerate } from "./permissions";

it.each([
  [undefined, false, false],
  ["guest", false, false],
  ["user", false, false],
  ["moderator", true, false],
  ["administrator", true, true],
])(
  "maps %s to the documented moderation capabilities",
  (role, approve, hardDelete) => {
    expect(canModerate(role)).toBe(approve);
    expect(canHardDelete(role)).toBe(hardDelete);
  }
);
