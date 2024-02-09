// *****************************************************************************
// Copyright (C) 2024 Typefox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
import * as Docker from 'dockerode';
import { injectable, interfaces } from '@theia/core/shared/inversify';
import { ContainerCreationContribution } from '../docker-container-service';
import { DevContainerConfiguration, ImageContainer } from '../devcontainer-file';

export function registerContainerCreationContributions(bind: interfaces.Bind): void {
    bind(ContainerCreationContribution).to(ImageFileContribution).inSingletonScope();
    bind(ContainerCreationContribution).to(ForwardPortsContribution).inSingletonScope();
    bind(ContainerCreationContribution).to(MountsContribution).inSingletonScope();
}

@injectable()
export class ImageFileContribution implements ContainerCreationContribution {
    async handleContainerCreation(createOptions: Docker.ContainerCreateOptions, containerConfig: ImageContainer, api: Docker): Promise<void> {
        // check if image container
        if (containerConfig.image) {
            await api.pull(containerConfig.image);
            createOptions.Image = containerConfig.image;
        }
    }
}

@injectable()
export class ForwardPortsContribution implements ContainerCreationContribution {
    async handleContainerCreation(createOptions: Docker.ContainerCreateOptions, containerConfig: DevContainerConfiguration, api: Docker): Promise<void> {
        if (!containerConfig.forwardPorts) {
            return;
        }

        for (const port of containerConfig.forwardPorts) {
            let portKey: string;
            let hostPort: string;
            if (typeof port === 'string') {
                const parts = port.split(':');
                portKey = isNaN(+parts[0]) ? parts[0] : `${parts[0]}/tcp`;
                hostPort = parts[1] ?? parts[0];
            } else {
                portKey = `${port}/tcp`;
                hostPort = port.toString();
            }
            createOptions.ExposedPorts![portKey] = {};
            createOptions.HostConfig!.PortBindings[portKey] = [{ HostPort: hostPort }];
        }

    }

}

@injectable()
export class MountsContribution implements ContainerCreationContribution {
    async handleContainerCreation(createOptions: Docker.ContainerCreateOptions, containerConfig: DevContainerConfiguration, api: Docker): Promise<void> {
        if (!containerConfig.mounts) {
            return;
        }

        createOptions.HostConfig!.Mounts!.push(...containerConfig.mounts
            .map(mount => typeof mount === 'string' ?
                this.parseMountString(mount) :
                { Source: mount.source, Target: mount.target, Type: mount.type ?? 'bind' }));
    }

    parseMountString(mount: string): Docker.MountSettings {
        const parts = mount.split(',');
        return {
            Source: parts.find(part => part.startsWith('source=') || part.startsWith('src='))?.split('=')[1]!,
            Target: parts.find(part => part.startsWith('target=') || part.startsWith('dst='))?.split('=')[1]!,
            Type: (parts.find(part => part.startsWith('type='))?.split('=')[1] ?? 'bind') as Docker.MountType
        };
    }
}
