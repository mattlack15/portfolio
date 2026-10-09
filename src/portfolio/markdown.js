import {Marked} from 'marked';
import {markedHighlight} from 'marked-highlight';
import hljs from 'highlight.js';
import {pioasmHighlightLanguage} from '@/editor/pioasm';

hljs.registerLanguage('pioasm', pioasmHighlightLanguage);
const aliases = {asm:'x86asm', assembly:'x86asm', gas:'x86asm', pio:'pioasm'};
const parser = new Marked(markedHighlight({langPrefix:'hljs language-',highlight(code,lang) {
  const requested = lang.trim().toLowerCase();
  const language = aliases[requested] || requested;
  return hljs.highlight(code,{language:hljs.getLanguage(language)?language:'plaintext'}).value;
}}));
export function renderMarkdown(text = '') {
  return parser.parse(text).replace(/<(\/?)h([1-6])(\b[^>]*)>/g,(_,slash,depth,attributes)=>`<${slash}h${Math.min(6,Number(depth)+1)}${attributes}>`);
}
