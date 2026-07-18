import { Elysia } from "elysia";
import { listPeopleRoute } from "./routes/list-people.route";
import { offboardPersonRoute } from "./routes/offboard-person.route";

export const recruitmentRouter = new Elysia({ prefix: "/recruitment" })
    .use(listPeopleRoute)
    .use(offboardPersonRoute);
