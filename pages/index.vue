<template>
  <transition name="slide-left" appear>
    <div
      v-if="showIntro"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black"
      @click="start"
    >
      <img
        src="/korytarz2.jpg"
        alt="Korytarz"
        class="object-cover w-full h-full cursor-pointer"
      />
      <!-- Optional: add a "click to enter" overlay -->
      <div class="absolute bottom-10 text-white text-xl animate-bounce">
        {{ citation.cytat }}
        <p v-if="citation.source">{{ citation.source }}</p>
      </div>
    </div>
    <div class="wrapper" v-else>
      <div class="min-h-screen bg-layout flex flex-col">
        <div
          v-if="isGlobalLoading"
          class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[9999] overflow-hidden"
        >
          <div
            class="fixed top-0 left-0 w-full h-full flex items-center justify-center text-white text-2xl text-center overflow-hidden z-[9999]"
          >
            Zara kurde, noc jest kurde...
          </div>
        </div>

        <header class="bg-amber-800/80 shadow-md py-4">
          <div class="container mx-auto px-4">
            <h1 class="text-3xl md:text-4xl font-bold text-center">
              <img
                src="/heading.png"
                alt="Kiepski Odtwarzacz"
                class="inline-block max-h-14 md:max-h-16 filter drop-shadow-md"
              />
            </h1>
          </div>
        </header>

        <main class="flex-grow container mx-auto px-4 py-6">
          <div v-if="isLoading" class="flex justify-center items-center py-24">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"
            ></div>
            <span class="ml-4 text-lg text-amber-100"
              >Ładowanie odcinków...</span
            >
          </div>

          <div v-else class="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div
              class="xl:col-span-8 bg-black/80 rounded-lg shadow-lg overflow-hidden"
            >
              <VideoPlayer
                v-if="playlist.length > 0"
                :playlist="playlist"
                @remove="removeFromPlaylist"
              />
              <div
                v-else
                class="flex items-center justify-center bg-black h-[100%] rounded-lg text-amber-100"
              >
                <p class="text-xl text-center">
                  Dodaj odcinki do playlisty, aby rozpocząć oglądanie
                </p>
              </div>
            </div>

            <div
              class="xl:col-span-4 bg-black/80 rounded-lg shadow-lg overflow-hidden flex flex-col h-fit max-h-screen"
            >
              <div class="p-4 bg-amber-900/90 flex-shrink-0">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xl font-semibold text-amber-100">
                    Wpisz se nazwę odcinka, kurde!
                  </h2>
                  <button
                    @click="addRandomEpisode"
                    class="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-2"
                  >
                    🎲 Losowy
                  </button>
                </div>

                <div class="relative mb-4">
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Szukaj odcinków..."
                    class="w-full px-4 py-2 pl-10 bg-amber-800/60 text-amber-100 border border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-amber-300/70"
                  />
                  <MagnifyingGlassIcon
                    class="absolute left-3 top-2.5 h-5 w-5 text-amber-300"
                  />
                </div>
              </div>

              <div class="episodes-container flex-grow overflow-hidden">
                <div
                  class="h-[calc(100vh-280px)] md:h-[500px] overflow-y-auto custom-scrollbar p-4"
                >
                  <div
                    v-for="episode in filteredEpisodes"
                    :key="episode.url"
                    class="flex items-center justify-between p-3 mb-2 bg-amber-900/40 hover:bg-amber-800/60 rounded-lg transition-colors"
                  >
                    <span class="text-amber-100 text-sm truncate mr-2">{{
                      episode.title
                    }}</span>
                    <button
                      @click="addToPlaylist(episode)"
                      :disabled="isInPlaylist(episode)"
                      class="flex items-center justify-center px-3 py-1.5 min-w-[80px] rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                      :class="
                        isInPlaylist(episode)
                          ? 'bg-amber-700/50 text-amber-400 cursor-not-allowed'
                          : 'bg-amber-600 text-white hover:bg-amber-500'
                      "
                    >
                      <PlusIcon
                        v-if="!isInPlaylist(episode)"
                        class="h-4 w-4 mr-1.5"
                      />
                      <span class="whitespace-nowrap">{{
                        isInPlaylist(episode) ? "Dodano" : "Dodaj"
                      }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer
          class="bg-amber-900/90 text-amber-200 py-3 text-center text-sm mt-auto"
        >
          Stworzono w celach edukacyjnych
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useEpisodes } from "../composables/useEpisodes";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/vue/24/outline";
import { useState } from "nuxt/app";
import { useCitation } from "../composables/useCitation";
const isGlobalLoading = useState("globalLoading", () => false);

const { getRandomCitation } = useCitation();
const citation = getRandomCitation();
const showIntro = ref(true);

const start = () => {
  const audio = new Audio("/route.mp3");

  // Graj dźwięk
  audio
    .play()
    .then(() => {
      // Po 300ms wyłącz intro i pozwól na transition
      setTimeout(() => {
        showIntro.value = false;
      }, 1000); // możesz dostosować delay do momentu w dźwięku
    })
    .catch((err) => {
      console.warn("Dźwięk zablokowany lub błąd:", err);
      // Fallback: mimo wszystko wyłącz intro
      showIntro.value = false;
    });
};

const {
  episodes,
  playlist,
  isLoading,
  loadEpisodes,
  addToPlaylist,
  removeFromPlaylist,
} = useEpisodes();
const searchQuery = ref("");

const filteredEpisodes = computed(() => {
  if (!searchQuery.value) return episodes.value;
  const query = searchQuery.value.toLowerCase();
  return episodes.value.filter((episode) =>
    episode.title.toLowerCase().includes(query)
  );
});

const addRandomEpisode = () => {
  const availableEpisodes = episodes.value.filter(
    (ep) => !playlist.value.some((p) => p.url === ep.url)
  );

  if (availableEpisodes.length === 0) return;

  const randomIndex = Math.floor(Math.random() * availableEpisodes.length);
  const randomEpisode = availableEpisodes[randomIndex];

  addToPlaylist(randomEpisode);
};

const isInPlaylist = (episode: { url: string }) => {
  return playlist.value.some((e) => e.url === episode.url);
};

onMounted(() => {
  loadEpisodes();
});
</script>

<style>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.4s ease;
  position: absolute;
  width: 100%;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-left-enter-to {
  transform: translateX(0%);
  opacity: 1;
}

.slide-left-leave-from {
  transform: translateX(0%);
  opacity: 1;
}
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(217, 119, 6, 0.5) rgba(0, 0, 0, 0.2);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.5);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(217, 119, 6, 0.7);
}

.episodes-container {
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1280px) {
  .episodes-container {
    min-height: 400px;
    max-height: 500px;
  }
}
</style>
