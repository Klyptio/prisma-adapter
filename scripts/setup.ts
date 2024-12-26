import * as fs from 'fs';
import * as path from 'path';

function setupPrisma() {
  const projectRoot = process.env.INIT_CWD || process.cwd();
  
  // Create directories
  const dirs = [
    path.join(projectRoot, 'prisma'),
    path.join(projectRoot, 'src/app/_lib/db'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Copy template files
  const templates = [
    {
      src: '../templates/schema.prisma',
      dest: 'prisma/schema.prisma'
    },
    {
      src: '../templates/db/index.ts',
      dest: 'src/app/_lib/db/index.ts'
    },
    {
      src: '../templates/db/types.ts',
      dest: 'src/app/_lib/db/types.ts'
    }
  ];

  templates.forEach(({ src, dest }) => {
    const destPath = path.join(projectRoot, dest);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(
        path.join(__dirname, src),
        destPath
      );
    }
  });

  // Update .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const prismaIgnores = [
    '',
    '# Prisma',
    '/prisma/generated/',
    '/prisma/migrations/',
    '*.db',
    '*.db-journal'
  ].join('\n');

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('# Prisma')) {
      fs.appendFileSync(gitignorePath, prismaIgnores);
    }
  } else {
    fs.writeFileSync(gitignorePath, prismaIgnores);
  }

  console.log('✅ Prisma adapter setup completed');
}

// Add environment validation
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Add database connection test
async function testConnection() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const client = new PrismaClient();
    await client.$connect();
    await client.$disconnect();
    console.log('✅ Database connection test successful');
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

validateEnvironment();
setupPrisma();
(async () => {
  await testConnection();
})();