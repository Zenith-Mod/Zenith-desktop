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

import type { ILanguageRegistration } from "@vap/shiki";

export const VPC_REPO = "Vap0r1ze/vapcord";
export const VPC_REPO_COMMIT = "88a7032a59cca40da170926651b08201ea3b965a";
export const vpcRepoAssets = `https://raw.githubusercontent.com/${VPC_REPO}/${VPC_REPO_COMMIT}/assets/shiki-codeblocks`;
export const vpcRepoGrammar = (fileName: string) => `${vpcRepoAssets}/${fileName}`;
export const vpcRepoLanguages = `${vpcRepoAssets}/languages.json`;

export interface Language {
    name: string;
    id: string;
    devicon?: string;
    grammarUrl: string;
    grammar?: ILanguageRegistration["grammar"];
    scopeName: string;
    aliases?: string[];
    custom?: boolean;
}

export interface LanguageJson {
    name: string;
    id: string;
    fileName: string;
    devicon?: string;
    scopeName: string;
    aliases?: string[];
}

export const languages: Record<string, Language> = {};

export async function loadLanguages() {
    const langsJson: LanguageJson[] = await (await fetch(vpcRepoLanguages)).json();
    const loadedLanguages = Object.fromEntries(
        langsJson.map(lang => [lang.id, {
            ...lang,
            grammarUrl: vpcRepoGrammar(lang.fileName),
        }])
    );
    Object.assign(languages, loadedLanguages);
}

export async function getGrammar(lang: Language): Promise<NonNullable<ILanguageRegistration["grammar"]>> {
    if (lang.grammar)
        return lang.grammar;
    return (await fetch(lang.grammarUrl)).json();
}

const aliasCache = new Map<string, Language>();

export function resolveLang(idOrAlias: string) {
    if (Object.hasOwn(languages, idOrAlias)) return languages[idOrAlias];

    const lang = Object.values(languages).find(lang => lang.aliases?.includes(idOrAlias));

    if (!lang) return null;

    aliasCache.set(idOrAlias, lang);
    return lang;
}
