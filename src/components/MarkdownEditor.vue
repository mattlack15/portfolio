<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import EditorIcon from './EditorIcon.vue';
import {basicSetup, EditorView} from 'codemirror';
import {EditorState, Prec} from '@codemirror/state';
import {keymap} from '@codemirror/view';
import {indentWithTab} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
import {StreamLanguage} from '@codemirror/language';
import {gas} from '@codemirror/legacy-modes/mode/gas';
import {pioasmParser} from '@/editor/pioasm';
import {
  autocompletion,
  CompletionContext,
  snippetCompletion,
  startCompletion,
  type Completion,
} from '@codemirror/autocomplete';

const props = defineProps<{
  modelValue: string;
  uploading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'save'): void;
  (event: 'image-drop', file: File, position: number): void;
}>();

const editorHost = ref<HTMLDivElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
let editor: EditorView | null = null;
const assemblyLanguage = StreamLanguage.define(gas);
const pioasmLanguage = StreamLanguage.define(pioasmParser);
const assemblyAliases = new Set(['asm', 'assembly', 'gas', 'x86asm']);
const pioasmAliases = new Set(['pioasm', 'pio']);

const words = computed(() => {
  const content = props.modelValue.trim();
  return content ? content.split(/\s+/).length : 0;
});

const markdownCompletions: Completion[] = [
  snippetCompletion('# ${Heading}', {label: '/heading 1', detail: 'Large section heading', type: 'keyword'}),
  snippetCompletion('## ${Heading}', {label: '/heading 2', detail: 'Section heading', type: 'keyword'}),
  snippetCompletion('### ${Heading}', {label: '/heading 3', detail: 'Small section heading', type: 'keyword'}),
  snippetCompletion('- ${List item}', {label: '/bullet list', detail: 'Bulleted list', type: 'keyword'}),
  snippetCompletion('1. ${List item}', {label: '/numbered list', detail: 'Numbered list', type: 'keyword'}),
  snippetCompletion('- [ ] ${Task}', {label: '/task', detail: 'Task list item', type: 'keyword'}),
  snippetCompletion('> ${Quote}', {label: '/quote', detail: 'Block quote', type: 'keyword'}),
  snippetCompletion('[${Link text}](${https://example.com})', {label: '/link', detail: 'Text link', type: 'keyword'}),
  snippetCompletion('<img src="${https://example.com/image.jpg}" alt="${Image description}" />', {label: '/image', detail: 'HTML image', type: 'keyword'}),
  snippetCompletion('```\n${code}\n```', {label: '/code block', detail: 'Fenced code block', type: 'keyword'}),
  snippetCompletion('| ${Column 1} | ${Column 2} |\n| --- | --- |\n| ${Value} | ${Value} |', {label: '/table', detail: 'Two-column table', type: 'keyword'}),
  snippetCompletion('---', {label: '/divider', detail: 'Horizontal rule', type: 'keyword'}),
];

const completeMarkdown = (context: CompletionContext) => {
  const command = context.matchBefore(/\/[\w -]*/);
  if (command) return {from: command.from, options: markdownCompletions};
  if (!context.explicit) return null;
  const word = context.matchBefore(/\w*/);
  return {from: word?.from ?? context.pos, options: markdownCompletions};
};

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--editorial-ink)',
    backgroundColor: 'var(--editorial-paper)',
    fontSize: '15px',
  },
  '&.cm-focused': {outline: 'none'},
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    lineHeight: '1.75',
    overflow: 'auto',
  },
  '.cm-content': {padding: '20px 8px 35vh'},
  '.cm-line': {padding: '0 12px'},
  '.cm-gutters': {
    backgroundColor: 'var(--editorial-paper)',
    color: 'var(--editorial-muted)',
    borderRight: '1px solid var(--editorial-border)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {backgroundColor: 'var(--editorial-control)'},
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {backgroundColor: 'var(--editorial-control-hover) !important'},
  '.cm-cursor': {borderLeftColor: 'var(--editorial-ink)'},
  '.cm-tooltip': {backgroundColor: 'var(--editorial-control)', border: '1px solid var(--editorial-border)'},
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {backgroundColor: 'var(--editorial-border)', color: 'var(--editorial-ink)'},
  '.cm-panels': {backgroundColor: 'var(--editorial-control)', color: 'var(--editorial-ink)'},
  '.cm-searchMatch': {backgroundColor: 'var(--editorial-control-hover)'},
}, {dark: true});

