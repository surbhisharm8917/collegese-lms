import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin, isStudent, isTeacher } from "@middlewares/adminAuth/admin.auth.middleware";
import {
  createLiveLecture,
  getLectureParticipants,
  getLiveLectureById,
  getLiveLecturesByCourse,
  getLiveLecturesByTeacher,
  getStudentLiveLectures,
  joinLecture,
  leaveLecture,
  startLiveLecture,
  endLiveLecture,
  removeLectureParticipant,
} from "@controllers/liveLecture/liveLecture.controller";

const router = Router();

router.get("/student-live-lectures", authMiddleware, isStudent, getStudentLiveLectures);
router.post("/live", authMiddleware, isAdmin, createLiveLecture);
router.get("/teacher/:teacherId", authMiddleware, getLiveLecturesByTeacher);
router.get("/course/:courseId", authMiddleware, getLiveLecturesByCourse);
router.post("/join/:lectureId", authMiddleware, joinLecture);
router.post("/leave/:lectureId", authMiddleware, leaveLecture);
router.post("/start/:lectureId", authMiddleware, isTeacher, startLiveLecture);
router.post("/end/:lectureId", authMiddleware, isTeacher, endLiveLecture);
router.get("/participants/:lectureId", authMiddleware, getLectureParticipants);
router.post(
  "/:lectureId/participants/:userId/remove",
  authMiddleware,
  isTeacher,
  removeLectureParticipant,
);

router.get("/:lectureId", authMiddleware, getLiveLectureById);

export default router;
