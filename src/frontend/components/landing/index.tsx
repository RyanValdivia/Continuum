import { LandingComparison } from "./comparison";
import { LandingCta } from "./cta";
import { LandingFooter } from "./footer";
import { LandingHero } from "./hero";
import { LandingHowItWorks } from "./how-it-works";
import { LandingNav } from "./nav";
import { LandingProblem } from "./problem";

export function Landing() {
    return (
        <div className="min-h-svh bg-background">
            <LandingNav />
            <main>
                <LandingHero />
                <LandingProblem />
                <LandingHowItWorks />
                <LandingComparison />
                <LandingCta />
            </main>
            <LandingFooter />
        </div>
    );
}
