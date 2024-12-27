import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface SetupOptions {
  withAuth?: boolean;
}

export async function setupPrisma(options: SetupOptions = {}) {
  const projectRoot = process.env.INIT_CWD || process.cwd();

  const dirs = [
    path.join(projectRoot, "prisma"),
    path.join(projectRoot, "src/app/_lib/db"),
    ...(options.withAuth
      ? [path.join(projectRoot, "src/app/api/auth/[...nextauth]")]
      : []),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const templates = [
    {
      src: "../templates/schema.prisma",
      dest: "prisma/schema.prisma",
      condition: true,
      transform: options.withAuth ? addAuthModels : undefined,
      forceUpdate: options.withAuth,
    },
    {
      src: "../templates/db/index.ts.template",
      dest: "src/app/_lib/db/index.ts",
      condition: true,
    },
    {
      src: "../templates/db/types.ts.template",
      dest: "src/app/_lib/db/types.ts",
      condition: true,
    },
    {
      src: "../templates/auth/auth.ts.template",
      dest: "src/app/auth.ts",
      condition: options.withAuth,
      forceUpdate: true,
    },
    {
      src: "../templates/auth/route.ts.template",
      dest: "src/app/api/auth/[...nextauth]/route.ts",
      condition: options.withAuth,
      forceUpdate: true,
    },
    {
      src: "../templates/auth/env.template",
      dest: ".env.local",
      condition:
        options.withAuth &&
        !fs.existsSync(path.join(projectRoot, ".env.local")),
    },
  ];

  templates.forEach(({ src, dest, condition, transform, forceUpdate }) => {
    if (!condition) return;

    const destPath = path.join(projectRoot, dest);
    const shouldWrite = !fs.existsSync(destPath) || forceUpdate;

    if (shouldWrite) {
      let content = fs.readFileSync(path.join(__dirname, src), "utf8");

      if (transform) {
        if (dest === "prisma/schema.prisma" && fs.existsSync(destPath)) {
          const existingContent = fs.readFileSync(destPath, "utf8");
          if (!existingContent.includes("model Account")) {
            content = transform(existingContent);
          }
        } else {
          content = transform(content);
        }
      }

      fs.writeFileSync(destPath, content);
      console.log(`📝 Updated ${dest}`);
    }
  });

  const gitignorePath = path.join(projectRoot, ".gitignore");
  const prismaIgnores = [
    "",
    "# Prisma",
    "/prisma/generated/",
    "/prisma/migrations/",
    "*.db",
    "*.db-journal",
  ].join("\n");

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf8");
    if (!content.includes("# Prisma")) {
      fs.appendFileSync(gitignorePath, prismaIgnores);
    }
  } else {
    fs.writeFileSync(gitignorePath, prismaIgnores);
  }

  if (options.withAuth) {
    console.log("📦 Installing Auth.js dependencies...");
    try {
      execSync("npm install @auth/core @auth/nextjs", {
        stdio: "inherit",
        cwd: projectRoot,
      });
    } catch (error) {
      console.error("❌ Failed to install Auth.js dependencies");
      console.error(error);
    }
  }

  console.log("✅ Prisma adapter setup completed");
}

function validateEnvironment() {
  const requiredEnvVars = ["DATABASE_URL"];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

async function testConnection() {
  try {
    const { PrismaClient } = require("@prisma/client");
    const client = new PrismaClient();
    await client.$connect();
    await client.$disconnect();
    console.log("✅ Database connection test successful");
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    process.exit(1);
  }
}

function addAuthModels(baseSchema: string): string {
  const authModels = `
// Auth.js models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}`;

  return `${baseSchema}\n${authModels}`;
}

const args = process.argv.slice(2);
const withAuth = args.includes("--with-auth");

validateEnvironment();
(async () => {
  await setupPrisma({ withAuth });
  await testConnection();
})();
