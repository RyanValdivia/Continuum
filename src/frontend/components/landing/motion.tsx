"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PropsWithChildren } from "react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Named queries reused by every block below. */
const QUERIES = {
    motion: "(prefers-reduced-motion: no-preference)",
    reduceMotion: "(prefers-reduced-motion: reduce)",
};

/**
 * The hero's opening. One timeline, sequenced with position parameters rather
 * than stacked delays, so the whole entrance can be retimed from one place.
 *
 * Elements opt in with `data-intro` (ordered) and `data-intro-aside`
 * (the right-hand column, which trails the copy slightly).
 */
export function GsapIntro({
    className,
    children,
}: PropsWithChildren<{ className?: string }>) {
    const root = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            mm.add(QUERIES, (context) => {
                const copy = gsap.utils.toArray<HTMLElement>("[data-intro]");
                const aside =
                    gsap.utils.toArray<HTMLElement>("[data-intro-aside]");
                const all = [...copy, ...aside];
                if (all.length === 0) return;

                if (context.conditions?.reduceMotion) {
                    gsap.set(all, { autoAlpha: 1, y: 0, scale: 1 });
                    return;
                }

                const tl = gsap.timeline({
                    defaults: { ease: "power3.out", duration: 0.8 },
                });

                tl.from(copy, {
                    y: 18,
                    autoAlpha: 0,
                    stagger: 0.08,
                }).from(
                    aside,
                    { y: 22, scale: 0.98, autoAlpha: 0, stagger: 0.12 },
                    // Overlap: the aside starts while the copy is still settling.
                    "-=0.55",
                );
            });

            return () => mm.revert();
        },
        { scope: root },
    );

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}

/**
 * Scroll entrance for a list of siblings, plus two optional flourishes that the
 * stage rail uses:
 *
 * - `[data-rail]`  — the connector line draws itself as you scroll past it
 *   (scrubbed, so it tracks the scroll instead of firing once).
 * - `[data-badge]` — the numeral pops in with a slight overshoot.
 *
 * Everything is transform + autoAlpha only, so it stays on the compositor.
 */
export function GsapReveal({
    selector = ":scope > *",
    y = 24,
    stagger = 0.09,
    className,
    children,
}: PropsWithChildren<{
    selector?: string;
    y?: number;
    stagger?: number;
    className?: string;
}>) {
    const root = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const el = root.current;
            if (!el) return;
            const mm = gsap.matchMedia();

            mm.add(QUERIES, (context) => {
                const items = gsap.utils.toArray<HTMLElement>(
                    el.querySelectorAll(selector),
                );
                const rails = gsap.utils.toArray<HTMLElement>("[data-rail]");
                const badges = gsap.utils.toArray<HTMLElement>("[data-badge]");

                if (context.conditions?.reduceMotion) {
                    gsap.set([...items, ...badges], {
                        autoAlpha: 1,
                        y: 0,
                        scale: 1,
                    });
                    gsap.set(rails, { scaleY: 1 });
                    return;
                }

                if (items.length > 0) {
                    gsap.from(items, {
                        y,
                        autoAlpha: 0,
                        duration: 0.6,
                        stagger,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: el,
                            start: "top 82%",
                            once: true,
                        },
                    });
                }

                for (const badge of badges) {
                    gsap.from(badge, {
                        scale: 0.6,
                        autoAlpha: 0,
                        duration: 0.5,
                        ease: "back.out(1.8)",
                        scrollTrigger: {
                            trigger: badge,
                            start: "top 88%",
                            once: true,
                        },
                    });
                }

                for (const rail of rails) {
                    gsap.fromTo(
                        rail,
                        { scaleY: 0 },
                        {
                            scaleY: 1,
                            transformOrigin: "top center",
                            ease: "none",
                            scrollTrigger: {
                                trigger: rail,
                                start: "top 88%",
                                end: "bottom 60%",
                                scrub: 0.6,
                            },
                        },
                    );
                }
            });

            return () => mm.revert();
        },
        { scope: root, dependencies: [selector, y, stagger] },
    );

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}

/**
 * A slow counter-scroll on a decorative panel. Scrubbed and small (a few dozen
 * pixels) — enough to give the section depth without the seasickness of real
 * parallax.
 */
export function GsapDrift({
    distance = 40,
    className,
    children,
}: PropsWithChildren<{ distance?: number; className?: string }>) {
    const root = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const el = root.current;
            if (!el) return;
            const mm = gsap.matchMedia();

            mm.add(QUERIES, (context) => {
                if (context.conditions?.reduceMotion) {
                    gsap.set(el, { y: 0 });
                    return;
                }
                gsap.fromTo(
                    el,
                    { y: distance / 2 },
                    {
                        y: -distance / 2,
                        ease: "none",
                        scrollTrigger: {
                            trigger: el,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: 1,
                        },
                    },
                );
            });

            return () => mm.revert();
        },
        { scope: root, dependencies: [distance] },
    );

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}
