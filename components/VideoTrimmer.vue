<template>
  <div class="video-trimmer">
    <div class="back-button mb-2">
      <button @click="goBack" class="action-btn">
        <ArrowLeftIcon class="h-5 w-5 text-white" />
        Powrót
      </button>
    </div>
    <div class="preview-container" v-if="!isLoading">
      <video
        ref="previewVideo"
        class="preview-video"
        :src="videoBlobUrl"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleMetadataLoaded"
        @error="(e) => console.error('Video error:', e)"
        @waiting="() => (isPlaying = false)"
        @playing="() => (isPlaying = true)"
        @pause="() => (isPlaying = false)"
        @play="() => (isPlaying = true)"
        crossorigin="anonymous"
        preload="metadata"
      ></video>
      <div class="preview-controls">
        <button @click="togglePlayback" class="control-btn">
          <PlayIcon v-if="!isPlaying" class="h-5 w-5" />
          <PauseIcon v-else class="h-5 w-5" />
        </button>
        <div class="time-display">
          {{ formatTime(currentTime) }} /
          {{ formatTime(previewVideo?.duration || 0) }}
        </div>
      </div>
    </div>
    <div v-else class="processing-status">
      <div class="progress-bar">
        <div class="progress" :style="{ width: `${downloadProgress}%` }"></div>
      </div>
      <p>Ładowanie wideo... {{ downloadProgress }}%</p>
    </div>

    <div v-if="isGeneratingThumbnails" class="processing-status">
      <div class="progress-bar">
        <div :style="{ width: `${thumbnailProgress}%` }" class="progress"></div>
      </div>
      <p>Generowanie... {{ thumbnailProgress }}%</p>
    </div>

    <div v-if="isSnippetMode" class="timeline-container">
      <div class="timeline">
        <div class="timeline-track">
          <div
            v-for="(thumbnail, index) in thumbnails"
            :key="index"
            class="thumbnail"
            :style="{ left: `${(index / (numThumbnails - 1)) * 100}%` }"
            @click="
              seekToTime(
                (index * (previewVideo?.duration || 0)) / (numThumbnails - 1)
              )
            "
          >
            <img
              :src="thumbnail"
              :alt="
                formatTime(
                  (index * (previewVideo?.duration || 0)) / (numThumbnails - 1)
                )
              "
              crossorigin="anonymous"
            />
          </div>
          <div
            class="selection-range"
            :style="{
              left: `${(startTime / (previewVideo?.duration || 1)) * 100}%`,
              width: `${
                ((endTime - startTime) / (previewVideo?.duration || 1)) * 100
              }%`,
            }"
          >
            <div class="selection-handle start-handle"></div>
            <div class="selection-handle end-handle"></div>
          </div>
        </div>

        <div class="range-controls">
          <input
            type="range"
            :min="0"
            :max="previewVideo?.duration || 100"
            :step="0.01"
            v-model.number="startTime"
            class="slider start-slider"
            @input="handleStartChange"
            style="z-index: 3; position: relative"
          />
          <input
            type="range"
            :min="0"
            :max="previewVideo?.duration || 100"
            :step="0.01"
            v-model.number="endTime"
            class="slider end-slider"
            @input="handleEndChange"
            style="z-index: 2; position: relative"
          />
        </div>
      </div>

      <div class="time-markers">
        <div class="time-control">
          <div class="time-adjust-buttons">
            <button @click="adjustStartTime(-0.5)" class="time-adjust-btn">
              -0.5s
            </button>
            <span>{{ formatTime(startTime, true) }}</span>
            <button @click="adjustStartTime(0.5)" class="time-adjust-btn">
              +0.5s
            </button>
          </div>
        </div>
        <span>Długość: {{ formatTime(endTime - startTime, false) }}</span>
        <div class="time-control">
          <div class="time-adjust-buttons">
            <button @click="adjustEndTime(-0.5)" class="time-adjust-btn">
              -0.5s
            </button>
            <span>{{ formatTime(endTime, true) }}</span>
            <button @click="adjustEndTime(0.5)" class="time-adjust-btn">
              +0.5s
            </button>
          </div>
        </div>
      </div>

      <div class="controls">
        <button
          @click="previewSnippet"
          :disabled="isProcessing"
          class="action-btn"
        >
          <EyeIcon class="h-5 w-5 mr-2" />
          Podgląd
        </button>
        <button
          @click="downloadSnippet"
          :disabled="isProcessing"
          class="action-btn"
        >
          <ClockIcon v-if="isProcessing" class="h-5 w-5 mr-2" />
          <ArrowDownTrayIcon v-else class="h-5 w-5 mr-2" />
          {{ isProcessing ? "Przetwarzanie..." : "Pobierz" }}
        </button>
      </div>
    </div>

    <div class="snippet-toggle">
      <button @click="toggleSnippetMode" class="action-btn">
        <XMarkIcon v-if="isSnippetMode" class="h-5 w-5 mr-2" />
        <ScissorsIcon v-else class="h-5 w-5 mr-2" />
        {{ isSnippetMode ? "Zamknij" : "Wytnij fragment" }}
      </button>
    </div>

    <div v-if="isProcessing" class="processing-status">
      <div class="progress-bar">
        <div :style="{ width: `${progress}%` }" class="progress"></div>
      </div>
      <p>{{ status }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";

import { useEpisodes } from "../composables/useEpisodes";
import {
  PlayIcon,
  PauseIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ClockIcon,
  XMarkIcon,
  ScissorsIcon,
} from "@heroicons/vue/24/outline";
import { useRouter } from "vue-router";
import { useState } from "nuxt/app";
const videoBlobUrl = ref("");
const isLoading = ref(false);
const downloadProgress = ref(0);

const videoUrl = ref("");
const duration = ref(0);
const previewVideo = ref<any>(null);
const currentTime = ref(0);
const isPlaying = ref(false);
const thumbnails = ref<string[]>([]);
const numThumbnails = 20;
const mediaRecorder = ref<MediaRecorder | null>(null);
const recordedChunks = ref<Blob[]>([]);
const isSnippetMode = ref(false);
const isGeneratingThumbnails = ref(false);
const thumbnailProgress = ref(0);

const startTime = ref(0);
const endTime = ref(0);

const isProcessing = ref(false);
const progress = ref(0);
const status = ref("");

import { useRoute } from "vue-router";

const route = useRoute();
const router = useRouter();

const {
  cacheThumbnails,
  getCachedThumbnails,
  cacheEpisodeMetadata,
  getEpisodeMetadata,
} = useEpisodes();

const isGlobalLoading = useState("globalLoading", () => false);

const goBack = async () => {
  isGlobalLoading.value = true;
  router.replace("/").then(() => {
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });
};

onMounted(async () => {
  const queryUrl = route.query.url;
  const queryDuration = route.query.duration;

  const alreadyRefreshed = sessionStorage.getItem("refreshed-on-trim");
  /*
  if (!alreadyRefreshed) {
    sessionStorage.setItem("refreshed-on-trim", "true");

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
    */

  if (typeof queryUrl === "string") {
    videoUrl.value = queryUrl;
    await loadFullVideo();
  }

  if (typeof queryDuration === "string") {
    duration.value = parseFloat(queryDuration);
  }

  console.log("[Trimmer] Odebrano z query:", videoUrl.value, duration.value);
});

const loadFullVideo = async () => {
  isLoading.value = true;
  downloadProgress.value = 0;

  try {
    const res = await fetch(videoUrl.value);
    const reader = res.body?.getReader();
    const contentLength = parseInt(res.headers.get("Content-Length") || "0");

    let received = 0;
    const chunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;

          if (contentLength > 0) {
            downloadProgress.value = Math.round(
              (received / contentLength) * 100
            );
          }
        }
      }
    }

    const blob = new Blob(chunks, { type: "video/mp4" });
    videoBlobUrl.value = URL.createObjectURL(blob);
  } catch (err) {
    console.error("Błąd pobierania wideo:", err);
  } finally {
    isLoading.value = false;
  }
};

