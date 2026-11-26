import { ChannelKind, type Tx } from '@app/db';
import { createCloudClient } from './cloud-api/client.ts';
import { tokenOf, type SenderConfig } from './sender.ts';

const NOT_CLOUD = 'media can only be fetched from a Cloud API channel with a token';

/** Downloads one inbound media (RF-24). The channel is read in `tx`; the network call is made outside it. */
export type MediaDownload = (mediaId: string) => Promise<{ bytes: Buffer; mime: string }>;
export type MediaDownloadFor = (tx: Tx, channelId: string) => Promise<MediaDownload>;

export function createMediaDownloadFor(
  config: Pick<SenderConfig, 'accessToken' | 'readChannelToken'>,
): MediaDownloadFor {
  return async (tx, channelId) => {
    const channel = await tx.channel.findUniqueOrThrow({ where: { id: channelId } });
    const accessToken = tokenOf(config, channel.accessTokenEnc);
    if (channel.kind !== ChannelKind.cloud_api || !channel.phoneNumberId || !accessToken)
      throw new Error(NOT_CLOUD);
    return createCloudClient({ phoneNumberId: channel.phoneNumberId, accessToken }).downloadMedia;
  };
}
