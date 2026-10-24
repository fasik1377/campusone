import { collectionRoutes } from "@/lib/crud";
import { courses } from "@/lib/resources";

const routes = collectionRoutes(courses);
export const GET = routes.GET;
export const POST = routes.POST;
