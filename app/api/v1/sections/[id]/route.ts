import { itemRoutes } from "@/lib/crud";
import { sections } from "@/lib/resources";

const routes = itemRoutes(sections);
export const GET = routes.GET;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
