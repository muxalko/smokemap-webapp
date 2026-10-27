import type { PropsWithChildren } from "react";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { act, fireEvent, render, screen } from "@/test/render";

import AccountNavigation from "./account-navigation";
import Template from "./template";

jest.mock("@/app/api/auth/[...nextauth]/config", () => ({ options: {} }));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("next-auth/react", () => ({
  SessionProvider: jest.fn(({ children }: PropsWithChildren) => (
    <>{children}</>
  )),
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

const session: Session = {
  user: { id: "7", name: "Member", role: "user", image: null },
  expires: "2099-01-01T00:00:00.000Z",
};
const logout = jest.mocked(signOut);
const readSession = jest.mocked(useSession);

beforeEach(() => {
  jest.clearAllMocks();
  readSession.mockReturnValue({
    data: session,
    status: "authenticated",
    update: jest.fn(),
  });
});

it("shows account loading without offering premature authentication actions", () => {
  readSession.mockReturnValue({
    data: null,
    status: "loading",
    update: jest.fn(),
  });
  render(<AccountNavigation session={null} />);
  expect(
    screen.getByRole("navigation", { name: "Account" })
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Loading account…");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(logout).not.toHaveBeenCalled();
});

it("offers signed-out visitors an absolute sign-in link to the public home page", () => {
  readSession.mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: jest.fn(),
  });
  render(<AccountNavigation session={null} />);
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/api/auth/signin?callbackUrl=%2F"
  );
  expect(
    screen.queryByRole("button", { name: "Sign out" })
  ).not.toBeInTheDocument();
});

it.each(["user", "moderator", "administrator"])(
  "offers %s accounts sign out without an avatar or opening a menu",
  (role) => {
    readSession.mockReturnValue({
      data: { ...session, user: { ...session.user, role } },
      status: "authenticated",
      update: jest.fn(),
    });
    render(<AccountNavigation session={session} />);
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button).toBeVisible();
    expect(button).toBeEnabled();
    expect(
      screen.queryByRole("link", { name: "Sign in" })
    ).not.toBeInTheDocument();
  }
);

it("uses a focusable native button with an explicit accessible label", () => {
  render(<AccountNavigation session={session} />);
  const button = screen.getByRole("button", { name: "Sign out" });
  expect(button.tagName).toBe("BUTTON");
  expect(button).toHaveAttribute("type", "button");
  expect(button).toHaveAttribute("aria-label", "Sign out");
  expect(button.tabIndex).toBe(0);
  button.focus();
  expect(button).toHaveFocus();
});

it("disables duplicate logout requests and retains NextAuth's full-page public redirect", async () => {
  let finish!: () => void;
  logout.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  render(<AccountNavigation session={session} />);
  const button = screen.getByRole("button", { name: "Sign out" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).toHaveTextContent("Signing out…");
  expect(logout).toHaveBeenCalledTimes(1);
  expect(logout).toHaveBeenCalledWith({ callbackUrl: "/" });
  await act(async () => {
    finish();
    await Promise.resolve();
  });
  // The redirect is in progress; do not re-enable the old protected page.
  expect(button).toBeDisabled();
});

it("announces a safe error and permits retry when the logout request fails", async () => {
  logout.mockRejectedValueOnce(new Error("private response detail"));
  render(<AccountNavigation session={session} />);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not sign out. Please try again."
  );
  expect(screen.queryByText(/private response detail/)).not.toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Sign out" });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(logout).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("offers a new sign-in for a terminally expired session", () => {
  const expired = { ...session, error: "SessionExpired" as const };
  readSession.mockReturnValue({
    data: expired,
    status: "authenticated",
    update: jest.fn(),
  });
  render(<AccountNavigation session={expired} />);
  expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Sign out" })
  ).not.toBeInTheDocument();
});

it("removes the signed-in control when NextAuth reports a cleared session", () => {
  const { rerender } = render(<AccountNavigation session={session} />);
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  readSession.mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: jest.fn(),
  });
  rerender(<AccountNavigation session={null} />);
  expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Sign out" })
  ).not.toBeInTheDocument();
});

it("mounts account navigation in the shared layout with the safe server session", async () => {
  jest.mocked(getServerSession).mockResolvedValueOnce(session);
  render(await Template({ children: <main>Page content</main> }));
  expect(screen.getByRole("navigation", { name: "Account" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  expect(screen.getByRole("img", { name: "Smokemap" })).toBeInTheDocument();
  expect(screen.getByRole("main")).toHaveTextContent("Page content");
  expect(jest.mocked(SessionProvider).mock.calls[0][0].session).toEqual(
    session
  );
});
