import { collectionRoutes } from "@/lib/crud";
import { programs } from "@/lib/resources";

const routes = collectionRoutes(programs);
export const GET = routes.GET;
export const POST = routes.POST;
