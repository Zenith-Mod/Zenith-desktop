/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// eslint-disable-next-line import/no-relative-packages
import type * as Vencord from "../../../../../src/Vencord.ts";
import type { CR } from "../types.mts";

export function autoFindEnum(this: typeof Vencord, source: CR.EnumSource) {
    let bestMatch: CR.EnumChanges | undefined;
    let lowestChangedCount = Infinity;

    const checked = new WeakSet();
    this.Webpack.find((exps: any) => {
        for (const name in exps) {
            let exp: unknown;
            // Some getters throw errors
            try {
                exp = exps[name];
            } catch {
                continue;
            }

            if (isValidEnum(exp) && !checked.has(exp)) {
                checked.add(exp);

                const changes = getEnumChanges(exp, source);
                const { changedCount } = changes;
                if (changedCount < lowestChangedCount) {
                    lowestChangedCount = changedCount;
                    bestMatch = changes;
                }
            }
        }

        return false;
    }, { isIndirect: true });

    return bestMatch;
}

export function isValidEnum(obj: unknown): obj is CR.EnumMembers {
    return typeof obj === "object"
        && obj !== null
        && !Array.isArray(obj);
}

export function getEnumChanges(obj: CR.EnumMembers, source: CR.EnumSource): CR.EnumChanges {
    const additions: CR.EnumMembers = {};
    const removals: CR.EnumMembers = { ...source };
    let unchangedCount = 0;
    let changedCount = 0;

    for (const key in obj) {
        // Ignore numeric enum reverse mapping
        if (parseFloat(key) === Number(key)) continue;

        // Some getters throw errors
        try {
            const value = obj[key]!;
            if (key in source && value === source[key]) {
                delete removals[key];
                unchangedCount++;
            } else {
                additions[key] = value;
                changedCount++;
            }
        } catch {
            changedCount = Infinity;
            break;
        }
    }

    changedCount += Object.keys(removals).length;

    return {
        additions,
        removals,
        unchangedCount,
        changedCount
    };
}
