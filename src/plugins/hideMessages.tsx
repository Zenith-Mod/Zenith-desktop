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

import { get, set } from "@api/DataStore";
import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { MessageInvisible, MessageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore } from "@webpack/common";

let style: HTMLStyleElement;

const KEY = "HideMessages_HiddenIds";

let hiddenMessages = new Set<string>();
const getHiddenMessages = async () => {
    const set = await get(KEY);
    hiddenMessages = set ?? new Set();
    return hiddenMessages;
};

const saveHiddenMessages = async (ids: Set<string>) => {
    await set(KEY, ids);
};

const clearHiddenMessages = () => saveHiddenMessages(new Set<string>());

async function buildCss() {
    const ids = await getHiddenMessages();
    const elements = [...ids].map(messageKey => {
        const [channel_id, message_id] = JSON.parse(messageKey);
        return settings.store.hideEntireMessage ? `#chat-messages-${channel_id}-${message_id}` : `#message-content-${message_id}`;
    }).join(",");
    style.textContent = settings.store.hideEntireMessage ? `
    :is(${elements}) {
        /* important is not necessary, but add it to make sure bad themes won't break it */
        display: none !important;
    }
    ` : `
    :is(${elements}) span, :is(${elements}) code, :is(${elements}) ul  {
        /* important is not necessary, but add it to make sure bad themes won't break it */
        display: none !important;
    }
    :is(${elements})::after {
        content: "Message hidden";
        color: var(--text-muted);
        font-size: 80%;
    }
    `;
}

const settings = definePluginSettings({
    hideEntireMessage: {
        type: OptionType.BOOLEAN,
        description: "Hide the entire message box instead of just the message content",
        default: false,
        onChange: buildCss
    },
    saveHiddenMessages: {
        type: OptionType.BOOLEAN,
        description: "Persist restarts",
        default: false
    },
    clearHiddenMessages: {
        type: OptionType.COMPONENT,
        description: "Clear hidden messages",
        component: () => (
            <Button onClick={() => {
                clearHiddenMessages();
                buildCss();
            }}>
                Clear hidden messages
            </Button>
        )
    },
});

export default definePlugin({
    name: "HideMessages",
    description: "Hide messages via a hover button",
    authors: [Devs.Ushie],
    dependencies: ["MessagePopoverAPI"],
    settings,

    async start() {
        if (!settings.store.saveHiddenMessages)
            clearHiddenMessages();
        style = document.createElement("style");
        style.id = "VencordHideMessages";
        document.head.appendChild(style);

        await getHiddenMessages();
        buildCss();

        addButton("HideMessages", msg => {
            if (!msg.content.length && !settings.store.hideEntireMessage) return null;

            const message = [msg.channel_id, msg.id];
            const messageKey = JSON.stringify(message);
            const isHidden = hiddenMessages.has(messageKey);

            return {
                label: isHidden ? "Show Message" : "Hide Message",
                icon: isHidden ? MessageVisible : MessageInvisible,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => this.toggleHide(msg.channel_id, msg.id)
            };
        });
    },

    stop() {
        style.remove();
        if (!settings.store.saveHiddenMessages)
            clearHiddenMessages();
        removeButton("HideMessages");
    },

    async toggleHide(channel_id: string, message_id: string) {
        const ids = await getHiddenMessages();
        const message = [channel_id, message_id];
        const messageKey = JSON.stringify(message);
        if (!ids.delete(messageKey))
            ids.add(messageKey);
        await saveHiddenMessages(ids);
        buildCss();
    }
});
