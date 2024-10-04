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

import { useAwaiter, useForceUpdater } from "@utils/react";
import { ChannelType } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Forms, RelationshipStore, useRef, UserStore } from "@webpack/common";

import { Auth, authorize } from "../auth";
import { type Review, ReviewType } from "../entities";
import { addReview, getReviews, type Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { settings } from "../settings";
import { cl, showToast } from "../utils";
import ReviewComponent from "./ReviewComponent";

const Transforms = findByPropsLazy("insertNodes", "textToText");
const Editor = findByPropsLazy("start", "end", "toSlateRange");
const ChatInputTypes = findByPropsLazy("FORM");
const InputComponent = findComponentByCodeLazy("disableThemedBackground", "CHANNEL_TEXT_AREA");
const createChannelRecordFromServer = findByCodeLazy(".GUILD_TEXT])", "fromServer)");

interface UserProps {
    discordId: string;
    name: string;
}

interface ReviewsViewProps extends UserProps {
    hideOwnReview?: boolean;
    onFetchReviews: (data: Response) => void;
    page?: number;
    refetchSignal?: unknown;
    scrollToTop?: () => void;
    showInput?: boolean;
    type: ReviewType;
}

export default function ReviewsView({
    discordId,
    name,
    onFetchReviews,
    refetchSignal,
    scrollToTop,
    page = 1,
    showInput = false,
    hideOwnReview = false,
    type,
}: ReviewsViewProps) {
    const [signal, refetch] = useForceUpdater(true);

    const [reviewData] = useAwaiter(() => getReviews(discordId, (page - 1) * REVIEWS_PER_PAGE), {
        fallbackValue: null,
        deps: [refetchSignal, signal, page],
        onSuccess: data => {
            if (settings.store.hideBlockedUsers)
                data!.reviews = data!.reviews.filter(r => !RelationshipStore.isBlocked(r.sender.discordID));

            scrollToTop?.();
            onFetchReviews(data!);
        }
    });

    if (!reviewData) return null;

    return (
        <>
            <ReviewList
                refetch={refetch}
                reviews={reviewData.reviews}
                hideOwnReview={hideOwnReview}
                profileId={discordId}
                type={type}
            />

            {showInput && (
                <ReviewsInputComponent
                    name={name}
                    discordId={discordId}
                    refetch={refetch}
                    isAuthor={reviewData.reviews.some(r => r.sender.discordID === UserStore.getCurrentUser()!.id)}
                />
            )}
        </>
    );
}

interface ReviewListProps {
    hideOwnReview: boolean;
    profileId: string;
    refetch: () => void;
    reviews: Review[];
    type: ReviewType;
}

function ReviewList({ hideOwnReview, profileId, refetch, reviews, type }: ReviewListProps) {
    const meId = UserStore.getCurrentUser()!.id;

    return (
        <div className={cl("view")}>
            {reviews.map(review =>
                (review.sender.discordID !== meId || !hideOwnReview) && (
                    <ReviewComponent
                        key={review.id}
                        review={review}
                        refetch={refetch}
                        profileId={profileId}
                    />
                )
            )}

            {reviews.length === 0 && (
                <Forms.FormText className={cl("placeholder")}>
                    Looks like nobody reviewed this {type === ReviewType.User ? "user" : "server"} yet. You could be the first!
                </Forms.FormText>
            )}
        </div>
    );
}

interface ReviewsInputComponentProps extends UserProps {
    isAuthor: boolean;
    modalKey?: string;
    refetch: () => void;
}

export function ReviewsInputComponent({ discordId, isAuthor, modalKey, name, refetch }: ReviewsInputComponentProps) {
    const { token } = Auth;
    const editorRef = useRef<any>(null);
    const inputType = ChatInputTypes.FORM;
    inputType.disableAutoFocus = true;

    const channel = createChannelRecordFromServer({ id: "0", type: ChannelType.DM });

    return (
        <div
            onClick={() => {
                if (!token) {
                    showToast("Opening authorization window...");
                    authorize();
                }
            }}
        >
            <InputComponent
                className={cl("input")}
                channel={channel}
                placeholder={
                    !token
                        ? "You need to authorize to review users!"
                        : isAuthor
                            ? `Update review for @${name}`
                            : `Review @${name}`
                }
                type={inputType}
                disableThemedBackground={true}
                setEditorRef={(ref: any) => { editorRef.current = ref; }}
                parentModalKey={modalKey}
                textValue=""
                onSubmit={
                    async (res: any) => {
                        const response = await addReview({
                            userid: discordId,
                            comment: res.value,
                        });

                        if (response) {
                            refetch();

                            const slateEditor = editorRef.current.ref.current.getSlateEditor();

                            // clear editor
                            Transforms.delete(slateEditor, {
                                at: {
                                    anchor: Editor.start(slateEditor, []),
                                    focus: Editor.end(slateEditor, []),
                                }
                            });
                        }

                        // even tho we need to return this, it doesnt do anything
                        return {
                            shouldClear: false,
                            shouldRefocus: true,
                        };
                    }
                }
            />
        </div>
    );
}
