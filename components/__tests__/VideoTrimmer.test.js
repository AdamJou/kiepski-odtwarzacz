import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VideoTrimmer from "../VideoTrimmer.vue";

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    writeFile: vi.fn(),
    exec: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(new Uint8Array()),
  })),
}));

vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array()),
  toBlobURL: vi.fn().mockResolvedValue("mock-blob-url"),
}));

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
}));
HTMLCanvasElement.prototype.toDataURL = vi.fn(
  () => "data:image/jpeg;base64,test"
);

global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: vi.fn(),
  onstop: vi.fn(),
}));

describe("VideoTrimmer", () => {
  let wrapper;
  const mockProps = {
    videoUrl: "https://example.com/video.mp4",
    duration: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();

    wrapper = mount(VideoTrimmer, {
      props: mockProps,
      global: {
        stubs: {
          PlayIcon: true,
          PauseIcon: true,
          EyeIcon: true,
          ArrowDownTrayIcon: true,
          ClockIcon: true,
          XMarkIcon: true,
          ScissorsIcon: true,
        },
      },
    });

    wrapper.vm.isSnippetMode = true;
  });

  it("renders properly", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".video-trimmer").exists()).toBe(true);
    expect(wrapper.find(".preview-video").exists()).toBe(true);
    expect(wrapper.find(".control-btn").exists()).toBe(true);
  });

  it("formats time correctly", () => {
    const formatTime = wrapper.vm.formatTime;
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(100)).toBe("01:40");
    expect(formatTime(65)).toBe("01:05");
  });

  it("toggles snippet mode", async () => {
    wrapper.vm.isSnippetMode = false;

    const toggleButton = wrapper.find(".snippet-toggle button");
    expect(toggleButton.exists()).toBe(true);

    await toggleButton.trigger("click");

    expect(wrapper.vm.isSnippetMode).toBe(true);
  });

  it("handles preview functionality", async () => {
    expect(typeof wrapper.vm.previewSnippet).toBe("function");

    wrapper.vm.isSnippetMode = true;
    await wrapper.vm.$nextTick();

    const previewButton = wrapper.find(".controls button:first-child");
    expect(previewButton.exists()).toBe(true);
  });

  it("has processing status component", () => {
    wrapper.vm.isProcessing = true;
    wrapper.vm.status = "Processing...";
    wrapper.vm.progress = 50;

    expect(wrapper.vm.isProcessing).toBe(true);
    expect(wrapper.vm.status).toBe("Processing...");
    expect(wrapper.vm.progress).toBe(50);
  });

  it("has download functionality", () => {
    // Sprawdzamy  metoda downloadSnippet istnieje
    expect(typeof wrapper.vm.downloadSnippet).toBe("function");
  });
});
