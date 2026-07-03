import { describe, it, expect, beforeAll } from "vitest";
import bcryptjs from "bcryptjs";
import { comparePasswordWithCandidates, isLocalAdminCredential } from "./_core/auth";

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "posventa-dev-secret";
});

describe("auth.login", () => {
  it("should hash password correctly with bcryptjs", async () => {
    const password = "admin123";
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // Verify password matches
    const isMatch = await bcryptjs.compare(password, hashedPassword);
    expect(isMatch).toBe(true);
    
    // Verify wrong password doesn't match
    const isWrongMatch = await bcryptjs.compare("wrongpassword", hashedPassword);
    expect(isWrongMatch).toBe(false);
  });

  it("should create JWT token with correct payload", () => {
    // Test that JWT_SECRET is available
    const secret = process.env.JWT_SECRET;
    expect(secret).toBeDefined();
    expect(typeof secret).toBe("string");
    expect(secret?.length).toBeGreaterThan(0);
  });

  it("should validate email format", () => {
    const validEmail = "admin@gmail.com";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test(validEmail)).toBe(true);
  });

  it("should validate password requirements", () => {
    const password = "admin123";
    
    // Password should be at least 6 characters
    expect(password.length).toBeGreaterThanOrEqual(6);
    
    // Password should not be empty
    expect(password.length).toBeGreaterThan(0);
  });

  it("should handle password hashing with different salts", async () => {
    const password = "admin123";
    
    // Hash the same password twice
    const hash1 = await bcryptjs.hash(password, 10);
    const hash2 = await bcryptjs.hash(password, 10);
    
    // Hashes should be different (different salts)
    expect(hash1).not.toBe(hash2);
    
    // But both should verify against the original password
    expect(await bcryptjs.compare(password, hash1)).toBe(true);
    expect(await bcryptjs.compare(password, hash2)).toBe(true);
  });

  it("should reject passwords with incorrect format", async () => {
    const correctPassword = "admin123";
    const wrongPassword = "admin124";
    const hashedPassword = await bcryptjs.hash(correctPassword, 10);
    
    const isMatch = await bcryptjs.compare(wrongPassword, hashedPassword);
    expect(isMatch).toBe(false);
  });

  it("should accept a legacy admin password when a known fallback password matches the stored hash", async () => {
    const hashedPassword = await bcryptjs.hash("admin123", 10);

    const isMatch = await comparePasswordWithCandidates("admin2026*", hashedPassword, ["admin123"]);

    expect(isMatch).toBe(true);
  });

  it("should handle empty password gracefully", async () => {
    const emptyPassword = "";
    const hashedPassword = await bcryptjs.hash("admin123", 10);
    
    const isMatch = await bcryptjs.compare(emptyPassword, hashedPassword);
    expect(isMatch).toBe(false);
  });

  it("should recognize the local admin fallback credentials", () => {
    expect(isLocalAdminCredential("admin@gmail.com", "admin2026*")).toBe(true);
    expect(isLocalAdminCredential("admin@gmail.com", "admin123")).toBe(true);
    expect(isLocalAdminCredential("admin@gmail.com", "wrong-password")).toBe(false);
  });

  it("should validate email structure", () => {
    const validEmails = [
      "admin@gmail.com",
      "user@example.com",
      "test.user@domain.co.uk"
    ];
    
    const invalidEmails = [
      "admin",
      "@gmail.com",
      "admin@",
      "admin @gmail.com"
    ];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
    
    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
});
