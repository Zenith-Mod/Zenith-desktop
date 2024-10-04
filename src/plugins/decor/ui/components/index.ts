/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { AvatarDecorationData } from "@vencord/discord-types";
import { findComponentByCode, LazyComponentWebpack } from "@webpack";
import { React } from "@webpack/common";
import type { ComponentType, HTMLProps, PropsWithChildren } from "react";

type DecorationGridItemComponent = ComponentType<PropsWithChildren<HTMLProps<HTMLDivElement>> & {
    onSelect: () => void;
    isSelected: boolean;
}>;

export let DecorationGridItem: DecorationGridItemComponent;
export const setDecorationGridItem = (v: any) => DecorationGridItem = v;

export const AvatarDecorationModalPreview = LazyComponentWebpack<any>(() => {
    const component = findComponentByCode(".shopPreviewBanner");
    return React.memo(component);
});

type DecorationGridDecorationComponent = ComponentType<HTMLProps<HTMLDivElement> & {
    avatarDecoration: AvatarDecorationData;
    onSelect: () => void;
    isSelected: boolean;
}>;

export let DecorationGridDecoration: DecorationGridDecorationComponent;
export const setDecorationGridDecoration = (v: any) => DecorationGridDecoration = v;
