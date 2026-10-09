<script setup>
import {onBeforeUnmount} from 'vue';
import './style.css';
import './theme';
document.documentElement.classList.add('portfolio-page');
onBeforeUnmount(()=>document.documentElement.classList.remove('portfolio-page'));
</script>
<template><div class="portfolio-layout editorial-preview"><slot /></div></template>
