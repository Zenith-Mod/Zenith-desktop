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

import { Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { LazyComponent, makeLazy } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findLazy, findModuleId, wreq } from "@webpack";
import { React, Select, Text, TextArea, Toasts } from "@webpack/common";

import cssText from "~fileContent/soundChangerStyles.css";

const useEffect = (...args: Parameters<typeof React.useEffect>) => React.useEffect(...args);
const useState = makeLazy(() => React.useState);
const TextAreaProps = findLazy(m => typeof m.textarea === "string");
const DeleteIcon = LazyComponent(() => wreq(findModuleId("M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z")!!).Z);
const SoundIcon = LazyComponent(() => wreq(findModuleId("M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6")!!).Z);
const soundsModule = makeLazy(() => findModuleId("call_ringing.mp3"));

type SoundsChanged = {
    name: string;
    original_link: string;
    new_link: string;
}[];

const snakeToTitleCase = txt => txt.split(/_+/).map((w: string) => {
    const word = w.trim();
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
}).join(" ");

const filenameToTitleCase = txt => snakeToTitleCase(txt.replace(".mp3", "").replace("./", ""));

const isAudioValid = (src: string) => {
    const a = new Audio(src);
    return new Promise(resolve => {
        a.addEventListener("error", () => resolve(false));
        a.addEventListener("canplay", () => resolve(true));
        setTimeout(() => resolve(false), 2000);
        a.load();
    });
};

