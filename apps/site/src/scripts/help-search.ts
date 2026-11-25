import { searchHelp, type SearchItem } from '../lib/help-search.ts';

const form = document.querySelector<HTMLElement>('[data-help-search]');
const input = form?.querySelector('input');
const list = form?.querySelector('ul');
const status = form?.querySelector('[data-status]');
const ARTICLE_BASE = '/ajuda/';
const NOT_FOUND = 'Nenhum artigo encontrado. Tente outras palavras.';
const LOAD_FAILED = 'A busca não carregou. Use as categorias abaixo.';

let index: SearchItem[] | null = null;

async function load(): Promise<SearchItem[]> {
  index ??= (await (await fetch(`${ARTICLE_BASE}busca.json`)).json()) as SearchItem[];
  return index;
}

function resultItem(item: SearchItem): HTMLLIElement {
  const li = document.createElement('li');
  const link = document.createElement('a');
  link.href = `${ARTICLE_BASE}${item.id}`;
  link.textContent = item.title;
  const small = document.createElement('span');
  small.className = 'muted small';
  small.textContent = ` ${item.category}`;
  li.append(link, small);
  return li;
}

function render(results: SearchItem[], query: string) {
  list?.replaceChildren(...results.map(resultItem));
  if (status) status.textContent = query.trim() && results.length === 0 ? NOT_FOUND : '';
}

input?.addEventListener('input', () => {
  load().then(
    (items) => {
      render(searchHelp(items, input.value), input.value);
    },
    () => {
      if (status) status.textContent = LOAD_FAILED;
    },
  );
});
