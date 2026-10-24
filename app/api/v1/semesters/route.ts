import { collectionRoutes } from "@/lib/crud";
import { semesters } from "@/lib/resources";

const routes = collectionRoutes(semesters);
export const GET = routes.GET;
export const POST = routes.POST;
