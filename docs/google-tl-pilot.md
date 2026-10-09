# Google Spanish `tl` pilot — October 7, 2026

**The tested exact `tl` phoneme encodings did not produce a distinct lateral release.** Google accepted the requests; output comparisons are consistent with normalization to the existing pronunciation or fallback to ordinary Spanish text. Its internal parser decisions are not observable from the response. Two supported frication approximations were generated for comparison; neither encodes the Nahuatl lateral affricate and neither has been approved for lessons.

The pilot used the existing project **mero-mero-494501**, **es-US-Standard-A**, Spanish-US, rate0.82, pitch0, LINEAR16. All pronunciation probes retained the existing custom rules for other sounds. The same four INALI words were used in order: **atl, xochitl, tlaxkali, sintli**. A separate plain-Spanish clip was only a diagnostic fallback control.

## Results

| Probe | Actual response | Interpretation |
| --- | --- | --- |
| Current X-SAMPA `tl`; equivalent IPA `tl` control | Accepted;4.9842s; controls correlate0.999999984 with only tiny integer-PCM differences | Current ordinary `t+l` baseline. |
| IPA `tɬ`, without tie; X-SAMPA `tK` | Accepted; **both PCM streams are exactly identical to the IPA `tl` control** | Request acceptance does not mean Google generated the voiceless lateral fricative. No new sound was produced. |
| IPA tied `t͡ɬ`; IPA aspirated/devoiced `tʰl̥` | Accepted;4.826s; correlation to the plain-Spanish control0.999999999925; maximum1 integer-PCM unit difference | Effectively plain-Spanish fallback rather than the requested lateral release. |
| IPA `tl̥`; X-SAMPA `tl_0`; IPA `tʰ`; X-SAMPA `t_h` | Accepted;4.826s; correlation to plain control at least0.9999999768; maximum12/32768 PCM units difference | No materially distinct requested devoice/aspiration effect established. |
| Supported X-SAMPA `tT`, `t` plus dental `/θ/` | Accepted; a distinct comparison recording | **Approximation only:** dental frication, not lateral airflow. Other Nahuatl exceptions remain applied. |
| Supported X-SAMPA `tx`, `t` plus Spanish `/x/` | Accepted; a distinct comparison recording | **Approximation only:** Spanish frication, not lateral airflow. Other Nahuatl exceptions remain applied. |

Google's [Spanish-US phoneme inventory](https://docs.cloud.google.com/text-to-speech/docs/phonemes#spanish_united_states_es-us) lists `t`, voiced `l`, `/θ/` and `/x/`, but does not document `/ɬ/`, aspiration or devoicing diacritics. The [SSML guide](https://docs.cloud.google.com/text-to-speech/docs/ssml#phoneme) allows inline IPA/X-SAMPA, within the supported inventory. The numerical waveform comparisons above are actual pilot results; they are not a claim that someone listened and certified pronunciation.

## Listen and compare

All clips say **atl → xochitl → tlaxkali → sintli**.

- [Current recipe](../data/audio-v3/tl-pilot-20261007/00-current-xsampa.wav)
- [Dental-air approximation](../data/audio-v3/tl-pilot-20261007/11-t-dental-frication.wav)
- [Spanish-frication approximation](../data/audio-v3/tl-pilot-20261007/12-t-spanish-frication.wav)
- [Linked native Chicontepec ātl reference](https://tlahtolli.coerll.utexas.edu/wp-content/uploads/atl.mp3), Nāhuatlahtolli / COERLL. The original recording remains linked, not copied, trained on or spliced into these candidates.

COERLL's [Chicontepec alphabet lesson](https://tlahtolli.coerll.utexas.edu/es/tlamachtiliztli-ce-leccion-1-piltlahcuiloltzitzin-el-alfabeto/) identifies `tl` as `[tɬ]`, including final voiceless `l`. The desired release is lateral; a separate dental or velar friction sound does not establish accuracy merely because it is airy.

## Cost, provenance and next decision

**13 requests,13 accepted clips**, all nonempty24kHz mono16-bit WAVs. Conservative synthesis estimate **$0.015296**, about1.5US cents, counting UTF-8 SSML bytes and ignoring any free allowance. This is an estimate, not an inspected billing charge. [Google's Standard pricing](https://cloud.google.com/text-to-speech/pricing) is $4/million characters. No billing console was accessed.

Exact requests, voice settings, output hashes, WAV validation and waveform comparisons are saved in the Git-ignored `data/audio-v3/tl-pilot-20261007/` folder. Authentication used only the existing service account for the named project; no Drive, personal Google account, production database, deployment or source recording was touched.

**The course pronunciation recipe and all learner audio bindings remain unchanged.** These experiments do not support replacing every `tl` recording with either proxy. Keep suitable exact native-source recordings where available. Within the current Spanish engine, a global accuracy claim needs a reproducible supported pronunciation control plus listening review; these encodings have not supplied one.
