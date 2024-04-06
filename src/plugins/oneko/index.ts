/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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


import { definePluginSettings } from "@api/Settings";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
export const settings = definePluginSettings({
    speed: {
        description: "Speed of Da Cat :3",
        type: OptionType.NUMBER,
        default: 10,
        isValid: (value: number) => {
            if (value && value < 0) return "The number must be bigger than 0";
            return true;
        },
        onChange: () => {
            // note: cant call the start() function from here. so i just copy pasted it (This was pointed out in the last commit i made. So this is to just clear stuff up for any future devs that work on this :D )
            if (Settings.plugins.oneko.enabled) {
                document.getElementById("oneko")?.remove();
                fetch("https://raw.githubusercontent.com/adryd325/oneko.js/8fa8a1864aa71cd7a794d58bc139e755e96a236c/oneko.js")
                    .then(x => x.text())
                    .then(s => s.replace("const nekoSpeed = 10;", `const nekoSpeed = ${onekoSettings.store.speed};`))
                    .then(s => s.replace("./oneko.gif", "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif")
                        .replace("(isReducedMotion)", "(false)"))
                    .then(eval);
            }
            return;
        }
    },
});

export default definePlugin({
    name: "oneko",
    description: "cat follow mouse (real)",
    // Listing adryd here because this literally just evals her script
    authors: [Devs.Ven, Devs.adryd, Devs.varram],

    settings: onekoSettings,

    start() {
        fetch("https://raw.githubusercontent.com/adryd325/oneko.js/8fa8a1864aa71cd7a794d58bc139e755e96a236c/oneko.js")
            .then(x => x.text())
            .then(s => s.replace("const nekoSpeed = 10;", `const nekoSpeed = ${onekoSettings.store.speed};`))
            .then(s => s.replace("./oneko.gif", "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif")
                .replace("(isReducedMotion)", "(false)"))
            .then(eval);
    },

    stop() {
        document.getElementById("oneko")?.remove();
    }
});
