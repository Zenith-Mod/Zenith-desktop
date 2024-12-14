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

export type MessageAccessoryFactory = (props: Record<string, any>) => JSX.Element | null | Array<JSX.Element | null>;
export type MessageAccessory = {
    callback: MessageAccessoryFactory;
    position?: number;
};

export const accessories = new Map<String, MessageAccessory>();

export function addMessageAccessory(
    identifier: string,
    callback: MessageAccessoryFactory,
    position?: number
) {
    accessories.set(identifier, {
        callback,
        position,
    });
}

export function removeMessageAccessory(identifier: string) {
    accessories.delete(identifier);
}

export function _modifyAccessories(
    elements: JSX.Element[],
    props: Record<string, any>
) {
    for (const accessory of accessories.values()) {
        let accessories = accessory.callback(props);
        if (accessories == null)
            continue;

        if (!Array.isArray(accessories))
            accessories = [accessories];
        else if (accessories.length === 0)
            continue;

        elements.splice(
            accessory.position != null
                ? accessory.position < 0
                    ? elements.length + accessory.position
                    : accessory.position
                : elements.length,
            0,
            ...accessories.filter(e => e != null) as JSX.Element[]
        );
    }

    return elements;
}
