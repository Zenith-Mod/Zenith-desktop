/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always show all message buttons no matter if you are holding the shift key or not.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: ".Messages.MESSAGE_UTILITIES_A11Y_LABEL",
            replacement: {
                match: /getTODOMessages\(\).+?isExpanded:(\i),/,
                replace: (m, isExpanded) => {
                    const shiftKeyDownRegex = canonicalizeMatch(RegExp(`(?<=,${isExpanded}=)\\i(?=&&)`));

                    const shiftKeyDown = m.match(shiftKeyDownRegex)?.[0];
                    if (shiftKeyDown) {
                        const shiftKeyDownOverrideRegex = canonicalizeMatch(RegExp(`(?<=,${shiftKeyDown}=).+?(?=,\\i=)`));
                        m = m.replace(shiftKeyDownOverrideRegex, "true");
                    }

                    return m;
                }
            }
        }
    ]
});