const seekToTime = (time: number) => {
  if (!previewVideo.value || isNaN(time)) return;

  try {
    const validTime = Math.max(0, Math.min(time, previewVideo.value.duration));
    previewVideo.value.currentTime = validTime;
  } catch (error) {
    console.error("Seek error:", error);
  }
};

watch(videoUrl, (newVal) => {
  console.log("videoUrl SET TO:", newVal);
});

watch(videoUrl, (val) => {
  if (val && previewVideo.value?.readyState >= 2) {
    generateThumbnails();
  }
});

const generateThumbnails = async () => {
  if (!previewVideo.value) return;

  const cachedThumbnails = getCachedThumbnails(videoUrl.value);
  if (cachedThumbnails && cachedThumbnails.length > 0) {
    thumbnails.value = [...cachedThumbnails];
    return;
  }

  isGeneratingThumbnails.value = true;
  thumbnailProgress.value = 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    isGeneratingThumbnails.value = false;
    return;
  }

  canvas.width = 160;
  canvas.height = 90;

  const newThumbs: string[] = [];
  const wasPlaying = isPlaying.value;
  const currentPlaybackTime = previewVideo.value?.currentTime || 0;

  if (isPlaying.value) {
    await previewVideo.value.pause();
    isPlaying.value = false;
  }

  const batchSize = 5;
  const videoDur = previewVideo.value.duration || 0;
  const interval = videoDur / (numThumbnails - 1);

  for (let batch = 0; batch < numThumbnails; batch += batchSize) {
    const batchPromises: Promise<string>[] = [];

    for (let i = 0; i < batchSize && batch + i < numThumbnails; i++) {
      const index = batch + i;
      const time = index * interval;

      batchPromises.push(
        (async () => {
          try {
            if (Number.isFinite(time)) {
              previewVideo.value.currentTime = time;
              await new Promise((resolve) => {
                previewVideo.value.addEventListener("seeked", resolve, {
                  once: true,
                });
              });
              ctx.drawImage(
                previewVideo.value,
                0,
                0,
                canvas.width,
                canvas.height
              );
              return canvas.toDataURL("image/jpeg", 0.7);
            }
          } catch (error) {
            console.error("Error generating thumbnail:", error);
          }
          return "data:image/jpeg,...";
        })()
      );
    }

    const results = await Promise.all(batchPromises);
    newThumbs.push(...results);
    thumbnails.value = [...newThumbs];
    thumbnailProgress.value = Math.round(
      (newThumbs.length / numThumbnails) * 100
    );
  }

  cacheThumbnails(videoUrl.value, newThumbs);

  previewVideo.value.currentTime = currentPlaybackTime;
  if (wasPlaying) {
    await previewVideo.value.play();
    isPlaying.value = true;
  }

  isGeneratingThumbnails.value = false;
};

