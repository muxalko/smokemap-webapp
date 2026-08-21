export class FrontendAuthorizationError extends Error {
  constructor(public readonly code: "AUTHENTICATION_REQUIRED" | "FORBIDDEN") {
    super(code);
    this.name = "FrontendAuthorizationError";
  }
}
