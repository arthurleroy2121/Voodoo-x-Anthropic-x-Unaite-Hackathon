# Mock videos (demo / pitch mode)

This folder hosts pre-rendered MP4s that are replayed in step 4 of the workflow
instead of calling the real Scenario (Seedance 2.0) API. Useful for pitches /
demos where we want a deterministic, fast result without burning credits.

## Expected file

```
sample-ad.mp4
```

Drop your demo video at `voodoo-hack/public/mock-videos/sample-ad.mp4` — Next.js
serves anything under `public/` automatically, so the file is reachable from
the browser at:

```
/mock-videos/sample-ad.mp4
```

## Where it is consumed

- [`components/creative/CreativeOutputStep.tsx`](../../components/creative/CreativeOutputStep.tsx) — see the
  `MOCK_VIDEO_URL` constant near the top of the file. Clicking
  *"Generate with Seedance 2.0"* now waits `MOCK_GENERATION_DELAY_MS` (3s) and
  then loads this MP4 via [`ScenarioVideoPlayer`](../../components/creative/ScenarioVideoPlayer.tsx).

## Recommended encoding

To match what Seedance 2.0 actually produces (so the player frames it
correctly):

- Duration: ~15s
- Aspect ratio: 9:16 (vertical) — the player crops with `object-cover` inside
  an `aspect-[9/16]` container, so non-vertical videos will be cropped.
- Resolution: 720x1280 (or higher, same aspect)
- Codec: H.264, AAC audio (or no audio — the player has `controls={false}`)

## Switching back to the real API

To re-enable real Seedance 2.0 generation, restore the import of
`generateScenarioVideo` in `CreativeOutputStep.tsx` and replace the `setTimeout`
block inside `runGeneration()` with the original `await generateScenarioVideo({...})`
call. All the surrounding state / UI logic was kept intact.