const SoundChangerSettings = ({ setValue }: { setValue: (newValue: any) => void; }) => {
    const [sounds, setSounds] = useState()({});
    const [soundsChanged, setSoundsChanged] = useState()<SoundsChanged>([]);
    const [audioPreviews, setAudioPreviews] = useState()<{ [key: string]: HTMLAudioElement; }>({});

    useEffect(() => {
        ensureCss();

        const modId = soundsModule();
        if (modId == null) {
            // Should never happen, but you never know...
            Toasts.show({
                type: Toasts.Type.FAILURE,
                message: "Couldn't find the module responsible for managing the sound links.",
                id: Toasts.genId()
            });
            return;
        }

        setSounds(JSON.parse(`${wreq.m[modId]}`.match(/\w=(\{(?:.|\n)*?\})/)!![1]));
        setSoundsChanged((Settings.plugins.SoundChanger.soundsChanged || []) as SoundsChanged);
    }, []);

    const save = (a: SoundsChanged) => {
        // I hate my saving mechanism, but hey, it works!
        setValue(a.filter(s => s.new_link.trim().length > 0));
    };

    return (
        <ErrorBoundary>
            <table>
                <thead>
                    <th><Text variant="text-md/bold" style={{ textAlign: "left" }}>Name</Text></th>
                    <th><Text variant="text-md/bold" style={{ textAlign: "left" }}>Custom sound</Text></th>
                    <th></th>
                </thead>
                <tbody>
                    {
                        soundsChanged.map(sound => {
                            return (
                                <tr key={sound.name} style={{ marginTop: "5%" }}>
                                    <td style={{ top: "50%", transform: "translateY(-50%)", width: "50%" }} >
                                        <div className="SC sound-label" style={{ display: "flex", flexDirection: "row", textAlign: "left", rowGap: "10px", columnGap: "10px", justifyItems: "center" }}>
                                            <Text style={{ marginTop: "0.8%" }} variant="text-sm/normal">{filenameToTitleCase(sound.name)}</Text>
                                            <span
                                                role="button"
                                                onClick={e => {
                                                    const revTreePath = (e as any).nativeEvent.path as HTMLElement[];
                                                    const svg = revTreePath.find(e => e.tagName.toLowerCase() === "svg");
                                                    svg?.classList.toggle("audio-preview-playing");

                                                    // Lol, discord can't even do this in their notification settings where you can preview audio...
                                                    // JK, discord please hire me
                                                    // ~ ArjixWasTaken
                                                    if (audioPreviews[sound.name] && !audioPreviews[sound.name].paused) {
                                                        audioPreviews[sound.name].pause();
                                                        return;
                                                    }

                                                    const audio = new Audio();
                                                    audio.src = !sound.new_link.trim().length ? `https://discord.com/assets/${sound.original_link}` : sound.new_link;
                                                    setAudioPreviews(old => { old[sound.name] = audio; return old; });

                                                    audio.play();
                                                    audio.onended = () => {
                                                        svg?.classList.toggle("audio-preview-playing");
                                                        audio.onended = function () { };
                                                    };
                                                }}
                                            >
                                                <SoundIcon color="black" />
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ width: "45%" }}>
                                        <TextArea
                                            className={TextAreaProps.textarea}
                                            placeholder="A link to an audio file!"
                                            spellCheck={false}
                                            onChange={e => {
                                                for (const s of soundsChanged) {
                                                    if (s.name === sound.name) {
                                                        s.new_link = e.nativeEvent.target.value.trim();
                                                        setSoundsChanged(_ => { save(soundsChanged); return soundsChanged; });
                                                        break;
                                                    }
                                                }
                                            }}
                                            onBlur={async e => {
                                                const link = e.nativeEvent.target.value.trim();
                                                if (!link.length) return;

                                                // TODO: Do more than just toasting an error message...
                                                if (!await isAudioValid(link)) {
                                                    Toasts.show({
                                                        type: Toasts.Type.FAILURE,
                                                        message: "Link points to an ivalid audio file!",
                                                        id: Toasts.genId()
                                                    });
                                                }
                                            }}
                                            value={soundsChanged.find(s => s.name === sound.name)?.new_link}
                                        />
                                    </td>
                                    <td style={{ transform: "translateY(-40%)", width: "5%" }}>
                                        <span
                                            style={{ cursor: "pointer" }}
                                            onClick={() => {
                                                const newSounds = soundsChanged.filter(s => s.name !== sound.name);
                                                setSoundsChanged(_ => { save(newSounds); return newSounds; });
                                            }}
                                        >
                                            <DeleteIcon width="24" height="24" color="var(--status-danger)" />
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    }
                    {!soundsChanged.length &&
                        <Text style={{
                            transform: "translateX(50%)",
                            marginTop: "10%",
                            marginBottom: "25%"
                        }} variant="text-sm/normal">No sounds have been changed.</Text>
                    }
                </tbody>
            </table>

            <div style={{ marginBottom: "5%" }}>
                <Select
                    options={
                        Object.keys(sounds)
                            .filter(sound => soundsChanged.find(a => a.name === sound) === undefined)
                            .map(sound => ({ label: filenameToTitleCase(sound), value: sound }))
                    }
                    placeholder="Change a sound"
                    maxVisibleItems={5}
                    closeOnSelect={true}
                    isSelected={() => false}
                    serialize={a => String(a)}
                    select={(sound: string) => {
                        const filename = `${wreq.m[sounds[sound]]}`.match(/"(.*?\.mp3)"/)!![1];
                        const newSounds = soundsChanged.concat([{ name: sound, original_link: filename, new_link: "" }]);
                        setSoundsChanged(newSounds);
                    }}
                />
            </div>
        </ErrorBoundary >
    );
};

const ensureCss = () => {
    if (document.querySelector("style#SoundChanger")) return;
    const style = document.createElement("style");
    style.id = "SoundChanger";
    style.innerHTML = cssText;
    document.head.appendChild(style);
};

export default definePlugin({
    name: "SoundChanger",
    authors: [Devs.Arjix],
    description: "Allows you to modify any discord sound. (God, please forgive me for making this sin)",
    options: {
        soundsChanged: {
            description: "",
            type: OptionType.COMPONENT,
            component: SoundChangerSettings
        }
    },
    patches: [{
        find: "call_calling.mp3",
        replacement: {
            match: /(function \w\((\w)\){)(.*?return \w\(\w\)})/,
            replace: (m, r, e, o) => `${r};if(Vencord.Settings.plugins.SoundChanger.enabled && (sound_=Vencord.Settings.plugins.SoundChanger.soundsChanged.find(a=>a.name===${e}))) return sound_.new_link;${o}`
        }
    }],
});
