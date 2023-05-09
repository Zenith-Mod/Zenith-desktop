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

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    receivedInput: {
        type: OptionType.STRING,
        description: "input language for received messages",
        default: "auto",
    },
    receivedOutput: {
        type: OptionType.STRING,
        description: "output language for received messages",
        default: "en",
    },
    sentInput: {
        type: OptionType.STRING,
        description: "input language for sent messages",
        default: "auto",
    },
    sentOutput: {
        type: OptionType.STRING,
        description: "output language for sent messages",
        default: "en",
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "automatically translate your messages before sending",
        default: false
    }
});
