import { handler, json } from "@/lib/api";
import { Announcement, College, Program } from "@/lib/models";
import { loadSiteContent } from "@/lib/site";

/** Public website content, the featured college, and the latest public news. */
export const GET = handler(async () => {
  const content = await loadSiteContent();
  const active = await College.find({ status: "active" }).select("_id name code slug").lean();
  const activeIds = active.map((c) => c._id);

  let featured = null;
  const pick = (content.featuredCollege && active.find((c) => c.slug === content.featuredCollege)) || null;
  const featuredDoc = pick
    ? await College.findById(pick._id).select("name code slug tagline address logoFileId coverImage brandColor enabledModules").lean()
    : await College.findOne({ status: "active", coverImage: { $nin: [null, ""] } }).select("name code slug tagline address logoFileId coverImage brandColor enabledModules").lean();
  if (featuredDoc) {
    const [programCount, openCount] = await Promise.all([
      Program.countDocuments({ college: featuredDoc._id }),
      Program.countDocuments({ college: featuredDoc._id, admissionOpen: true }),
    ]);
    featured = { ...featuredDoc, programCount, admissionsOpen: openCount > 0 && featuredDoc.enabledModules.includes("admissions") };
  }

  // Platform-wide public posts plus public posts from active colleges.
  const news = await Announcement.find({ isPublic: true, $or: [{ college: null }, { college: { $exists: false } }, { college: { $in: activeIds } }] })
    .select("title body createdAt college")
    .populate("college", "name slug")
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  return json({ content, featured, news });
});
