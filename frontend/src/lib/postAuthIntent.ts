const safeCourseId = (value: string | null) =>
  value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;

export function authPath(path: "/login" | "/register", search: string): string {
  const source = new URLSearchParams(search);
  const target = new URLSearchParams();
  const courseId = safeCourseId(source.get("courseId"));
  const programme = source.get("programme")?.trim();
  if (courseId) target.set("courseId", courseId);
  if (programme && programme.length <= 120) target.set("programme", programme);
  const query = target.toString();
  return query ? `${path}?${query}` : path;
}

export function postAuthPath(role: string, search: string, fallback: string): string {
  if (role !== "STUDENT") return fallback;
  const courseId = safeCourseId(new URLSearchParams(search).get("courseId"));
  return courseId
    ? `/dashboard/student/dashboard?courseId=${encodeURIComponent(courseId)}&payment=1`
    : fallback;
}
