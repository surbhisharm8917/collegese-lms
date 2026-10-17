import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import helmet from "helmet";
import compression from "compression";

// Routes (consistent @alias imports)
import authRouter from "@routes/auth.routes";
import adminRouter from "@routes/adminRoutes/admin.routes";
import userRouter from "@routes/userRoutes/user.routes";
import liveLectureRoutes from "@routes/liveRoutes/liveLecture.routes";
import quizRouter from "@routes/quizRoutes/quiz.routes";
import assessmentRouter from "@routes/assessmentRoutes/assessment.routes";
import superAdminRouter from "@routes/superadmin.router";
import recordedLectureRouter from "@routes/recordedRoutes/recordedlecture.routes";
import teacherRouter from "@routes/teacherRoutes/teacher.routes";
import statsRouter from "@routes/statisticsRoutes/stats.routes";
import certificateRouter from "@routes/certificate/certificate.route";
import ExamRouter from "@routes/examRoutes/exam.routes";
import { notificationRoutes } from "@routes/notification.routes";
import assistantStatsRouter from "@routes/statisticsRoutes/assistantStatsRoutes";
import uploadsRouter from "@routes/uploads.routes";
import courseRouter from "@routes/adminRoutes/course.routes";
import paymentRequestRouter from "@routes/paymentRequest.routes";
import { protectedSupportRouter, publicSupportRouter } from "@routes/support.routes";
import { getPublicCoursesController } from "@controllers/course/course.controller";

// Middleware & Utils
import { initCronJobs } from "@utils/cron.utils";
import { maintenanceModeMiddleware } from "@middlewares/adminAuth/maintenanceModeMiddleware";
import { authMiddleware } from "@middlewares/auth.middleware";
import { forcePasswordChangeMiddleware } from "@middlewares/forcePasswordChange.middleware";
import { connectDatabase, disconnectDatabase } from "@config/db";
import { validateEnv } from "@config/env";
import { globalErrorHandler } from "@middlewares/errorHandler.middleware";
import {
  applySecurityMiddleware,
  authLimiter,
  statusLimiter,
} from "@middlewares/security.middleware";
import { logger } from "@utils/logger";
import { getMaintenanceStatus } from "@controllers/auth.controller";
import { publicVerifyCertificate } from "@controllers/certificate/certificate.controller";
import { handleLiveKitWebhook } from "@controllers/liveLecture/liveLecture.controller";
import { USE_LOCAL_STORAGE } from "@utils/s3.utils";
import { UPLOAD_ROOT } from "@utils/localStorage.utils";
import { csrfProtection, issueCsrfToken } from "@middlewares/csrf.middleware";
import { requestIdMiddleware } from "@middlewares/requestId.middleware";
import { dependencyHealth, liveHealth, readyHealth } from "@controllers/health.controller";

validateEnv();

const app = express();
app.use(requestIdMiddleware);

// Trust a bounded number of proxy hops. In production the only proxy that
// adds forwarding headers Express sees is Nginx (Cloudflare → Nginx → Express,
// and Nginx restores the real client IP via CF-Connecting-IP). Using a fixed
// number instead of `true` prevents clients from spoofing X-Forwarded-For to
// bypass rate limiting or forge their IP. Override with TRUST_PROXY_HOPS if your
// topology differs.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

if (allowedOrigins.length === 0) {
  logger.warn("CORS_ORIGINS not set. No external origins will be allowed.");
}

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-CSRF-Token",
    "X-Request-ID",
    "x-requested-with",
  ],
  optionsSuccessStatus: 200,
};

// CORS is applied FIRST so that even rate-limited (429) and error responses
// carry the Access-Control-Allow-Origin header. Otherwise a throttled request
// surfaces in the browser as a misleading CORS error instead of a clean 429.
app.use(cors(corsOptions));

// Security headers + rate limiting
applySecurityMiddleware(app);

// Production Optimizations
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
); // Security headers
app.use(compression()); // Gzip compression

// LiveKit signs the exact raw request body. This route must run before JSON
// parsing and before browser CSRF protection.
app.post(
  "/api/v1/live-lectures/webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  handleLiveKitWebhook,
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
morgan.token("request-id", (req) => (req as express.Request).requestId);
app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? ":remote-addr - :method :url :status :response-time ms request_id=:request-id"
      : "dev",
  ),
);
app.use(cookieParser());
app.use(express.static("public"));

// A signed double-submit token protects every state-changing API request that
// relies on the browser's authentication cookie.
app.get("/api/v1/auth/csrf", statusLimiter, issueCsrfToken);
app.use("/api/v1", csrfProtection);

