<script setup>
import {useEditorAuth} from '@/auth/editor';
const {token, signIn, lock} = useEditorAuth();
</script>
<template>
  <button class="editorial-action editor-access" type="button" @click="token ? lock() : signIn()" :aria-label="token ? 'Lock editing' : 'Unlock editing'" data-analytics-ignore>{{ token ? 'Finish editing' : 'Edit' }}</button>
</template>
<style scoped>
.editor-access { color:var(--editorial-link); font-size:inherit; }
.editor-access:hover { text-decoration:underline; text-underline-offset:4px; }
</style>
