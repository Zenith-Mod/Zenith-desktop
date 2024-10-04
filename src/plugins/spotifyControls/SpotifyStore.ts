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

import { Settings } from "@api/Settings";
import type { Store } from "@vencord/discord-types";
import { findByPropsLazy, findStore, proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

export interface Track {
    id: string;
    name: string;
    duration: number;
    isLocal: boolean;
    album: {
        id: string;
        name: string;
        image: {
            height: number;
            width: number;
            url: string;
        };
    };
    artists: {
        id: string;
        href: string;
        name: string;
        type: string;
        uri: string;
    }[];
}

interface PlayerState {
    type: "SPOTIFY_PLAYER_STATE";
    accountId: string;
    track: Track | null;
    volumePercent?: number;
    isPlaying?: boolean;
    repeat: boolean;
    position?: number;
    context?: any;
    device?: Device;

    // added by patch
    actual_repeat?: Repeat;
    shuffle?: boolean;
}

interface Device {
    id: string;
    is_active: boolean;
}

type Repeat = "off" | "track" | "context";

// Don't wanna run before Flux and Dispatcher are ready!
export const SpotifyStore = proxyLazyWebpack(() => {
    const $SpotifyStore: Store & Record<string, any> = findStore("SpotifyStore");
    const SpotifyAPI = findByPropsLazy("vcSpotifyMarker");

    const API_BASE = "https://api.spotify.com/v1/me/player";

    class SpotifyStore extends Flux.Store {
        public mPosition = 0;
        // https://github.com/microsoft/TypeScript/issues/36060
        /* private */ start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public isPlaying = false;
        public repeat: Repeat = "off";
        public shuffle = false;
        public volume = 0;

        public isSettingPosition = false;

        public openExternal(path: string) {
            const url = Settings.plugins.SpotifyControls!.useSpotifyUris || Vencord.Plugins.isPluginEnabled("OpenInApp")
                ? "spotify:" + path.replaceAll("/", (_, idx) => idx === 0 ? "" : ":")
                : "https://open.spotify.com" + path;

            VencordNative.native.openExternal(url);
        }

        // Need to keep track of this manually
        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this.start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this.start = Date.now();
        }

        prev() {
            this.req("post", "/previous");
        }

        next() {
            this.req("post", "/next");
        }

        async setVolume(percent: number) {
            await this.req("put", "/volume", {
                query: {
                    volume_percent: Math.round(percent)
                }
            });
            this.volume = percent;
            this.emitChange();
        }

        setPlaying(playing: boolean) {
            this.req("put", playing ? "/play" : "/pause");
        }

        setRepeat(state: Repeat) {
            this.req("put", "/repeat", {
                query: { state }
            });
        }

        async setShuffle(state: boolean) {
            await this.req("put", "/shuffle", {
                query: { state }
            });
            this.shuffle = state;
            this.emitChange();
        }

        async seek(ms: number) {
            if (this.isSettingPosition) return;

            this.isSettingPosition = true;

            try {
                return await this.req("put", "/seek", {
                    query: {
                        position_ms: Math.round(ms)
                    }
                });
            } catch (e) {
                console.error("[VencordSpotifyControls] Failed to seek", e);
                this.isSettingPosition = false;
            }
        }

        // https://github.com/microsoft/TypeScript/issues/36060
        /* private */ req(method: "post" | "get" | "put", route: string, data: any = {}): Promise<any> {
            if (this.device?.is_active)
                (data.query ??= {}).device_id = this.device.id;

            const { socket } = $SpotifyStore.getActiveSocketAndDevice();
            return SpotifyAPI[method](socket.accountId, socket.accessToken, {
                url: API_BASE + route,
                ...data
            });
        }
    }

    const store = new SpotifyStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(a: PlayerState) {
            store.track = a.track;
            store.device = a.device ?? null;
            store.isPlaying = a.isPlaying ?? false;
            store.volume = a.volumePercent ?? 0;
            store.repeat = a.actual_repeat || "off";
            store.shuffle = a.shuffle ?? false;
            store.position = a.position ?? 0;
            store.isSettingPosition = false;
            store.emitChange();
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        }
    });

    return store;
});
