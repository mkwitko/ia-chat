import { ExternalLink, Mail, MessageCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HELP_URL } from '@/lib/config';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import { LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { Note, Section } from '../screens/section';
import { CommonCopy } from '../setup/setup-copy';
import { searchHelp } from './help-search';
import { SupportCopy as Copy } from './support-copy';
import { useHelpIndex, useSupport, type Support } from './support-api';
import { emailLink, whatsappLink } from './support-link';

const ARTICLE_PATH = '/ajuda/';
const LINK_BUTTON = cn(buttonVariants({ variant: 'outline' }), 'h-11 justify-start gap-2 px-4');

/** S-07 (RF-91): help center search first, then a prefilled message to support. */
export function SupportScreen() {
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <p className="px-4 pb-2 text-muted-foreground md:px-0">{Copy.intro}</p>
      {HELP_URL ? <HelpSearch /> : null}
      <Contact />
    </Screen>
  );
}

function HelpSearch() {
  const [query, setQuery] = useState('');
  const index = useHelpIndex();
  const results = index.data ? searchHelp(index.data, query) : [];
  return (
    <Section title={Copy.searchLabel}>
      <div className="relative px-4 md:px-0">
        <Search
          className="pointer-events-none absolute top-3.5 left-7 size-4 text-muted-foreground md:left-3"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label={Copy.searchLabel}
          placeholder={Copy.searchPlaceholder}
          className="pl-9"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>
      {index.isError ? <p className="px-4 pt-3 md:px-0">{Copy.indexFailed}</p> : null}
      <Results items={results} searched={Boolean(query.trim())} />
      <a
        href={HELP_URL}
        target="_blank"
        rel="noreferrer"
        className="mx-4 mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline md:mx-0"
      >
        {Copy.openCenter}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </Section>
  );
}

function Results({
  items,
  searched,
}: Readonly<{ items: ReturnType<typeof searchHelp>; searched: boolean }>) {
  if (!searched) return null;
  if (items.length === 0) return <p className="px-4 pt-3 md:px-0">{Copy.noResults}</p>;
  return (
    <ul className="mt-3 divide-y border-y bg-card md:rounded-xl md:border">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={new URL(`${ARTICLE_PATH}${item.id}`, HELP_URL).toString()}
            target="_blank"
            rel="noreferrer"
            className="block px-4 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="block font-medium">{item.title}</span>
            <span className="block text-sm text-muted-foreground">{item.summary}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Contact() {
  const support = useSupport();
  const { pathname } = useLocation();
  return (
    <Section title={Copy.contactTitle}>
      <Note>{Copy.contactNote}</Note>
      {support.isError ? (
        <LoadError
          message={Copy.loadFailed}
          onRetry={() => {
            void support.refetch();
          }}
        />
      ) : null}
      {support.data ? <Channels support={support.data} page={pathname} /> : null}
    </Section>
  );
}

function Channels({ support, page }: Readonly<{ support: Support; page: string }>) {
  const context = { ...support.context, page };
  const { whatsapp, email } = support;
  if (!whatsapp && !email) return <p className="px-4 md:px-0">{Copy.noChannel}</p>;
  return (
    <div className="grid gap-3 px-4 sm:grid-cols-2 md:px-0">
      {whatsapp ? (
        <a
          href={whatsappLink(whatsapp, context)}
          target="_blank"
          rel="noreferrer"
          className={LINK_BUTTON}
        >
          <MessageCircle aria-hidden="true" />
          {Copy.whatsapp}
        </a>
      ) : null}
      {email ? (
        <a href={emailLink(email, context)} className={LINK_BUTTON}>
          <Mail aria-hidden="true" />
          {Copy.email}
        </a>
      ) : null}
    </div>
  );
}
