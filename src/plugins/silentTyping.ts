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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { get, set } from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const KEY = "SilentTyping_ENABLED";

export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven, Devs.dzshn],
    description: "Hide that you are typing",
    patches: [{
        find: "startTyping:",
        replacement: {
            match: /startTyping:.+?,stop/,
            replace: "startTyping:$self.startTyping,stop"
        }
    }],
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "silenttype",
        description: "Toggle whether you're hiding that you're typing or not.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "value",
                description: "whether to hide or not what you're typing (default is toggle)",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            }
        ],
        execute: async (args, ctx) => {
            const value = !!findOption(args, "value", !await get(KEY));
            await set(KEY, value);
            sendBotMessage(ctx.channel.id, {
                content: value ? "Silent typing enabled!" : "Silent typing disabled!",
            });
        }
    }],

    async startTyping(channelId: string) {
        if (await get(KEY)) return;
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    }
});
