import { collectionRoutes } from "@/lib/crud";
import { sections } from "@/lib/resources";

const routes = collectionRoutes(sections);
export const GET = routes.GET;
export const POST = routes.POST;
