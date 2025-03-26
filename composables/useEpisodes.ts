import { ref, computed } from "vue";

interface Episode {
  title: string;
  url: string;
}

interface EpisodeMetadata {
  duration: number;
  thumbnails?: string[];
}

export const useEpisodes = () => {
  const episodes = ref<Episode[]>([]);
  const playlist = ref<Episode[]>([]);
  const isLoading = ref(false);
  const episodeCache = ref<Map<string, EpisodeMetadata>>(new Map());

  const loadEpisodes = async () => {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const response = await fetch("/kiepscy.txt", {
        headers: { Accept: "text/plain" },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const text = await response.text();
      const lines = text.split("\n");
      const parsedEpisodes: Episode[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith("http")) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine?.startsWith("http")) {
            parsedEpisodes.push({ title: line, url: nextLine });
            i++;
          }
        }
      }

      episodes.value = parsedEpisodes;
    } catch (error) {
      console.error("Error loading episodes:", error);
      episodes.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const addToPlaylist = (episode: Episode) => {
    if (!playlist.value.some((e) => e.url === episode.url)) {
      playlist.value.push(episode);
    }
  };

  const removeFromPlaylist = (episode: Episode) => {
    playlist.value = playlist.value.filter((e) => e.url !== episode.url);
  };

  const clearPlaylist = () => {
    playlist.value = [];
  };

  const cacheThumbnails = (url: string, thumbnails: string[]) => {
    const metadata = episodeCache.value.get(url) || { duration: 0 };
    episodeCache.value.set(url, { ...metadata, thumbnails });
  };

  const getCachedThumbnails = (url: string): string[] | undefined => {
    return episodeCache.value.get(url)?.thumbnails;
  };

  const cacheEpisodeMetadata = (url: string, duration: number) => {
    const metadata = episodeCache.value.get(url) || {};
    episodeCache.value.set(url, { ...metadata, duration });
  };

  const getEpisodeMetadata = (url: string): EpisodeMetadata | undefined => {
    return episodeCache.value.get(url);
  };

  return {
    episodes,
    playlist,
    isLoading,
    loadEpisodes,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    cacheThumbnails,
    getCachedThumbnails,
    cacheEpisodeMetadata,
    getEpisodeMetadata,
    episodeCache,
  };
};