// Local filesystem storage (dev only): serve uploaded files and accept direct PUT uploads.
if (USE_LOCAL_STORAGE) {
  app.use("/uploads", express.static(UPLOAD_ROOT));
  app.use("/api/v1/uploads", uploadsRouter);
  logger.warn(`[storage] Local uploads served from ${UPLOAD_ROOT} at /uploads`);
}

// Health check (exempt from auth rate limiter)
app.get("/health/live", liveHealth);
app.get("/health/ready", readyHealth);
app.get("/health/dependencies", dependencyHealth);
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Just Easy CA Classes API</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        :root {
          --primary-orange: #FF5733;
          --text-dark: #1e293b;
          --text-muted: #64748b;
          --bg-light: #f8fafc;
          --card-bg: #ffffff;
          --success: #22c55e;
        }
        body {
          font-family: 'Poppins', sans-serif;
          background-color: var(--bg-light);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          color: var(--text-dark);
        }
        .container {
          background: var(--card-bg);
          padding: 3.5rem;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          text-align: center;
          max-width: 480px;
          width: 90%;
          border-top: 5px solid var(--primary-orange);
        }
        h1 {
          color: var(--text-dark);
          margin-bottom: 0.5rem;
          font-size: 2.25rem;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        p {
          color: var(--text-muted);
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2.5rem;
          font-weight: 400;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: rgba(34, 197, 94, 0.1);
          color: var(--success);
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.875rem;
          gap: 0.5rem;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background-color: var(--success);
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .footer {
          margin-top: 2.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
          border-top: 1px solid #e2e8f0;
          padding-top: 1.5rem;
        }
        .footer span {
          font-weight: 600;
          color: var(--primary-orange);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      </link>
    </head>
    <body>
      <div class="container">
        <h1>Just Easy CA Classes</h1>
        <p>Welcome to the backend API service. Authenticated access is required for most endpoints.</p>
        
        <div class="status-badge">
          <span class="status-dot"></span>
          System Operational
        </div>

        <div style="margin-top: 2rem;">
          <a href="${process.env.APP_URL}" style="display: inline-block; padding: 0.75rem 1.5rem; background-color: var(--primary-orange); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background-color 0.2s;">
            Go to Learning Platform &rarr;
          </a>
        </div>

        <div class="footer">
          v1.0.0 &bullet; Powered by <span>Just Easy CA Classes</span>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Maintenance / status – mounted before authLimiter so it only hits generalLimiter + statusLimiter
app.get("/api/v1/auth/status/maintenance", statusLimiter, getMaintenanceStatus);

// Public routes (with auth-specific rate limiter)
app.use("/api/v1/auth", authLimiter, authRouter);
app.get("/api/v1/certificates/verify/:certificateId", publicVerifyCertificate);
app.get("/api/v1/public/courses", getPublicCoursesController);
app.use("/api/v1/support", publicSupportRouter);

// Protected routes (auth + maintenance)
app.use(authMiddleware);
app.use(forcePasswordChangeMiddleware);
app.use(maintenanceModeMiddleware);

app.use("/api/v1/payment-requests", paymentRequestRouter);
app.use("/api/v1/superadmin", superAdminRouter);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/live-lectures", liveLectureRoutes);
app.use("/api/v1/quizzes", quizRouter);
app.use("/api/v1/reclec", recordedLectureRouter);
app.use("/api/v1/teachers", teacherRouter);
app.use("/api/v1/assessments", assessmentRouter);
app.use("/api/v1/stats", statsRouter);
app.use("/api/v1/certificates", certificateRouter);
app.use("/api/v1/exams", ExamRouter);
app.use("/api/v1/assistant/stats", assistantStatsRouter);
app.use("/api/v1/support/admin", protectedSupportRouter);

// Global error handler (MUST be last middleware)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDatabase();
    initCronJobs();

    server.listen(PORT, () => {
      logger.info("=".repeat(50));
      logger.info("JUST EASY CA CLASSES API - ONLINE");
      logger.info(`Running on: http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info("Live classroom media: LiveKit SFU");
      logger.info(`Started at: ${new Date().toLocaleString()}`);
      logger.info("=".repeat(50));
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await new Promise<void>((resolve) => {
    if (!server.listening) {
      return resolve();
    }
    server.close(() => {
      logger.info("HTTP server closed");
      resolve();
    });
  });
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Catch unhandled rejections & uncaught exceptions
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled Rejection", reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception", error);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

export { app, server, startServer };
