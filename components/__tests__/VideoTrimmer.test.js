import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VideoTrimmer from "../VideoTrimmer.vue";

// Mock FFmpeg
vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    writeFile: vi.fn(),
    exec: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(new Uint8Array()),
  })),
}));

// Mock FFmpeg utils
vi.mock("@ffmpeg/util", () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array()),
  toBlobURL: vi.fn().mockResolvedValue("mock-blob-url"),
}));

describe("VideoTrimmer", () => {
  let wrapper;
  const mockProps = {
    videoUrl: "https://example.com/video.mp4",
    duration: 100,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create URL mock
    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();

    wrapper = mount(VideoTrimmer, {
      props: mockProps,
    });
  });

  it("renders properly", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(2);
    expect(wrapper.findAll("button")).toHaveLength(2);
  });

  it("formats time correctly", () => {
    const timeDisplay = wrapper.find(".time-display");
    expect(timeDisplay.text()).toContain("00:00"); // Start time
    expect(timeDisplay.text()).toContain("01:40"); // End time (100 seconds)
  });

  it("updates time values when sliders change", async () => {
    const [startSlider, endSlider] = wrapper.findAll('input[type="range"]');

    await startSlider.setValue(20);
    await endSlider.setValue(80);

    const timeDisplay = wrapper.find(".time-display");
    expect(timeDisplay.text()).toContain("00:20");
    expect(timeDisplay.text()).toContain("01:20");
  });

  it("prevents end time from being less than start time", async () => {
    const [startSlider, endSlider] = wrapper.findAll('input[type="range"]');

    await endSlider.setValue(30);
    await startSlider.setValue(40);

    expect(wrapper.vm.startTime).toBeLessThan(wrapper.vm.endTime);
  });

  it("prevents start time from being greater than end time", async () => {
    const [startSlider, endSlider] = wrapper.findAll('input[type="range"]');

    await startSlider.setValue(70);
    await endSlider.setValue(60);

    expect(wrapper.vm.startTime).toBeLessThan(wrapper.vm.endTime);
  });

  it("shows processing status during download", async () => {
    const downloadButton = wrapper.findAll("button")[1];

    const downloadPromise = downloadButton.trigger("click");

    expect(wrapper.find(".processing-status").exists()).toBe(true);
    expect(wrapper.text()).toContain("Processing");

    await downloadPromise;
  });

  it("creates and triggers download when processing is complete", async () => {
    const downloadButton = wrapper.findAll("button")[1];

    await downloadButton.trigger("click");

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("handles preview functionality", async () => {
    // Mock video element and its methods
    const mockVideo = {
      currentTime: 0,
      play: vi.fn(),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    global.document.querySelector = vi.fn(() => mockVideo);

    const previewButton = wrapper.findAll("button")[0];
    await previewButton.trigger("click");

    expect(mockVideo.currentTime).toBe(wrapper.vm.startTime);
    expect(mockVideo.play).toHaveBeenCalled();
    expect(mockVideo.addEventListener).toHaveBeenCalledWith(
      "timeupdate",
      expect.any(Function)
    );
  });
});
