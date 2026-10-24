import { itemRoutes } from "@/lib/crud";
import { semesters } from "@/lib/resources";

const routes = itemRoutes(semesters);
export const GET = routes.GET;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
