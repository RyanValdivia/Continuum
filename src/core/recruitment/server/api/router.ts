import { Elysia } from "elysia";
import { applyRoute } from "./routes/apply.route";
import { closeVacancyRoute } from "./routes/close-vacancy.route";
import { createVacancyRoute } from "./routes/create-vacancy.route";
import { getVacancyRoute } from "./routes/get-vacancy.route";
import { listPeopleRoute } from "./routes/list-people.route";
import { listVacanciesRoute } from "./routes/list-vacancies.route";
import { offboardPersonRoute } from "./routes/offboard-person.route";
import { regenerateTokenRoute } from "./routes/regenerate-token.route";

export const recruitmentRouter = new Elysia({ prefix: "/recruitment" })
    .use(listPeopleRoute)
    .use(offboardPersonRoute)
    .use(listVacanciesRoute)
    .use(createVacancyRoute)
    .use(getVacancyRoute)
    .use(closeVacancyRoute)
    .use(regenerateTokenRoute)
    .use(applyRoute);
