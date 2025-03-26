import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VideoPlayer from "../VideoPlayer.vue";

// Mock HTMLMediaElement methods that are not implemented in JSDOM
window.HTMLMediaElement.prototype.play = vi.fn();
window.HTMLMediaElement.prototype.pause = vi.fn();

describe("VideoPlayer", () => {
  let wrapper;
  const mockPlaylist = [
    {
      title: "Episode 1",
      url: "https://example.com/video1.mp4",
    },
    {
      title: "Episode 2",
      url: "https://example.com/video2.mp4",
    },
    {
      title: "Episode 3",
      url: "https://example.com/video3.mp4",
    },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    wrapper = mount(VideoPlayer, {
      props: {
        playlist: mockPlaylist,
      },
    });
  });

  it("renders properly", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find("video").exists()).toBe(true);
    expect(wrapper.findAll("li")).toHaveLength(mockPlaylist.length);
  });

  it("initializes with the first video", () => {
    const video = wrapper.find("video source");
    expect(video.attributes("src")).toBe(mockPlaylist[0].url);
  });

  it("can navigate to next video", async () => {
    await wrapper.vm.playNext();
    const video = wrapper.find("video source");
    expect(video.attributes("src")).toBe(mockPlaylist[1].url);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("can navigate to previous video", async () => {
    // First go to second video
    await wrapper.vm.playNext();
    // Then go back
    await wrapper.vm.playPrevious();
    const video = wrapper.find("video source");
    expect(video.attributes("src")).toBe(mockPlaylist[0].url);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("disables previous button when on first video", () => {
    const prevButton = wrapper.find("button:first-child");
    expect(prevButton.attributes("disabled")).toBeDefined();
  });

  it("disables next button when on last video", async () => {
    // Navigate to last video
    await wrapper.vm.playNext();
    await wrapper.vm.playNext();
    const nextButton = wrapper.find("button:last-child");
    expect(nextButton.attributes("disabled")).toBeDefined();
  });

  it("emits remove event when remove button is clicked", async () => {
    const removeButton = wrapper.find(".remove-btn");
    await removeButton.trigger("click");
    expect(wrapper.emitted("remove")).toBeTruthy();
    expect(wrapper.emitted("remove")[0]).toEqual([mockPlaylist[0]]);
  });

  describe("Automatic progression", () => {
    it("automatically plays next episode when current one ends", async () => {
      const video = wrapper.find("video");

      // Simulate video end
      await video.trigger("ended");

      // Check if the video source changed to the next episode
      const source = wrapper.find("video source");
      expect(source.attributes("src")).toBe(mockPlaylist[1].url);
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });

    it("stops at the last episode when it ends", async () => {
      // Navigate to last episode
      await wrapper.vm.playNext();
      await wrapper.vm.playNext();

      const video = wrapper.find("video");
      const playCallCount =
        window.HTMLMediaElement.prototype.play.mock.calls.length;

      // Simulate video end
      await video.trigger("ended");

      // Check if the video source remained the same (last episode)
      const source = wrapper.find("video source");
      expect(source.attributes("src")).toBe(mockPlaylist[2].url);
      // Check that play wasn't called again
      expect(window.HTMLMediaElement.prototype.play.mock.calls.length).toBe(
        playCallCount
      );
    });

    it("maintains correct episode order when progressing automatically", async () => {
      const video = wrapper.find("video");

      // Simulate first episode end
      await video.trigger("ended");
      expect(wrapper.find("video source").attributes("src")).toBe(
        mockPlaylist[1].url
      );
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

      // Simulate second episode end
      await video.trigger("ended");
      expect(wrapper.find("video source").attributes("src")).toBe(
        mockPlaylist[2].url
      );
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

      // Simulate last episode end
      const playCallCount =
        window.HTMLMediaElement.prototype.play.mock.calls.length;
      await video.trigger("ended");
      expect(wrapper.find("video source").attributes("src")).toBe(
        mockPlaylist[2].url
      );
      expect(window.HTMLMediaElement.prototype.play.mock.calls.length).toBe(
        playCallCount
      );
    });
  });
});
