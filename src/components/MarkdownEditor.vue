<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {Icon} from '@iconify/vue';
import {basicSetup, EditorView} from 'codemirror';
import {EditorState, Prec} from '@codemirror/state';
import {keymap} from '@codemirror/view';
import {indentWithTab} from '@codemirror/commands';
import {markdown} from '@codemirror/lang-markdown';
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
  (event: 'image-drop', file: File): void;
}>();

const editorHost = ref<HTMLDivElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
let editor: EditorView | null = null;

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
    color: '#e5e7eb',
    backgroundColor: '#111111',
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
    backgroundColor: '#111111',
    color: '#525252',
    borderRight: '1px solid #262626',
  },
  '.cm-activeLine, .cm-activeLineGutter': {backgroundColor: '#181818'},
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {backgroundColor: '#3f3f46 !important'},
  '.cm-cursor': {borderLeftColor: '#f5f5f5'},
  '.cm-tooltip': {backgroundColor: '#202020', border: '1px solid #404040'},
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {backgroundColor: '#404040', color: '#ffffff'},
  '.cm-panels': {backgroundColor: '#171717', color: '#e5e5e5'},
  '.cm-searchMatch': {backgroundColor: '#854d0e66'},
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

const insertText = (text: string) => {
  if (!editor) return;
  const selection = editor.state.selection.main;
  editor.dispatch({
    changes: {from: selection.from, to: selection.to, insert: text},
    selection: {anchor: selection.from + text.length},
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
  emit('image-drop', file);
  return true;
};

const handleImageSelection = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) emit('image-drop', file);
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
        markdown(),
        autocompletion({override: [completeMarkdown], activateOnTyping: true}),
        Prec.high(keymap.of([
          {key: 'Mod-s', preventDefault: true, run: () => { emit('save'); return true; }},
          {key: '/', run: insertSlashAndComplete},
          indentWithTab,
        ])),
        EditorView.lineWrapping,
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
        <Icon icon="material-symbols:title" />
      </button>
      <button type="button" title="Bold" aria-label="Bold" @click="applyFormat('bold')">
        <Icon icon="material-symbols:format-bold" />
      </button>
      <button type="button" title="Italic" aria-label="Italic" @click="applyFormat('italic')">
        <Icon icon="material-symbols:format-italic" />
      </button>
      <button type="button" title="Link" aria-label="Insert link" @click="applyFormat('link')">
        <Icon icon="material-symbols:link" />
      </button>
      <button type="button" title="Inline code" aria-label="Inline code" @click="applyFormat('code')">
        <Icon icon="material-symbols:code" />
      </button>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <button type="button" title="Bulleted list" aria-label="Bulleted list" @click="applyFormat('bullet')">
        <Icon icon="material-symbols:format-list-bulleted" />
      </button>
      <button type="button" title="Numbered list" aria-label="Numbered list" @click="applyFormat('numbered')">
        <Icon icon="material-symbols:format-list-numbered" />
      </button>
      <button type="button" title="Task list" aria-label="Task list" @click="applyFormat('task')">
        <Icon icon="material-symbols:check-box-outline" />
      </button>
      <button type="button" title="Quote" aria-label="Block quote" @click="applyFormat('quote')">
        <Icon icon="material-symbols:format-quote" />
      </button>
      <button type="button" title="Code block" aria-label="Code block" @click="applyFormat('codeblock')">
        <Icon icon="material-symbols:data-object" />
      </button>
      <button type="button" title="Upload image" aria-label="Upload image" :disabled="uploading" @click="imageInput?.click()">
        <Icon icon="material-symbols:add-photo-alternate-outline-rounded" />
      </button>
      <input ref="imageInput" class="sr-only" type="file" accept="image/*" @change="handleImageSelection" />
      <div class="editor-meta">
        <span v-if="uploading" class="uploading"><Icon icon="svg-spinners:ring-resize" /> Uploading image</span>
        <span>{{ words }} {{ words === 1 ? 'word' : 'words' }}</span>
      </div>
    </div>
    <div ref="editorHost" class="editor-host"></div>
    <div class="editor-hint">
      <span>Type <kbd>/</kbd> for blocks</span>
      <span><kbd>Tab</kbd> indents</span>
      <span><kbd>⌘ S</kbd> saves</span>
      <span>Drop an image to upload</span>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: #111;
}

.editor-toolbar {
  display: flex;
  min-height: 48px;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  border-bottom: 1px solid #292929;
  padding: 6px 10px;
  background: #171717;
}

.editor-toolbar button {
  display: grid;
  height: 32px;
  width: 32px;
  cursor: pointer;
  place-items: center;
  border-radius: 6px;
  color: #a3a3a3;
  transition: background-color 120ms ease, color 120ms ease;
}

.editor-toolbar button:hover,
.editor-toolbar button:focus-visible {
  background: #303030;
  color: white;
  outline: none;
}

.editor-toolbar button:disabled { cursor: wait; opacity: .45; }

.toolbar-divider {
  height: 22px;
  width: 1px;
  margin: 0 5px;
  background: #353535;
}

.editor-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
  color: #737373;
  font-size: 12px;
}

.uploading {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #d4d4d4;
}

.editor-host {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.editor-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  border-top: 1px solid #292929;
  padding: 7px 14px;
  color: #737373;
  font-size: 11px;
}

kbd {
  border: 1px solid #404040;
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0 4px;
  color: #a3a3a3;
  font: inherit;
}

:deep(.cm-editor) { height: 100%; }

@media (max-width: 640px) {
  .editor-meta { width: 100%; margin: 3px 2px 0; }
  .editor-hint span:nth-last-child(-n + 2) { display: none; }
}
</style>
