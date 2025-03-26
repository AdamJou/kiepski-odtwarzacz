<template>
  <div class="video-player">
    <div class="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
      <video
        ref="videoPlayer"
        class="w-full h-full"
        controls
        @ended="playNext"
        @loadedmetadata="handleMetadataLoaded"
        preload="metadata"
      >
        <source v-if="currentVideo" :src="currentVideo.url" type="video/mp4" />
        <p v-else class="text-amber-100 text-center p-4">
          Twoja przeglądarka nie obsługuje odtwarzania wideo.
        </p>
      </video>
    </div>

    <div
      class="debug-info bg-amber-900/40 p-2 mb-4 rounded text-xs text-amber-100"
      v-if="debugMode"
    >
      <p>Status wideo: {{ playerStatus }}</p>
      <p>URL: {{ currentVideo?.url }}</p>
      <p>Indeks: {{ currentIndex }}</p>
      <p>Playlista: {{ playlist.length }} elementów</p>
      <button
        @click="forceReload"
        class="px-2 py-1 bg-amber-700 text-white rounded mt-2 hover:bg-amber-600 transition-colors"
      >
        Wymuś przeładowanie
      </button>
    </div>

    <div class="fixed-controls">
      <div class="playback-controls">
        <button
          @click="playPrevious"
          :disabled="currentIndex === 0"
          class="control-button"
        >
          <span class="mr-1">⏮</span> Poprzedni
        </button>
        <button
          @click="playVideo(currentIndex)"
          class="control-button play-button"
        >
          <span class="mr-1">▶</span> Odtwórz
        </button>
        <button
          @click="playNext"
          :disabled="currentIndex === playlist.length - 1"
          class="control-button"
        >
          <span class="mr-1">⏭</span> Następny
        </button>
      </div>
      <button
        @click="toggleTrimmer"
        :disabled="!currentVideo"
        class="control-button trim-button"
      >
        <span class="mr-1">✂️</span>
        {{ showTrimmer ? "Ukryj trimmer" : "Przytnij" }}
      </button>
    </div>

    <div
      v-if="showTrimmer && currentVideo && videoDuration > 0"
      class="trimmer-container bg-black/60 rounded-lg p-3 mb-6"
    >
      <VideoTrimmer :videoUrl="currentVideo.url" :duration="videoDuration" />
    </div>

    <div class="mt-4 bg-black rounded-lg p-4">
      <h3 class="text-lg font-semibold text-amber-300 mb-3">
        Aktualna Playlista
      </h3>
      <div
        v-if="playlist.length === 0"
        class="text-center py-6 text-amber-100 h-full"
      >
        Dodaj odcinki do playlisty, aby rozpocząć odtwarzanie
      </div>
      <div
        v-else
        class="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar"
      >
        <div
          v-for="(episode, index) in playlist"
          :key="episode.url"
          :class="[
            'flex items-center justify-between p-3 rounded-lg cursor-pointer h-full',
            index === currentIndex
              ? 'bg-amber-900'
              : 'bg-amber-900/30 hover:bg-amber-800/60',
          ]"
          @click="playVideo(index)"
        >
          <span class="text-sm truncate text-amber-100">{{
            episode.title
          }}</span>
          <button
            class="text-amber-400 rounded px-2 ml-2"
            @click.stop="removeFromPlaylist(episode)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import VideoTrimmer from "./VideoTrimmer.vue";

interface Episode {
  title: string;
  url: string;
}

const props = defineProps<{
  playlist: Episode[];
}>();

const emit = defineEmits<{
  (e: "remove", episode: Episode): void;
}>();

const videoPlayer = ref<HTMLVideoElement | null>(null);
const currentIndex = ref(0);
const currentVideo = ref<Episode | null>(null);
const videoDuration = ref(0);
const playerStatus = ref("Nie załadowano");
const debugMode = ref(false); // Ustaw na true, aby zobaczyć informacje debugowania
const showTrimmer = ref(false); // Kontroluje widoczność komponentu VideoTrimmer

const toggleTrimmer = () => {
  showTrimmer.value = !showTrimmer.value;

  // Jeśli włączamy trimmer, możemy chcieć zatrzymać wideo
  if (showTrimmer.value && videoPlayer.value) {
    videoPlayer.value.pause();
  }
};

