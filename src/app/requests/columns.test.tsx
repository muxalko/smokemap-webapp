jest.mock("../actions", () => ({
  approveRequest: jest.fn(),
  deleteRequest: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import type { RequestType } from "@/graphql/__generated__/types";
import { ModerationActions } from "./columns";

const request = { id: "1" } as RequestType;

it("renders no moderation controls for guests and users", () => {
  const { rerender } = render(
    <ModerationActions request={request} canApprove={false} canDelete={false} />
  );
  expect(screen.queryByRole("button")).toBeNull();
  rerender(
    <ModerationActions request={request} canApprove={false} canDelete={false} />
  );
  expect(screen.queryByRole("button")).toBeNull();
});

it("shows approval but not hard deletion to moderators", () => {
  render(<ModerationActions request={request} canApprove canDelete={false} />);
  expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Open menu" })).toBeNull();
});

it("shows approval and the administrative action menu to administrators", () => {
  render(<ModerationActions request={request} canApprove canDelete />);
  expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
});
