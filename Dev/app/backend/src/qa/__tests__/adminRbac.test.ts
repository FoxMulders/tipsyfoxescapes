import { describe, expect, it } from "vitest";

/** Mirrors adminRoutes requireAdmin role check for unit coverage without Express. */
const isAdminUser = (user: { isAdmin?: boolean; role?: string } | null | undefined): boolean =>
  Boolean(user && (user.isAdmin || user.role === "admin"));

describe("admin RBAC", () => {
  it("allows isAdmin flag", () => {
    expect(isAdminUser({ isAdmin: true, role: "user" })).toBe(true);
  });

  it("allows explicit admin role", () => {
    expect(isAdminUser({ isAdmin: false, role: "admin" })).toBe(true);
  });

  it("denies standard users", () => {
    expect(isAdminUser({ isAdmin: false, role: "user" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});
