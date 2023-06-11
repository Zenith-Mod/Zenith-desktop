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

import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings, Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, Parser, Text } from "@webpack/common";
import { Message } from "discord-types/general";


const CopyIcon = () => {
    return <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="22" height="22">
        <path d="M12.9297 3.25007C12.7343 3.05261 12.4154 3.05226 12.2196 3.24928L11.5746 3.89824C11.3811 4.09297 11.3808 4.40733 11.5739 4.60245L16.5685 9.64824C16.7614 9.84309 16.7614 10.1569 16.5685 10.3517L11.5739 15.3975C11.3808 15.5927 11.3811 15.907 11.5746 16.1017L12.2196 16.7507C12.4154 16.9477 12.7343 16.9474 12.9297 16.7499L19.2604 10.3517C19.4532 10.1568 19.4532 9.84314 19.2604 9.64832L12.9297 3.25007Z" />
        <path d="M8.42616 4.60245C8.6193 4.40733 8.61898 4.09297 8.42545 3.89824L7.78047 3.24928C7.58466 3.05226 7.26578 3.05261 7.07041 3.25007L0.739669 9.64832C0.5469 9.84314 0.546901 10.1568 0.739669 10.3517L7.07041 16.7499C7.26578 16.9474 7.58465 16.9477 7.78047 16.7507L8.42545 16.1017C8.61898 15.907 8.6193 15.5927 8.42616 15.3975L3.43155 10.3517C3.23869 10.1569 3.23869 9.84309 3.43155 9.64824L8.42616 4.60245Z" />
    </svg>;
};

function sortObject<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).sort(([k1], [k2]) => k1.localeCompare(k2))) as T;
}

function cleanMessage(msg: Message) {
    const clone = sortObject(JSON.parse(JSON.stringify(msg)));
    for (const key in clone.author) {
        switch (key) {
            case "id":
            case "username":
            case "usernameNormalized":
            case "discriminator":
            case "avatar":
            case "bot":
            case "system":
            case "publicFlags":
                break;
            default:
                // phone number, email, etc
                delete clone.author[key];
        }
    }

    // message logger added properties
    const cloneAny = clone as any;
    delete cloneAny.editHistory;
    delete cloneAny.deleted;
    cloneAny.attachments?.forEach(a => delete a.deleted);

    return clone;
}

function CodeBlock(props: { content: string, lang: string; }) {
    return (
        // make text selectable
        <div style={{ userSelect: "text" }}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

function openViewRawModal(msg: Message) {
    msg = cleanMessage(msg);
    const msgJson = JSON.stringify(msg, null, 4);

    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>View Raw</Text>
                    <ModalCloseButton onClick={() => closeModal(key)} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        {!!msg.content && (
                            <>
                                <Forms.FormTitle tag="h5">Content</Forms.FormTitle>
                                <CodeBlock content={msg.content} lang="" />
                                <Forms.FormDivider className={Margins.bottom20} />
                            </>
                        )}

                        <Forms.FormTitle tag="h5">Message Data</Forms.FormTitle>
                        <CodeBlock content={msgJson} lang="json" />
                    </div>
                </ModalContent >
                <ModalFooter>
                    <Flex cellSpacing={10}>
                        <Button onClick={() => copyWithToast(msgJson, "Message data copied to clipboard!")}>
                            Copy Message JSON
                        </Button>
                        <Button onClick={() => copyWithToast(msg.content, "Content copied to clipboard!")}>
                            Copy Raw Content
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalRoot >
        </ErrorBoundary >
    ));
}

const settings = definePluginSettings({
    clickMethod: {
        description: "Click method",
        type: OptionType.SELECT,
        options: [
            { label: "Right Click", value: "Right", default: true },
            { label: "Left Click", value: "Left" }
        ]
    }
});

export default definePlugin({
    name: "ViewRaw",
    description: "Copy and view the raw content/data of any message.",
    authors: [Devs.KingFish, Devs.Ven, Devs.rad],
    dependencies: ["MessagePopoverAPI"],
    settings,

    start() {
        addButton("ViewRaw", msg => {
            const handleClick = () => {
                if (Settings.plugins.ViewRaw.clickMethod === "Left") {
                    copyWithToast(msg.content);
                } else {
                    openViewRawModal(msg);
                }
            };

            const handleContextMenu = e => {
                if (Settings.plugins.ViewRaw.clickMethod === "Right") {
                    e.preventDefault();
                    e.stopPropagation();
                    copyWithToast(msg.content);
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    openViewRawModal(msg);
                }
            };

            const label = Settings.plugins.ViewRaw.clickMethod === "Left"
                ? "Copy Raw (Left Click) / View Raw (Right Click)"
                : "View Raw (Left Click) / Copy Raw (Right Click)";

            return {
                label: label,
                icon: CopyIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        });
    },

    stop() {
        removeButton("CopyRawMessage");
    }
});
