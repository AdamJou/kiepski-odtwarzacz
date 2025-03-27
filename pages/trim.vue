<script setup lang="ts">
import { useRoute } from "vue-router";
import { ref, onMounted } from "vue";
import { useState } from "nuxt/app";
const route = useRoute();
const videoUrl = ref("");
const duration = ref(0);
const isTrimmingLoading = useState("isTrimmingLoading", () => false);

onMounted(() => {
  const queryUrl = route.query.url;
  const queryDuration = route.query.duration;

  if (typeof queryUrl === "string") {
    videoUrl.value = queryUrl;
  }

  if (typeof queryDuration === "string") {
    duration.value = parseFloat(queryDuration);
  }
});
</script>

<template>
  <div class="p-4 bg-black text-white min-h-screen">
    <div
      v-if="isTrimmingLoading"
      class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
    >
      <div class="text-white text-2xl">Ładowanie...</div>
    </div>
    <VideoTrimmer :videoUrl="videoUrl" :duration="duration" />
  </div>
</template>
