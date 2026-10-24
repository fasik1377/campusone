import { itemRoutes } from "@/lib/crud";
import { programs } from "@/lib/resources";

const routes = itemRoutes(programs);
export const GET = routes.GET;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
