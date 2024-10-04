/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentChannel } from "@utils/discord";
import { isObjectEmpty } from "@utils/misc";
import { StatusType } from "@vencord/discord-types";
import { SelectedChannelStore, Tooltip, useEffect, useStateFromStores } from "@webpack/common";

import { ChannelMemberStore, cl, GuildMemberCountStore, numberFormat, ThreadMemberListStore } from ".";
import { OnlineMemberCountStore } from "./OnlineMemberCountStore";

export function MemberCount({ isTooltip, tooltipGuildId }: { isTooltip?: true; tooltipGuildId?: string; }) {
    const currentChannel = useStateFromStores([SelectedChannelStore], () => getCurrentChannel());

    const guildId = isTooltip ? tooltipGuildId! : currentChannel?.guild_id;

    const totalCount = useStateFromStores(
        [GuildMemberCountStore],
        () => GuildMemberCountStore.getMemberCount(guildId)
    );

    let onlineCount = useStateFromStores(
        [OnlineMemberCountStore],
        () => OnlineMemberCountStore.getCount(guildId!)
    );

    const { groups } = useStateFromStores(
        [ChannelMemberStore],
        () => ChannelMemberStore.getProps(guildId!, currentChannel?.id)
    );

    const threadGroups = useStateFromStores(
        [ThreadMemberListStore],
        // @ts-expect-error
        () => ThreadMemberListStore.getMemberListSections(currentChannel?.id)
    );

    if (!isTooltip && (groups.length >= 1 || groups[0]!.id !== StatusType.UNKNOWN)) {
        onlineCount = groups.reduce((total, curr) => total + (curr.id === StatusType.OFFLINE ? 0 : curr.count), 0);
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!isTooltip && threadGroups && !isObjectEmpty(threadGroups)) {
        onlineCount = Object.values(threadGroups).reduce((total, curr) => total + (curr.sectionId === StatusType.OFFLINE ? 0 : curr.userIds.length), 0);
    }

    useEffect(() => {
        OnlineMemberCountStore.ensureCount(guildId!);
    }, [guildId]);

    if (totalCount == null)
        return null;

    const formattedOnlineCount = onlineCount != null ? numberFormat(onlineCount) : "?";

    return (
        <div className={cl("widget", { tooltip: isTooltip, "member-list": !isTooltip })}>
            <Tooltip text={`${formattedOnlineCount} online in this channel`} position="bottom">
                {props => (
                    <div {...props}>
                        <span className={cl("online-dot")} />
                        <span className={cl("online")}>{formattedOnlineCount}</span>
                    </div>
                )}
            </Tooltip>
            <Tooltip text={`${numberFormat(totalCount)} total server members`} position="bottom">
                {props => (
                    <div {...props}>
                        <span className={cl("total-dot")} />
                        <span className={cl("total")}>{numberFormat(totalCount)}</span>
                    </div>
                )}
            </Tooltip>
        </div>
    );
}
