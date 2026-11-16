<script setup>
import { computed } from 'vue';
import { getStockBadgeMeta } from '../../utils/formatters.js';

const props = defineProps({
  estado: {
    type: String,
    default: 'OPTIMO'
  },
  stock: {
    type: Number,
    default: 0
  },
  showUnits: {
    type: Boolean,
    default: true
  }
});

const meta = computed(() => getStockBadgeMeta(props.estado));
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap"
    :class="meta.classes"
  >
    <span class="w-1.5 h-1.5 rounded-full" :class="meta.dotClass"></span>
    <span>{{ meta.label }}</span>
    <span v-if="showUnits" class="opacity-80 font-medium">({{ stock }})</span>
  </span>
</template>
