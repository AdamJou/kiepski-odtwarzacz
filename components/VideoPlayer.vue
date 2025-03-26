<template>
  <div class="video-player">
    <div class="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
      <div
        v-if="!videoLoaded && currentVideo"
        class="absolute inset-0 flex items-center justify-center bg-black/80 z-10"
      >
        <div class="flex flex-col items-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"
          ></div>
          <p class="text-amber-100">Ładowanie filmu...</p>
        </div>
      </div>

      <video
        ref="videoPlayer"
        class="w-full h-full"
        controls
        @ended="playNext"
        @loadedmetadata="handleMetadataLoaded"
        @canplay="handleVideoLoaded"
        @error="handleVideoError"
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
import { useEpisodes } from "../composables/useEpisodes";

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
const debugMode = ref(false);
const showTrimmer = ref(false);
const videoLoaded = ref(false);

const { getEpisodeMetadata, cacheEpisodeMetadata } = useEpisodes();

const toggleTrimmer = () => {
  showTrimmer.value = !showTrimmer.value;

  if (showTrimmer.value && videoPlayer.value) {
    videoPlayer.value.pause();
  }
};

const handleVideoLoaded = () => {
  videoLoaded.value = true;
  playerStatus.value = "Załadowano";

  if (currentVideo.value && videoPlayer.value) {
    cacheEpisodeMetadata(currentVideo.value.url, videoPlayer.value.duration);
  }
};

const handleVideoError = () => {
  videoLoaded.value = false;
  playerStatus.value = `Błąd: ${
    videoPlayer.value?.error?.message || "Nieznany błąd"
  }`;
};

const playVideo = (index: number) => {
  if (index >= 0 && index < props.playlist.length) {
    currentIndex.value = index;
    currentVideo.value = props.playlist[index];
    videoLoaded.value = false;

    const metadata = currentVideo.value
      ? getEpisodeMetadata(currentVideo.value.url)
      : null;
    if (metadata) {
      videoDuration.value = metadata.duration;
    }

    setTimeout(() => {
      if (videoPlayer.value) {
        videoPlayer.value.load();
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
    setTimeout(() => {
      if (currentIndex.value >= props.playlist.length) {
        currentIndex.value = Math.max(0, props.playlist.length - 1);
        if (props.playlist.length > 0) {
          playVideo(currentIndex.value);
        } else {
          currentVideo.value = null;
          videoLoaded.value = false;
        }
      }
    }, 0);
  }
};

const handleMetadataLoaded = () => {
  if (videoPlayer.value && currentVideo.value) {
    playerStatus.value = "Załadowano metadane";
    videoDuration.value = videoPlayer.value.duration;

    cacheEpisodeMetadata(currentVideo.value.url, videoPlayer.value.duration);
  }
};

const forceReload = () => {
  if (videoPlayer.value && currentVideo.value) {
    videoLoaded.value = false;
    videoPlayer.value.load();
    setTimeout(() => {
      videoPlayer.value?.play();
    }, 100);
  }
};

watch(currentVideo, (newVideo) => {
  if (newVideo) {
    videoLoaded.value = false;
  }
});

watch(
  () => props.playlist,
  (newPlaylist) => {
    if (newPlaylist.length > 0 && !currentVideo.value) {
      playVideo(0);
    } else if (newPlaylist.length === 0) {
      currentVideo.value = null;
      videoLoaded.value = false;
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
      videoLoaded.value = false;
      console.error("Błąd wideo:", e);
    });

    videoPlayer.value.addEventListener("waiting", () => {
      playerStatus.value = "Buforowanie...";
    });

    videoPlayer.value.addEventListener("playing", () => {
      playerStatus.value = "Odtwarzanie";
      videoLoaded.value = true;
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
