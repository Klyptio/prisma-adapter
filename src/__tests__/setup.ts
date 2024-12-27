process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.GITHUB_ID = "test-github-id";
process.env.GITHUB_SECRET = "test-github-secret";
process.env.GOOGLE_ID = "test-google-id";
process.env.GOOGLE_SECRET = "test-google-secret";

// Mock fs module
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

// Mock child_process
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

// Mock PrismaClient
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock @prisma/client/runtime/library
jest.mock("@prisma/client/runtime/library", () => ({
  Sql: jest.fn(),
  raw: jest.fn(),
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Add this to silence console output
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Helper to simulate file system state
export const mockFileSystem = (files: { [path: string]: string }) => {
  const fs = require("fs");
  fs.existsSync.mockImplementation((path: string) => !!files[path]);
  fs.readFileSync.mockImplementation((path: string) => files[path] || "");
};

// Helper to verify auth setup
export const verifyAuthSetup = (projectRoot: string) => {
  const fs = require("fs");
  const path = require("path");

  expect(fs.existsSync).toHaveBeenCalledWith(
    path.join(projectRoot, "src/app/api/auth/[...nextauth]")
  );
  expect(fs.existsSync).toHaveBeenCalledWith(
    path.join(projectRoot, "src/app/auth.ts")
  );
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining("schema.prisma"),
    expect.stringContaining("model Account")
  );
};

// Helper to verify dependencies installation
export const verifyDependencies = () => {
  const { execSync } = require("child_process");
  expect(execSync).toHaveBeenCalledWith(
    "npm install @auth/core @auth/nextjs",
    expect.any(Object)
  );
};

// Helper to simulate database connection
export const mockDatabaseConnection = (shouldSucceed: boolean = true) => {
  const { PrismaClient } = require("@prisma/client");
  if (shouldSucceed) {
    PrismaClient.mockImplementation(() => ({
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    }));
  } else {
    PrismaClient.mockImplementation(() => ({
      $connect: jest.fn().mockRejectedValue(new Error("Connection failed")),
      $disconnect: jest.fn(),
    }));
  }
};

// Helper to verify schema transformation
export const verifySchemaTransformation = (projectRoot: string) => {
  const fs = require("fs");
  const schemaContent = fs.writeFileSync.mock.calls.find(
    (call: [string, string]) => call[0].includes("schema.prisma")
  )?.[1];

  expect(schemaContent).toBeDefined();
  expect(schemaContent).toContain("model Account");
  expect(schemaContent).toContain("model Session");
  expect(schemaContent).toContain("model User");
  expect(schemaContent).toContain("model VerificationToken");
};