import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VideoPlayer from "../VideoPlayer.vue";

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
    // Mock HTMLMediaElement methods that are not implemented in JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn();
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

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
    expect(wrapper.findAll(".space-y-2 .flex")).toHaveLength(
      mockPlaylist.length
    );
  });

  it("initializes with the first video", () => {
    const video = wrapper.find("video source");
    expect(video.attributes("src")).toBe(mockPlaylist[0].url);
  });

  it("can navigate to next video", async () => {
    await wrapper.vm.playNext();

    expect(wrapper.vm.currentIndex).toBe(1);
    expect(wrapper.vm.currentVideo.url).toBe(mockPlaylist[1].url);
  });

  it("can navigate to previous video", async () => {
    wrapper.vm.currentIndex = 1;
    wrapper.vm.currentVideo = mockPlaylist[1];

    await wrapper.vm.playPrevious();

    expect(wrapper.vm.currentIndex).toBe(0);
    expect(wrapper.vm.currentVideo.url).toBe(mockPlaylist[0].url);
  });

  it("disables previous button when on first video", () => {
    const prevButton = wrapper.find(".playback-controls button:first-child");
    expect(prevButton.attributes("disabled")).toBeDefined();
  });

  it("disables next button when on last video", async () => {
    wrapper.vm.currentIndex = 2;
    await wrapper.vm.$nextTick();

    const nextButton = wrapper.find(".playback-controls button:last-child");
    expect(nextButton.attributes("disabled")).toBeDefined();
  });

  it("emits remove event when remove button is clicked", async () => {
    const removeButton = wrapper.find(".space-y-2 .flex button");
    await removeButton.trigger("click");
    expect(wrapper.emitted("remove")).toBeTruthy();
    expect(wrapper.emitted("remove")[0]).toEqual([mockPlaylist[0]]);
  });

  describe("Automatic progression", () => {
    it("automatically updates currentIndex when video ends", async () => {
      const video = wrapper.find("video");

      await video.trigger("ended");

      expect(wrapper.vm.currentIndex).toBe(1);
      expect(wrapper.vm.currentVideo.url).toBe(mockPlaylist[1].url);
    });

    it("stops at the last episode when it ends", async () => {
      wrapper.vm.currentIndex = 2;
      wrapper.vm.currentVideo = mockPlaylist[2];
      await wrapper.vm.$nextTick();

      const video = wrapper.find("video");

      await video.trigger("ended");

      expect(wrapper.vm.currentIndex).toBe(2);
      expect(wrapper.vm.currentVideo.url).toBe(mockPlaylist[2].url);
    });
  });
});
