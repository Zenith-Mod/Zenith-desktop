/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { PluginNative } from "@utils/types";
import { Button, Forms, React, Switch, TextInput, useState } from "@webpack/common";

const Native = VencordNative.pluginHelpers.WebhookManager as PluginNative<typeof import("./native")>;
let url, content, username, avatarUrl = "";
let jsonMode = false;

// TODO: add sending as raw
function WebhookMessageModal(props: ModalProps) {
    const [params, setParams] = useState({ content: "", username: "", avatarUrl: "", url: "", jsonMode: false });

    const onURL = (url: string) => setParams(prev => ({ ...prev, url }));
    const onContent = (content: string) => setParams(prev => ({ ...prev, content }));
    const onUsername = (username: string) => setParams(prev => ({ ...prev, username }));
    const onAvatar = (avatarUrl: string) => setParams(prev => ({ ...prev, avatarUrl }));
    const onSwitch = (jsonMode: boolean) => setParams(prev => ({ ...prev, jsonMode }));


    return <ModalRoot {...props} size={ModalSize.MEDIUM} className={"wm-send-webhook"} >
        <ModalContent className="wm-send-webhook-content">
            <Forms.FormTitle className={Margins.top20}>Webhook URL</Forms.FormTitle>
            <TextInput
                placeholder={"Webhook URL"}
                value={params.url}
                onChange={onURL}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Message</Forms.FormTitle>
            <TextInput
                placeholder={"Content"}
                value={params.content}
                onChange={onContent}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Username</Forms.FormTitle>
            <TextInput
                placeholder={"Username"}
                value={params.username}
                onChange={onUsername}
            />
            <Forms.FormTitle className={Margins.top20}>Webhook Avatar URL</Forms.FormTitle>
            <TextInput
                placeholder={"Image URL"}
                value={params.avatarUrl}
                onChange={onAvatar}
            />
            <Switch
                key="wm-raw"
                value={jsonMode}
                onChange={onSwitch}
            >Send as Raw JSON</Switch>
            <Button
                onClick={() => {
                    if (jsonMode !== true) {
                        Native.executeWebhook(params.url, {
                            content: params.content,
                            username: params.username,
                            avatar_url: params.avatarUrl
                        });
                    }
                    else {
                        Native.executeWebhook(params.url, {
                            webhookMessage: params.content,
                            username: params.username,
                            avatar_url: params.avatarUrl
                        });
                    }

                }}
            >Send Webhook</Button>
        </ModalContent>
    </ModalRoot >;
}


export default definePlugin({
    name: "WebhookManager",
    description: "Manage your webhooks easily; delete, send messages, get detailed info and more.",
    authors: [Devs.Byeoon, Devs.Ven],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "webhook delete",
            description: "Delete a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (option, ctx) => {
                try {
                    await fetch(findOption(option, "url", ""), {
                        method: "DELETE"
                    });
                    sendBotMessage(ctx.channel.id, {
                        content: "The webhook has deleted successfully."
                    });
                }
                catch (error) {
                    sendBotMessage(ctx.channel.id, {
                        content: "There was an error deleting the webhook. Did you input a valid webhook URL? Error: " + error
                    });
                }
            }
        },
        {
            name: "webhook info",
            description: "Retrieve information about a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "url",
                    description: "The URL of the webhook",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: async (option, ctx) => {
                const webhookUrl = findOption(option, "url", "");
                const { user, avatar, name, id, token, type, channel_id, guild_id }
                    = await fetch(webhookUrl).then(res => res.json());

                sendBotMessage(ctx.channel.id, {
                    content: `This webhook was created by ${user?.name}.`,
                    embeds: [
                        {
                            title: "Webhook Information",
                            color: "1323",
                            // @ts-ignore
                            author: {
                                name,
                                url: ""
                            },
                            thumbnail: {
                                url: `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,
                                proxyURL: `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,
                                height: 128,
                                width: 128
                            },
                            description: `
                                Webhook ID: ${id}
                                Webhook Token: ${token}
                                Webhook Type: ${type}
                                Channel ID: ${channel_id}
                                Server ID: ${guild_id}
                            `
                        }
                    ]
                });
            }
        },
        {
            name: "webhook send",
            description: "Send a message through a webhook.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            async execute(_, ctx) {
                openModal(props => <WebhookMessageModal {...props} />);
                sendBotMessage(ctx.channel.id, {
                    content: "Your webhook message has been executed."
                });
            }
        }
    ]
});
