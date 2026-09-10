import { beforeEach, describe, expect, it, vi } from "vitest";
import { signup, login, currentAccount } from "./service";
import * as repository from "./repository";
import * as passwords from "@/server/auth/passwords";
import * as sessions from "@/server/auth/sessions";
vi.mock("./repository", () => ({ findUserByEmail: vi.fn(), findUserById: vi.fn(), createUser: vi.fn() }));
vi.mock("@/server/auth/passwords", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn(), getDummyHash: vi.fn() }));
vi.mock("@/server/auth/sessions", () => ({ createSession: vi.fn(), readSession: vi.fn() }));
const user = { _id: "123", name: "Test Person", email: "Person@example.com", passwordHash: "hash" };
beforeEach(() => { vi.resetAllMocks(); });
describe("account use cases", () => {
  it("rejects duplicate normalized email before hashing", async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValue(user as never);
    await expect(signup({ name: "Test", email: " PERSON@example.com ", password: "long-test-password" })).rejects.toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
    expect(repository.findUserByEmail).toHaveBeenCalledWith("person@example.com");
    expect(passwords.hashPassword).not.toHaveBeenCalled();
  });
  it("maps a concurrent unique-index conflict", async () => {
    vi.mocked(repository.createUser).mockRejectedValue({ code: 11000 });
    await expect(signup({ name: "Test", email: "p@example.com", password: "long-test-password" })).rejects.toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
    expect(sessions.createSession).not.toHaveBeenCalled();
  });
  it.each([null, user])("returns the same error for unknown account or incorrect password", async record => {
    vi.mocked(repository.findUserByEmail).mockResolvedValue(record as never);
    vi.mocked(passwords.getDummyHash).mockResolvedValue("dummy");
    vi.mocked(passwords.verifyPassword).mockResolvedValue(false);
    await expect(login({ email: "p@example.com", password: "wrong" })).rejects.toMatchObject({ status: 401, message: "Invalid email or password." });
    expect(passwords.verifyPassword).toHaveBeenCalled();
    expect(sessions.createSession).not.toHaveBeenCalled();
  });
  it("returns only public fields after login", async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValue(user as never);
    vi.mocked(passwords.verifyPassword).mockResolvedValue(true);
    vi.mocked(sessions.createSession).mockResolvedValue({ token: "test", expiresAt: new Date() });
    const result = await login({ email: "Person@example.com", password: "valid" });
    expect(result.user).toEqual({ id: "123", name: "Test Person", email: "Person@example.com" });
    expect(sessions.createSession).toHaveBeenCalledWith("123");
  });
  it("does not look up users without a valid session", async () => {
    vi.mocked(sessions.readSession).mockResolvedValue(null);
    expect(await currentAccount()).toBeNull();
    expect(repository.findUserById).not.toHaveBeenCalled();
  });
});
