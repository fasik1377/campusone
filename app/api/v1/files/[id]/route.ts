import { forbidden, getAuth, handler, notFound, toId } from "@/lib/api";
import { findFile, readFile } from "@/lib/files";
import { Application, Student } from "@/lib/models";

export const GET = handler<{ id: string }>(async (req, { params }) => {
  const id = toId((await params).id, "File");
  const file = await findFile(id);
  if (!file) throw notFound("File");

  if (!file.metadata.public) {
    const auth = await getAuth(req);
    const sameCollege = String(auth.collegeId) === String(file.metadata.college);
    const staff = sameCollege && auth.has("registrar", "admissions_officer", "college_admin");
    let ownApplication = false;
    if (!staff && sameCollege && auth.has("student")) {
      // A student may open documents from their own admission application.
      const applicationIds = await Application.find({ "documents.fileId": id, college: auth.collegeId }).distinct("_id");
      ownApplication = !!(await Student.exists({ user: auth.userId, application: { $in: applicationIds } }));
    }
    if (!staff && !ownApplication) throw forbidden();
  }

  const data = await readFile(id);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.metadata.contentType,
      "Content-Disposition": `${file.metadata.public ? "inline" : "attachment"}; filename="${file.filename}"`,
      "Cache-Control": file.metadata.public ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
