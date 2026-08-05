import type {StreamParser} from '@codemirror/language';
import type {LanguageFn} from 'highlight.js';

type PioasmState = {
  blockComment: boolean;
  embeddedCode: boolean;
};

const instructions = new Set([
  'jmp', 'wait', 'in', 'out', 'push', 'pull', 'mov', 'irq', 'set', 'nop',
]);

const registers = new Set([
  'x', 'y', 'pins', 'pindirs', 'pc', 'exec', 'isr', 'osr', 'status',
  'rxfifo', 'txfifo',
]);

const modifiers = new Set([
  'pin', 'gpio', 'osre', 'jmppin', 'prev', 'next', 'null', 'block', 'noblock',
  'iffull', 'ifempty', 'rel', 'clear', 'nowait', 'opt', 'optional', 'side',
  'sideset', 'side_set', 'public', 'txrx', 'tx', 'rx', 'txput', 'txget',
  'putget', 'rp2040', 'rp2350', 'left', 'right', 'auto', 'manual', 'one', 'zero',
]);

const instructionsList = [...instructions].join(' ');
const registersList = [...registers].join(' ');
const modifiersList = [...modifiers].join(' ');

export const pioasmParser: StreamParser<PioasmState> = {
  name: 'pioasm',
  startState: () => ({blockComment: false, embeddedCode: false}),
  token(stream, state) {
    if (state.embeddedCode) {
      if (stream.match(/^.*?%}/)) state.embeddedCode = false;
      else stream.skipToEnd();
      return 'string';
    }

    if (state.blockComment) {
      while (!stream.eol()) {
        if (stream.match('*/')) {
          state.blockComment = false;
          break;
        }
        stream.next();
      }
      return 'comment';
    }

    if (stream.eatSpace()) return null;

    if (stream.match(/^%\s*[^%\n{]+\s*\{/)) {
      state.embeddedCode = true;
      return 'meta';
    }
    if (stream.match('/*')) {
      state.blockComment = true;
      while (!stream.eol()) {
        if (stream.match('*/')) {
          state.blockComment = false;
          break;
        }
        stream.next();
      }
      return 'comment';
    }
    if (stream.match(/^(?:;|\/\/).*/)) return 'comment';
    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return 'string';
    if (stream.match(/^\.(?:program|wrap_target|wrap|word|define|side_set|origin|lang_opt|pio_version|clock_div|fifo|mov_status|set|out|in)\b/i)) return 'meta';
    if (stream.match(/^\.[A-Za-z_][A-Za-z0-9_]*/)) return 'meta';
    if (stream.match(/^(?:0x[\da-f]+|0b[01]+|(?:\d+\.\d*|\.\d+)|\d+)\b/i)) return 'number';
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*(?=\s*:)/)) return 'labelName';

    const identifier = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      const word = identifier[0].toLowerCase();
      if (instructions.has(word)) return 'keyword';
      if (registers.has(word)) return 'variableName.special';
      if (modifiers.has(word)) return 'atom';
      return 'variableName';
    }

    if (stream.match(/^(?:::|--|!=|<<|>>|[+\-*\/|&^!~<>=])/)) return 'operator';
    if (stream.match(/^[()[\],:]/)) return 'punctuation';

    stream.next();
    return null;
  },
};

export const pioasmHighlightLanguage: LanguageFn = (hljs) => ({
  name: 'PIO Assembly',
  aliases: ['pioasm', 'pio'],
  case_insensitive: true,
  keywords: {
    keyword: instructionsList,
    built_in: registersList,
    literal: modifiersList,
  },
  contains: [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.COMMENT(';', '$'),
    {
      scope: 'meta',
      begin: /%\s*[^%\n{]+\s*\{/,
      end: /%}/,
    },
    {
      scope: 'meta',
      match: /\.(?:program|wrap_target|wrap|word|define|side_set|origin|lang_opt|pio_version|clock_div|fifo|mov_status|set|out|in)\b/,
    },
    {
      scope: 'symbol',
      match: /[A-Za-z_][A-Za-z0-9_]*(?=\s*:)/,
    },
    {
      scope: 'number',
      variants: [
        {begin: /\b0x[\da-f]+/},
        {begin: /\b0b[01]+/},
        {begin: /(?:\b\d+\.\d*|\B\.\d+|\b\d+)/},
      ],
      relevance: 0,
    },
    hljs.QUOTE_STRING_MODE,
  ],
});
