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

import "./style.css";

import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";
import { Channel } from "discord-types/general";

import { PickerBody } from "./components/pickerBody";
import { PickerHeader } from "./components/pickerHeader";
import { Wrapper } from "./components/wrapper";


const cl = classNameFactory("vc-more-stickers-");
export default definePlugin({
    name: "MoreStickers",
    description: "Adds sticker packs from apps like LINE",
    authors: [Devs.Arjix, Devs.Leko],

    patches: [
        {
            find: "().stickerIcon,",
            replacement: [{
                match: /(children:\(0,\w\.jsx\)\()(\w{2})(,{innerClassName.{20,30}\.stickerButton)/,
                replace: (_, head, button, tail) => {
                    const isMoreStickers = "arguments[0]?.type === \"more-stickers\"";
                    return `${head}${isMoreStickers}?$self.stickerButton:${button}${tail}`;
                }
            }, {
                match: /null==\(null===\(\w=\w\.stickers\)\|\|void 0.*?\.consolidateGifsStickersEmojis.*?(\w)\.push\((\(0,\w\.jsx\))\((\w+),.*?"sticker"\)\)/,
                replace: (m, _, jsx, compo) => {
                    const c = "arguments[0].type";
                    return `${m};${c}?.submit?.button&&${_}.push(${jsx}(${compo},{disabled:!${c}?.submit?.button,type:"more-stickers"},"more-stickers"))`;
                }
            }, {
                match: /(var \w,\w=\w\.useCallback\(\(function\(\)\{\(0,\w+\.\w+\)\()(.*?\.STICKER)(,.*?;)/,
                replace: (_, head, section, tail) => {
                    const isMoreStickers = "arguments[0]?.type === \"more-stickers\"";
                    return `${head}${isMoreStickers}?"more-stickers":${section}${tail}`;
                }
            }]
        },
        {
            find: ".Messages.EXPRESSION_PICKER_GIF",
            replacement: {
                match: /role:"tablist",.{10,20}\.Messages\.EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL,children:(\[.*?\)\]}\)}\):null,)(.*?closePopout:\w.*?:null)/,
                replace: m => {
                    const stickerTabRegex = /(\w)\?(\(.+?\))\((\w{1,2}),.*?isActive:(\w)==.*?:null/;
                    const res = m.replace(stickerTabRegex, (_m, canUseStickers, jsx, tabHeaderComp, currentTab) => {
                        const isActive = `${currentTab}==="more-stickers"`;
                        return (
                            `${_m},${canUseStickers}?` +
                            `${jsx}(${tabHeaderComp},{id:"more-stickers-picker-tab","aria-controls":"more-stickers-picker-tab-panel","aria-selected":${isActive},isActive:${isActive},autoFocus:true,viewType:"more-stickers",children:${jsx}("div",{children:"More Stickers"})})` +
                            ":null"
                        );
                    });

                    return res.replace(/:null,((\w)===.*?\.STICKER&&\w\?(\(.*?\)).*?(\{.*?,onSelectSticker:.*?\})\):null)/, (_, _m, currentTab, jsx, props) => {
                        return `:null,${currentTab}==="more-stickers"?${jsx}($self.moreStickersComponent,${props}):null,${_m}`;
                    });
                }
            }
        },
    ],
    stickerButton({
        innerClassName,
        isActive,
        onClick
    }) {
        return (
            <button
                className={innerClassName}
                onClick={onClick}
                style={{ backgroundColor: "transparent" }}
            >
                {/*
                    Icon taken from: https://github.com/Pitu/Magane/blob/0ebb09acf9901933ebebe19fbd473ec08cf917b3/src/Button.svelte#L29
                */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 24 24"
                    className={cl("icon", { "icon-active": isActive })}
                >
                    <path d="M18.5 11c-4.136 0-7.5 3.364-7.5 7.5c0 .871.157 1.704.432 2.482l9.551-9.551A7.462 7.462 0 0 0 18.5 11z" />
                    <path d="M12 2C6.486 2 2 6.486 2 12c0 4.583 3.158 8.585 7.563 9.69A9.431 9.431 0 0 1 9 18.5C9 13.262 13.262 9 18.5 9c1.12 0 2.191.205 3.19.563C20.585 5.158 16.583 2 12 2z" />
                </svg>
            </button>
        );
    },
    moreStickersComponent({
        channel,
        closePopout
    }: {
        isLoading: boolean,
        channel: Channel,
        closePopout: Function;
    }) {
        return (
            <Wrapper>
                <PickerHeader />
                <PickerBody />
            </Wrapper>
        );
    }
});