const playVideo = (index: number) => {
  if (index >= 0 && index < props.playlist.length) {
    currentIndex.value = index;
    currentVideo.value = props.playlist[index];

    // Poczekaj, aż interfejs się zaktualizuje
    setTimeout(() => {
      if (videoPlayer.value) {
        videoPlayer.value.load(); // Wymuś przeładowanie źródła
        const playPromise = videoPlayer.value.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              playerStatus.value = "Odtwarzanie";
            })
            .catch((error) => {
              console.error("Błąd odtwarzania:", error);
              playerStatus.value = "Błąd odtwarzania";
            });
        }
      }
    }, 100);
  }
};

const playNext = () => {
  if (currentIndex.value < props.playlist.length - 1) {
    playVideo(currentIndex.value + 1);
  }
};

const playPrevious = () => {
  if (currentIndex.value > 0) {
    playVideo(currentIndex.value - 1);
  }
};

const removeFromPlaylist = (episode: Episode) => {
  const isCurrentEpisode = currentVideo.value?.url === episode.url;
  emit("remove", episode);

  if (isCurrentEpisode && props.playlist.length > 0) {
    // Jeśli usunięto aktualnie odtwarzany element, odtwórz pierwszy dostępny
    setTimeout(() => {
      if (currentIndex.value >= props.playlist.length) {
        currentIndex.value = Math.max(0, props.playlist.length - 1);
        if (props.playlist.length > 0) {
          playVideo(currentIndex.value);
        } else {
          currentVideo.value = null;
        }
      }
    }, 0);
  }
};

const handleMetadataLoaded = () => {
  if (videoPlayer.value) {
    playerStatus.value = "Załadowano metadane";
    videoDuration.value = videoPlayer.value.duration;
  }
};

const forceReload = () => {
  if (videoPlayer.value && currentVideo.value) {
    videoPlayer.value.load();
    setTimeout(() => {
      videoPlayer.value?.play();
    }, 100);
  }
};

// Obserwuj zmiany w playliście
watch(
  () => props.playlist,
  (newPlaylist) => {
    if (newPlaylist.length > 0 && !currentVideo.value) {
      // Jeśli mamy elementy na liście, ale nic nie jest odtwarzane, odtwórz pierwszy element
      playVideo(0);
    } else if (newPlaylist.length === 0) {
      currentVideo.value = null;
    }
  },
  { deep: true }
);

onMounted(() => {
  if (props.playlist.length > 0) {
    currentVideo.value = props.playlist[0];
    playerStatus.value = "Załadowano";
  }

  if (videoPlayer.value) {
    videoPlayer.value.addEventListener("error", (e) => {
      playerStatus.value = `Błąd: ${
        videoPlayer.value?.error?.message || "Nieznany błąd"
      }`;
      console.error("Błąd wideo:", e);
    });

    videoPlayer.value.addEventListener("waiting", () => {
      playerStatus.value = "Buforowanie...";
    });

    videoPlayer.value.addEventListener("playing", () => {
      playerStatus.value = "Odtwarzanie";
    });

    videoPlayer.value.addEventListener("pause", () => {
      playerStatus.value = "Wstrzymano";
    });
  }
});
</script>

<style scoped>
.video-player {
  width: 100%;
  padding: 16px;
}

.trimmer-container {
  border: 1px solid rgba(217, 119, 6, 0.3);
}

.fixed-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  gap: 10px;
}

.playback-controls {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: rgb(180, 83, 9);
  color: white;
  border-radius: 0.5rem;
  margin: 0 0.25rem;
  white-space: nowrap;
  min-width: auto;
  border: none;
  cursor: pointer;
}

.control-button:disabled {
  background-color: rgb(75, 85, 99);
  color: rgb(156, 163, 175);
  cursor: not-allowed;
}

.play-button {
  background-color: rgb(217, 119, 6);
}

.trim-button {
  background-color: rgb(146, 64, 14);
}

/* Dostosuj styl dla małych ekranów */
@media (max-width: 640px) {
  .video-player {
    padding: 8px;
  }

  .control-button {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    min-width: auto;
  }

  .control-button span {
    margin-right: 0.25rem;
  }

  .trim-button {
    width: 100%;
    max-width: 200px;
  }
}

/* Niestandardowy scrollbar dla spójności z głównym układem */
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

.playlist li {
  padding: 10px;
  margin: 5px 0;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.playlist li:hover {
  background: #e0e0e0;
}

.playlist li.active {
  background: #4caf50;
  color: white;
}

.remove-btn {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
}

.remove-btn:hover {
  color: #cc0000;
}
</style>
