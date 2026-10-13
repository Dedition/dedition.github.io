# The Night Shift — synthetic cast

These are locally generated, curated character performances for Leo Ladipo's fictional Night Shift experience. They are synthetic voices, not recordings of actors or imitations of named people. No system voice recordings, paid speech service, or remote inference API were used.

| Character | Kokoro voice | Direction and treatment |
| --- | --- | --- |
| Evaluator | `bf_emma` | Precise British corporate calm; small deliberate pauses. |
| Subject 001 | `am_michael` | Direct, grounded American delivery. |
| Warden | `bm_george` | Measured British authority, low-mid weight and a short institutional room reflection. |
| Sable | `af_bella` | Faster, bright American delivery with a dry, close sound. |
| D-13 | `am_puck` | Warmer American delivery; the clearest and least processed voice. |
| System | `af_sarah` | Narrow broadcast bandwidth, slight mechanical modulation and a short electronic reflection. |
| Unknown | `am_puck` | D-13 before identification, behind a narrow radio filter and distant reflection. |

Masked words in captions become a 190ms electronic bleep. Their uncensored forms are never passed to the synthesizer. The asset manifest preserves the exact displayed caption as its key and records the encoded clip duration in seconds. Mono MP3 at 24kHz / 64kbps keeps the cast small and broadly playable. Audio is normalized toward -19 LUFS with a -3dB true-peak ceiling; the player controls dialogue volume independently from the score.

## Model and tool provenance

- [Kokoro-82M, v1.0 by hexgrad](https://huggingface.co/hexgrad/Kokoro-82M): Apache-2.0 licensed model weights. The publisher documents permissive training sources and explicitly permits production deployment. See the [Apache-2.0 terms](https://www.apache.org/licenses/LICENSE-2.0) and [voice inventory](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).
- [kokoro-onnx 0.6.1](https://github.com/thewh1teagle/kokoro-onnx): MIT-licensed local inference wrapper by thewh1teagle. ONNX v1.0 model and voice archive came from its [`model-files-v1.1` release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1).
- `soundfile 0.14.0` writes temporary PCM; FFmpeg 8.1 processes and encodes the final files. The application distributes the audio only, not these tools or the model weights.
- Kokoro's model card additionally credits Koniwa (`tnc`, CC BY 3.0) and [SIWIS](https://datashare.ed.ac.uk/handle/10283/2353) (CC BY 4.0) as portions of its training set. The selected cast uses the English voices listed above.

Downloaded generation inputs:

```text
kokoro-v1.0.onnx  SHA256 beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a
voices-v1.0.bin   SHA256 bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d
```

## Reproduce

Use an isolated Python environment with `kokoro-onnx==0.6.1` and `soundfile==0.14.0`, plus FFmpeg/ffprobe. Download the two model files from the release above into a separate tooling directory and verify their SHA256 sums. From the repository root:

```sh
python scripts/generate-night-shift-voices.py \
  --model /path/to/kokoro-v1.0.onnx \
  --voices /path/to/voices-v1.0.bin
```

The script reads the caption triples from `src/components/NightShift.jsx`, rejects unexpectedly small extractions, bleeps masked words, applies character processing, and writes the MP3 files and `public/night-shift-voices.json`. Exact speaker/text matches with an existing manifest file reuse that clip; every duration is checked with ffprobe. After successful generation and manifest replacement, it removes only obsolete clips named in the previous manifest. Use `--force` when changing the cast or performance direction, to regenerate unchanged dialogue too.

It does not download anything, install dependencies, upload dialogue, or contact a speech provider. Only regenerate when dialogue or performance direction changes; the browser never needs the model.