const setSelection = (anchor: number, head = anchor) => {
  if (!editor) return;
  editor.dispatch({selection: {anchor, head}, scrollIntoView: true});
  editor.focus();
};

const wrapSelection = (before: string, after: string, placeholder: string) => {
  if (!editor) return;
  const selection = editor.state.selection.main;
  const selected = editor.state.sliceDoc(selection.from, selection.to);
  const content = selected || placeholder;
  editor.dispatch({
    changes: {from: selection.from, to: selection.to, insert: `${before}${content}${after}`},
  });
  nextTick(() => setSelection(
    selection.from + before.length,
    selection.from + before.length + content.length,
  ));
};

const prefixLines = (prefix: string) => {
  if (!editor) return;
  const selection = editor.state.selection.main;
  const firstLine = editor.state.doc.lineAt(selection.from);
  const lastLine = editor.state.doc.lineAt(selection.to);
  const changes = [];
  for (let lineNumber = firstLine.number; lineNumber <= lastLine.number; lineNumber += 1) {
    changes.push({from: editor.state.doc.line(lineNumber).from, insert: prefix});
  }
  editor.dispatch({changes});
  editor.focus();
};

const insertText = (text: string, position?: number) => {
  if (!editor) return;
  const selection = editor.state.selection.main;
  const insertionStart = position === undefined
    ? selection.from
    : Math.max(0, Math.min(position, editor.state.doc.length));
  const insertionEnd = position === undefined ? selection.to : insertionStart;
  editor.dispatch({
    changes: {from: insertionStart, to: insertionEnd, insert: text},
    selection: {anchor: insertionStart + text.length},
    scrollIntoView: true,
  });
  editor.focus();
};

const applyFormat = (format: string) => {
  switch (format) {
    case 'bold': wrapSelection('**', '**', 'bold text'); break;
    case 'italic': wrapSelection('_', '_', 'italic text'); break;
    case 'code': wrapSelection('`', '`', 'code'); break;
    case 'link': wrapSelection('[', '](https://example.com)', 'link text'); break;
    case 'heading': prefixLines('## '); break;
    case 'quote': prefixLines('> '); break;
    case 'bullet': prefixLines('- '); break;
    case 'numbered': prefixLines('1. '); break;
    case 'task': prefixLines('- [ ] '); break;
    case 'codeblock': wrapSelection('```\n', '\n```', 'code'); break;
  }
};

const handleDrop = (event: DragEvent) => {
  const file = Array.from(event.dataTransfer?.files ?? []).find((candidate) => candidate.type.startsWith('image/'));
  if (!file) return false;
  event.preventDefault();
  const position = editor?.posAtCoords({x: event.clientX, y: event.clientY})
    ?? editor?.state.selection.main.from
    ?? 0;
  editor?.dispatch({selection: {anchor: position}, scrollIntoView: true});
  emit('image-drop', file, position);
  return true;
};

const handleImageSelection = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('image-drop', file, editor?.state.selection.main.from ?? 0);
  input.value = '';
};

const insertSlashAndComplete = (view: EditorView) => {
  const selection = view.state.selection.main;
  view.dispatch({
    changes: {from: selection.from, to: selection.to, insert: '/'},
    selection: {anchor: selection.from + 1},
  });
  startCompletion(view);
  return true;
};

onMounted(() => {
  if (!editorHost.value) return;
  editor = new EditorView({
    parent: editorHost.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        markdown({
          codeLanguages: (info) => {
            const language = info.trim().toLowerCase();
            if (pioasmAliases.has(language)) return pioasmLanguage;
            return assemblyAliases.has(language) ? assemblyLanguage : null;
          },
        }),
        autocompletion({override: [completeMarkdown], activateOnTyping: true}),
        Prec.high(keymap.of([
          {key: 'Mod-s', preventDefault: true, run: () => { emit('save'); return true; }},
          {key: '/', run: insertSlashAndComplete},
          indentWithTab,
        ])),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({'aria-label':'Project description'}),
        editorTheme,
        EditorView.domEventHandlers({drop: handleDrop}),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit('update:modelValue', update.state.doc.toString());
        }),
      ],
    }),
  });
  editor.focus();
});

