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

import type { EventEmitter } from "events"; // Discord uses a polyfill for node's EventEmitter
import type { Guild, GuildMember } from "discord-types/general";
import type { ReactNode } from "react";

import type { FluxActionType } from "./fluxActionType";
import type { i18nMessages } from "./i18nMessages";

export { FluxActionType };

type Nullish = null | undefined;

export interface FluxPayload<ActionType extends FluxActionType = FluxActionType> extends Record<PropertyKey, any> {
    type: ActionType;
}

export type FluxActionHandlers<T extends FluxActionType = FluxActionType> = {
    [K in T]?: (payload: FluxPayload<K>) => void;
};

class DepGraph<Data = any> {
    constructor(options?: { circular?: boolean | undefined; } | undefined);

    addDependency(from: string, to: string): void;
    addNode(name: string, data?: Data | undefined): void;
    clone(): DepGraph<Data>;
    dependantsOf(name: string, leavesOnly?: boolean | undefined): string[];
    dependenciesOf(name: string, leavesOnly?: boolean | undefined): string[];
    getNodeData(name: string): Data;
    hasNode(name: string): Data;
    overallOrder(leavesOnly?: boolean | undefined): string[];
    removeDependency(from: string, to: string): void;
    removeNode(name: string): void;
    setNodeData(name: string, data?: Data | undefined): void;
    size(): number;

    circular: boolean | undefined;
    nodes: Record<string, Data | string>;
    outgoingEdges: Record<string, string[]>;
    incomingEdges: Record<string, string[]>;
}

interface FluxActionHandlersGraphNode<
    Payload extends FluxPayload = FluxPayload
> {
    name: string;
    band: number;
    actionHandler: (payload: Payload) => void;
    storeDidChange: (payload: Payload) => void;
}

type FluxOrderedActionHandlers<Payload extends FluxPayload = FluxPaylod> = Omit<FluxActionHandlersGraphNode<Payload>, "band">[];

class FluxActionHandlersGraph<
    Payload extends FluxPayload<infer A> = FluxPayload,
    ActionType = A
> {
    _addToBand(token: string, band: number): void;
    _bandToken(band: number): string;
    _computeOrderedActionHandlers(actionType: ActionType): FluxOrderedActionHandlers<Payload>;
    _computeOrderedCallbackTokens(): string[];
    _invalidateCaches(): void;
    _validateDependencies(fromToken: string, toToken: string): void;
    addDependencies(fromToken: string, toTokens: string[]): void;
    createToken(): string;
    getOrderedActionHandlers(payload: Payload): FluxOrderedActionHandlers<Payload>;
    register(
        name: string,
        actionHandlers: FluxActionHandlers<ActionType>,
        storeDidChange: (payload: Payload) => void,
        band: number,
        token?: string | undefined
    ): string;

    _dependencyGraph: DepGraph<FluxActionHandlersGraphNode<Payload>>;
    _lastID: number;
    _orderedActionHandlers: Record<ActionType, FluxOrderedActionHandlers<Payload> | null>;
    _orderedCallbackTokens: string[] | null;
}

interface SentryUtils {
    addBreadcrumb: (breadcrumb: {
        category?: string | undefined;
        data?: any;
        level?: string | undefined;
        message?: string | undefined;
        type?: string | undefined;
    }) => void;
}

class FluxActionLog<
    Payload extends FluxPayload<infer A> = FluxPayload,
    ActionType = A
> {
    constructor(actionType: Payload);

    get name(): ActionType;
    toJSON(): Pick<FluxActionLog<ActionType>, "action" | "createdAt" | "traces"> & {
        created_at: FluxActionLog["createdAt"];
    };

    action: Payload;
    createdAt: Date;
    error: Error | undefined;
    id: number;
    startTime: number;
    totalTime: number;
    traces: {
        name: string;
        time: number;
    }[];
}

class FluxActionLogger<
    Payload extends FluxPayload<infer A> = FluxPayload,
    ActionType = A
> extends EventEmitter {
    constructor(options?: { persist?: boolean | undefined; } | undefined);

    getLastActionMetrics(title: string, quantity?: number | undefined /* = 20 */): [
        storeName: string,
        actionType: ActionType,
        totalTime: number
    ];
    getSlowestActions(actionType?: ActionType | Nullish, quantity?: number | undefined /* = 20 */): [];
    log<T extends ActionType>(
        actionType: T,
        callback: (func: <U extends () => any>(storeName: string, func: U) => ReturnType<U>) => void
    ): FluxActionLog<T>;

    logs: FluxActionLog<ActionType>[];
    persist: boolean;
}

