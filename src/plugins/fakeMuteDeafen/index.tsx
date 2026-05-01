/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

import managedStyle from "./style.css?managed";

const PanelButton = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");

const settings = definePluginSettings({
    active: {
        type: OptionType.BOOLEAN,
        description: "Freeze your mute/deafen state so Discord keeps seeing you as muted & deafened",
        default: false
    }
});

let patched = false;

function applyPatch() {
    if (patched) return;
    patched = true;

    const text = new TextDecoder("utf-8");
    const origSend = WebSocket.prototype.send;
    (WebSocket.prototype as any)._vcOrigSend = origSend;

    WebSocket.prototype.send = function (data: any) {
        if (Object.prototype.toString.call(data) === "[object ArrayBuffer]") {
            const decoded = text.decode(data);
            if (decoded.includes("self_deaf")) {
                const modified = decoded.replace('"self_mute":false', '"self_mute":true');
                data = new TextEncoder().encode(modified).buffer;
            }
        }
        origSend.apply(this, [data]);
    };
}

function removePatch() {
    if (!patched) return;
    patched = false;
    const orig = (WebSocket.prototype as any)._vcOrigSend;
    if (orig) WebSocket.prototype.send = orig;
    delete (WebSocket.prototype as any)._vcOrigSend;
}

function ToggleIcon() {
    const { active } = settings.use(["active"]);
    return (
        <svg width="20" height="20" viewBox="0 0 24 24">
            <path
                fill={active ? "var(--status-danger)" : "currentColor"}
                mask={active ? "url(#vc-fakemd-mask)" : undefined}
                d="M6.16 3.5A12.82 12.82 0 0 1 12 2a12.82 12.82 0 0 1 5.84 1.5l.42-.88a.5.5 0 0 1 .91.42l-.42.88A11 11 0 0 1 23 12v4.75A2.75 2.75 0 0 1 20.25 19.5h-1.5a1.75 1.75 0 0 1-1.75-1.75v-4.5c0-.97.78-1.75 1.75-1.75h1.5c.17 0 .33.02.49.05A7.5 7.5 0 0 0 4.26 11.55c.16-.03.32-.05.49-.05h1.5c.97 0 1.75.78 1.75 1.75v4.5c0 .97-.78 1.75-1.75 1.75h-1.5A2.75 2.75 0 0 1 1 16.75V12a11 11 0 0 1 4.25-8.08l-.42-.88a.5.5 0 0 1 .91-.42l.42.88zM12 17a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0v-1a3 3 0 0 0-3-3z"
            />
            {active && <>
                <path fill="var(--status-danger)" d="M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4z" />
                <mask id="vc-fakemd-mask">
                    <rect fill="white" x="0" y="0" width="24" height="24" />
                    <path fill="black" d="M23.27 4.73 19.27.73-.27 20.27 3.73 24.27z" />
                </mask>
            </>}
        </svg>
    );
}

function ToggleBtn(props: { nameplate?: any; }) {
    const { active } = settings.use(["active"]);
    return (
        <PanelButton
            tooltipText={active ? "Disable Fake Mute & Deafen" : "Enable Fake Mute & Deafen"}
            icon={ToggleIcon}
            role="switch"
            aria-checked={active}
            redGlow={active}
            plated={props?.nameplate != null}
            onClick={() => {
                const next = !settings.store.active;
                settings.store.active = next;
                if (next) applyPatch();
                else removePatch();
            }}
        />
    );
}

export default definePlugin({
    name: "FakeMuteDeafen",
    description: "Appear muted & deafened to others while still being able to hear and speak",
    authors: [{ name: "Nems1337", id: 1181295846021677107n }],
    settings,
    managedStyle,
    enabledByDefault: true,

    patches: [
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK)",
            replacement: {
                match: /children:\[(?=.{0,200}?accountContainerRef)/,
                replace: "children:[$self.ToggleBtn(arguments[0]),"
            }
        }
    ],

    start() {
        settings.store.active = false;
    },

    stop() {
        removePatch();
    },

    ToggleBtn: ErrorBoundary.wrap(ToggleBtn, { noop: true })
});
