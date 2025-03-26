import { ref } from "vue";

interface Episode {
  title: string;
  url: string;
}

export const useEpisodes = () => {
  const episodes = ref<Episode[]>([]);
  const playlist = ref<Episode[]>([]);
  const isLoading = ref(false);

  const loadEpisodes = async () => {
    isLoading.value = true;
    try {
      // Using the full URL to ensure proper loading
      const response = await fetch("/kiepscy.txt", {
        headers: {
          Accept: "text/plain",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // Parse the text file
      const lines = text.split("\n");
      const parsedEpisodes: Episode[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith("http")) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && nextLine.startsWith("http")) {
            parsedEpisodes.push({
              title: line,
              url: nextLine,
            });
            i++; // Skip the URL line in next iteration
          }
        }
      }

      episodes.value = parsedEpisodes;
    } catch (error) {
      console.error("Error loading episodes:", error);
      // Add some error handling UI feedback
      episodes.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const addToPlaylist = (episode: Episode) => {
    if (!playlist.value.find((e) => e.url === episode.url)) {
      playlist.value.push(episode);
    }
  };

  const removeFromPlaylist = (episode: Episode) => {
    playlist.value = playlist.value.filter((e) => e.url !== episode.url);
  };

  const clearPlaylist = () => {
    playlist.value = [];
  };

  return {
    episodes,
    playlist,
    isLoading,
    loadEpisodes,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
  };
};
