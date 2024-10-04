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

import { ClipboardUtils, Toasts } from "@webpack/common";
import type { IsAny } from "type-fest";

import { DevsById } from "./constants";

/**
 * Calls .join(" ") on the arguments
 * classes("one", "two") => "one two"
 */
export const classes = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(" ");

/**
 * Returns a promise that resolves after the specified amount of time
 */
export const sleep = (ms: number) => new Promise<void>(r => { setTimeout(r, ms); });

export function copyWithToast(text: string, toastMessage?: string) {
    let type: number;
    if (ClipboardUtils.SUPPORTS_COPY) {
        ClipboardUtils.copy(text);
        toastMessage ??= "Copied to clipboard!";
        type = Toasts.Type.SUCCESS;
    } else {
        toastMessage = "Your browser does not support copying to clipboard";
        type = Toasts.Type.FAILURE;
    }
    Toasts.show({
        message: toastMessage,
        id: Toasts.genId(),
        type
    });
}

/**
 * Check if obj is a true object: of type "object" and not null or array
 */
export function isObject<T>(obj: T): obj is IsAny<T> extends true ? any : unknown extends T ? Extract<object, T> : Exclude<T & object, readonly unknown[]> {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

/**
 * Checks if an object has no own enumerable non-symbol properties
 */
export function isObjectEmpty(obj: object) {
    for (const k in obj)
        if (Object.hasOwn(obj, k)) return false;

    return true;
}

/**
 * Returns null if value is not a URL, otherwise return URL object.
 * Avoids having to wrap url checks in a try/catch
 */
export function parseUrl(urlString: string): URL | null {
    try {
        return new URL(urlString);
    } catch {
        return null;
    }
}

/**
 * Checks whether an element is on screen
 */
export function checkIntersecting(el: Element) {
    const elementBox = el.getBoundingClientRect();
    const documentHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    return !(elementBox.bottom < 0 || elementBox.top - documentHeight >= 0);
}

export function identity<T>(value: T) {
    return value;
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#mobile_tablet_or_desktop
// "In summary, we recommend looking for the string Mobi anywhere in the User Agent to detect a mobile device."
export const isMobile = navigator.userAgent.includes("Mobi");

export const isPluginDev = (id?: string | null) => id != null && Object.hasOwn(DevsById, id);

export function pluralise(amount: number, singular: string, plural = singular + "s") {
    return amount === 1 ? `${amount} ${singular}` : `${amount} ${plural}`;
}

export function tryOrElse<T>(func: () => T, fallback: T): T {
    try {
        const res = func();
        return res instanceof Promise
            ? res.catch(() => fallback) as T
            : res;
    } catch {
        return fallback;
    }
}