const handleStartChange = () => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = startTime.value;
};

const handleEndChange = () => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = endTime.value;
};

const adjustStartTime = (adjustment: number) => {
  if (!previewVideo.value) return;
  const newTime = startTime.value + adjustment;
  if (newTime >= 0 && newTime < endTime.value) {
    startTime.value = Number(newTime.toFixed(2));
    previewVideo.value.currentTime = startTime.value;
  }
};

const adjustEndTime = (adjustment: number) => {
  if (!previewVideo.value) return;
  const newTime = endTime.value + adjustment;
  if (
    newTime > startTime.value &&
    newTime <= (previewVideo.value.duration || 0)
  ) {
    endTime.value = Number(newTime.toFixed(2));
    previewVideo.value.currentTime = endTime.value;
  }
};

const toggleSnippetMode = () => {
  isSnippetMode.value = !isSnippetMode.value;
  if (isSnippetMode.value && previewVideo.value) {
    startTime.value = currentTime.value;
    endTime.value = Math.min(
      currentTime.value + 30,
      previewVideo.value.duration
    );
    const cache = getCachedThumbnails(videoUrl.value);
    if (!cache) {
      generateThumbnails();
    } else {
      thumbnails.value = cache;
    }
  }
};

const previewSnippet = async () => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = startTime.value;
  previewVideo.value.play();
  isPlaying.value = true;
};

