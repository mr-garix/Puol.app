export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  duration: string;
};

export const MUSIC_LIBRARY: readonly MusicTrack[] = [
  {
    id: 'track-sunset',
    title: 'Sunset Breeze',
    artist: 'PUOL Studio',
    uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '1:42',
  },
  {
    id: 'track-vibes',
    title: 'City Vibes',
    artist: 'PUOL Studio',
    uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: '2:05',
  },
  {
    id: 'track-chill',
    title: 'Chill Steps',
    artist: 'PUOL Studio',
    uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: '1:33',
  },
] as const;

export const getMusicTrackById = (id?: string | null): MusicTrack | undefined => {
  if (!id) {
    return undefined;
  }
  return MUSIC_LIBRARY.find((track) => track.id === id);
};
