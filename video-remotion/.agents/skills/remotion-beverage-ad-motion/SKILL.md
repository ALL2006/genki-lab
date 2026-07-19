---
name: remotion-beverage-ad-motion
description: Improve or build fast 9:16 Remotion beverage and FMCG product ads with smooth 60fps motion, configuration-driven timing, animated layered backgrounds, strong product/background separation, product- or ingredient-led occlusion transitions, synchronized local sound effects, and render QA. Use when a Remotion ad feels static, stiff, too much like a PPT, visually flat, low-contrast around the package, incorrectly converted from 30fps to 60fps, or needs a reusable 15-second social-video motion system.
---

# Remotion Beverage Ad Motion

Create a fast commercial cut in which the product remains readable while the frame stays continuously alive. Preserve configuration-driven reuse and deterministic rendering.

## Start from the existing system

1. Read `.agents/skills/remotion-best-practices/SKILL.md` before editing Remotion code.
2. Inspect the Composition registration, product configuration, scene durations, transitions, audio cues, and render scripts.
3. In this project, treat these files as canonical patterns:
   - `src/utils/motion.ts`
   - `src/components/DynamicBackdrop.tsx`
   - `src/components/ProductBottle.tsx`
   - `src/components/OcclusionTransition.tsx`
   - `src/components/SoundDesign.tsx`
   - `src/compositions/BeverageProductAd.tsx`
4. Preserve `objectFit: contain`, packaging proportions, labels, and source imagery. Never redraw, crop, stretch, or rewrite package artwork.

## Audit before changing motion

Map every visible element to one role:

- Background: gradient fields, liquid paths, lighting, large atmospheric forms.
- Midground: bubbles, petals, ingredients, supporting type.
- Hero: product and primary copy.
- Foreground: occluders, speed streaks, splashes, ingredients passing close to camera.

For each scene, identify entrance, settle, held motion, and transition. Flag these failures:

- A base gradient stays unchanged for the whole scene.
- All elements share one speed, direction, sine phase, or scale pulse.
- Motion finishes early and leaves a static hold.
- Every scene enters as a complete slide.
- Pale packaging uses `multiply` on a pale background.
- Changing Composition fps changes the real-time beat duration.
- Audio cues remain on old frame numbers after an fps change.

## Preserve timing while rendering at 60fps

Author motion on a stable design timeline and sample it at the output fps. Do not merely change `fps={30}` to `fps={60}`.

```ts
const DESIGN_FPS = 30;

const useDesignFrame = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame * DESIGN_FPS / fps;
};
```

Use the design frame for `interpolate()`, deterministic noise, sine motion, and spring timing. For a 15-second 60fps Composition:

- Set total duration to 900 output frames.
- Double 30fps `Sequence` durations and scene-start positions.
- Double audio cue frame numbers.
- Scale `Trail.lagInFrames` by `outputFps / DESIGN_FPS` to preserve smear duration.
- Keep real-time transition and entrance durations unchanged.

Do not mix raw output frames and design frames inside the same motion calculation unless the conversion is explicit.

## Keep the background alive

Build at least three independently moving layers:

1. Move two or more oversized gradient or organic forms with deterministic noise, different directions, and different frequencies.
2. Animate liquid paths or dashed curves continuously across the scene.
3. Run a single-pass traveling light band or sheen through the frame.
4. Add bubbles, petals, droplets, or ingredients with index-derived positions and out-of-phase motion.

Use small continuous camera drift or gradual push-in to connect the layers. Keep drift subtle per frame and visible over time. Avoid applying identical breathing scale to every element; use sequential reveals first, then low-amplitude held motion.

Keep all motion deterministic. Use fixed arrays, indices, seeded noise, `useCurrentFrame()`, and `useVideoConfig()`. Never use `Math.random()`, wall-clock time, CSS infinite animation, or autoplay behavior.

## Separate the product from the background

For pale or translucent packaging on a pale field:

- Prefer `mixBlendMode: normal`; test `multiply` only when it improves silhouette and label contrast.
- Use a narrowed feathered mask to hide the source image's white rectangle without cropping the bottle.
- Add a darker, more saturated halo behind the product rather than a same-lightness glow.
- Add contact shadow below the bottle and a restrained drop shadow around the hero layer.
- Increase contrast and saturation slightly, without altering label colors.
- Add one finite traveling sheen across the package.
- Give the bottle small independent float and tilt after the entrance settles.

Keep the label sharp during holds. Couple blur or echo trails to fast movement, then resolve them completely when the product lands.

## Make transitions spatial, not slide-based

Use one primary transition language for most cuts and one or two accents. For a fresh beverage ad, prefer foreground occlusion:

- Product bottle rushes close to camera.
- Fruit or flowers pass through the lens plane.
- A liquid ribbon crosses the full frame.
- A bubble or splash expands until it covers the cut.

Position the incoming scene first, accelerate the occluder, cut at maximum coverage, then decelerate or clear the occluder. Match outgoing and incoming velocity so motion appears continuous. At 60fps, keep high-energy transitions around 0.25–0.4 seconds unless the visual mass requires longer.

Avoid a different transition for every scene, repeated card slides, generic crossfades, uniform tile patterns, and exits that fade to empty before the next scene begins.

## Synchronize sound design

Use local SFX through `staticFile()` and keep sound paths centralized. Assign sound by physical action:

- `whoosh`: product, ingredient, or liquid crossing the frame.
- `impact`: product reveal or headline lock.
- `pop`: bubble expansion or flavor beat.
- `sparkle` or `chime`: sheen, freshness cue, or final lockup.

Align the transient with the visual impact frame, not the start of the animation. Layer sparingly. Keep final peak below clipping; the current reference mix is approximately `-19 dB` mean and `-3.8 dB` peak.

## Preserve reusable configuration

Keep product name, palette, flavor count, copy, scene timing, asset paths, and audio choices in configuration. Make scenes consume typed configuration rather than product-specific strings.

Do not add unapproved claims, prices, results, concept labels, disclaimers, or accent colors. Render only copy and colors explicitly enabled for the current cut.

## Validate in this order

1. Run asset checks, TypeScript checks, lint, and the Remotion bundle build.
2. Render one still from every scene at its settled state.
3. Render frames at every transition center and verify complete coverage of the cut.
4. Check product proportions, label visibility, safe areas, copy, and foreground/background contrast.
5. Render the final MP4.
6. Use `ffprobe` to verify H.264, 1080×1920, 60fps, 900 video frames, approximately 15 seconds, and an AAC audio stream.
7. Extract 8–12 consecutive frame hashes with `framemd5`; confirm adjacent frames are not duplicates during a held product shot.
8. Measure audio peak and mean volume with `volumedetect`.

Do not approve the render when the package is cropped or distorted, the label is blurred at rest, the background is visually static, adjacent 60fps frames are duplicated, a transition reveals a naked cut, or unauthorized copy appears.
