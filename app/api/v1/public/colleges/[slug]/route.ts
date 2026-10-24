import { handler, json, notFound } from "@/lib/api";
import { Announcement, College, Department, Program } from "@/lib/models";

export const GET = handler<{ slug: string }>(async (_req, { params }) => {
  const { slug } = await params;
  const college = await College.findOne({ slug: String(slug).toLowerCase(), status: "active" })
    .select("name code slug tagline description email phone address website logoFileId coverImage brandColor enabledModules")
    .lean();
  if (!college) throw notFound("College");
  const [departments, programs, announcements] = await Promise.all([
    Department.find({ college: college._id }).select("name code description").sort({ name: 1 }).lean(),
    Program.find({ college: college._id })
      .select("name code level durationYears totalCredits description admissionRequirements admissionOpen department")
      .populate("department", "name")
      .sort({ name: 1 })
      .lean(),
    Announcement.find({ college: college._id, isPublic: true }).select("title body createdAt").sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  return json({
    item: college,
    departments,
    programs,
    announcements,
    admissionsEnabled: college.enabledModules.includes("admissions"),
  });
});
