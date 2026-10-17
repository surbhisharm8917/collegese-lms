const bcrypt = require("bcryptjs");
const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();
const roles = ["STUDENT", "TEACHER", "ASSISTANT", "ADMIN", "SUPER_ADMIN"];
const names = {
  STUDENT: "Demo Student",
  TEACHER: "Demo Teacher",
  ASSISTANT: "Demo Course Assistant",
  ADMIN: "Demo Administrator",
  SUPER_ADMIN: "Demo Super Administrator",
};
const learnerIds = {
  STUDENT: "JECA-DEMO-STUDENT",
  TEACHER: "JECA-DEMO-TEACHER",
  ASSISTANT: "JECA-DEMO-ASSISTANT",
  ADMIN: "JECA-DEMO-ADMIN",
  SUPER_ADMIN: "JECA-DEMO-SUPERADMIN",
};
const validPassword = (value) =>
  typeof value === "string" &&
  value.length >= 12 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value);

function credentials() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_PROD_DEMO_SEED=true for an intentional production demo seed.");
  }
  let parsed;
  try {
    parsed = JSON.parse(process.env.DEMO_CREDENTIALS_JSON || "");
  } catch {
    throw new Error("DEMO_CREDENTIALS_JSON must be valid JSON.");
  }
  for (const role of roles) {
    const item = parsed?.[role];
    if (!item?.email || !validPassword(item.password)) {
      throw new Error(`A valid email and strong password are required for ${role}.`);
    }
  }
  return parsed;
}

async function upsertUsers(items) {
  const users = {};
  for (const role of roles) {
    const email = items[role].email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== role) {
      throw new Error(`Refusing to change the role of existing account ${email}.`);
    }
    users[role] = await prisma.user.upsert({
      where: { email },
      create: {
        name: names[role],
        email,
        password: await bcrypt.hash(items[role].password, 12),
        learnerId: learnerIds[role],
        role,
        courseName: role === "STUDENT" ? "CA Foundation" : null,
        isVerified: true,
        forcePasswordChange: false,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        adultConfirmedAt: new Date(),
      },
      update: {
        name: names[role],
        password: await bcrypt.hash(items[role].password, 12),
        learnerId: learnerIds[role],
        isVerified: true,
        isSuspended: false,
        isDeleted: false,
        forcePasswordChange: false,
      },
    });
  }
  return users;
}

const courseSpecs = [
  {
    id: "demo-ca-foundation-2026",
    title: "CA Foundation Complete Learning Programme",
    category: "CA Foundation",
    description:
      "A structured foundation pathway covering accounting, business law, quantitative aptitude, and business economics.",
    priceInPaise: 149900,
    modules: [
      ["Accounting Fundamentals", ["The accounting process", "Trial balance and rectification"]],
      ["Business Laws", ["Indian Contract Act", "Sale of Goods Act"]],
    ],
  },
  {
    id: "demo-ca-intermediate-2026",
    title: "CA Intermediate Group I Guided Programme",
    category: "CA Intermediate",
    description:
      "Exam-focused guided learning for advanced accounting, corporate law, and taxation with structured practice.",
    priceInPaise: 249900,
    modules: [
      ["Advanced Accounting", ["Accounting standards", "Company accounts"]],
      ["Taxation", ["Income tax foundations", "Goods and Services Tax"]],
    ],
  },
];

async function upsertCourses(users) {
  for (const spec of courseSpecs) {
    await prisma.course.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        title: spec.title,
        category: spec.category,
        description: spec.description,
        priceInPaise: spec.priceInPaise,
        currency: "INR",
        isPublished: true,
        isActive: true,
        createdById: users.SUPER_ADMIN.id,
      },
      update: {
        title: spec.title,
        category: spec.category,
        description: spec.description,
        priceInPaise: spec.priceInPaise,
        currency: "INR",
        isPublished: true,
        isActive: true,
        isDeleted: false,
        createdById: users.SUPER_ADMIN.id,
      },
    });
    await prisma.courseTeacher.upsert({
      where: { courseId_teacherId: { courseId: spec.id, teacherId: users.TEACHER.id } },
      create: { courseId: spec.id, teacherId: users.TEACHER.id },
      update: {},
    });
    await prisma.courseAssistant.upsert({
      where: { courseId_assistantId: { courseId: spec.id, assistantId: users.ASSISTANT.id } },
      create: { courseId: spec.id, assistantId: users.ASSISTANT.id },
      update: {},
    });
    for (let moduleIndex = 0; moduleIndex < spec.modules.length; moduleIndex += 1) {
      const [title, chapters] = spec.modules[moduleIndex];
      const moduleId = `${spec.id}-module-${moduleIndex + 1}`;
      await prisma.module.upsert({
        where: { id: moduleId },
        create: { id: moduleId, title, order: moduleIndex + 1, courseId: spec.id },
        update: { title, order: moduleIndex + 1, courseId: spec.id },
      });
      for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
        await prisma.chapter.upsert({
          where: { moduleId_order: { moduleId, order: chapterIndex + 1 } },
          create: { title: chapters[chapterIndex], order: chapterIndex + 1, moduleId },
          update: { title: chapters[chapterIndex] },
        });
      }
    }
  }
}

async function upsertPaymentSettings() {
  const settings = {
    paymentAccountName: "JUST EASY CA CLASSES — DEMO ONLY",
    paymentAccountNumber: "000000000000",
    paymentIfsc: "DEMO0000001",
    paymentUpi: "demo@upi",
    paymentInstructions:
      "DEMO ONLY — DO NOT TRANSFER REAL MONEY. Scan the QR to review the test flow, then upload any sample JPEG, PNG, or WebP image as payment proof.",
  };
  await prisma.$transaction(
    Object.entries(settings).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
}

async function main() {
  const items = credentials();
  const users = await upsertUsers(items);
  await upsertCourses(users);
  await upsertPaymentSettings();
  console.log("Demo seed complete: 5 role accounts, 2 paid courses, and test payment settings.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
