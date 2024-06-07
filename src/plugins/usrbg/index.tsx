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
import { enableStyle } from "@api/Styles";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./index.css?managed";

const API_URL = "https://usrbg.is-hardly.online/users";

interface UsrbgApiReturn {
    endpoint: string;
    bucket: string;
    prefix: string;
    users: Record<string, string>;
}

const settings = definePluginSettings({
    nitroFirst: {
        description: "Banner to use if both Nitro and USRBG banners are present",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro banner", value: true, default: true },
            { label: "USRBG banner", value: false },
        ]
    },
    voiceBackground: {
        description: "Use USRBG banners as voice chat backgrounds",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "USRBG",
    description: "Displays user banners from USRBG, allowing anyone to get a banner without Nitro",
    authors: [Devs.AutumnVN, Devs.katlyn, Devs.pylix, Devs.TheKodeToad],
    settings,
    patches: [
        {
            find: ".NITRO_BANNER,",
            replacement: [
                {
                    match: /(\i)\.premiumType/,
                    replace: "$self.premiumHook($1)||$&"
                },
                {
                    match: /(?<=function \i\((\i)\)\{)(?=var.{30,50},bannerSrc:)/,
                    replace: "$1.bannerSrc=$self.useBannerHook($1);"
                },
                {
                    match: /\?\(0,\i\.jsx\)\(\i,{type:\i,shown/,
                    replace: "&&$self.shouldShowBadge(arguments[0])$&"
                }
            ]
        },
        {
            find: /overrideBannerSrc:\i,overrideBannerWidth:/,
            replacement: [
                {
                    match: /(\i)\.premiumType/,
                    replace: "$self.premiumHook($1)||$&"
                },
                {
                    match: /function \i\((\i)\)\{/,
                    replace: "$&$1.overrideBannerSrc=$self.useBannerHook($1);"
                }
            ]
        },
        {
            find: "\"data-selenium-video-tile\":",
            predicate: () => settings.store.voiceBackground,
            replacement: [
                {
                    match: /(?<=function\((\i),\i\)\{)(?=let.{20,40},style:)/,
                    replace: "$1.style=$self.voiceBackgroundHook($1);"
                }
            ]
        }
    ],

    data: null as UsrbgApiReturn | null,

    settingsAboutComponent: () => {
        return (
            <Link href="https://github.com/AutumnVN/usrbg#how-to-request-your-own-usrbg-banner">CLICK HERE TO GET YOUR OWN BANNER</Link>
        );
    },

    voiceBackgroundHook({ className, participantUserId }: any) {
        if (className.includes("tile_")) {
            if (this.userHasBackground(participantUserId)) {
                return {
                    backgroundImage: `url(${this.getImageUrl(participantUserId)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                };
            }
        }
    },

    useBannerHook({ displayProfile, user }: any) {
        if (displayProfile?.banner && settings.store.nitroFirst) return;
        if (this.userHasBackground(user.id)) return this.getImageUrl(user.id);
    },

    premiumHook({ userId }: any) {
        if (this.userHasBackground(userId)) return 2;
    },

    shouldShowBadge({ displayProfile, user }: any) {
        return displayProfile?.banner && (!this.userHasBackground(user.id) || settings.store.nitroFirst);
    },

    userHasBackground(userId: string) {
        return !!this.data?.users[userId];
    },

    getImageUrl(userId: string): string | null {
        if (!this.userHasBackground(userId)) return null;

        // We can assert that data exists because userHasBackground returned true
        const { endpoint, bucket, prefix, users: { [userId]: etag } } = this.data!;
        return `${endpoint}/${bucket}/${prefix}${userId}?${etag}`;
    },

    async start() {
        enableStyle(style);

        const res = await fetch(API_URL);
        if (res.ok) {
            this.data = await res.json();
        }
    }
});
