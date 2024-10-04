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

import type { ChannelRecord, MessageRecord } from "@vencord/discord-types";
import type { FunctionComponent, ReactNode } from "react";

interface DecorationProps {
    author: {
        /**
         * Will be username if the user has no nickname
         */
        nick: string;
        iconRoleId: string;
        guildMemberAvatar: string;
        colorRoleName: string;
        colorString: string;
    };
    channel: ChannelRecord;
    compact: boolean;
    decorations: {
        /**
         * Element for the [BOT] tag if there is one
         */
        0: ReactNode;
        /**
         * Other decorations (including ones added with this api)
         */
        1: ReactNode[];
    };
    message: MessageRecord;
    [key: string]: any;
}
export type Decoration = FunctionComponent<DecorationProps>;

export const decorations = new Map<string, Decoration>();

export function addDecoration(identifier: string, decoration: Decoration) {
    decorations.set(identifier, decoration);
}

export function removeDecoration(identifier: string) {
    decorations.delete(identifier);
}

export function __addDecorationsToMessage(props: DecorationProps) {
    return Array.from(decorations.values(), decoration => decoration(props));
}
