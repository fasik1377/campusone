import { cookies } from "next/headers";
import { z } from "zod";
import { forbidden, getAuth, handler, json, parseBody, zs } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export const POST = handler(async (req) => {
  const auth = await getAuth(req);
  const { collegeId } = await parseBody(req, z.object({ collegeId: zs.id }));
  if (!auth.user.roles.some((r) => String(r.college) === collegeId)) throw forbidden("You have no role in that college.");
  (await cookies()).set(SESSION_COOKIE, await signSession({ uid: String(auth.userId), cid: collegeId }), sessionCookieOptions());
  return json({ ok: true });
});
