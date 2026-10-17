const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

const validatePassword = (password) =>
  typeof password === "string" &&
  password.length >= 12 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /[0-9]/.test(password);

async function bootstrapSuperAdmin() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_BOOTSTRAP !== "true") {
    throw new Error("Set ALLOW_PROD_BOOTSTRAP=true for an intentional production bootstrap.");
  }

  const name = process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "BOOTSTRAP_SUPERADMIN_NAME, BOOTSTRAP_SUPERADMIN_EMAIL, and BOOTSTRAP_SUPERADMIN_PASSWORD are required.",
    );
  }
  if (!validatePassword(password)) {
    throw new Error(
      "Bootstrap password must be at least 12 characters and include upper, lower, and numeric characters.",
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "SUPER_ADMIN") {
      throw new Error("Refusing to promote an existing non-super-admin account during bootstrap.");
    }
    console.log(`Super administrator already exists: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 12),
      learnerId: `JECA-SA-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      role: "SUPER_ADMIN",
      isVerified: true,
      forcePasswordChange: true,
    },
  });
  console.log(`Created super administrator: ${email}`);
}

bootstrapSuperAdmin()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