const currentTimeUpdate = () => {
  if (!previewVideo.value || isNaN(previewVideo.value.currentTime)) return;
  currentTime.value = previewVideo.value.currentTime;
  if (previewVideo.value.currentTime >= endTime.value) {
    previewVideo.value.pause();
    isPlaying.value = false;
  }
};

const handleTimeUpdate = currentTimeUpdate;

const togglePlayback = async () => {
  if (!previewVideo.value) return;
  try {
    if (isPlaying.value) {
      await previewVideo.value.pause();
    } else {
      await previewVideo.value.play();
    }
  } catch (error) {
    console.error("Playback error:", error);
  }
};

const formatTime = (secs: number, showDecimals = false) => {
  if (isNaN(secs) || !isFinite(secs)) return "00:00";
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  if (showDecimals) {
    return `${String(mins).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${Math.round(s)
    .toString()
    .padStart(2, "0")}`;
};

const handleMetadataLoaded = () => {
  if (!previewVideo.value) return;
  const vidDur = previewVideo.value.duration;
  if (!vidDur || isNaN(vidDur)) return;
  cacheEpisodeMetadata(videoUrl.value, vidDur);
  startTime.value = 0;
  endTime.value = vidDur;
  setTimeout(() => {
    if (previewVideo.value && previewVideo.value.readyState >= 2) {
      generateThumbnails();
    }
  }, 500);
};

import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
const ffmpeg = createFFmpeg({
  log: true,
  corePath: "/ffmpeg-core/ffmpeg-core.js",
  singleThread: true,
} as any);

const downloadSnippet = async () => {
  if (!previewVideo.value || isProcessing.value) return;
  try {
    isProcessing.value = true;
    progress.value = 0;
    status.value = "Rozpoczynam nagrywanie...";

    const webmH264 = "video/webm; codecs=h264";
    const mp4Mime = "video/mp4; codecs=avc1.42E01E, mp4a.40.2";
    let chosenMime = "";
    if (MediaRecorder.isTypeSupported(mp4Mime)) {
      chosenMime = mp4Mime;
    } else if (MediaRecorder.isTypeSupported(webmH264)) {
      chosenMime = webmH264;
    } else {
      throw new Error(
        "Brak wsparcia dla wymaganych formatów (MP4/WebM H.264)."
      );
    }

    const stream = previewVideo.value.captureStream();
    const recorder = new MediaRecorder(stream, {
      mimeType: chosenMime,
      videoBitsPerSecond: 5_000_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (evt: BlobEvent) => {
      if (evt.data.size > 0) chunks.push(evt.data);
    };

    recorder.onstop = async () => {
      const finalBlob = new Blob(chunks, { type: chosenMime });
      console.log("Final Blob size:", finalBlob.size);
      if (finalBlob.size === 0) {
        status.value = "Błąd: Brak danych w nagraniu.";
        isProcessing.value = false;
        return;
      }

      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }

      const inputFilename = chosenMime.includes("mp4")
        ? "input.mp4"
        : "input.webm";
      status.value =
        "Ja jestem plikiem wielkiego formata, poczekaj aż sie przekonwertuje...";

      ffmpeg.FS("writeFile", inputFilename, await fetchFile(finalBlob));
      await ffmpeg.run(
        "-i",
        inputFilename,
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        "output.mp4"
      );

      const data = ffmpeg.FS("readFile", "output.mp4");

      const convertedBlob = new Blob([data.buffer], { type: "video/mp4" });
      console.log("Converted Blob size:", convertedBlob.size);
      if (convertedBlob.size === 0) {
        status.value = "Błąd konwersji: Wygenerowany plik ma 0 bajtów.";
        isProcessing.value = false;
        return;
      }

      const filename = `snippet_${formatTime(
        startTime.value,
        true
      )}-${formatTime(endTime.value, true)}.mp4`;
      const url = URL.createObjectURL(convertedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      progress.value = 100;
      status.value = "Gotowe! Plik zapisany jako MP4";
      isProcessing.value = false;
    };

    recorder.start();
    previewVideo.value.currentTime = startTime.value;
    await previewVideo.value.play();

    function checkProgress() {
      if (!previewVideo.value) return;
      const cur = previewVideo.value.currentTime;
      const clipDur = endTime.value - startTime.value;
      const ratio = (cur - startTime.value) / clipDur;
      progress.value = Math.min(100, Math.max(0, ratio * 100));
      if (cur >= endTime.value) {
        previewVideo.value.pause();
        recorder.stop();
      } else {
        requestAnimationFrame(checkProgress);
      }
    }
    requestAnimationFrame(checkProgress);
  } catch (err) {
    console.error("Błąd przy nagrywaniu:", err);
    status.value = "Wystąpił błąd. Szczegóły w konsoli.";
    isProcessing.value = false;
    progress.value = 0;
    if (previewVideo.value) {
      previewVideo.value.pause();
    }
  }
};

watch(startTime, (newVal) => {
  if (newVal >= endTime.value) {
    startTime.value = endTime.value - 1;
  }
});
watch(endTime, (newVal) => {
  if (newVal <= startTime.value) {
    endTime.value = startTime.value + 1;
  }
});

onUnmounted(() => {
  if (previewVideo.value) {
    try {
      previewVideo.value.pause();
      previewVideo.value.removeAttribute("src");
      previewVideo.value.load();
    } catch (error) {
      console.error("Error cleaning up video:", error);
    }
  }

  if (mediaRecorder.value && mediaRecorder.value.state !== "inactive") {
    try {
      mediaRecorder.value.stop();
    } catch (error) {
      console.error("Error stopping media recorder:", error);
    }
  }

  thumbnails.value = [];
  currentTime.value = 0;
  isPlaying.value = false;
  isProcessing.value = false;
  isGeneratingThumbnails.value = false;
});
</script>

<style scoped>
.video-trimmer {
  margin: 10px auto;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  color: #fff;
  max-width: 100%;
  box-sizing: border-box;
}

.preview-container {
  margin-bottom: 10px;
}

.preview-video {
  width: 100%;
  max-height: 70vh;
  background: #000;
  border-radius: 4px;
  margin-bottom: 10px;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
  padding: 8px;
  background: rgba(146, 64, 14, 0.3);
  border-radius: 4px;
}

.control-btn {
  background: rgba(180, 83, 9, 0.7);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  font-size: 16px;
}

.control-btn:hover {
  background: rgba(217, 119, 6, 0.8);
}

.time-display {
  font-family: monospace;
  font-size: 1em;
  margin-left: auto;
  color: rgba(251, 191, 36, 0.9);
}

.timeline-container {
  margin: 15px 0;
  max-width: 100%;
  overflow: hidden;
}

.timeline {
  position: relative;
  height: 100px;
  background: rgba(146, 64, 14, 0.3);
  border-radius: 4px;
  margin-bottom: 10px;
}

.timeline-track {
  position: relative;
  height: 60px;
  background: rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.thumbnail {
  position: absolute;
  top: 0;
  width: 60px;
  height: 34px;
  transform: translateX(-50%);
  cursor: pointer;
  border: 1px solid rgba(217, 119, 6, 0.4);
  transition: all 0.2s ease;
  overflow: hidden;
  z-index: 1;
}

.thumbnail:hover {
  transform: scale(2);
  z-index: 10;
  border-color: rgba(217, 119, 6, 0.8);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selection-range {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(217, 119, 6, 0.2);
  border: 2px solid rgba(217, 119, 6, 0.7);
  pointer-events: none;
  z-index: 2;
}

.selection-handle {
  position: absolute;
  top: 0;
  width: 10px;
  height: 100%;
  background: rgba(217, 119, 6, 0.8);
  cursor: ew-resize;
  pointer-events: auto;
}

.start-handle {
  left: -5px;
}

.end-handle {
  right: -5px;
}

.range-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  padding: 0 5px;
  display: flex;
  flex-direction: column;
}

.slider {
  position: relative;
  width: 100%;
  height: 20px;
  margin-bottom: 5px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  background: rgba(120, 53, 15, 0.5);
  border-radius: 2px;
}

.slider::-moz-range-track {
  width: 100%;
  height: 4px;
  background: rgba(120, 53, 15, 0.5);
  border-radius: 2px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: rgba(217, 119, 6, 0.8);
  border-radius: 50%;
  cursor: pointer;
  margin-top: -8px;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: rgba(217, 119, 6, 0.8);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.start-slider {
  margin-bottom: 8px;
}

.slider:hover {
  opacity: 1;
}

.time-markers {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: monospace;
  font-size: 0.9em;
  color: rgba(251, 191, 36, 0.9);
  padding: 0 5px;
  margin-bottom: 15px;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(180, 83, 9, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  background: rgba(217, 119, 6, 0.8);
}

.action-btn:disabled {
  background: rgba(120, 53, 15, 0.4);
  cursor: not-allowed;
  color: rgba(255, 255, 255, 0.6);
}

.snippet-toggle {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.processing-status {
  margin-top: 15px;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 16px;
  background: rgba(120, 53, 15, 0.4);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress {
  height: 100%;
  background: rgba(217, 119, 6, 0.8);
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .video-trimmer {
    padding: 5px;
    margin: 5px;
  }

  .timeline {
    height: 80px;
  }

  .timeline-track {
    height: 40px;
  }

  .thumbnail {
    width: 40px;
    height: 23px;
  }

  .time-markers {
    font-size: 0.75em;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .time-control {
    width: 100%;
  }

  .time-adjust-buttons {
    width: 100%;
    justify-content: space-between;
    padding: 0 10px;
  }

  .time-adjust-btn {
    padding: 4px 8px;
    font-size: 0.85em;
    min-width: 50px;
    text-align: center;
  }

  .action-btn {
    padding: 8px 12px;
    font-size: 0.9em;
    width: 100%;
    justify-content: center;
  }

  .controls {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .control-btn {
    width: 40px;
    height: 40px;
  }

  .preview-controls {
    padding: 10px;
  }

  .time-display {
    font-size: 0.85em;
  }

  .slider::-webkit-slider-thumb {
    width: 24px;
    height: 24px;
  }

  .slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
  }

  .selection-handle {
    width: 16px;
  }

  .start-handle {
    left: -8px;
  }

  .end-handle {
    right: -8px;
  }

  .thumbnail:hover {
    transform: scale(1.5) translateY(-10px);
  }

  .range-controls {
    height: 50px;
    padding: 0 8px;
  }

  .slider {
    height: 30px;
  }

  .slider::-webkit-slider-runnable-track {
    height: 6px;
  }

  .slider::-moz-range-track {
    height: 6px;
  }
}

@media (max-width: 380px) {
  .time-markers {
    font-size: 0.7em;
  }

  .time-adjust-btn {
    padding: 3px 6px;
    min-width: 45px;
  }

  .action-btn {
    padding: 6px 10px;
    font-size: 0.85em;
  }

  .preview-controls {
    padding: 8px;
  }

  .control-btn {
    width: 36px;
    height: 36px;
  }
}

.icon-text {
  display: inline-block;
  font-size: 18px;
  margin-right: 6px;
}

.time-control {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-adjust-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-adjust-btn {
  background: rgba(180, 83, 9, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.8em;
  cursor: pointer;
  transition: background 0.2s;
}

.time-adjust-btn:hover {
  background: rgba(217, 119, 6, 0.8);
}
</style>
