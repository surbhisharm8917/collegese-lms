import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin, isAssistant, isTeacher } from "../../middlewares/adminAuth/admin.auth.middleware";
import { getAssignedTeachersController } from "../../controllers/adminUser.controller";

import {
  createCourseController,
  getAllCoursesController,
  getCourseByIdController,
  updateCourseController,
  deleteCourseController,
  getEnrolledUsersCountController,
  enrollStudentController,
  getCourseForEnrolledUserController,
  getMyCoursesController,
  getCurrentUserCoursesController,
  enrollUserByEmailController,
  selfEnrollController,
  enrollUserByIdController,
  getTeacherAssignedCoursesController,
  assignTeacherToCourseController,
  removeTeacherFromCourseController,
  getCourseModulesController,
  createCourseModuleController,
  updateCourseModuleController,
  deleteCourseModuleController,
  createCourseChapterController,
  updateCourseChapterController,
  deleteCourseChapterController,
  assignAssistantToCourseController,
  getCourseAssistantsController,
  removeAssistantFromCourseController,
} from "../../controllers/course/course.controller";
import { uploadCourseThumbnail } from "../../middlewares/multer.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createCourseSchema, updateCourseSchema } from "../../utils/validation.schemas";

const courseRouter = Router();

courseRouter.post(
  "/",
  authMiddleware,
  isAdmin,
  uploadCourseThumbnail,
  validateBody(createCourseSchema),
  createCourseController,
);
courseRouter.put(
  "/:id",
  authMiddleware,
  isAdmin,
  uploadCourseThumbnail,
  validateBody(updateCourseSchema),
  updateCourseController,
);
courseRouter.delete("/:id", authMiddleware, isAdmin, deleteCourseController);
courseRouter.get("/dashboard/all", authMiddleware, isAssistant, getAllCoursesController);
courseRouter.get("/student/:id", authMiddleware, getCourseByIdController);
courseRouter.get("/dashboard/:id", authMiddleware, getCourseByIdController);
courseRouter.get(
  "/dashboard/:courseId/enrollment-count",
  authMiddleware,
  isAdmin,
  getEnrolledUsersCountController,
);
courseRouter.get("/enrolled/:courseId", authMiddleware, getCourseForEnrolledUserController);
courseRouter.post("/:courseId/enroll-user", authMiddleware, isAdmin, enrollStudentController);
courseRouter.post("/:courseId/enroll-by-id", authMiddleware, isAdmin, enrollUserByIdController);
courseRouter.get("/my-courses", authMiddleware, getMyCoursesController);
courseRouter.get("/current-user-courses", authMiddleware, getCurrentUserCoursesController);
courseRouter.get("/:courseId/modules", authMiddleware, getCourseModulesController);
courseRouter.post("/:courseId/modules", authMiddleware, isTeacher, createCourseModuleController);
courseRouter.put(
  "/:courseId/modules/:moduleId",
  authMiddleware,
  isTeacher,
  updateCourseModuleController,
);
courseRouter.delete(
  "/:courseId/modules/:moduleId",
  authMiddleware,
  isTeacher,
  deleteCourseModuleController,
);
courseRouter.post(
  "/:courseId/modules/:moduleId/chapters",
  authMiddleware,
  isTeacher,
  createCourseChapterController,
);
courseRouter.put(
  "/:courseId/modules/:moduleId/chapters/:chapterId",
  authMiddleware,
  isTeacher,
  updateCourseChapterController,
);
courseRouter.delete(
  "/:courseId/modules/:moduleId/chapters/:chapterId",
  authMiddleware,
  isTeacher,
  deleteCourseChapterController,
);
courseRouter.post(
  "/:courseId/enroll-by-email",
  authMiddleware,
  isAdmin,
  enrollUserByEmailController,
);
courseRouter.post("/:courseId/enroll", authMiddleware, selfEnrollController);
courseRouter.get("/dashboard/all", authMiddleware, isTeacher, getAllCoursesController);
courseRouter.get(
  "/teacher/my-assigned",
  authMiddleware,
  isTeacher,
  getTeacherAssignedCoursesController,
);
courseRouter.get("/:courseId/teachers", authMiddleware, isAdmin, getAssignedTeachersController);
courseRouter.post(
  "/:courseId/assign-teacher",
  authMiddleware,
  isAdmin,
  assignTeacherToCourseController,
);
courseRouter.delete(
  "/:courseId/teachers/:teacherId",
  authMiddleware,
  isAdmin,
  removeTeacherFromCourseController,
);
courseRouter.get("/:courseId/assistants", authMiddleware, isAdmin, getCourseAssistantsController);
courseRouter.post(
  "/:courseId/assign-assistant",
  authMiddleware,
  isAdmin,
  assignAssistantToCourseController,
);
courseRouter.delete(
  "/:courseId/assistants/:assistantId",
  authMiddleware,
  isAdmin,
  removeAssistantFromCourseController,
);

export default courseRouter;
