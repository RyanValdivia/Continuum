/**
 * Roll up per-person knowledge stats from flat (person, area) attribution rows.
 * An "area" is a critical knowledge node's label. A node is *sole-owned* when
 * its area is attributed to exactly one person across the whole org — those are
 * the single points of failure the bus factor and top-risks panel surface.
 *
 * Pure so it is unit-tested without a database; the repository hands over the
 * raw rows and calls this.
 */

export interface PersonAreaRow {
    personId: string;
    label: string;
}

export interface PersonKnowledgeStat {
    personId: string;
    attributedNodes: number;
    soleOwnedNodes: number;
    criticalAreas: string[];
}

export const aggregatePersonStats = (
    rows: PersonAreaRow[],
): PersonKnowledgeStat[] => {
    const ownersByArea = new Map<string, Set<string>>();
    for (const { personId, label } of rows) {
        const owners = ownersByArea.get(label) ?? new Set<string>();
        owners.add(personId);
        ownersByArea.set(label, owners);
    }

    const order: string[] = [];
    const byPerson = new Map<string, PersonAreaRow[]>();
    for (const row of rows) {
        const existing = byPerson.get(row.personId);
        if (existing) {
            existing.push(row);
        } else {
            byPerson.set(row.personId, [row]);
            order.push(row.personId);
        }
    }

    return order.map((personId) => {
        const personRows = byPerson.get(personId) ?? [];
        const areas: string[] = [];
        let soleOwnedNodes = 0;
        for (const { label } of personRows) {
            if (ownersByArea.get(label)?.size === 1) {
                soleOwnedNodes++;
                if (!areas.includes(label)) areas.push(label);
            }
        }
        return {
            personId,
            attributedNodes: personRows.length,
            soleOwnedNodes,
            criticalAreas: areas,
        };
    });
};
