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

import type { ApplicationCommandOptionType, ApplicationCommandType, ChannelRecord, GuildRecord } from "@vencord/discord-types";
import type { Promisable } from "type-fest";

export interface CommandContext {
    channel: ChannelRecord;
    guild?: GuildRecord;
}

export const enum ApplicationCommandInputType {
    BUILT_IN = 0,
    BUILT_IN_TEXT = 1,
    BUILT_IN_INTEGRATION = 2,
    BOT = 3,
    PLACEHOLDER = 4,
}

export interface Option {
    name: string;
    displayName?: string;
    type: ApplicationCommandOptionType;
    description: string;
    displayDescription?: string;
    required?: boolean;
    options?: Option[];
    choices?: ChoicesOption[];
}

export interface ChoicesOption {
    label: string;
    value: string;
    name: string;
    displayName?: string;
}

export interface CommandReturnValue {
    content: string;
    /** TODO: implement */
    cancel?: boolean;
}

export interface Argument {
    type: ApplicationCommandOptionType;
    name: string;
    value: string;
    focused: undefined;
    options: Argument[];
}

export interface Command {
    id?: string;
    applicationId?: string;
    type?: ApplicationCommandType;
    inputType?: ApplicationCommandInputType;
    plugin?: string;
    isVencordCommand?: boolean;

    name: string;
    untranslatedName?: string;
    displayName?: string;
    description: string;
    untranslatedDescription?: string;
    displayDescription?: string;

    options?: Option[];
    predicate?: (ctx: CommandContext) => boolean;

    execute: (args: Argument[], ctx: CommandContext) => Promisable<void | CommandReturnValue>;
}
