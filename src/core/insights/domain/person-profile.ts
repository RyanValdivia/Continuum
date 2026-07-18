/**
 * Person-profile shaping — pure grouping of a person's attributed know-how
 * nodes into the decision / process / concept sections the profile renders.
 * Documents are NOT grouped here; they come from `source_documents`.
 */

export interface ProfileNodeInput {
    type: string;
    label: string;
    summary: string | null;
}

export interface ProfileItem {
    label: string;
    summary: string | null;
}

export interface ProfileGroup {
    count: number;
    items: ProfileItem[];
}

export interface ProfileGroups {
    decisions: ProfileGroup;
    processes: ProfileGroup;
    concepts: ProfileGroup;
}

const KNOW_HOW = {
    decision: "decisions",
    process: "processes",
    concept: "concepts",
} as const;

/** Group know-how nodes by type; each group keeps the full count and the first
 *  `limitPerType` items for display. `document` nodes are ignored. */
export const groupProfileNodes = (
    nodes: ProfileNodeInput[],
    limitPerType = 5,
): ProfileGroups => {
    const groups: ProfileGroups = {
        decisions: { count: 0, items: [] },
        processes: { count: 0, items: [] },
        concepts: { count: 0, items: [] },
    };

    for (const node of nodes) {
        const key = KNOW_HOW[node.type as keyof typeof KNOW_HOW];
        if (!key) continue;
        const group = groups[key];
        group.count++;
        if (group.items.length < limitPerType) {
            group.items.push({ label: node.label, summary: node.summary });
        }
    }

    return groups;
};

export interface PersonProfileMember {
    memberId: string;
    name: string;
    email: string;
    role: string;
}

export interface ProfileDocument {
    title: string;
    url: string | null;
}

export interface PersonProfile {
    person: PersonProfileMember;
    counts: {
        decisions: number;
        processes: number;
        concepts: number;
        documents: number;
    };
    decisions: ProfileItem[];
    processes: ProfileItem[];
    concepts: ProfileItem[];
    documents: ProfileDocument[];
    /** False when nothing is captured yet — the UI shows a capture prompt. */
    hasKnowledge: boolean;
}
