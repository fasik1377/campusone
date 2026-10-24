import { collectionRoutes } from "@/lib/crud";
import { departments } from "@/lib/resources";

const routes = collectionRoutes(departments);
export const GET = routes.GET;
export const POST = routes.POST;
