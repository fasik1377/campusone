import { audit, getAuth, handler, json, notFound, requireCollegeRole } from "@/lib/api";
import { deleteFile, saveFile } from "@/lib/files";
import { College } from "@/lib/models";

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const collegeId = requireCollegeRole(auth, "college_admin");
  const college = await College.findById(collegeId);
  if (!college) throw notFound("College");
  const form = await req.formData();
  const saved = await saveFile(form.get("file") as File, { kind: "logo", college: college._id, public: true });
  if (college.logoFileId) await deleteFile(college.logoFileId);
  college.logoFileId = saved.fileId;
  await college.save();
  await audit(auth, "update_logo", "College", college._id);
  return json({ item: college });
});
