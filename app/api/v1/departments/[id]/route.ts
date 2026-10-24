import { itemRoutes } from "@/lib/crud";
import { departments } from "@/lib/resources";

const routes = itemRoutes(departments);
export const GET = routes.GET;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
