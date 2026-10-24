import { itemRoutes } from "@/lib/crud";
import { courses } from "@/lib/resources";

const routes = itemRoutes(courses);
export const GET = routes.GET;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