export class FluxDispatcher<
    Payload extends FluxPayload<infer A> = FluxPayload,
    ActionType = A
> {
    constructor(
        defaultBand?: number | undefined /* = 0 */,
        actionLogger?: FluxActionLogger<Payload> | Nullish,
        sentryUtils?: SentryUtils | Nullish
    );

    _dispatch(
        payload: Payload,
        func: <U extends () => any>(storeName: string, func: U) => ReturnType<U>
    ): false | void;
    _dispatchWithDevtools(payload: Payload): void;
    _dispatchWithLogging(payload: Payload): void;
    addDependencies(fromToken: string, toTokens: string[]): void;
    addInterceptor(interceptor: (payload: Payload) => boolean): void;
    createToken(): string;
    dispatch(payload: Payload): Promise<void>;
    flushWaitQueue(): void;
    isDispatching(): boolean;
    register(
        name: string,
        actionHandlers: FluxActionHandlers<ActionType>,
        storeDidChange: (payload: Payload) => void,
        band?: number | Nullish,
        token?: string | undefined
    ): string;
    subscribe(actionType: ActionType, listener: (payload: Payload) => void): void;
    unsubscribe(actionType: ActionType, listener: (payload: Payload) => void): void;
    wait(callback: () => void): void;

    _actionHandlers: FluxActionHandlersGraph<Payload>;
    _currentDispatchActionType: ActionType | Nullish;
    _defaultBand: number;
    _interceptors: ((payload: Payload) => boolean)[];
    _processingWaitQueue: boolean;
    _sentryUtils: SentryUtils | Nullish;
    _subscriptions: Record<ActionType, Set<(payload: Payload) => void> | Nullish>;
    _waitQueue: (() => void)[];
    actionLogger: FluxActionLogger<Payload>;
    functionCache: Record<ActionType, (payload: Payload) => void>;
}

export type Parser = Record<
    | "parse"
    | "parseTopic"
    | "parseEmbedTitle"
    | "parseInlineReply"
    | "parseGuildVerificationFormRule"
    | "parseGuildEventDescription"
    | "parseAutoModerationSystemMessage"
    | "parseForumPostGuidelines"
    | "parseForumPostMostRecentMessage",
    (content: string, inline?: boolean, state?: Record<string, any>) => ReactNode[]
> & Record<"defaultRules" | "guildEventRules", Record<string, Record<"react" | "html" | "parse" | "match" | "order", any>>>;

export interface Alerts {
    show(alert: {
        title: any;
        body: React.ReactNode;
        className?: string;
        confirmColor?: string;
        cancelText?: string;
        confirmText?: string;
        secondaryConfirmText?: string;
        onCancel?(): void;
        onConfirm?(): void;
        onConfirmSecondary?(): void;
        onCloseCallback?(): void;
    }): void;
    /** This is a noop, it does nothing. */
    close(): void;
}

export interface SnowflakeUtils {
    fromTimestamp(timestamp: number): string;
    extractTimestamp(snowflake: string): number;
    age(snowflake: string): number;
    atPreviousMillisecond(snowflake: string): string;
    compare(snowflake1?: string, snowflake2?: string): number;
}

interface RestRequestData {
    url: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
    oldFormErrors?: boolean;
    retries?: number;
}

export type RestAPI = Record<"delete" | "get" | "patch" | "post" | "put", (data: RestRequestData) => Promise<any>>;

