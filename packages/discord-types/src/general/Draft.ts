/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** @todo It seems that the other DraftTypes are either not handled by DraftStore or not yet implemented. */
export type Draft<Type extends DraftType = DraftType>
    = Type extends DraftType.CHANNEL_MESSAGE | DraftType.FIRST_THREAD_MESSAGE ? DraftMessage
    : Type extends DraftType.THREAD_SETTINGS ? DraftThreadSettings
    : never;

// Enum keys made screaming snake case for consistency.
export enum DraftType {
    CHANNEL_MESSAGE = 0,
    THREAD_SETTINGS = 1,
    FIRST_THREAD_MESSAGE = 2,
    APPLICATION_LAUNCHER_COMMAND = 3,
    POLL = 4,
    SLASH_COMMAND = 5,
}

export interface DraftBase {
    timestamp: number;
}

export interface DraftMessage extends DraftBase {
    draft: string;
}

export type DraftThreadSettings = DraftForumThreadSettings | DraftNonForumThreadSettings;

export interface DraftThreadSettingsBase extends DraftBase {
    name?: string;
    parentChannelId: string;
}

export interface DraftForumThreadSettings extends DraftThreadSettingsBase {
    appliedTags?: Set<string>;
}

export interface DraftNonForumThreadSettings extends DraftThreadSettingsBase {
    isPrivate?: boolean;
    parentMessageId?: string | undefined;
}
