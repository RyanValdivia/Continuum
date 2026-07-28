import { LandingComparison } from "./comparison";
import { LandingContinuity } from "./continuity";
import { LandingCta } from "./cta";
import { LandingDemo } from "./demo/demo-section";
import { LandingFooter } from "./footer";
import { LandingHero } from "./hero";
import { LandingNav } from "./nav";
import { LandingSources } from "./sources";
import { LandingStages } from "./stages";

/**
 * The marketing surface pins the dark scheme: `dark` re-declares the same
 * shadcn variables the rest of the app uses, so the landing and the product
 * share one palette, one radius and one type stack — it just runs on the night
 * canvas regardless of the visitor's theme.
 *
 * Rhythm follows the hum-07 reference: hero → numbered stage rail → centred
 * band → content → content → closer → footer.
 */
export function Landing() {
    return (
        <div className="dark lumen-grid min-h-svh bg-background font-sans text-foreground">
            <LandingNav />
            <main>
                <LandingHero />
                <LandingStages />
                <LandingContinuity />
                <LandingDemo />
                <LandingSources />
                <LandingComparison />
                <LandingCta />
            </main>
            <LandingFooter />
        </div>
    );
}