export type Permissions = "CREATE_INSTANT_INVITE"
    | "KICK_MEMBERS"
    | "BAN_MEMBERS"
    | "ADMINISTRATOR"
    | "MANAGE_CHANNELS"
    | "MANAGE_GUILD"
    | "CHANGE_NICKNAME"
    | "MANAGE_NICKNAMES"
    | "MANAGE_ROLES"
    | "MANAGE_WEBHOOKS"
    | "MANAGE_GUILD_EXPRESSIONS"
    | "CREATE_GUILD_EXPRESSIONS"
    | "VIEW_AUDIT_LOG"
    | "VIEW_CHANNEL"
    | "VIEW_GUILD_ANALYTICS"
    | "VIEW_CREATOR_MONETIZATION_ANALYTICS"
    | "MODERATE_MEMBERS"
    | "SEND_MESSAGES"
    | "SEND_TTS_MESSAGES"
    | "MANAGE_MESSAGES"
    | "EMBED_LINKS"
    | "ATTACH_FILES"
    | "READ_MESSAGE_HISTORY"
    | "MENTION_EVERYONE"
    | "USE_EXTERNAL_EMOJIS"
    | "ADD_REACTIONS"
    | "USE_APPLICATION_COMMANDS"
    | "MANAGE_THREADS"
    | "CREATE_PUBLIC_THREADS"
    | "CREATE_PRIVATE_THREADS"
    | "USE_EXTERNAL_STICKERS"
    | "SEND_MESSAGES_IN_THREADS"
    | "SEND_VOICE_MESSAGES"
    | "CONNECT"
    | "SPEAK"
    | "MUTE_MEMBERS"
    | "DEAFEN_MEMBERS"
    | "MOVE_MEMBERS"
    | "USE_VAD"
    | "PRIORITY_SPEAKER"
    | "STREAM"
    | "USE_EMBEDDED_ACTIVITIES"
    | "USE_SOUNDBOARD"
    | "USE_EXTERNAL_SOUNDS"
    | "REQUEST_TO_SPEAK"
    | "MANAGE_EVENTS"
    | "CREATE_EVENTS";

export type PermissionsBits = Record<Permissions, bigint>;

export interface Locale {
    name: string;
    value: string;
    localizedName: string;
}

export interface LocaleInfo {
    code: string;
    enabled: boolean;
    name: string;
    englishName: string;
    postgresLang: string;
}

export interface i18n {
    getAvailableLocales(): Locale[];
    getLanguages(): LocaleInfo[];
    getDefaultLocale(): string;
    getLocale(): string;
    getLocaleInfo(): LocaleInfo;
    setLocale(locale: string): void;

    loadPromise: Promise<void>;

    Messages: Record<i18nMessages, any>;
}

export interface Clipboard {
    copy(text: string): void;
    SUPPORTS_COPY: boolean;
}

export interface NavigationRouter {
    back(): void;
    forward(): void;
    hasNavigated(): boolean;
    getHistory(): {
        action: string;
        length: 50;
        [key: string]: any;
    };
    transitionTo(path: string, ...args: unknown[]): void;
    transitionToGuild(guildId: string, ...args: unknown[]): void;
    replaceWith(...args: unknown[]): void;
    getLastRouteChangeSource(): any;
    getLastRouteChangeSourceLocationStack(): any;
}

export interface IconUtils {
    getUserAvatarURL(user: User, canAnimate?: boolean, size?: number, format?: string): string;
    getDefaultAvatarURL(id: string, discriminator?: string): string;
    getUserBannerURL(data: { id: string, banner: string, canAnimate?: boolean, size: number; }): string | undefined;
    getAvatarDecorationURL(dara: { avatarDecoration: string, size: number; canCanimate?: boolean; }): string | undefined;

    getGuildMemberAvatarURL(member: GuildMember, canAnimate?: string): string | null;
    getGuildMemberAvatarURLSimple(data: { guildId: string, userId: string, avatar: string, canAnimate?: boolean; size?: number; }): string;
    getGuildMemberBannerURL(data: { id: string, guildId: string, banner: string, canAnimate?: boolean, size: number; }): string | undefined;

    getGuildIconURL(data: { id: string, icon?: string, size?: number, canAnimate?: boolean; }): string | undefined;
    getGuildBannerURL(guild: Guild, canAnimate?: boolean): string | null;

    getChannelIconURL(data: { id: string; icon?: string; applicationId?: string; size?: number; }): string | undefined;
    getEmojiURL(data: { id: string, animated: boolean, size: number, forcePNG?: boolean; }): string;

    hasAnimatedGuildIcon(guild: Guild): boolean;
    isAnimatedIconHash(hash: string): boolean;

    getGuildSplashURL: any;
    getGuildDiscoverySplashURL: any;
    getGuildHomeHeaderURL: any;
    getResourceChannelIconURL: any;
    getNewMemberActionIconURL: any;
    getGuildTemplateIconURL: any;
    getApplicationIconURL: any;
    getGameAssetURL: any;
    getVideoFilterAssetURL: any;

    getGuildMemberAvatarSource: any;
    getUserAvatarSource: any;
    getGuildSplashSource: any;
    getGuildDiscoverySplashSource: any;
    makeSource: any;
    getGameAssetSource: any;
    getGuildIconSource: any;
    getGuildTemplateIconSource: any;
    getGuildBannerSource: any;
    getGuildHomeHeaderSource: any;
    getChannelIconSource: any;
    getApplicationIconSource: any;
    getAnimatableSourceWithFallback: any;
}
