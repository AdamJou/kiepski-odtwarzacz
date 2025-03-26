<template>
  <div class="video-trimmer">
    <div class="preview-container">
      <video
        ref="previewVideo"
        class="preview-video"
        :src="videoUrl"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleMetadataLoaded"
        crossorigin="anonymous"
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
            :step="0.1"
            v-model.number="startTime"
            class="slider start-slider"
            @input="handleStartChange"
            style="z-index: 3; position: relative"
          />
          <input
            type="range"
            :min="0"
            :max="previewVideo?.duration || 100"
            :step="0.1"
            v-model.number="endTime"
            class="slider end-slider"
            @input="handleEndChange"
            style="z-index: 2; position: relative"
          />
        </div>
      </div>

      <div class="time-markers">
        <span>{{ formatTime(startTime) }}</span>
        <span>Długość: {{ formatTime(endTime - startTime) }}</span>
        <span>{{ formatTime(endTime) }}</span>
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

    <!-- Hidden canvas for video processing -->
    <canvas ref="canvas" style="display: none"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { toBlobURL } from "@ffmpeg/util";
import {
  PlayIcon,
  PauseIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  XMarkIcon,
  ScissorsIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps<{
  videoUrl: string;
  duration: number;
}>();

const startTime = ref(0);
const endTime = ref(0);
const currentTime = ref(0);
const isProcessing = ref(false);
const progress = ref(0);
const status = ref("");
const ffmpeg = ref<FFmpeg | null>(null);
const previewVideo = ref<HTMLVideoElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const isPlaying = ref(false);
const thumbnails = ref<string[]>([]);
const numThumbnails = 20;
const mediaRecorder = ref<MediaRecorder | null>(null);
const recordedChunks = ref<Blob[]>([]);
const isSnippetMode = ref(false);

// Initialize FFmpeg
const initFFmpeg = async () => {
  try {
    const ffmpegInstance = new FFmpeg();
    console.log("Created FFmpeg instance");

    // Configure logging
    ffmpegInstance.on("log", ({ message }) => {
      console.log("FFmpeg Log:", message);
    });

    // Configure progress tracking
    ffmpegInstance.on("progress", ({ progress: p }) => {
      console.log("FFmpeg Progress:", p);
      progress.value = Math.round(p * 100);
    });

    console.log("Loading FFmpeg...");

    // Load FFmpeg with proxied URLs
    await ffmpegInstance.load({
      coreURL: "/ffmpeg/ffmpeg-core.js",
      wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      workerURL: "/ffmpeg/ffmpeg-core.worker.js",
    });

    console.log("FFmpeg loaded successfully");
    ffmpeg.value = ffmpegInstance;
  } catch (error) {
    console.error("Error initializing FFmpeg:", error);
    status.value = "Failed to initialize video processor. Please try again.";
    throw error;
  }
};

// Format time in MM:SS format
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

// Generate thumbnails
const generateThumbnails = async () => {
  if (!previewVideo.value) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = 160;
  canvas.height = 90;

  thumbnails.value = [];

  for (let i = 0; i < numThumbnails; i++) {
    const time = (i * previewVideo.value.duration) / numThumbnails;
    previewVideo.value.currentTime = time;

    await new Promise((resolve) => {
      previewVideo.value!.addEventListener("seeked", resolve, { once: true });
    });

    ctx.drawImage(previewVideo.value, 0, 0, canvas.width, canvas.height);
    try {
      thumbnails.value.push(canvas.toDataURL("image/jpeg", 0.7));
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      // Add a placeholder thumbnail
      thumbnails.value.push(
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSAyVC08MTY3LjIyOUFTRjo/Tj4yMkhiSk46NjU1PVBVXWRkXWyEhIf/2wBDARUXFx4aHjshITtBNkFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUH/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      );
    }
  }
};

// Handle video metadata loaded
const handleMetadataLoaded = () => {
  if (!previewVideo.value) return;

  const videoDur = previewVideo.value.duration;

  // Inicjalizujemy zakresy wycinania
  startTime.value = 0;
  endTime.value = videoDur;

  // Opóźnij generowanie miniatur, żeby dać czas na ustawienie sliderów
  setTimeout(() => {
    generateThumbnails();
  }, 500);
};

// Handle time update
const handleTimeUpdate = () => {
  if (!previewVideo.value) return;

  currentTime.value = previewVideo.value.currentTime;

  if (previewVideo.value.currentTime >= endTime.value) {
    previewVideo.value.pause();
    isPlaying.value = false;
  }
};

// Toggle playback
const togglePlayback = () => {
  if (!previewVideo.value) return;

  if (isPlaying.value) {
    previewVideo.value.pause();
  } else {
    previewVideo.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

// Seek to specific time
const seekToTime = (time: number) => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = time;
};

// Seek to start
const seekToStart = () => {
  seekToTime(startTime.value);
};

// Seek to end
const seekToEnd = () => {
  seekToTime(endTime.value);
};

// Handle start time change
const handleStartChange = () => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = startTime.value;
};

// Handle end time change
const handleEndChange = () => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = endTime.value;
};

