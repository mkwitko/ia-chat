import { ConversationCopy as Copy } from './inbox-copy';
import { MediaState, type MessageView } from './inbox-api';

// E-10: what the patient sent, in the thread. The file comes from the API's media route
// (a short-lived signed link); the transcript is the message text, shown by the bubble.

const NOTE = 'text-sm text-muted-foreground';

export function MessageMedia({ message }: Readonly<{ message: MessageView }>) {
  const { media } = message;
  if (!media) return null;
  if (media.state === MediaState.unavailable)
    return <p className={NOTE}>{Copy.mediaUnavailable}</p>;
  if (media.state === MediaState.pending || !media.url)
    return <p className={NOTE}>{Copy.mediaPending}</p>;
  if (media.mime.startsWith('audio/'))
    return (
      <audio
        controls
        preload="none"
        src={media.url}
        aria-label={Copy.audioPlayer}
        className="my-1 w-full"
      />
    );
  if (media.mime.startsWith('image/'))
    return (
      <a href={media.url} target="_blank" rel="noreferrer">
        <img
          src={media.url}
          alt={Copy.imageAlt}
          loading="lazy"
          className="my-1 max-h-64 rounded-lg"
        />
      </a>
    );
  return (
    <a href={media.url} target="_blank" rel="noreferrer" className="text-sm underline">
      {Copy.openDocument}
    </a>
  );
}
