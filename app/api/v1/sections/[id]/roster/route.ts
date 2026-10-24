import { getAuth, handler, json } from "@/lib/api";
import { loadSection, rosterFor } from "@/lib/teaching";

export const GET = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  const { section, isInstructor } = await loadSection(auth, (await params).id);
  const students = await rosterFor(section._id);
  return json({ section, students, isInstructor });
});