// Preview the selected snippet
const previewSnippet = async () => {
  if (!previewVideo.value) return;
  previewVideo.value.currentTime = startTime.value;
  previewVideo.value.play();
  isPlaying.value = true;
};

// Download the trimmed video snippet
const downloadSnippet = async () => {
  if (!previewVideo.value || isProcessing.value) return;

  try {
    isProcessing.value = true;
    progress.value = 0;
    status.value = "Preparing video...";

    // Create a MediaRecorder with high quality settings
    const stream = (
      previewVideo.value as HTMLVideoElement & {
        captureStream: (fps: number) => MediaStream;
      }
    ).captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=h264",
      videoBitsPerSecond: 8000000, // 8 Mbps for high quality
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Create a blob with WebM data but save it as MP4
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Save with .mp4 extension even though it's WebM inside
      a.download = `trimmed_${formatTime(startTime.value)}-${formatTime(
        endTime.value
      )}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      status.value = "Download complete!";
      isProcessing.value = false;
      progress.value = 100;
    };

    // Start recording
    mediaRecorder.start();
    status.value = "Zapisywanie...";

    // Seek to start time and play
    previewVideo.value.currentTime = startTime.value;
    previewVideo.value.play();

    // Update progress
    const updateProgress = () => {
      if (!previewVideo.value) return;
      const currentProgress =
        ((previewVideo.value.currentTime - startTime.value) /
          (endTime.value - startTime.value)) *
        100;
      progress.value = Math.min(100, Math.max(0, currentProgress));

      if (previewVideo.value.currentTime < endTime.value) {
        requestAnimationFrame(updateProgress);
      } else {
        mediaRecorder.stop();
      }
    };

    updateProgress();
  } catch (error) {
    console.error("Error processing video:", error);
    status.value = "Error processing video. Please try again.";
    isProcessing.value = false;
    progress.value = 0;
  }
};

// Ensure end time is always greater than start time
watch(startTime, (newValue) => {
  if (newValue >= endTime.value) {
    startTime.value = endTime.value - 1;
  }
});

watch(endTime, (newValue) => {
  if (newValue <= startTime.value) {
    endTime.value = startTime.value + 1;
  }
});

// Toggle snippet mode
const toggleSnippetMode = () => {
  isSnippetMode.value = !isSnippetMode.value;
  if (isSnippetMode.value && previewVideo.value) {
    startTime.value = currentTime.value;
    endTime.value = Math.min(
      currentTime.value + 30,
      previewVideo.value.duration
    );
    generateThumbnails();
  }
};

onMounted(async () => {
  console.log("Component mounted, initializing FFmpeg");
  try {
    await initFFmpeg();
  } catch (error) {
    console.error("Failed to initialize FFmpeg on mount:", error);
  }
});

onUnmounted(() => {
  if (previewVideo.value) {
    previewVideo.value.pause();
    previewVideo.value.src = "";
  }
  if (mediaRecorder.value && mediaRecorder.value.state !== "inactive") {
    mediaRecorder.value.stop();
  }
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

/* Responsywność dla urządzeń mobilnych */
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
    font-size: 0.8em;
  }

  .action-btn {
    padding: 6px 12px;
    font-size: 0.8em;
  }

  .control-btn {
    width: 32px;
    height: 32px;
  }

  .time-display {
    font-size: 0.9em;
  }
}

.icon-text {
  display: inline-block;
  font-size: 18px;
  margin-right: 6px;
}
</style>
