import { ChannelState } from '@app/channels';
import { ChannelStatus, type Tx } from '@app/db';

const CHANNEL_STATUS: Readonly<Record<ChannelState, ChannelStatus>> = {
  [ChannelState.connected]: ChannelStatus.connected,
  [ChannelState.disconnected]: ChannelStatus.disconnected,
  [ChannelState.restricted]: ChannelStatus.restricted,
};

/**
 * Applies the provider's connection state. True when a connected channel just went down
 * (RF-29: alert and push once). A channel still pairing stays pending: a session asking for a
 * QR code before the first scan is not a drop.
 */
export async function applyChannelState(
  tx: Tx,
  channelId: string,
  state: ChannelState,
): Promise<boolean> {
  const { status } = await tx.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { status: true },
  });
  const next = CHANNEL_STATUS[state];
  if (next === status) return false;
  if (next === ChannelStatus.disconnected && status === ChannelStatus.pending) return false;
  await tx.channel.update({ where: { id: channelId }, data: { status: next } });
  return status === ChannelStatus.connected;
}
