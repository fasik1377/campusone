import { z } from "zod";
import { audit, badRequest, forbidden, getAuth, handler, json, parseBody, requireModule, zs } from "@/lib/api";
import { logGradeAction } from "@/lib/grading";
import { GradeEntry } from "@/lib/models";
import { loadSection } from "@/lib/teaching";

const schema = z.object({ action: z.enum(["approve", "return", "publish"]), note: zs.str(500) });

/**
 * Explicit workflow commands (never a free status update):
 * submitted --approve (dept head / dean)--> approved --publish (registrar)--> published.
 * Reviewers may return submitted or approved sheets to the instructor.
 */
export const POST = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireModule(auth, "grading");
  const { section, inDepartment } = await loadSection(auth, (await params).id);
  const { action, note } = await parseBody(req, schema);
  const reviewer = auth.has("department_head", "dean") && inDepartment;

  if (action === "approve") {
    if (!reviewer) throw forbidden("Only the department head or dean can approve these grades.");
    if (section.gradeStatus !== "submitted") throw badRequest("Only submitted grades can be approved.");
    section.gradeStatus = "approved";
  } else if (action === "return") {
    if (!reviewer && !auth.has("registrar")) throw forbidden();
    if (section.gradeStatus !== "submitted" && section.gradeStatus !== "approved") throw badRequest("Only grades under review can be returned.");
    if (!note) throw badRequest("Tell the instructor why the grades are being returned.");
    section.gradeStatus = "returned";
  } else {
    if (!auth.has("registrar")) throw forbidden("Only the registrar can publish grades.");
    if (section.gradeStatus !== "approved") throw badRequest("Grades must be approved by the department before publication.");
    await GradeEntry.updateMany({ section: section._id }, { published: true });
    section.gradeStatus = "published";
  }
  logGradeAction(section, auth, section.gradeStatus, note);
  await section.save();
  await audit(auth, `grades_${section.gradeStatus}`, "Section", section._id, { note });
  return json({ ok: true, gradeStatus: section.gradeStatus });
});
