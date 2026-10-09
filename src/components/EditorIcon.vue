<script setup>
defineProps({name:{type:String,required:true}});
const paths={
  heading:'M5 5v14m14-14v14M5 12h14',
  bold:'M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z',
  italic:'M10 4h9M5 20h9M15 4 9 20',
  link:'m10 14 4-4m-6 3-2 2a4 4 0 0 0 6 6l3-3m1-7 2-2a4 4 0 0 0-6-6l-3 3',
  code:'m8 6-6 6 6 6m8-12 6 6-6 6',
  bullet:'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
  numbered:'M10 6h11M10 12h11M10 18h11M3 3h1v5M2 11h3l-3 4h3M2 18h3v4H2',
  task:'M3 3h18v18H3zm4 9 3 3 7-7',
  quote:'M4 6h6v7H4zm10 0h6v7h-6zM10 13c0 4-2 5-4 5m14-5c0 4-2 5-4 5',
  codeblock:'M8 3H6v6l-3 3 3 3v6h2m8-18h2v6l3 3-3 3v6h-2',
  image:'M3 3h18v18H3zm0 14 6-6 5 5 3-3 4 4M16 7h.01',
  refresh:'M20 7a9 9 0 1 0 1 7M20 2v6h-6',
};
</script>
<template><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]" /></svg></template>
