/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Emitter } from "./Emitter";
import type { PersistedStore } from "./PersistedStore";
import type { Store } from "./Store";
import type { UserAgnosticStore } from "./UserAgnosticStore";

export * from "./ActionHandlersGraph";
export * from "./ActionLog";
export * from "./ActionLogger";
export * from "./actions";
export * from "./BatchedStoreListener";
export * from "./ChangeListeners";
export * from "./Dispatcher";
export * from "./Emitter";
export * from "./PersistedStore";
export * from "./SnapshotStore";
export * from "./Store";
export * from "./UserAgnosticStore";
export * from "./utils";

export interface Flux {
    get initialized(): typeof Store["initialized"];

    /** @todo */
    connectStores: (a?: any, b?: any, c?: any) => (a?: any) => any;
    DeviceSettingsStore: typeof UserAgnosticStore;
    Emitter: Emitter;
    initialize: typeof Store["initialize"];
    OfflineCacheStore: typeof UserAgnosticStore;
    PersistedStore: typeof PersistedStore;
    Store: typeof Store;
}