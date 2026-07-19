import { Audio, Sequence, staticFile } from "remotion";

const AUDIO_CUES = [
  { frame: 6, file: "pop.mp3", volume: 0.3 },
  { frame: 10, file: "sparkle.mp3", volume: 0.24 },
  { frame: 84, file: "impact-bass-2.mp3", volume: 0.32 },
  { frame: 198, file: "whoosh-short.mp3", volume: 0.42 },
  { frame: 318, file: "whoosh.mp3", volume: 0.4 },
  { frame: 438, file: "whoosh-short.mp3", volume: 0.36 },
  { frame: 564, file: "pop.mp3", volume: 0.34 },
  { frame: 566, file: "impact-bass-1.mp3", volume: 0.28 },
  { frame: 744, file: "chime.mp3", volume: 0.34 },
  { frame: 752, file: "sparkle.mp3", volume: 0.2 },
] as const;

export const SoundDesign = () => (
  <>
    {AUDIO_CUES.map((cue, index) => (
      <Sequence key={`${cue.file}-${cue.frame}-${index}`} from={cue.frame} layout="none">
        <Audio src={staticFile(`assets/sfx/${cue.file}`)} volume={() => cue.volume} />
      </Sequence>
    ))}
  </>
);
