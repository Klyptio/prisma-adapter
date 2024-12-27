import { setupPrisma } from "../../scripts/setup";
import {
  mockFileSystem,
  verifyAuthSetup,
  verifyDependencies,
  mockDatabaseConnection,
  verifySchemaTransformation,
} from "./setup";

describe("setupPrisma", () => {
  const projectRoot = process.cwd();

  describe("Basic Prisma setup", () => {
    it("should create basic directory structure", async () => {
      mockFileSystem({});
      mockDatabaseConnection();

      await setupPrisma({ withAuth: false });

      const fs = require("fs");
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("prisma"),
        expect.any(Object)
      );
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("src/app/_lib/db"),
        expect.any(Object)
      );
    });

    it("should copy base schema without auth models", async () => {
      mockFileSystem({});
      mockDatabaseConnection();

      await setupPrisma({ withAuth: false });

      const fs = require("fs");
      const schemaCall = fs.writeFileSync.mock.calls.find(
        (call: [string, string]) => call[0].includes("schema.prisma")
      );
      expect(schemaCall[1]).not.toContain("model Account");
      expect(schemaCall[1]).not.toContain("model User");
    });

    it("should update .gitignore with Prisma entries", async () => {
      mockFileSystem({});
      mockDatabaseConnection();

      await setupPrisma({ withAuth: false });

      const fs = require("fs");
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".gitignore"),
        expect.stringContaining("# Prisma")
      );
    });

    it("should not install auth dependencies", async () => {
      mockFileSystem({});
      mockDatabaseConnection();

      await setupPrisma({ withAuth: false });

      const { execSync } = require("child_process");
      expect(execSync).not.toHaveBeenCalledWith(
        expect.stringContaining("@auth/core"),
        expect.any(Object)
      );
    });
  });

  describe("Auth.js integration", () => {
    it("should set up auth when flag is provided", async () => {
      mockFileSystem({});
      mockDatabaseConnection();

      await setupPrisma({ withAuth: true });

      verifyAuthSetup(projectRoot);
      verifyDependencies();
      verifySchemaTransformation(projectRoot);
    });

    it("should not modify existing auth setup", async () => {
      mockFileSystem({
        [`${projectRoot}/prisma/schema.prisma`]: "model Account { ... }",
        [`${projectRoot}/src/app/auth.ts`]: "existing auth config",
      });
      mockDatabaseConnection();

      await setupPrisma({ withAuth: true });

      const fs = require("fs");
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining("schema.prisma"),
        expect.stringContaining("model Account")
      );
    });

    it("should handle reinstallation with auth flag", async () => {
      // First installation without auth
      mockFileSystem({});
      await setupPrisma({ withAuth: false });

      // Reset mocks
      jest.clearAllMocks();

      // Second installation with auth
      await setupPrisma({ withAuth: true });

      verifyAuthSetup(projectRoot);
      verifyDependencies();
      verifySchemaTransformation(projectRoot);
    });

    it("should preserve existing environment variables", async () => {
      mockFileSystem({
        [`${projectRoot}/.env.local`]: "EXISTING_VAR=value",
      });

      await setupPrisma({ withAuth: true });

      const fs = require("fs");
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining(".env.local"),
        expect.any(String)
      );
    });
  });
});
