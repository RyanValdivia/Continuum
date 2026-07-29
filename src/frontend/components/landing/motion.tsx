"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PropsWithChildren } from "react";
import { useLayoutEffect, useRef } from "react";
import { getActiveSceneIndex } from "./scene-progress";

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
                    const revealTargets = [...items, ...badges];
                    if (revealTargets.length > 0) {
                        gsap.set(revealTargets, {
                            autoAlpha: 1,
                            y: 0,
                            scale: 1,
                        });
                    }
                    if (rails.length > 0) {
                        gsap.set(rails, { scaleY: 1 });
                    }
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

type GsapPinnedScenesProps = PropsWithChildren<{
    className?: string;
    onSceneChange: (index: 0 | 1 | 2 | 3) => void;
    onSectionActiveChange?: (active: boolean) => void;
}>;

export function GsapPinnedScenes({
    className,
    onSectionActiveChange,
    onSceneChange,
    children,
}: GsapPinnedScenesProps) {
    const root = useRef<HTMLDivElement>(null);
    const activeScene = useRef<0 | 1 | 2 | 3>(0);
    const onSceneChangeRef = useRef(onSceneChange);
    const onSectionActiveChangeRef = useRef(onSectionActiveChange);

    useLayoutEffect(() => {
        onSceneChangeRef.current = onSceneChange;
        onSectionActiveChangeRef.current = onSectionActiveChange;
    }, [onSceneChange, onSectionActiveChange]);

    useGSAP(
        () => {
            const element = root.current;
            if (!element) return;

            const media = gsap.matchMedia();
            media.add(
                {
                    all: "all",
                    desktop: "(min-width: 64rem)",
                    reduceMotion: "(prefers-reduced-motion: reduce)",
                },
                (context) => {
                    const scenes =
                        gsap.utils.toArray<HTMLElement>("[data-full-scene]");
                    const progress = element.querySelector<HTMLElement>(
                        "[data-scene-progress]",
                    );
                    const { desktop, reduceMotion } = context.conditions ?? {};

                    if (!desktop || reduceMotion || scenes.length < 2) {
                        gsap.set(scenes, { clearProps: "all" });
                        if (progress) gsap.set(progress, { clearProps: "all" });
                        activeScene.current = 0;
                        onSceneChangeRef.current(0);
                        onSectionActiveChangeRef.current?.(false);
                        return;
                    }

                    gsap.set(scenes, { autoAlpha: 0, yPercent: 4 });
                    gsap.set(scenes[0], { autoAlpha: 1, yPercent: 0 });
                    if (progress) {
                        gsap.set(progress, {
                            scaleX: 0,
                            transformOrigin: "left center",
                        });
                    }

                    const duration = scenes.length;
                    const timeline = gsap.timeline({
                        onUpdate: () => {
                            const next = getActiveSceneIndex(
                                timeline.progress(),
                                scenes.length,
                            ) as 0 | 1 | 2 | 3;
                            if (next === activeScene.current) return;
                            activeScene.current = next;
                            onSceneChangeRef.current(next);
                        },
                        scrollTrigger: {
                            trigger: element,
                            start: "top top",
                            end: () =>
                                `+=${window.innerHeight * scenes.length}`,
                            pin: true,
                            scrub: 0.5,
                            invalidateOnRefresh: true,
                            onEnter: () =>
                                onSectionActiveChangeRef.current?.(true),
                            onEnterBack: () =>
                                onSectionActiveChangeRef.current?.(true),
                            onLeave: () =>
                                onSectionActiveChangeRef.current?.(false),
                            onLeaveBack: () =>
                                onSectionActiveChangeRef.current?.(false),
                        },
                    });

                    if (progress) {
                        timeline.to(
                            progress,
                            { scaleX: 1, duration, ease: "none" },
                            0,
                        );
                    }

                    for (let index = 1; index < scenes.length; index += 1) {
                        timeline
                            .to(
                                scenes[index - 1],
                                {
                                    autoAlpha: 0,
                                    yPercent: -3,
                                    duration: 0.28,
                                    ease: "power1.inOut",
                                },
                                index,
                            )
                            .fromTo(
                                scenes[index],
                                { autoAlpha: 0, yPercent: 3 },
                                {
                                    autoAlpha: 1,
                                    yPercent: 0,
                                    duration: 0.28,
                                    ease: "power1.inOut",
                                    immediateRender: false,
                                },
                                // Trails the outgoing panel rather than
                                // matching it: a full cross-dissolve leaves two
                                // headlines legible at once, and their differing
                                // heights centre them a line apart. Kept short
                                // so the copy is not still swapping while the
                                // apparatus is already well into the new scene.
                                "<0.12",
                            );
                    }
                },
            );

            return () => media.revert();
        },
        { scope: root },
    );

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}
