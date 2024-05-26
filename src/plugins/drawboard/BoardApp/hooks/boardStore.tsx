/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { overlayState } from "./overlayStore";

function createBoardStore<T>(init?: T) {
    if (!init) return;
    let store: T = init;
    const listeners = new Set<any>();

    function useStore() {
        const [, listener] = React.useState();
        React.useEffect(() => {
            listeners.add(listener);
            return () => listeners.delete(listener) as unknown as void;
        }, []);
        return store;
    }

    function dispatch<T1 extends typeof init>(newStore: T1 extends T ? (x: T) => void : T) {
        store = typeof newStore === "function" ? newStore(store) : store;
        listeners.forEach(l => l(store));
    }

    function getStore() { return store; }
    return { dispatch, getStore, useStore };
}

export const lol = createBoardStore<{ images: Array<{ url: string; }>; overlays: Array<overlayState>; }>({ images: [], overlays: [] });

// lol?.dispatch({ ...lol.getStore(), images: [...lol.getStore().images, { url: "HAHAHAHA" }] });