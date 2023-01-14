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

import { execFileSync, execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { fileURLToPath } from "url";

const BASE_URL = "https://github.com/Vencord/Installer/releases/latest/download/";

const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_DIR = join(DIST_DIR, "dist", "Installer");
const ETAG_FILE = join(FILE_DIR, "etag.txt");

function getFilename() {
    switch (process.platform) {
        case "win32":
            return "VencordInstaller.exe";
        case "darwin":
            return "VencordInstaller.MacOS.zip";
        case "linux":
            return "VencordInstaller-" + (process.env.WAYLAND_DISPLAY ? "wayland" : "x11");
        default:
            throw new Error("Unsupported platform: " + process.platform);
    }
}

async function ensureBinary() {
    const filename = getFilename();
    console.log("Downloading " + filename);

    mkdirSync(FILE_DIR, { recursive: true });

    const installerFile = join(FILE_DIR, filename);
    const etag = existsSync(installerFile) && existsSync(ETAG_FILE) ? readFileSync(ETAG_FILE, "utf-8") : null;

    const res = await fetch(BASE_URL + filename, {
        headers: {
            "User-Agent": "Vencord (https://github.com/Vendicated/Vencord)",
            "If-None-Match": etag
        }
    });
    if (res.status === 304) {
        console.log("Up to date, not redownloading!");
        return installerFile;
    }

    if (!res.ok) {
        throw new Error(`Failed to download installer: ${res.status} ${res.statusText}`);
    }

    const newEtag = res.headers.get("etag");
    writeFileSync(ETAG_FILE, newEtag);

    if (process.platform === "darwin") {
        const zip = new Uint8Array(await res.arrayBuffer());

        const ff = await import("fflate");
        const INSTALLER_PATH = "VencordInstaller.app/Contents/MacOS/VencordInstaller";
        const bytes = ff.unzipSync(zip, { filter: f => f.name === INSTALLER_PATH })[INSTALLER_PATH];
        writeFileSync(installerFile, bytes, { mode: 0o755 });

        console.log("Downloaded and extracted installer");
        console.log("Overriding security policy for installer binary (this is required to run it)");

        const logAndRun = cmd => {
            console.log("Running", cmd);
            execSync(cmd);
        };
        logAndRun(`sudo spctl --add '${installerFile}' --label "Vencord Installer"`);
        logAndRun(`sudo xattr -d com.apple.quarantine '${installerFile}'`);
    } else {
        // WHY DOES NODE FETCH RETURN A WEB STREAM OH MY GOD
        const body = Readable.fromWeb(res.body);
        await finished(body.pipe(createWriteStream(installerFile, {
            mode: 0o755,
            autoClose: true
        })));
    }

    console.log("Finished downloading!");

    return installerFile;
}


console.log("Now running Installer...");

const installerBin = await ensureBinary();

execFileSync(installerBin, {
    stdio: "inherit",
    env: {
        ...process.env,
        VENCORD_USER_DATA_DIR: DIST_DIR,
        VENCORD_DEV_INSTALL: "1"
    }
});

Buffer.from("").buffer;
