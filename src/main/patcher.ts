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

import { onceDefined } from "@utils/onceDefined";
import electron, { app, BrowserWindowConstructorOptions, Menu } from "electron";
import { dirname, join } from "path";

import { getSettings, initIpc } from "./ipcMain";
import { IS_VANILLA } from "./utils/constants";

console.log("[Vencord] Starting up...");

// Our injector file at app/index.js
const injectorPath = require.main!.filename;

// special discord_arch_electron injection method
const asarName = require.main!.path.endsWith("app.asar") ? "_app.asar" : "app.asar";

// The original app.asar
const asarPath = join(dirname(injectorPath), "..", asarName);

const discordPkg = require(join(asarPath, "package.json"));
require.main!.filename = join(asarPath, discordPkg.main);

// @ts-ignore Untyped method? Dies from cringe
app.setAppPath(asarPath);

if (!IS_VANILLA) {
    const settings = getSettings();

    // Repatch after host updates on Windows
    if (process.platform === "win32") {
        require("./patchWin32Updater");

        if (settings.winCtrlQ) {
            const originalBuild = Menu.buildFromTemplate;
            Menu.buildFromTemplate = function (template) {
                if (template[0]?.label === "&File") {
                    const { submenu } = template[0];
                    if (Array.isArray(submenu)) {
                        submenu.push({
                            label: "Quit (Hidden)",
                            visible: false,
                            acceleratorWorksWhenHidden: true,
                            accelerator: "Control+Q",
                            click: () => app.quit()
                        });
                    }
                }
                return originalBuild.call(this, template);
            };
        }
    }

    class BrowserWindow extends electron.BrowserWindow {
        constructor(options: BrowserWindowConstructorOptions) {
            if (options?.webPreferences?.preload && options.title) {
                const original = options.webPreferences.preload;
                options.webPreferences.preload = join(__dirname, "preload.js");
                options.webPreferences.sandbox = false;
                if (settings.frameless) {
                    options.frame = false;
                } else if (process.platform === "win32" && settings.winNativeTitleBar) {
                    delete options.frame;
                }

                // This causes electron to freeze / white screen for some people
                if ((settings as any).transparentUNSAFE_USE_AT_OWN_RISK) {
                    options.transparent = true;
                    options.backgroundColor = "#00000000";
                }

                if (settings.macosTranslucency) {
                    options.backgroundColor = "#00000000";
                    options.vibrancy = "sidebar";
                }

                process.env.DISCORD_PRELOAD = original;

                super(options);
                initIpc(this);
            } else super(options);
        }
    }
    Object.assign(BrowserWindow, electron.BrowserWindow);
    // esbuild may rename our BrowserWindow, which leads to it being excluded
    // from getFocusedWindow(), so this is necessary
    // https://github.com/discord/electron/blob/13-x-y/lib/browser/api/browser-window.ts#L60-L62
    Object.defineProperty(BrowserWindow, "name", { value: "BrowserWindow", configurable: true });

    // Replace electrons exports with our custom BrowserWindow
    const electronPath = require.resolve("electron");
    delete require.cache[electronPath]!.exports;
    require.cache[electronPath]!.exports = {
        ...electron,
        BrowserWindow
    };

    // Patch appSettings to force enable devtools and optionally disable min size
    onceDefined(global, "appSettings", s => {
        s.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
        if (settings.disableMinSize) {
            s.set("MIN_WIDTH", 0);
            s.set("MIN_HEIGHT", 0);
        } else {
            s.set("MIN_WIDTH", 940);
            s.set("MIN_HEIGHT", 500);
        }
    });

    process.env.DATA_DIR = join(app.getPath("userData"), "..", "Vencord");
} else {
    console.log("[Vencord] Running in vanilla mode. Not loading Vencord");
}

console.log("[Vencord] Loading original Discord app.asar");
require(require.main!.filename);
