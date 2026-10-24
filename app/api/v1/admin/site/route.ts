import { audit, badRequest, getAuth, handler, json, parseBody, requireSuperAdmin } from "@/lib/api";
import { College, SiteSettings } from "@/lib/models";
import { loadSiteContent, siteContentSchema } from "@/lib/site";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content";

export const GET = handler(async (req) => {
  requireSuperAdmin(await getAuth(req));
  return json({ content: await loadSiteContent(), defaults: DEFAULT_SITE_CONTENT });
});

export const PUT = handler(async (req) => {
  const auth = await getAuth(req);
  requireSuperAdmin(auth);
  const content = await parseBody(req, siteContentSchema);
  if (content.featuredCollege && !(await College.exists({ slug: content.featuredCollege }))) {
    throw badRequest("The featured college was not found.");
  }
  if (content.announcementBar.enabled && !content.announcementBar.text) {
    throw badRequest("Enter the announcement bar text, or turn the bar off.");
  }
  await SiteSettings.findOneAndUpdate({ key: "site" }, { content, updatedBy: auth.user.name }, { upsert: true });
  await audit(auth, "update_website_content", "SiteSettings", "site", { fields: Object.keys(content) }, null);
  return json({ content });
});
