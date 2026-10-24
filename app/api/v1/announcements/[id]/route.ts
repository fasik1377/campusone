import { audit, forbidden, getAuth, handler, json, notFound, toId } from "@/lib/api";
import { Announcement } from "@/lib/models";

export const DELETE = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const item = await Announcement.findById(toId((await params).id, "Announcement"));
  if (!item) throw notFound("Announcement");
  const allowed = item.college
    ? String(item.college) === String(auth.collegeId) && auth.has("college_admin", "registrar", "dean", "department_head")
    : auth.isSuperAdmin;
  if (!allowed) throw forbidden();
  await item.deleteOne();
  await audit(auth, "delete_announcement", "Announcement", item._id, { title: item.title }, item.college);
  return json({ ok: true });
});
