import { ChannelKind, type Tx } from '@app/db';
import { createCloudClient } from './cloud-api/client.ts';
import { tokenOf, type SenderConfig } from './sender.ts';
import { createWahaClient } from './waha/client.ts';

const NOT_CLOUD = 'media can only be fetched from a Cloud API channel with a token';
const NO_GATEWAY = 'media of a QR code channel needs WAHA_URL and WAHA_API_KEY';

/** Downloads one inbound media (RF-24). The channel is read in `tx`; the network call is made outside it. */
export type MediaDownload = (mediaId: string) => Promise<{ bytes: Buffer; mime: string }>;
export type MediaDownloadFor = (tx: Tx, channelId: string) => Promise<MediaDownload>;

export function createMediaDownloadFor(
  config: Pick<SenderConfig, 'accessToken' | 'readChannelToken' | 'waha'>,
): MediaDownloadFor {
  return async (tx, channelId) => {
    const channel = await tx.channel.findUniqueOrThrow({ where: { id: channelId } });
    if (channel.kind === ChannelKind.qr_gateway) {
      if (!config.waha || !channel.gatewaySession) throw new Error(NO_GATEWAY);
      return createWahaClient({ ...config.waha, session: channel.gatewaySession }).downloadMedia;
    }
    const accessToken = tokenOf(config, channel.accessTokenEnc);
    if (!channel.phoneNumberId || !accessToken) throw new Error(NOT_CLOUD);
    return createCloudClient({ phoneNumberId: channel.phoneNumberId, accessToken }).downloadMedia;
  };
}
