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

import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants.js";
import { classes } from "@utils/misc";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType } from "@utils/types";
import type { ChannelRecord, MessageRecord } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import {
    Button,
    ChannelStore,
    Constants,
    GuildStore,
    IconUtils,
    MarkupUtils,
    MessageStore,
    Permissions,
    PermissionStore,
    RestAPI,
    Text,
    UserStore
} from "@webpack/common";
import type { ReactElement } from "react";

const messageCache = new Map<string, {
    message?: MessageRecord;
    fetched: boolean;
}>();

const Embed = findComponentByCodeLazy(".inlineMediaEmbed");
const AutoModEmbed = findComponentByCodeLazy(".withFooter]:", "childrenMessageContent:");
const ChannelMessage = findComponentByCodeLazy("childrenExecutedCommand:", ".hideAccessories");

const SearchResultClasses: Record<string, string> = findByPropsLazy("message", "searchResult");
const EmbedClasses: Record<string, string> = findByPropsLazy("embedAuthorIcon", "embedAuthor", "embedAuthor");

const MessageDisplayCompact = getUserSettingLazy("textAndImages", "messageDisplayCompact")!;

const messageLinkRegex = /(?<!<)https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(?:\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/g;
const tenorRegex = /^https:\/\/(?:www\.)?tenor\.com\//;

interface Attachment {
    height: number;
    width: number;
    url: string;
    proxyURL?: string;
}

interface MessageEmbedProps {
    message: MessageRecord;
    channel: ChannelRecord;
}

const messageFetchQueue = new Queue();

const settings = definePluginSettings({
    messageBackgroundColor: {
        description: "Background color for messages in rich embeds",
        type: OptionType.BOOLEAN
    },
    automodEmbeds: {
        description: "Use automod embeds instead of rich embeds (smaller but less info)",
        type: OptionType.SELECT,
        options: [
            {
                label: "Always use automod embeds",
                value: "always"
            },
            {
                label: "Prefer automod embeds, but use rich embeds if some content can't be shown",
                value: "prefer"
            },
            {
                label: "Never use automod embeds",
                value: "never",
                default: true
            }
        ]
    },
    listMode: {
        description: "Whether to use ID list as blacklist or whitelist",
        type: OptionType.SELECT,
        options: [
            {
                label: "Blacklist",
                value: "blacklist",
                default: true
            },
            {
                label: "Whitelist",
                value: "whitelist"
            }
        ]
    },
    idList: {
        description: "Guild/channel/user IDs to blacklist or whitelist (separate with comma)",
        type: OptionType.STRING,
        default: ""
    },
    clearMessageCache: {
        type: OptionType.COMPONENT,
        description: "Clear the linked message cache",
        component: () => (
            <Button onClick={() => { messageCache.clear(); }}>
                Clear the linked message cache
            </Button>
        )
    }
});

async function fetchMessage(channelId: string, messageId: string) {
    const cached = messageCache.get(messageId);
    if (cached) return cached.message;

    messageCache.set(messageId, { fetched: false });

    const res = await RestAPI.get({
        url: Constants.Endpoints.MESSAGES(channelId),
        query: {
            limit: 1,
            around: messageId
        },
        retries: 2
    }).catch(() => null);

    const msg = res?.body?.[0];
    if (!msg) return;

    const message = MessageStore.getMessages(msg.channel_id).receiveMessage(msg).get(msg.id);
    if (!message) return;

    messageCache.set(message.id, {
        message,
        fetched: true
    });

    return message;
}


function getImages(message: MessageRecord) {
    const attachments: Attachment[] = [];

    for (const { content_type, height, width, url, proxy_url } of message.attachments) {
        if (content_type?.startsWith("image/"))
            attachments.push({
                height: height!,
                width: width!,
                url: url,
                proxyURL: proxy_url
            });
    }

    for (const { type, image, thumbnail, url } of message.embeds) {
        if (type === "image")
            attachments.push({ ...(image ?? thumbnail!) });
        else if (url && type === "gifv" && !tenorRegex.test(url))
            attachments.push({
                height: thumbnail!.height,
                width: thumbnail!.width,
                url
            });
    }

    return attachments;
}

function noContent(attachments: number, embeds: number) {
    if (!attachments && !embeds)
        return "";
    if (!attachments)
        return `[no content, ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
    if (!embeds)
        return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""}]`;
    return `[no content, ${attachments} attachment${attachments !== 1 ? "s" : ""} and ${embeds} embed${embeds !== 1 ? "s" : ""}]`;
}

function requiresRichEmbed(message: MessageRecord) {
    if (message.components.length) return true;
    if (message.attachments.some(a => !a.content_type?.startsWith("image/"))) return true;
    if (message.embeds.some(e => e.type !== "image" && (e.type !== "gifv" || tenorRegex.test(e.url!)))) return true;

    return false;
}

function computeWidthAndHeight(width: number, height: number) {
    const maxWidth = 400;
    const maxHeight = 300;

    if (width > height) {
        const adjustedWidth = Math.min(width, maxWidth);
        return { width: adjustedWidth, height: Math.round(height / (width / adjustedWidth)) };
    }

    const adjustedHeight = Math.min(height, maxHeight);
    return { width: Math.round(width / (height / adjustedHeight)), height: adjustedHeight };
}

function withEmbeddedBy(message: MessageRecord, embeddedBy: string[]) {
    return new Proxy(message, {
        get(_, prop) {
            if (prop === "vencordEmbeddedBy") return embeddedBy;
            // https://github.com/microsoft/TypeScript/issues/29055
            return Reflect.get(...arguments as any as Parameters<ProxyHandler<MessageRecord>["get"] & {}>);
        }
    });
}

function MessageEmbedAccessory({ message }: { message: MessageRecord & { vencordEmbeddedBy?: string[]; }; }) {
    const embeddedBy: string[] = message.vencordEmbeddedBy ?? [];

    const accessories: ReactElement[] = [];

    for (const [_, channelId, messageId] of message.content.matchAll(messageLinkRegex)) {
        if (embeddedBy.includes(messageId!) || embeddedBy.length > 2) {
            continue;
        }

        const linkedChannel = ChannelStore.getChannel(channelId);
        if (!linkedChannel || (!linkedChannel.isPrivate() && !PermissionStore.can(Permissions.VIEW_CHANNEL, linkedChannel))) {
            continue;
        }

        const { listMode, idList } = settings.store;

        const isListed = [linkedChannel.guild_id, channelId, message.author.id].some(id => id && idList.includes(id));

        if (listMode === "blacklist" && isListed) continue;
        if (listMode === "whitelist" && !isListed) continue;

        let linkedMessage = messageCache.get(messageId!)?.message;
        if (!linkedMessage) {
            linkedMessage ??= MessageStore.getMessage(channelId!, messageId!);
            if (linkedMessage) {
                messageCache.set(messageId!, { message: linkedMessage, fetched: true });
            } else {
                messageFetchQueue.unshift(async () => {
                    const msg = await fetchMessage(channelId!, messageId!);
                    if (msg) updateMessage(message.channel_id, message.id);
                });
                continue;
            }
        }

        const messageProps: MessageEmbedProps = {
            message: withEmbeddedBy(linkedMessage, [...embeddedBy, message.id]),
            channel: linkedChannel
        };

        const type = settings.store.automodEmbeds;
        accessories.push(
            type === "always" || (type === "prefer" && !requiresRichEmbed(linkedMessage))
                ? <AutomodEmbedAccessory {...messageProps} />
                : <ChannelMessageEmbedAccessory {...messageProps} />
        );
    }

    return accessories;
}

function getChannelLabelAndIconUrl(channel: ChannelRecord) {
    if (channel.isDM())
        return ["Direct Message", UserStore.getUser(channel.getRecipientId())!.getAvatarURL()];
    if (channel.isGroupDM())
        return ["Group DM", IconUtils.getChannelIconURL({
            id: channel.id,
            icon: channel.icon,
            applicationId: channel.getApplicationId()
        })];
    return ["Server", IconUtils.getGuildIconURL({ id: GuildStore.getGuild(channel.guild_id)!.id })];
}

function ChannelMessageEmbedAccessory({ message, channel }: MessageEmbedProps) {
    const compact = MessageDisplayCompact.useSetting();

    const dmReceiver = UserStore.getUser(ChannelStore.getChannel(channel.id)!.recipients?.[0]);

    const [channelLabel, iconUrl] = getChannelLabelAndIconUrl(channel);

    return (
        <Embed
            embed={{
                rawDescription: "",
                color: "var(--background-secondary)",
                author: {
                    name: (
                        <Text variant="text-xs/medium" tag="span">
                            <span>{channelLabel} - </span>
                            {MarkupUtils.parse(channel.isDM() ? `<@${dmReceiver?.id ?? ""}>` : `<#${channel.id}>`)}
                        </Text>
                    ),
                    iconProxyURL: iconUrl
                }
            }}
            renderDescription={() => (
                <div key={message.id} className={classes(SearchResultClasses.message, settings.store.messageBackgroundColor && SearchResultClasses.searchResult!)}>
                    <ChannelMessage
                        id={`message-link-embeds-${message.id}`}
                        message={message}
                        channel={channel}
                        subscribeToComponentDispatch={false}
                        compact={compact}
                    />
                </div>
            )}
        />
    );
}

function AutomodEmbedAccessory(props: MessageEmbedProps) {
    const { message, channel } = props;
    const compact = MessageDisplayCompact.useSetting();
    const images = getImages(message);

    const [channelLabel, iconUrl] = getChannelLabelAndIconUrl(channel);

    return (
        <AutoModEmbed
            channel={channel}
            childrenAccessories={
                <Text
                    color="text-muted"
                    variant="text-xs/medium"
                    tag="span"
                    className={`${EmbedClasses.embedAuthor} ${EmbedClasses.embedMargin}`}
                >
                    {iconUrl && <img src={iconUrl} className={EmbedClasses.embedAuthorIcon} alt="" />}
                    <span>
                        <span>{channelLabel} - </span>
                        {channel.isDM()
                            ? MarkupUtils.parse(`<@${ChannelStore.getChannel(channel.id)!.recipients![0]}>`)
                            : MarkupUtils.parse(`<#${channel.id}>`)
                        }
                    </span>
                </Text>
            }
            compact={compact}
            content={
                <>
                    {message.content || message.attachments.length <= images.length
                        ? MarkupUtils.parse(message.content)
                        : [noContent(message.attachments.length, message.embeds.length)]
                    }
                    {images.map(a => {
                        const { width, height } = computeWidthAndHeight(a.width, a.height);
                        return (
                            <div>
                                <img src={a.url} width={width} height={height} />
                            </div>
                        );
                    })}
                </>
            }
            hideTimestamp={false}
            message={message}
            _messageEmbed="automod"
        />
    );
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Adds a preview to messages that link another message",
    authors: [Devs.TheSun, Devs.Ven, Devs.RyanCaoDev],
    dependencies: ["MessageAccessoriesAPI", "MessageUpdaterAPI", "UserSettingsAPI"],

    settings,

    start() {
        addAccessory("messageLinkEmbed", props => {
            if (!messageLinkRegex.test(props.message.content))
                return null;

            // need to reset the regex because it's global
            messageLinkRegex.lastIndex = 0;

            return (
                <ErrorBoundary>
                    <MessageEmbedAccessory
                        message={props.message}
                    />
                </ErrorBoundary>
            );
        }, 4 /* just above rich embeds */);
    },

    stop() {
        removeAccessory("messageLinkEmbed");
    }
});
