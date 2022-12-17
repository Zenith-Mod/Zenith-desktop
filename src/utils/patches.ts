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

export type ReplaceFn = (match: string, ...groups: string[]) => string;

export function canonicalizeMatch(match: RegExp | string) {
    if (typeof match === "string") return match;
    const canonSource = match.source
        .replaceAll("\\i", "[A-Za-z_$][\\w$]*");
    return new RegExp(canonSource, match.flags);
}

export function canonicalizeReplace(replace: string | ReplaceFn, pluginName: string) {
    if (typeof replace === "function") return replace;
    return replace.replaceAll("$self", `Vencord.Plugins.plugins.${pluginName}`);
}

export function canonicalizeDescriptor<T>(descriptor: TypedPropertyDescriptor<T>, canonicalize: (value: T) => T) {
    if (descriptor.get) {
        const original = descriptor.get;
        descriptor.get = function () {
            return canonicalize(original.call(this));
        };
    } else if (descriptor.value) {
        descriptor.value = canonicalize(descriptor.value);
    }
    return descriptor;
}
