import { audit, getAuth, handler, json, notFound, requireSuperAdmin, toId } from "@/lib/api";
import { deleteFile, saveFile } from "@/lib/files";
import { College } from "@/lib/models";

export const POST = handler<{ id: string }>(async (req, { params }) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const college = await College.findById(toId((await params).id, "College"));
  if (!college) throw notFound("College");
  const form = await req.formData();
  const saved = await saveFile(form.get("file") as File, { kind: "logo", college: college._id, public: true });
  if (college.logoFileId) await deleteFile(college.logoFileId);
  college.logoFileId = saved.fileId;
  await college.save();
  await audit(auth, "update_logo", "College", college._id, undefined, college._id);
  return json({ item: college });
});
