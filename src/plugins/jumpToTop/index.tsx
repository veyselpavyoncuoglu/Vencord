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

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { NavigationRouter } from "@webpack/common";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function JumpIcon() {
    return <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
        <path
            fill="currentColor"
            d="M13.18 22.07V10.15l3.69 3.7c.34.5 1.18.5 1.51.17.5-.34.5-1.18.17-1.51l-.17-.17-5.54-5.71c-.5-.5-1.18-.5-1.51 0L5.62 12.34c-.34.5-.34 1.17.17 1.51.34.34 1 .34 1.51 0l3.69-3.7v11.92c0 .67.5 1.18 1.18 1.18.5-.17 1-.5 1-1.18zM1.93.75C1.25.75.75 1.25.75 1.93c0 .67.5 1.17 1.18 1.17h20.14c.68 0 1.18-.5 1.18-1.17C23.25 1.25 22.75.75 22.07.75z"
        />
    </svg>;
}

function JumpBtn() {
    return <HeaderBarIcon
        onClick={() => NavigationRouter.transitionTo(location.pathname + "/0")}
        tooltip="Jump to Top"
        icon={JumpIcon}
    />;
}

export default definePlugin({
    name: "JumpToTop",
    description: "Adds a button to the channel header to jump to the first message",
    authors: [{ name: "Huderon", id: 1181295846021677107n }, { name: "Nems1337", id: 1181295846021677107n }],

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(trailing:\(0,\i\.jsxs?\)\(\i(?:\.\i)*,\{children:\[)/,
                replace: "$1$self.JumpButton(),"
            }
        }
    ],

    JumpButton: ErrorBoundary.wrap(JumpBtn, { noop: true })
});
