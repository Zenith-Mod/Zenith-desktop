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

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { EmojiStore } from "@webpack/common";

export default definePlugin({
    name: "zipServerEmojis",
    description: "Adds a /zip-server-emojis slash command to download every emoji of a server as a zip file",
    authors: [Devs.Lumap],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "zip-server-emojis",
            description: "Download every emoji of a server as a zip file",
            options: [
                {
                    name: "server-id",
                    description: "The server you want to download emojis from.",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (opts, cmdCtx) => {
                const emojis = EmojiStore.getGuilds()[opts[0].value]?.emojis;
                if (!emojis) {
                    return sendBotMessage(cmdCtx.channel.id, {
                        content: "Server ID is invalid",
                    });
                }
                sendBotMessage(cmdCtx.channel.id, {
                    content: "This shouldn't take long...",
                });
                if (!window.JSZip) {
                    await fetch("https://unpkg.com/jszip/dist/jszip.min.js").then(r => r.text()).then(eval);
                }
                // @ts-ignore JSZip exists
                const zip = new JSZip();
                var waitForFetches = new Promise((resolve, _) => {
                    emojis.forEach(async (e, index, array) => {
                        const emoji = await fetch(`https://cdn.discordapp.com/emojis/${e.id}${e.animated ? ".gif" : ".png"}?size=96&quality=lossless`).then(res => res.blob());
                        zip.file(`${e.id}${e.animated ? ".gif" : ".png"}`, emoji);
                        if (index === array.length - 1) resolve(null);
                    });
                });
                waitForFetches.then(() => {
                    zip.generateAsync({ type: "blob" }).then(content => {
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(content);
                        link.download = "emojis.zip";
                        link.click();
                        link.remove();
                    });
                });
            },
        },
    ]
});
