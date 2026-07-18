import { Elysia } from "elysia";
import { generatePlanRoute } from "./routes/generate-plan.route";
import { getMyOnboardingRoute } from "./routes/get-my-onboarding.route";
import { listTargetsRoute } from "./routes/list-targets.route";
import { toggleTaskRoute } from "./routes/toggle-task.route";

export const onboardingRouter = new Elysia({ prefix: "/onboarding" })
    .use(getMyOnboardingRoute)
    .use(listTargetsRoute)
    .use(generatePlanRoute)
    .use(toggleTaskRoute);
