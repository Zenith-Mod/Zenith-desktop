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

import { Devs } from "../../utils/constants";
import { lazyWebpack } from "../../utils/misc";
import definePlugin from "../../utils/types";
import { filters } from "../../webpack";
import { React } from "../../webpack/common";

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii],

    timestampModule: null as any,
    momentJsModule: null as Function | null,

    css: `
        .messageLogger-deleted {
            background-color: rgba(240, 71, 71, 0.15);
        }

        .messageLogger-deleted-attachment {
            filter: grayscale(1);
        }

        .messageLogger-deleted-attachment:hover {
            filter: grayscale(0);
            -webkit-transition: -webkit-filter 250ms linear;
        }

        .theme-dark .messageLogger-edited {
            filter: brightness(80%);
        }

        .theme-light .messageLogger-edited {
            opacity: 0.5;
        }
    `,

    start() {
        this.momentJsModule = lazyWebpack(filters.byProps("relativeTimeRounding", "relativeTimeThreshold"));
        this.timestampModule = lazyWebpack(filters.byProps("messageLogger_TimestampComponent"));

        const style = document.createElement("style");
        style.textContent = this.css;
        style.id = "MessageLogger-css";
        document.head.appendChild(style);
    },

    stop() {
        document.head.querySelector("#MessageLogger-css")?.remove();
    },

    renderEdit(edit: { timestamp: any, content: string }): any {
        return React.createElement("div", { className: "messageLogger-edited" }, [
            edit.content,
            React.createElement(this.timestampModule.messageLogger_TimestampComponent, {
                timestamp: edit.timestamp,
                isEdited: true,
                isInline: false
            }, [
                React.createElement("span", {}, " (edited)")
            ])
        ]);
    },

    makeEdit(newMessage: any, oldMessage: any): any {
        return {
            timestamp: this.momentJsModule?.call(newMessage.edited_timestamp),
            content: oldMessage.content
        };
    },

    // Based on canary 9ab8626bcebceaea6da570b9c586172d02b9c996
    patches: [
        {
            // MessageStore
            // Module 171447
            find: "displayName=\"MessageStore\"",
            replacement: [
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE event
                    match: /MESSAGE_DELETE:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace:
                        "MESSAGE_DELETE:function($1){" +
                        "   var cache = $2getOrCreate($1.channelId);" +
                        "   cache = cache.update($1.id,m=>m.set('deleted', true).set('attachments', m.attachments.map(a => (a.deleted = true, a))));" +
                        "   $2commit(cache);" +
                        "},"
                },
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE_BULK event
                    match: /MESSAGE_DELETE_BULK:function\((\w)\){var .+?((?:\w{1,2}\.){2})getOrCreate.+?},/,
                    replace:
                        "MESSAGE_DELETE_BULK:function($1){" +
                        "   var cache = $2getOrCreate($1.channelId);" +
                        "   cache = $1.ids.reduce((pv,cv) => pv.update(cv, m => m.set('deleted', true).set('attachments', m.attachments.map(a => (a.deleted = true, a)))), cache);" +
                        "   $2commit(cache);" +
                        "},"
                },
                {
                    // Add current cached content + new edit time to cached message's editHistory
                    match: /(MESSAGE_UPDATE:function\((\w)\).+?)\.update\((\w)/,
                    replace: "$1" +
                        ".update($3,m =>" +
                        "   $2.message.content !== m.editHistory?.[0]?.content && $2.message.content !== m.content ?" +
                        "       m.set('editHistory',[...(m.editHistory || []), Vencord.Plugins.plugins.MessageLogger.makeEdit($2.message, m)]) :" +
                        "       m" +
                        ")" +
                        ".update($3"
                }
            ]
        },

        {
            // Message domain model
            // Module 451
            find: "isFirstMessageInForumPost=function",
            replacement: [
                {
                    match: /(\w)\.customRenderedContent=(\w)\.customRenderedContent;/,
                    replace: "$1.customRenderedContent = $2.customRenderedContent;" +
                        "$1.deleted = $2.deleted || false;" +
                        "$1.editHistory = $2.editHistory || [];"
                }
            ]
        },

        {
            // Updated message transformer(?)
            // Module 819525
            find: "THREAD_STARTER_MESSAGE?null===",
            replacement: [
                // {
                //     // DEBUG: Log the params of the target function to the patch below
                //     match: /function N\(e,t\){/,
                //     replace: "function L(e,t){console.log('pre-transform', e, t);"
                // },
                {
                    // Pass through editHistory & deleted & original attachments to the "edited message" transformer
                    match: /interactionData:(\w)\.interactionData/,
                    replace:
                        "interactionData:$1.interactionData," +
                        "deleted:$1.deleted," +
                        "editHistory:$1.editHistory," +
                        "attachments:$1.attachments"
                },

                // {
                //     // DEBUG: Log the params of the target function to the patch below
                //     match: /function R\(e\){/,
                //     replace: "function R(e){console.log('after-edit-transform', arguments);"
                // },
                {
                    // Construct new edited message and add editHistory & deleted (ref above)
                    // Pass in custom data to attachment parser to mark attachments deleted as well
                    match: /attachments:(\w{1,2})\((\w)\)/,
                    replace:
                        "attachments: $1((() => {" +
                        "   let old = arguments[1]?.attachments;" +
                        "   if (!old) return $2;" +
                        "   let new_ = $2.attachments?.map(a => a.id) ?? [];" +
                        "   let diff = old.filter(a => !new_.includes(a.id));" +
                        "   old.forEach(a => a.deleted = true);" +
                        "   $2.attachments = [...diff, ...$2.attachments];" +
                        "   return $2;" +
                        "})())," +
                        "deleted: arguments[1]?.deleted," +
                        "editHistory: arguments[1]?.editHistory"
                },
                {
                    // Preserve deleted attribute on attachments
                    match: /(\((\w)\){return null==\2\.attachments.+?)spoiler:/,
                    replace:
                        "$1deleted: arguments[0]?.deleted," +
                        "spoiler:"
                }
            ]
        },

        {
            // Attachment renderer
            // Module 96063
            find: "[\"className\",\"attachment\",\"inlineMedia\"]",
            replacement: [
                {
                    match: /((\w)\.className,\w=\2\.attachment),/,
                    replace: "$1,deleted=$2.attachment?.deleted,"
                },
                {
                    match: /(hiddenSpoilers:\w,className:)/,
                    replace: "$1 (deleted ? 'messageLogger-deleted-attachment ' : '') +"
                }
            ]
        },

        {
            // Base message component renderer
            // Module 748241
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    // Write message.deleted to deleted var
                    match: /var (\w)=(\w).id,(?=\w=\w.message)/,
                    replace: "var $1=$2.id,deleted=$2.message.deleted,"
                },
                {
                    // Append messageLogger-deleted to classNames if deleted
                    match: /\)\("li",\{(.+?),className:/,
                    replace: ")(\"li\",{$1,className:(deleted ? \"messageLogger-deleted \" : \"\")+"
                }
            ]
        },

        {
            // Message content renderer
            // Module 43016
            find: "Messages.MESSAGE_EDITED,\")\"",
            replacement: [
                {
                    // Render editHistory in the deepest div for message content
                    match: /(\)\("div",\{id:.+?children:\[)/,
                    replace: "$1 (arguments[0].message.editHistory.length > 0 ? arguments[0].message.editHistory.map(edit => Vencord.Plugins.plugins.MessageLogger.renderEdit(edit)) : null), "
                }
            ]
        },

        {
            // ReferencedMessageStore
            // Module 778667
            find: "displayName=\"ReferencedMessageStore\"",
            replacement: [
                {
                    match: /MESSAGE_DELETE:function.+?},/,
                    replace: "MESSAGE_DELETE:function(){},"
                },
                {
                    match: /MESSAGE_DELETE_BULK:function.+?},/,
                    replace: "MESSAGE_DELETE_BULK:function(){},"
                }
            ]
        },

        {
            // Message "(edited)" timestamp component
            // Module 23552
            find: "Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format",
            replacement: {
                // Re-export the timestamp component under a findable name
                match: /{(\w{1,2}:\(\)=>(\w{1,2}))}/,
                replace: "{$1,messageLogger_TimestampComponent:()=>$2}"
            }
        }

        // {
        //     // MessageStore caching internals
        //     // Module 819525
        //     find: "e.getOrCreate=function(t)",
        //     replacement: [
        //         // {
        //         //     // DEBUG: log getOrCreate return values from MessageStore caching internals
        //         //     match: /getOrCreate=function(.+?)return/,
        //         //     replace: "getOrCreate=function$1console.log('getOrCreate',n);return"
        //         // }
        //     ]
        // }
    ]
});
