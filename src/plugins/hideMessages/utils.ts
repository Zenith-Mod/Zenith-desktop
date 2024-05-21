/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import { removeHiddenUser, STORE_KEY, userIds } from "./store";

export const removeIgnore = (userId: string) => {
    removeHiddenUser(userId);
    changeMessages(userId, "remove");
    DataStore.set(STORE_KEY, userIds);
};
export const createIgnore = (userId: string) => {
    if (!userIds.includes(userId))
        userIds.push(userId);
    changeMessages(userId, "add");
    DataStore.set(STORE_KEY, userIds);
};

export const changeMessages = (userId: string, action: "remove" | "add") => {
    document.querySelectorAll(`li[data-author-id="${userId}"]`).forEach(m => m.classList[action]("vc-message-hidden"));
};
