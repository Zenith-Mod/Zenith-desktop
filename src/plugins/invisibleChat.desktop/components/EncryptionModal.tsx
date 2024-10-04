/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { insertTextIntoChatInputBox } from "@utils/discord";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    type ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { Button, Forms, Switch, TextInput, useState } from "@webpack/common";

import { encrypt } from "../index";

function EncModal(props: ModalProps) {
    const [secret, setSecret] = useState("");
    const [cover, setCover] = useState("");
    const [password, setPassword] = useState("password");
    const [noCover, setNoCover] = useState(false);

    // cover must have at least 2 words
    const isValid = secret && (noCover || /[^ ] +[^ ]/.test(cover));

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Encrypt Message</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Secret</Forms.FormTitle>
                <TextInput
                    onChange={setSecret}
                />
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Cover (2 or more Words!!)</Forms.FormTitle>
                <TextInput
                    disabled={noCover}
                    onChange={setCover}
                />
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>Password</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "20px" }}
                    defaultValue="password"
                    onChange={setPassword}
                />
                <Switch
                    value={noCover}
                    onChange={setNoCover}
                >
                    Don't use a Cover
                </Switch>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    disabled={!isValid}
                    onClick={() => {
                        if (!isValid) return;
                        const encrypted = encrypt(secret, password, noCover ? "d d" : cover);
                        const toSend = noCover ? encrypted.replaceAll("d", "") : encrypted;
                        if (toSend) {
                            insertTextIntoChatInputBox(toSend);
                            props.onClose();
                        }
                    }}
                >
                    Send
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openEncModal() {
    openModal(props => <EncModal {...props} />);
}
