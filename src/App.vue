<script setup>
import {onMounted} from 'vue';
import Layout from '@/portfolio/Layout.vue';
import PasskeyAuth from '@/components/PasskeyAuth.vue';
import {useEditorAuth, validateEditorSession} from '@/auth/editor';
const {token,showSignIn,authenticated,closeSignIn} = useEditorAuth();
onMounted(validateEditorSession);
</script>
<template>
  <Layout><RouterView v-slot="{Component}"><component :is="Component" :auth-token="token" /></RouterView></Layout>
  <Teleport to="body"><PasskeyAuth v-if="showSignIn" @authenticated="authenticated" @close="closeSignIn" /></Teleport>
</template>