watch(() => props.modelValue, (value) => {
  if (!editor || value === editor.state.doc.toString()) return;
  editor.dispatch({changes: {from: 0, to: editor.state.doc.length, insert: value}});
});

onBeforeUnmount(() => editor?.destroy());

defineExpose({insertText, focus: () => editor?.focus()});
</script>

<template>
  <div class="markdown-editor">
    <div class="editor-toolbar" role="toolbar" aria-label="Markdown formatting">
      <button type="button" title="Heading" aria-label="Add heading" @click="applyFormat('heading')">
        <EditorIcon name="heading" />
      </button>
      <button type="button" title="Bold" aria-label="Bold" @click="applyFormat('bold')">
        <EditorIcon name="bold" />
      </button>
      <button type="button" title="Italic" aria-label="Italic" @click="applyFormat('italic')">
        <EditorIcon name="italic" />
      </button>
      <button type="button" title="Link" aria-label="Insert link" @click="applyFormat('link')">
        <EditorIcon name="link" />
      </button>
      <button type="button" title="Inline code" aria-label="Inline code" @click="applyFormat('code')">
        <EditorIcon name="code" />
      </button>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <button type="button" title="Bulleted list" aria-label="Bulleted list" @click="applyFormat('bullet')">
        <EditorIcon name="bullet" />
      </button>
      <button type="button" title="Numbered list" aria-label="Numbered list" @click="applyFormat('numbered')">
        <EditorIcon name="numbered" />
      </button>
      <button type="button" title="Task list" aria-label="Task list" @click="applyFormat('task')">
        <EditorIcon name="task" />
      </button>
      <button type="button" title="Quote" aria-label="Block quote" @click="applyFormat('quote')">
        <EditorIcon name="quote" />
      </button>
      <button type="button" title="Code block" aria-label="Code block" @click="applyFormat('codeblock')">
        <EditorIcon name="codeblock" />
      </button>
      <button type="button" title="Upload image" aria-label="Upload image" :disabled="uploading" @click="imageInput?.click()">
        <EditorIcon name="image" />
      </button>
      <input ref="imageInput" class="sr-only" type="file" accept="image/*" @change="handleImageSelection" />
      <div class="editor-meta">
        <span v-if="uploading" class="uploading"><EditorIcon name="refresh" /> Uploading image</span>
        <span>{{ words }} {{ words === 1 ? 'word' : 'words' }}</span>
      </div>
    </div>
    <div ref="editorHost" class="editor-host"></div>
  </div>
</template>

<style scoped>
.markdown-editor {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: var(--editorial-paper);
}

.editor-toolbar {
  display: flex;
  min-height: 48px;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  border-bottom: 1px solid var(--editorial-border);
  padding: 6px 10px;
  background: var(--editorial-control);
}

.editor-toolbar button {
  display: grid;
  height: 32px;
  width: 32px;
  cursor: pointer;
  place-items: center;
  border-radius: 6px;
  color: var(--editorial-muted);
  transition: background-color 120ms ease, color 120ms ease;
}

.editor-toolbar button:hover,
.editor-toolbar button:focus-visible {
  background: var(--editorial-control-hover);
  color: var(--editorial-ink);
  outline: 2px solid var(--editorial-link); outline-offset: -2px;
}

.editor-toolbar button:disabled { cursor: wait; opacity: .45; }

.toolbar-divider {
  height: 22px;
  width: 1px;
  margin: 0 5px;
  background: var(--editorial-border);
}

.editor-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
  color: var(--editorial-muted);
  font-size: 12px;
}

.uploading {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--editorial-ink);
}

.editor-host {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

:deep(.cm-editor) { height: 100%; }

@media (max-width: 640px) {
  .editor-meta { width: 100%; margin: 3px 2px 0; }
}
</style>
