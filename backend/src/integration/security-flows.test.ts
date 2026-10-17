import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";

dotenv.config();
process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "local";
process.env.SEND_VERIFICATION_EMAILS = "true";

vi.mock("../services/email.service", () => ({
  sendAssessmentEmail: vi.fn().mockResolvedValue(undefined),
  sendAccountInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendCertificateEmail: vi.fn().mockResolvedValue(undefined),
  sendCertificateVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendExamMail: vi.fn().mockResolvedValue(undefined),
  sendExamResultEmail: vi.fn().mockResolvedValue(undefined),
  sendLiveLectureScheduledEmail: vi.fn().mockResolvedValue(undefined),
  sendLoginNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendMaintenanceModeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendQuizCreatedEmail: vi.fn().mockResolvedValue(undefined),
  sendSupportTicketCreatedEmails: vi.fn().mockResolvedValue(undefined),
  sendSupportTicketStatusEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendWhitelistUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

const PASSWORD = "StrongPass123"; // gitleaks:allow - deterministic integration fixture
const PROVISIONED_PASSWORD = "ProvisionedPass123"; // gitleaks:allow - deterministic integration fixture
const EMAIL_PREFIX = "integration-jecc-";

describe("production security journeys", () => {
  let app: any;
  let prisma: any;
  let ids: Record<string, string> = {};

  const csrf = async (agent: ReturnType<typeof request.agent>) => {
    const response = await agent.get("/api/v1/auth/csrf").expect(200);
    return response.body.csrfToken as string;
  };

  /** Reads the code most recently handed to the (mocked) OTP mailer for an address. */
  const latestOtpCode = async (email: string, purpose: "REGISTRATION" | "LOGIN") => {
    const emailService = await import("../services/email.service");
    const calls = vi
      .mocked(emailService.sendOtpEmail)
      .mock.calls.filter((call) => call[0] === email && call[2] === purpose);
    expect(calls.length).toBeGreaterThan(0);
    return calls[calls.length - 1][1];
  };

  /**
   * Password sign-in, available to every role and the default on the sign-in
   * screen. Completes in one request and sets the session cookie.
   */
  const login = async (email: string) => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const response = await agent
      .post("/api/v1/auth/login")
      .set("X-CSRF-Token", token)
      .send({ email, password: PASSWORD })
      .expect(200);

    expect(response.body.otpRequired).toBe(false);
    expect(response.body.user).toBeDefined();

    return { agent, token, response };
  };

  /**
   * The learner-only alternative: an emailed code instead of a password.
   * No password is sent, so the code alone completes the sign-in.
   */
  const loginWithCode = async (email: string) => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const challenge = await agent
      .post("/api/v1/auth/login")
      .set("X-CSRF-Token", token)
      .send({ email, method: "OTP" })
      .expect(200);

    expect(challenge.body.otpRequired).toBe(true);
    expect(challenge.body.user).toBeUndefined();

    const response = await agent
      .post("/api/v1/auth/otp/verify")
      .set("X-CSRF-Token", token)
      .send({
        challengeToken: challenge.body.challengeToken,
        code: await latestOtpCode(email, "LOGIN"),
      })
      .expect(200);

    return { agent, token, response, challenge };
  };

  const cleanup = async () => {
    await prisma.supportTicket.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
    const users = await prisma.user.findMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
      select: { id: true },
    });
    const userIds = users.map((user: { id: string }) => user.id);
    const courses = await prisma.course.findMany({
      where: { title: { startsWith: "Integration JECC" } },
      select: { id: true },
    });
    const courseIds = courses.map((course: { id: string }) => course.id);
    const quizzes = await prisma.quiz.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    });
    const quizIds = quizzes.map((quiz: { id: string }) => quiz.id);
    const exams = await prisma.exam.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    });
    const examIds = exams.map((exam: { id: string }) => exam.id);
    const assessmentIds = (
      await prisma.assessment.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      })
    ).map((assessment: { id: string }) => assessment.id);
    const recordedIds = (
      await prisma.recordedLecture.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      })
    ).map((lecture: { id: string }) => lecture.id);
    const liveIds = (
      await prisma.liveLecture.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      })
    ).map((lecture: { id: string }) => lecture.id);

    await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.certificate.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.liveWebhookEvent.deleteMany({ where: { lectureId: { in: liveIds } } });
    await prisma.lectureParticipant.deleteMany({ where: { lectureId: { in: liveIds } } });
    await prisma.liveLecture.deleteMany({ where: { id: { in: liveIds } } });
    await prisma.lectureProgress.deleteMany({ where: { recordedLectureId: { in: recordedIds } } });
    await prisma.recordedLecture.deleteMany({ where: { id: { in: recordedIds } } });
    await prisma.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId: { in: examIds } },
      select: { id: true },
    });
    await prisma.examOption.deleteMany({
      where: { questionId: { in: examQuestions.map((question: { id: string }) => question.id) } },
    });
    await prisma.examQuestion.deleteMany({ where: { examId: { in: examIds } } });
    await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId: { in: quizIds } },
      select: { id: true },
    });
    await prisma.quizResponse.deleteMany({
      where: { submissionId: { in: submissions.map((entry: { id: string }) => entry.id) } },
    });
    await prisma.quizSubmission.deleteMany({ where: { quizId: { in: quizIds } } });
    const quizQuestions = await prisma.question.findMany({
      where: { quizId: { in: quizIds } },
      select: { id: true },
    });
    await prisma.option.deleteMany({
      where: { questionId: { in: quizQuestions.map((question: { id: string }) => question.id) } },
    });
    await prisma.question.deleteMany({ where: { quizId: { in: quizIds } } });
    await prisma.quiz.deleteMany({ where: { id: { in: quizIds } } });
    await prisma.assessmentSubmission.deleteMany({
      where: { assessmentId: { in: assessmentIds } },
    });
    await prisma.assessmentAssistant.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
    await prisma.assessment.deleteMany({ where: { id: { in: assessmentIds } } });
    await prisma.content.deleteMany({ where: { module: { courseId: { in: courseIds } } } });
    await prisma.module.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.courseAssistant.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.courseTeacher.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.courseEnrollment.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  };

  beforeAll(async () => {
    const dbModule = await import("../config/db");
    prisma = dbModule.default;
    await cleanup();

    const password = await bcrypt.hash(PASSWORD, 4);
    const createUser = (name: string, role: string, slug = role.toLowerCase()) =>
      prisma.user.create({
        data: {
          name,
          email: `${EMAIL_PREFIX}${slug}@example.test`,
          password,
          role,
          isVerified: true,
          forcePasswordChange: false,
        },
      });
    const [superAdmin, admin, teacher, assistant, student, outsider] = await Promise.all([
      createUser("Integration Super Admin", "SUPER_ADMIN", "superadmin"),
      createUser("Integration Admin", "ADMIN"),
      createUser("Integration Teacher", "TEACHER"),
      createUser("Integration Assistant", "ASSISTANT"),
      createUser("Integration Student", "STUDENT", "student"),
      createUser("Integration Outsider", "STUDENT", "outsider"),
    ]);
    const [course, otherCourse] = await Promise.all([
      prisma.course.create({
        data: {
          title: "Integration JECC Course",
          description: "Security journey fixture",
          createdById: admin.id,
          isPublished: true,
          isActive: true,
        },
      }),
      prisma.course.create({
        data: {
          title: "Integration JECC Other Course",
          createdById: admin.id,
          isPublished: true,
          isActive: true,
        },
      }),
    ]);
    await Promise.all([
      prisma.courseTeacher.create({ data: { courseId: course.id, teacherId: teacher.id } }),
      prisma.courseAssistant.create({ data: { courseId: course.id, assistantId: assistant.id } }),
      prisma.courseEnrollment.create({ data: { courseId: course.id, userId: student.id } }),
    ]);
    const quiz = await prisma.quiz.create({
      data: {
        title: "Integration Safe Quiz",
        courseId: course.id,
        createdById: teacher.id,
        status: "PUBLISHED",
        isLatest: true,
        maxAttempts: 1,
        totalMarks: 1,
      },
    });
    const question = await prisma.question.create({
      data: { quizId: quiz.id, text: "Safe question", type: "MCQ", marks: 1 },
    });
    await prisma.option.createMany({
      data: [
        { questionId: question.id, text: "Correct", isCorrect: true },
        { questionId: question.id, text: "Wrong", isCorrect: false },
      ],
    });
    const quizCorrectOption = await prisma.option.findFirstOrThrow({
      where: { questionId: question.id, isCorrect: true },
    });
    const exam = await prisma.exam.create({
      data: {
        title: "Integration Safe Exam",
        durationMins: 30,
        totalMarks: 1,
        passingMarks: 1,
        courseId: course.id,
        createdById: teacher.id,
        status: "PUBLISHED",
      },
    });
    const examQuestion = await prisma.examQuestion.create({
      data: { examId: exam.id, text: "Exam question", maxMarks: 1 },
    });
    const examOptions = await Promise.all([
      prisma.examOption.create({ data: { questionId: examQuestion.id, text: "Correct" } }),
      prisma.examOption.create({ data: { questionId: examQuestion.id, text: "Wrong" } }),
    ]);
    await prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: { correctOptionId: examOptions[0].id },
    });
    const recorded = await prisma.recordedLecture.create({
      data: {
        title: "Integration Recording",
        videoUrl: "http://localhost:4000/uploads/integration/test.webm",
        courseId: course.id,
        teacherId: teacher.id,
        duration: 60,
        order: 1,
      },
    });
    const live = await prisma.liveLecture.create({
      data: {
        title: "Integration Live Class",
        courseId: course.id,
        teacherId: teacher.id,
        startTime: new Date(Date.now() - 60_000),
        endTime: new Date(Date.now() + 3_600_000),
        roomId: `integration-${Date.now()}`,
        status: "LIVE",
      },
    });
    const certificate = await prisma.certificate.create({
      data: {
        title: "Integration Certificate",
        userId: student.id,
        courseId: course.id,
        issuedById: assistant.id,
      },
    });
    ids = {
      admin: admin.id,
      superAdmin: superAdmin.id,
      teacher: teacher.id,
      assistant: assistant.id,
      student: student.id,
      outsider: outsider.id,
      course: course.id,
      otherCourse: otherCourse.id,
      quiz: quiz.id,
      quizQuestion: question.id,
      quizCorrectOption: quizCorrectOption.id,
      exam: exam.id,
      examQuestion: examQuestion.id,
      examCorrectOption: examOptions[0].id,
      recorded: recorded.id,
      live: live.id,
      certificate: certificate.id,
    };
    const serverModule = await import("../server");
    app = serverModule.app;
  }, 30_000);

  // The production credential caps are per-IP and deliberately low, while this
  // suite signs in many times from the same loopback address. Clearing the
  // counters between tests keeps the limits strict in production without making
  // the suite fail as soon as another sign-in is added to it.
  beforeEach(async () => {
    const { loginLimiter, otpLimiter } = await import("../middlewares/security.middleware");
    for (const key of ["::ffff:127.0.0.1", "127.0.0.1", "::1"]) {
      loginLimiter.resetKey(key);
      otpLimiter.resetKey(key);
    }
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  }, 30_000);

  it("rejects state changes without a CSRF token", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: `${EMAIL_PREFIX}student@example.test`, password: PASSWORD })
      .expect(403)
      .expect((response) => expect(response.body.code).toBe("CSRF_INVALID"));
  });

  it("requires legal consent and prevents role injection during self-registration", async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const email = `${EMAIL_PREFIX}registered@example.test`;
    const validRegistration = {
      name: "Consent Learner",
      email,
      password: PASSWORD,
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAdult: true,
      courseName: "CA Foundation",
      website: "",
    };

    const missingConsent = await agent
      .post("/api/v1/auth/register")
      .set("X-CSRF-Token", token)
      .send({ ...validRegistration, acceptTerms: false })
      .expect(400);
    expect(missingConsent.body.errors).toContainEqual(
      expect.objectContaining({
        field: "acceptTerms",
        message: "You must accept the Terms of Service.",
      }),
    );

    const roleInjection = await agent
      .post("/api/v1/auth/register")
      .set("X-CSRF-Token", token)
      .send({ ...validRegistration, role: "SUPER_ADMIN" })
      .expect(400);
    expect(roleInjection.body.errors).toContainEqual(
      expect.objectContaining({ field: "_form", code: "unrecognized_keys" }),
    );

    const longPhone = await agent
      .post("/api/v1/auth/register")
      .set("X-CSRF-Token", token)
      .send({
        ...validRegistration,
        email: `${EMAIL_PREFIX}long-phone@example.test`,
        phone: "1".repeat(21),
      })
      .expect(400);
    expect(longPhone.body).toMatchObject({
      success: false,
      message: "Phone number must be 20 characters or fewer.",
    });
    expect(longPhone.body.errors).toContainEqual(
      expect.objectContaining({
        field: "phone",
        message: "Phone number must be 20 characters or fewer.",
      }),
    );

    await agent
      .post("/api/v1/auth/register")
      .set("X-CSRF-Token", token)
      .send({ ...validRegistration, phone: "1".repeat(20) })
      .expect(201);

    const registered = await prisma.user.findUnique({ where: { email } });
    expect(registered?.role).toBe("STUDENT");
    expect(registered?.phone).toBe("1".repeat(20));
    expect(registered?.isVerified).toBe(false);
    expect(registered?.termsAcceptedAt).toBeInstanceOf(Date);
    expect(registered?.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(registered?.adultConfirmedAt).toBeInstanceOf(Date);
  });

  it("treats the public session probe as anonymous without returning 401", async () => {
    const response = await request(app).get("/api/v1/auth/verify").expect(200);
    expect(response.body).toEqual({ success: true, authenticated: false, user: null });
  });

  it("issues a registration OTP at sign-up and rejects a wrong code", async () => {
    const email = `${EMAIL_PREFIX}registered@example.test`;
    const code = await latestOtpCode(email, "REGISTRATION");
    expect(code).toMatch(/^\d{6}$/);

    const agent = request.agent(app);
    const token = await csrf(agent);
    const wrong = await agent
      .post("/api/v1/auth/otp/verify")
      .set("X-CSRF-Token", token)
      .send({ challengeToken: "0".repeat(64), code })
      .expect(400);
    expect(wrong.body.code).toBe("OTP_CHALLENGE_UNKNOWN");
  });

  it("handles missing, invalid, valid, and reused email verification tokens", async () => {
    const email = `${EMAIL_PREFIX}registered@example.test`;
    const emailService = await import("../services/email.service");

    // Registration now confirms via an emailed code, so the legacy link is
    // obtained through the resend fallback that still serves lost-tab users.
    const agent = request.agent(app);
    const csrfToken = await csrf(agent);
    await agent
      .post("/api/v1/auth/resend-verification")
      .set("X-CSRF-Token", csrfToken)
      .send({ email })
      .expect(200);

    const verificationCall = vi
      .mocked(emailService.sendVerificationEmail)
      .mock.calls.findLast((call) => call[0] === email);
    expect(verificationCall).toBeDefined();
    const rawToken = verificationCall![1];

    await request(app)
      .get("/api/v1/auth/verify-email")
      .expect(400)
      .expect((response) => expect(response.body.message).toContain("missing"));
    await request(app)
      .get("/api/v1/auth/verify-email")
      .query({ token: "invalid-token" })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain("Invalid or expired"));
    await request(app)
      .get("/api/v1/auth/verify-email")
      .query({ token: rawToken })
      .expect(200)
      .expect((response) => expect(response.body.message).toContain("verified successfully"));
    await request(app)
      .get("/api/v1/auth/verify-email")
      .query({ token: rawToken })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain("Invalid or expired"));

    const verified = await prisma.user.findUnique({ where: { email } });
    expect(verified?.isVerified).toBe(true);
    expect(verified?.verificationToken).toBeNull();
    expect(verified?.verificationTokenExpiresAt).toBeNull();
  });

  it("skips SMTP and reports when verification delivery is disabled", async () => {
    const emailService = await import("../services/email.service");
    const authService = await import("../services/auth.service");
    const callsBefore = vi.mocked(emailService.sendVerificationEmail).mock.calls.length;
    process.env.SEND_VERIFICATION_EMAILS = "false";
    try {
      expect(authService.isVerificationEmailDeliveryEnabled()).toBe(false);
      const message = await authService.resendVerificationEmailService(
        `${EMAIL_PREFIX}registered@example.test`,
      );
      expect(message).toContain("temporarily unavailable");
      expect(vi.mocked(emailService.sendVerificationEmail).mock.calls).toHaveLength(callsBefore);
    } finally {
      process.env.SEND_VERIFICATION_EMAILS = "true";
    }
  });

  it("uses cookie-only login and returns a sanitized verified user", async () => {
    const { agent, response } = await login(`${EMAIL_PREFIX}student@example.test`);
    expect(response.body.token).toBeUndefined();
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.verificationToken).toBeUndefined();

    const verified = await agent.get("/api/v1/auth/verify").expect(200);
    expect(verified.body.user.id).toBe(ids.student);
    expect(verified.body.user.passwordResetToken).toBeUndefined();
  });

  it("never exposes quiz or exam answer keys to learners", async () => {
    const { agent } = await login(`${EMAIL_PREFIX}student@example.test`);
    const quiz = await agent.get(`/api/v1/quizzes/student/${ids.quiz}`).expect(200);
    expect(quiz.body.quiz.questions[0].options[0]).not.toHaveProperty("isCorrect");

    const exams = await agent.get("/api/v1/exams").expect(200);
    expect(exams.body[0]).not.toHaveProperty("questions");
    const exam = await agent.get(`/api/v1/exams/${ids.exam}`).expect(200);
    expect(exam.body.questions[0]).not.toHaveProperty("correctOptionId");
  });

  it("completes learner quiz and exam journeys without revealing answer keys", async () => {
    const learner = await login(`${EMAIL_PREFIX}student@example.test`);
    const quizStart = await learner.agent
      .post(`/api/v1/quizzes/student/${ids.quiz}/start`)
      .set("X-CSRF-Token", learner.token)
      .expect(201);
    const quizQuestions = await learner.agent
      .get(`/api/v1/quizzes/student/${ids.quiz}/attempt`)
      .expect(200);
    expect(quizQuestions.body.questions[0].options[0]).not.toHaveProperty("isCorrect");
    const quizSubmission = await learner.agent
      .post(`/api/v1/quizzes/student/submissions/${quizStart.body.submissionId}/submit`)
      .set("X-CSRF-Token", learner.token)
      .send({
        answers: [
          {
            questionId: ids.quizQuestion,
            selectedOptionId: ids.quizCorrectOption,
          },
        ],
      })
      .expect(200);
    expect(quizSubmission.body.score).toBe(1);
    const quizResult = await learner.agent
      .get(`/api/v1/quizzes/student/submissions/${quizStart.body.submissionId}/result`)
      .expect(200);
    expect(quizResult.body.result.score).toBe(1);
    expect(quizResult.body.result.responses).toBeNull();

    const examStart = await learner.agent
      .post(`/api/v1/exams/${ids.exam}/start`)
      .set("X-CSRF-Token", learner.token)
      .expect(201);
    const examQuestions = await learner.agent
      .get(`/api/v1/exams/${ids.exam}/questions`)
      .expect(200);
    expect(examQuestions.body[0]).not.toHaveProperty("correctOptionId");
    const examSubmission = await learner.agent
      .post(`/api/v1/exams/attempt/${examStart.body.id}/submit`)
      .set("X-CSRF-Token", learner.token)
      .send({ answers: { [ids.examQuestion]: ids.examCorrectOption } })
      .expect(200);
    expect(examSubmission.body.score).toBe(1);
    expect(examSubmission.body.isPassed).toBe(true);
    const examResult = await learner.agent
      .get(`/api/v1/exams/attempts/${examStart.body.id}`)
      .expect(200);
    expect(examResult.body.exam).not.toHaveProperty("questions");
    expect(examResult.body).not.toHaveProperty("answers");
  });

  it("denies course media and attempts to a non-enrolled learner", async () => {
    const { agent, token } = await login(`${EMAIL_PREFIX}outsider@example.test`);
    await agent.get(`/api/v1/reclec/courses/${ids.course}/lectures`).expect(403);
    await agent
      .post(`/api/v1/live-lectures/join/${ids.live}`)
      .set("X-CSRF-Token", token)
      .expect(403);
    await agent.post(`/api/v1/exams/${ids.exam}/start`).set("X-CSRF-Token", token).expect(404);
  });

  it("prevents an administrator from creating a super administrator", async () => {
    const { agent, token } = await login(`${EMAIL_PREFIX}admin@example.test`);
    const response = await agent
      .post("/api/v1/admin/users")
      .set("X-CSRF-Token", token)
      .send({
        name: "Forbidden Super Admin",
        email: `${EMAIL_PREFIX}forbidden-super@example.test`,
        password: PASSWORD,
        role: "SUPER_ADMIN",
      })
      .expect(400);
    expect(response.body.message).toContain("not allowed");
  });

  it("allows a super administrator to provision an immediately accessible administrator", async () => {
    const superAdmin = await login(`${EMAIL_PREFIX}superadmin@example.test`);
    const provisionedEmail = `${EMAIL_PREFIX}provisioned-admin@example.test`;
    const customLearnerId = "JECA-INTEGRATION-ADMIN";

    await superAdmin.agent
      .post("/api/v1/admin/users")
      .set("X-CSRF-Token", superAdmin.token)
      .send({
        name: "Missing Password Admin",
        email: `${EMAIL_PREFIX}missing-password@example.test`,
        role: "ADMIN",
      })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain("Password is required"));

    const response = await superAdmin.agent
      .post("/api/v1/admin/users")
      .set("X-CSRF-Token", superAdmin.token)
      .send({
        name: "Integration Provisioned Admin",
        email: provisionedEmail,
        password: PROVISIONED_PASSWORD,
        role: "ADMIN",
        learnerId: customLearnerId,
        courseName: "CA Foundation",
        phone: "+91 9999999999",
        bio: "Provisioned directly by a Super Admin.",
      })
      .expect(201);
    expect(response.body.message).toContain("sign in immediately");
    expect(response.body.user).toMatchObject({
      role: "ADMIN",
      learnerId: customLearnerId,
      courseName: "CA Foundation",
      isVerified: false,
      forcePasswordChange: false,
    });
    expect(response.body.user.password).toBeUndefined();

    const provisioned = await prisma.user.findUniqueOrThrow({ where: { email: provisionedEmail } });
    expect(provisioned.forcePasswordChange).toBe(false);
    expect(provisioned.isVerified).toBe(false);
    expect(provisioned.passwordResetToken).toBeNull();
    expect(provisioned.verificationToken).not.toBeNull();
    expect(provisioned.password).not.toBe(PROVISIONED_PASSWORD);
    expect(await bcrypt.compare(PROVISIONED_PASSWORD, provisioned.password)).toBe(true);

    const emailService = await import("../services/email.service");
    const verificationCall = vi
      .mocked(emailService.sendVerificationEmail)
      .mock.calls.find((call) => call[0] === provisionedEmail);
    expect(verificationCall).toBeDefined();
    expect(verificationCall![1]).not.toBe(PROVISIONED_PASSWORD);
    expect(
      vi
        .mocked(emailService.sendAccountInvitationEmail)
        .mock.calls.some((call) => call[0] === provisionedEmail),
    ).toBe(false);

    const provisionedAgent = request.agent(app);
    const provisionedCsrf = await csrf(provisionedAgent);

    // Staff accounts are password-only: the emailed-code route must not start
    // for them, and the refusal must not reveal that the address exists.
    await provisionedAgent
      .post("/api/v1/auth/login")
      .set("X-CSRF-Token", provisionedCsrf)
      .send({ email: provisionedEmail, method: "OTP" })
      .expect(400)
      .expect((response) => {
        expect(response.body.code).toBe("OTP_LOGIN_NOT_AVAILABLE");
        expect(response.body.otpRequired).toBeUndefined();
      });
    await expect(latestOtpCode(provisionedEmail, "LOGIN")).rejects.toThrow();

    const directLogin = await provisionedAgent
      .post("/api/v1/auth/login")
      .set("X-CSRF-Token", provisionedCsrf)
      .send({ email: provisionedEmail, password: PROVISIONED_PASSWORD })
      .expect(200);
    expect(directLogin.body.otpRequired).toBe(false);
    expect(directLogin.body.user).toMatchObject({
      role: "ADMIN",
      forcePasswordChange: false,
    });
    await provisionedAgent.get("/api/v1/admin/all").expect(200);
  });

  it("lets a student sign in with an emailed code instead of a password", async () => {
    const email = `${EMAIL_PREFIX}student@example.test`;
    const student = await loginWithCode(email);

    expect(student.response.body.authenticated).toBe(true);
    expect(student.response.body.user).toMatchObject({
      role: "STUDENT",
      // Entering the emailed code proves control of the mailbox, so the account
      // is confirmed as part of signing in.
      isVerified: true,
    });
    await student.agent.get("/api/v1/auth/verify").expect(200);
  });

  it("completes administrator course setup, staffing, enrollment, and archive", async () => {
    const admin = await login(`${EMAIL_PREFIX}admin@example.test`);
    const created = await admin.agent
      .post("/api/v1/admin/courses")
      .set("X-CSRF-Token", admin.token)
      .send({
        title: "Integration JECC Managed Course",
        description: "Administrator workflow",
        isPublished: true,
      })
      .expect(201);
    const courseId = created.body.course.id as string;
    expect(created.body.course.isPublished).toBe(true);

    await admin.agent
      .post(`/api/v1/admin/courses/${courseId}/assign-teacher`)
      .set("X-CSRF-Token", admin.token)
      .send({ teacherId: ids.teacher })
      .expect(200);
    await admin.agent
      .post(`/api/v1/admin/courses/${courseId}/assign-assistant`)
      .set("X-CSRF-Token", admin.token)
      .send({ assistantId: ids.assistant })
      .expect(200);
    await admin.agent
      .post(`/api/v1/admin/courses/${courseId}/enroll-by-id`)
      .set("X-CSRF-Token", admin.token)
      .send({ userId: ids.outsider })
      .expect(201);

    const teacher = await login(`${EMAIL_PREFIX}teacher@example.test`);
    const assigned = await teacher.agent
      .get("/api/v1/admin/courses/teacher/my-assigned")
      .expect(200);
    expect(assigned.body.courses.some((course: { id: string }) => course.id === courseId)).toBe(
      true,
    );
    const learner = await login(`${EMAIL_PREFIX}outsider@example.test`);
    const enrolled = await learner.agent.get("/api/v1/user/courses/me").expect(200);
    expect(enrolled.body.courses.some((course: { id: string }) => course.id === courseId)).toBe(
      true,
    );

    await admin.agent
      .delete(`/api/v1/admin/courses/${courseId}`)
      .set("X-CSRF-Token", admin.token)
      .expect(200);
    const afterArchive = await learner.agent.get("/api/v1/user/courses/me").expect(200);
    expect(afterArchive.body.courses.some((course: { id: string }) => course.id === courseId)).toBe(
      false,
    );
  });

  it("prevents a teacher from creating content in an unassigned course", async () => {
    const { agent, token } = await login(`${EMAIL_PREFIX}teacher@example.test`);
    await agent
      .post("/api/v1/quizzes/admin/create")
      .set("X-CSRF-Token", token)
      .send({ title: "Forbidden quiz", courseId: ids.otherCourse, timeLimit: 10 })
      .expect(403);
  });

  it("uploads, validates, plays, and deletes a private recorded lecture", async () => {
    const teacher = await login(`${EMAIL_PREFIX}teacher@example.test`);
    const video = Buffer.from("integration-video-content");
    const prepared = await teacher.agent
      .post(`/api/v1/reclec/courses/${ids.course}/lectures/upload-url`)
      .set("X-CSRF-Token", teacher.token)
      .send({
        fileName: "lesson.webm",
        contentType: "video/webm",
        fileSize: video.length,
      })
      .expect(200);

    const uploadLocation = new URL(prepared.body.uploadUrl);
    await request(app)
      .put(`${uploadLocation.pathname}${uploadLocation.search}`)
      .set("Content-Type", "video/webm")
      .send(video)
      .expect(200);

    const completed = await teacher.agent
      .post(`/api/v1/reclec/courses/${ids.course}/lectures/complete`)
      .set("X-CSRF-Token", teacher.token)
      .send({
        key: prepared.body.key,
        uploadToken: prepared.body.uploadToken,
        title: "Integration Uploaded Recording",
        duration: 60,
        order: 2,
      })
      .expect(201);

    const learner = await login(`${EMAIL_PREFIX}student@example.test`);
    const signed = await learner.agent
      .get(`/api/v1/reclec/lectures/${completed.body.lecture.id}/signed-url`)
      .expect(200);
    const playbackLocation = new URL(signed.body.signedUrl);
    const playback = await request(app).get(playbackLocation.pathname).expect(200);
    expect(playback.body).toEqual(video);

    await teacher.agent
      .delete(`/api/v1/reclec/lectures/${completed.body.lecture.id}`)
      .set("X-CSRF-Token", teacher.token)
      .expect(200);
  });

  it("completes teacher creation, learner submission, and assistant grading", async () => {
    const teacher = await login(`${EMAIL_PREFIX}teacher@example.test`);
    const created = await teacher.agent
      .post(`/api/v1/assessments/course/${ids.course}`)
      .set("X-CSRF-Token", teacher.token)
      .send({
        title: "Integration JECC Written Assessment",
        description: "End-to-end assessment workflow",
        totalMarks: 10,
        submissionType: "TEXT_ENTRY",
        questions: [{ text: "Explain the accounting principle.", marks: 10 }],
      })
      .expect(201);
    const assessmentId = created.body.assessment.id as string;

    await teacher.agent
      .post(`/api/v1/assessments/${assessmentId}/assign-assistant`)
      .set("X-CSRF-Token", teacher.token)
      .send({ assistantId: ids.assistant })
      .expect(200);

    const learner = await login(`${EMAIL_PREFIX}student@example.test`);
    const submitted = await learner.agent
      .post(`/api/v1/assessments/${assessmentId}/submit`)
      .set("X-CSRF-Token", learner.token)
      .send({ textContent: "The principle requires consistent recognition and measurement." })
      .expect(200);
    expect(submitted.body.submission.status).toBe("SUBMITTED");

    const assistant = await login(`${EMAIL_PREFIX}assistant@example.test`);
    const assigned = await assistant.agent
      .get("/api/v1/assessments/assistant/assigned")
      .expect(200);
    expect(
      assigned.body.assessments.some(
        (assessment: { id: string }) => assessment.id === assessmentId,
      ),
    ).toBe(true);
    const submissions = await assistant.agent
      .get(`/api/v1/assessments/${assessmentId}/submissions`)
      .expect(200);
    expect(submissions.body.submissions).toHaveLength(1);
    await assistant.agent
      .put(`/api/v1/assessments/submission/${submissions.body.submissions[0].id}/grade`)
      .set("X-CSRF-Token", assistant.token)
      .send({ grade: 8, feedback: "Clear and accurate." })
      .expect(200);

    const result = await learner.agent
      .get(`/api/v1/assessments/student/${assessmentId}`)
      .expect(200);
    expect(result.body.submission).toMatchObject({ status: "GRADED", grade: 8 });
  });

  it("provides side-effect-free public certificate verification", async () => {
    const response = await request(app)
      .get(`/api/v1/certificates/verify/${ids.certificate}`)
      .expect(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.certificate.user).toEqual({
      name: "Integration Student",
      learnerId: null,
    });
    expect(response.body.certificate.user).not.toHaveProperty("email");
  });

  it("creates, tracks, and resolves a grievance with scoped administrator access", async () => {
    const requester = request.agent(app);
    const requesterToken = await csrf(requester);
    const email = `${EMAIL_PREFIX}grievance@example.test`;
    const created = await requester
      .post("/api/v1/support/tickets")
      .set("X-CSRF-Token", requesterToken)
      .send({
        name: "Integration Requester",
        email,
        category: "TECHNICAL",
        subject: "Unable to open a recorded class",
        message: "The recorded class returns an error after I press the play button.",
        consentToContact: true,
        website: "",
      })
      .expect(201);
    const reference = created.body.ticket.reference as string;
    expect(reference).toMatch(/^JECA-\d{8}-[A-F0-9]{8}$/);

    await requester
      .get(`/api/v1/support/tickets/${reference}/status`)
      .query({ email: "wrong@example.test" })
      .expect(404);
    const publicStatus = await requester
      .get(`/api/v1/support/tickets/${reference}/status`)
      .query({ email })
      .expect(200);
    expect(publicStatus.body.ticket.status).toBe("OPEN");

    const admin = await login(`${EMAIL_PREFIX}admin@example.test`);
    const list = await admin.agent
      .get("/api/v1/support/admin/tickets")
      .query({ search: reference })
      .expect(200);
    expect(list.body.tickets).toHaveLength(1);

    await admin.agent
      .patch(`/api/v1/support/admin/tickets/${list.body.tickets[0].id}`)
      .set("X-CSRF-Token", admin.token)
      .send({ status: "RESOLVED", resolution: "The media access record was refreshed." })
      .expect(200);

    const resolved = await requester
      .get(`/api/v1/support/tickets/${reference}/status`)
      .query({ email })
      .expect(200);
    expect(resolved.body.ticket.status).toBe("RESOLVED");
    expect(resolved.body.ticket.resolution).toContain("refreshed");
  });

  it.runIf(Boolean(process.env.LIVEKIT_API_URL))(
    "starts and closes a real LiveKit classroom with role-scoped grants",
    async () => {
      const teacher = await login(`${EMAIL_PREFIX}teacher@example.test`);
      await teacher.agent
        .post(`/api/v1/live-lectures/start/${ids.live}`)
        .set("X-CSRF-Token", teacher.token)
        .expect(200);

      const teacherJoin = await teacher.agent
        .post(`/api/v1/live-lectures/join/${ids.live}`)
        .set("X-CSRF-Token", teacher.token)
        .expect(200);
      expect(teacherJoin.body.serverUrl).toBe(process.env.LIVEKIT_WS_URL);
      expect(teacherJoin.body.permissions).toEqual({ canPublish: true, canManage: true });

      const learner = await login(`${EMAIL_PREFIX}student@example.test`);
      const learnerJoin = await learner.agent
        .post(`/api/v1/live-lectures/join/${ids.live}`)
        .set("X-CSRF-Token", learner.token)
        .expect(200);
      expect(learnerJoin.body.permissions).toEqual({ canPublish: false, canManage: false });

      const verifier = new TokenVerifier(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );
      const grants = await verifier.verify(learnerJoin.body.token);
      expect(grants.sub).toBe(ids.student);
      expect(grants.video?.roomJoin).toBe(true);
      expect(grants.video?.canPublish).toBe(false);

      await teacher.agent
        .post(`/api/v1/live-lectures/end/${ids.live}`)
        .set("X-CSRF-Token", teacher.token)
        .expect(200);
      await learner.agent
        .post(`/api/v1/live-lectures/join/${ids.live}`)
        .set("X-CSRF-Token", learner.token)
        .expect(410);
    },
    20_000,
  );
});
