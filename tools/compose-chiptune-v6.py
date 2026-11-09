"""Original four-channel music for Hat and Cat; synthesis, never source audio.

Usage (from the packaged project):
    python tools/compose-chiptune-v6.py --output assets/audio --ffmpeg /path/to/ffmpeg

Requires numpy and FFmpeg with libmp3lame. Each song is rendered and encoded
sequentially to keep memory modest. This is a composition/build tool, not a test.
No audio is played, and no browser or game is opened.
"""

from __future__ import annotations

import argparse
import gc
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave

import numpy as np


RATE = 32000
SEMITONES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name: str) -> int:
    letter = name[0]
    accidental = 1 if "#" in name else -1 if "b" in name else 0
    return (int(name[-1]) + 1) * 12 + SEMITONES[letter] + accidental


def phrase(text: str):
    """Eighth-note lengths; '-' is an actual rest, not a held chord."""
    cursor = 0.0
    for token in text.split():
        note, length = token.split(":")
        length = float(length)
        if note != "-":
            yield cursor, length, midi(note)
        cursor += length


# Written melody bars. A, contrasting B, and returning A' are independently
# articulated rather than a single short riff repeated for the whole file.
GATE_A = [
    "D4:1 F4:1 A4:2 G4:1 F4:1 E4:1 -:1",
    "F4:1 A4:1 C5:2 A4:1 G4:1 F4:2",
    "G4:1 Bb4:1 A4:1 G4:1 F4:2 D4:1 -:1",
    "E4:1 A4:1 G4:1 E4:1 C#4:2 A3:1 -:1",
    "D4:1 F4:1 A4:2 D5:1 C5:1 A4:2",
    "C5:1 A4:1 G4:2 F4:1 G4:1 A4:1 -:1",
    "Bb4:2 A4:1 G4:1 F4:2 E4:1 D4:1",
    "E4:1 F4:1 E4:1 C#4:1 A3:2 -:2",
]
GATE_B = [
    "A4:2 C5:1 D5:1 C5:2 A4:1 -:1",
    "G4:1 A4:1 Bb4:2 A4:1 G4:1 F4:2",
    "F4:1 G4:1 A4:2 C5:1 A4:1 F4:1 -:1",
    "G4:2 E4:1 F4:1 G4:1 A4:1 G4:2",
    "A4:1 C5:1 D5:2 C5:1 A4:1 F4:2",
    "Bb4:2 A4:1 G4:1 D5:1 C5:1 Bb4:1 -:1",
    "A4:1 G4:1 F4:1 E4:1 D4:2 F4:1 G4:1",
    "A4:2 G4:1 E4:1 C#4:2 -:2",
]
GATE_RETURN = GATE_A[:4] + [
    "D5:2 A4:1 F4:1 G4:1 A4:1 F4:2",
    "A4:1 C5:1 A4:1 G4:1 F4:2 E4:1 F4:1",
    "G4:1 Bb4:1 A4:1 G4:1 F4:1 E4:1 D4:2",
    "E4:1 F4:1 A4:2 C#5:1 A4:1 -:2",
]

TIDE_A = [
    "-:1 D4:1 G4:1 Bb4:1 A4:1 G4:2 -:1",
    "F4:1 -:1 G4:1 A4:2 G4:1 E4:1 -:1",
    "-:1 C5:1 Bb4:1 G4:1 E4:2 D4:1 -:1",
    "D4:1 F#4:1 A4:1 -:1 G4:1 F#4:1 D4:2",
    "-:1 G4:1 Bb4:1 D5:1 C5:1 Bb4:2 -:1",
    "A4:1 -:1 G4:1 F4:1 E4:2 G4:1 -:1",
    "Bb4:1 A4:1 G4:1 -:1 E4:1 D4:1 C4:2",
    "D4:1 -:1 F#4:1 A4:1 D5:1 C5:1 -:2",
]
TIDE_B = [
    "Bb4:2 D5:1 C5:1 Bb4:1 -:1 G4:2",
    "A4:1 G4:1 F4:1 -:1 C5:1 A4:1 G4:2",
    "G4:1 -:1 A4:1 C5:1 E5:1 D5:1 C5:2",
    "Bb4:1 A4:1 G4:2 F#4:1 -:1 D4:2",
    "D5:1 -:1 C5:1 Bb4:1 G4:2 F4:1 G4:1",
    "A4:2 C5:1 A4:1 G4:1 -:1 E4:2",
    "C5:1 Bb4:1 A4:1 G4:1 E4:2 D4:1 -:1",
    "F#4:1 A4:1 C5:1 -:1 A4:1 F#4:1 -:2",
]
TIDE_RETURN = TIDE_A[:4] + [
    "-:1 D5:1 Bb4:1 G4:1 A4:1 Bb4:2 -:1",
    "C5:1 -:1 A4:1 G4:1 E4:2 F4:1 G4:1",
    "Bb4:1 A4:1 G4:1 E4:1 D4:2 C4:1 -:1",
    "D4:1 F#4:1 A4:2 G4:1 F#4:1 -:2",
]

SPIRE_A = [
    "D4:1 F#4:1 A4:2 F#4:1 -:1",
    "E4:1 G#4:1 B4:2 A4:1 -:1",
    "F#4:1 A4:1 C#5:2 B4:1 A4:1",
    "E4:2 F#4:1 E4:1 C#4:1 -:1",
    "D4:1 A4:1 B4:2 A4:1 F#4:1",
    "G#4:1 B4:1 E5:1 D5:1 B4:1 -:1",
    "C#5:2 B4:1 A4:1 F#4:1 E4:1",
    "E4:2 A4:1 G4:1 E4:1 -:1",
    "F#4:1 A4:1 D5:2 C#5:1 B4:1",
    "G#4:1 B4:1 C#5:2 B4:1 -:1",
    "A4:1 F#4:1 E4:1 D4:1 F#4:1 A4:1",
    "E4:2 C#4:1 E4:1 A3:1 -:1",
]
SPIRE_B = [
    "B4:2 F#4:1 A4:1 B4:1 -:1",
    "C#5:1 B4:1 G#4:2 E4:1 -:1",
    "A4:1 F#4:1 D4:2 F#4:1 A4:1",
    "G4:1 B4:1 D5:2 C#5:1 -:1",
    "B4:1 C#5:1 D5:2 F#4:1 -:1",
    "E5:1 D5:1 C#5:1 B4:1 G#4:1 E4:1",
    "D5:2 A4:1 F#4:1 E4:1 -:1",
    "G4:1 B4:1 A4:2 E4:1 C#4:1",
    "B3:1 D4:1 F#4:2 A4:1 B4:1",
    "G#4:1 B4:1 C#5:2 E5:1 -:1",
    "D5:1 C#5:1 B4:1 A4:1 F#4:1 E4:1",
    "C#4:1 E4:1 G4:1 A4:1 -:2",
]
SPIRE_RETURN = SPIRE_A[:8] + [
    "D5:2 A4:1 F#4:1 A4:1 B4:1",
    "C#5:2 B4:1 G#4:1 E4:1 -:1",
    "F#4:1 A4:1 B4:1 A4:1 F#4:1 E4:1",
    "C#4:1 E4:1 A4:2 -:2",
]

BOSS_A = [
    "E4:1 E4:1 B4:1 A4:1 G4:1 F#4:1 E4:1 -:1",
    "G4:1 B4:1 C5:2 B4:1 G4:1 E4:1 -:1",
    "A4:1 A4:1 C5:1 B4:1 A4:1 G4:1 F#4:2",
    "F#4:1 B4:1 A4:1 F#4:1 D#4:2 B3:1 -:1",
    "E4:1 G4:1 B4:1 E5:1 D5:1 B4:1 G4:2",
    "C5:1 B4:1 G4:1 E4:1 G4:1 A4:1 B4:1 -:1",
    "A4:1 C5:1 B4:1 A4:1 G4:1 F#4:1 E4:2",
    "F#4:1 A4:1 B4:2 D#5:1 B4:1 -:2",
]
BOSS_B = [
    "G4:2 B4:1 D5:1 B4:1 A4:1 G4:2",
    "A4:1 D5:1 C5:1 A4:1 F#4:2 D4:1 -:1",
    "E4:1 G4:1 C5:2 B4:1 G4:1 E4:2",
    "F#4:1 A4:1 B4:1 A4:1 F#4:1 D#4:1 B3:2",
    "B4:1 D5:1 E5:1 D5:1 B4:2 A4:1 G4:1",
    "F#4:1 A4:1 D5:1 C5:1 A4:2 F#4:1 -:1",
    "G4:1 C5:1 B4:1 G4:1 E4:1 G4:1 A4:1 B4:1",
    "B4:2 A4:1 F#4:1 D#4:2 -:2",
]
BOSS_RETURN = BOSS_A[:4] + [
    "E5:1 D5:1 B4:1 G4:1 E4:1 G4:1 B4:2",
    "C5:2 B4:1 G4:1 A4:1 B4:1 G4:1 E4:1",
    "A4:1 C5:1 B4:1 G4:1 F#4:1 E4:1 F#4:1 A4:1",
    "B4:1 A4:1 F#4:1 D#4:1 B3:2 -:2",
]
BOSS_FINAL = BOSS_B[:4] + [
    "D5:1 B4:1 G4:1 B4:1 D5:1 E5:1 D5:1 B4:1",
    "A4:1 F#4:1 D4:2 F#4:1 A4:1 C5:1 -:1",
    "C5:1 B4:1 A4:1 G4:1 E4:1 G4:1 A4:1 B4:1",
    "D#5:1 B4:1 A4:1 F#4:1 B3:2 -:2",
]

# Chords are (triangle bass root, one pulse channel's arpeggio notes).
CHORDS = {
    "Dm": ("D3", "D4 F4 A4 C5"), "Bb": ("Bb2", "D4 F4 Bb4 A4"),
    "Gm": ("G2", "D4 G4 Bb4 A4"), "A7": ("A2", "C#4 E4 A4 G4"),
    "F": ("F2", "C4 F4 A4 C5"), "C": ("C3", "E4 G4 C5 B4"),
    "Gm7": ("G2", "G3 Bb3 D4 F4"), "C9": ("C3", "E4 G4 Bb4 D5"),
    "F6": ("F2", "F3 A3 C4 D4"), "D7": ("D3", "F#3 A3 C4 D4"),
    "Bb6": ("Bb2", "F3 Bb3 D4 G4"), "Am7": ("A2", "G3 A3 C4 E4"),
    "D6": ("D3", "D4 F#4 A4 B4"), "E": ("E3", "E4 G#4 B4 D5"),
    "Bm": ("B2", "D4 F#4 B4 A4"), "A": ("A2", "C#4 E4 A4 B4"),
    "G": ("G2", "D4 G4 B4 A4"), "Em": ("E3", "E4 G4 B4 D5"),
    "Am": ("A2", "E4 A4 C5 B4"), "B7": ("B2", "D#4 F#4 A4 B4"),
    "D": ("D3", "D4 F#4 A4 C5"),
}

GATE_H = ["Dm", "Bb", "Gm", "A7", "Dm", "F", "Gm", "A7"]
TIDE_H = ["Gm7", "F6", "C9", "D7", "Gm7", "Am7", "C9", "D7"]
SPIRE_H = ["D6", "E", "Bm", "A", "D6", "E", "Bm", "A7", "D6", "E", "D6", "A"]
BOSS_H = ["Em", "C", "Am", "B7", "Em", "C", "Am", "B7"]

SCORES = [
    dict(key="gate", title="Lanterns at the Iron Gate", bpm=116, beats=4,
         bars=GATE_A + GATE_B + GATE_RETURN,
         harmony=GATE_H + ["F", "Gm", "Bb", "C", "F", "Bb", "Dm", "A7"] + GATE_H,
         sections=[8, 8, 8], form="A (8) / B (8) / A variation (8)", tonality="D minor"),
    dict(key="tide", title="The Pump Below the Tide", bpm=102, beats=4,
         bars=TIDE_A + TIDE_B + TIDE_RETURN,
         harmony=TIDE_H + ["Bb6", "F6", "C9", "D7", "Bb6", "Am7", "C9", "D7"] + TIDE_H,
         sections=[8, 8, 8], form="A (8) / B (8) / A variation (8)", tonality="G Dorian with D7 cadences"),
    dict(key="spire", title="Waltz of the Astral Spire", bpm=132, beats=3,
         bars=SPIRE_A + SPIRE_B + SPIRE_RETURN,
         harmony=SPIRE_H + ["Bm", "E", "D6", "G", "Bm", "E", "D6", "A7", "Bm", "E", "D6", "A7"] + SPIRE_H,
         sections=[12, 12, 12], form="A (12) / B (12) / A variation (12)", tonality="D major / Lydian color"),
    dict(key="boss", title="The Clockwork Pursuer", bpm=150, beats=4,
         bars=BOSS_A + BOSS_B + BOSS_RETURN + BOSS_FINAL,
         harmony=BOSS_H + ["G", "D", "C", "B7", "G", "D", "C", "B7"] + BOSS_H + ["G", "D", "C", "B7", "G", "D", "C", "B7"],
         sections=[8, 8, 8, 8], form="A (8) / B (8) / A variation (8) / B variation (8)", tonality="E minor"),
]


def lfsr_table() -> np.ndarray:
    # 15-bit shift register: a hardware-style noise oscillator, no random sample.
    register = 1
    result = np.empty(32767, dtype=np.float32)
    for i in range(len(result)):
        result[i] = 1.0 if register & 1 else -1.0
        feedback = (register ^ (register >> 1)) & 1
        register = (register >> 1) | (feedback << 14)
    return result


NOISE = lfsr_table()


class Chip:
    def __init__(self, score):
        self.score = score
        self.beat = 60 / score["bpm"]
        self.total_beats = len(score["bars"]) * score["beats"]
        self.samples = int(round(self.total_beats * self.beat * RATE))
        self.mix = np.zeros((self.samples, 2), dtype=np.float32)

    def add(self, signal, beat, pan=0.0):
        start = int(round(beat * self.beat * RATE))
        size = min(len(signal), self.samples - start)
        if size <= 0:
            return
        # Conservative narrow stereo keeps melody and bass clear in mono capture.
        self.mix[start:start + size, 0] += signal[:size] * (1 - max(0.0, pan))
        self.mix[start:start + size, 1] += signal[:size] * (1 + min(0.0, pan))

    def tone(self, note, beat, length, kind, volume, duty=.25):
        duration = length * self.beat
        count = int(round(duration * RATE))
        if count < 2:
            return
        t = np.arange(count, dtype=np.float32) / RATE
        frequency = 440.0 * 2 ** ((note - 69) / 12)
        if kind == "lead":
            # A small delayed vibrato on long notes; never a stack of unison voices.
            vibrato = np.maximum(t - .16, 0) * .012
            phase = (t * frequency + np.sin(t * (2 * np.pi * 5.1)) * np.minimum(vibrato, .009)) % 1
        else:
            phase = (t * frequency) % 1
        if kind == "bass":
            # 32-step triangle wave: 16 ascending then 16 descending DAC values.
            index = np.floor(phase * 32).astype(np.int32)
            triangle = np.where(index < 16, index, 31 - index)
            signal = triangle.astype(np.float32) / 7.5 - 1
        else:
            # True duty-cycle pulse. Remove DC but retain its harmonic character.
            signal = np.where(phase < duty, 1.0, -duty / (1 - duty)).astype(np.float32)
        attack = .003 if kind == "lead" else .0015
        release = min(duration * .16, .026 if kind == "lead" else .014)
        sustain = .73 if kind == "lead" else .6 if kind == "arp" else .94
        env = sustain + (1 - sustain) * np.exp(-t * (15 if kind == "arp" else 10))
        env *= np.minimum(t / attack, 1) * np.minimum((duration - t) / release, 1)
        # Hardware-like 4-bit volume register; final mix is quantized to 8-bit.
        env = np.round(np.maximum(env, 0) * 15) / 15
        pan = -.08 if kind == "lead" else .16 if kind == "arp" else 0
        self.add(signal * env * volume, beat, pan)

    def drum(self, kind, beat, accent=1.0, max_beats=.23):
        duration = {"kick": .13, "snare": .12, "hat": .035, "tick": .045}[kind]
        duration = min(duration, max_beats * self.beat)
        t = np.arange(max(2, int(duration * RATE)), dtype=np.float32) / RATE
        if kind == "kick":
            rate = 900 * np.exp(-t * 45) + 70
            env = np.exp(-t * 35)
            volume = .24
        elif kind == "snare":
            rate = np.full(len(t), 6800, dtype=np.float32)
            env = np.exp(-t * 30) * (.8 + .2 * np.cos(2 * np.pi * 180 * t))
            volume = .16
        else:
            rate = np.full(len(t), 12000 if kind == "hat" else 4600, dtype=np.float32)
            env = np.exp(-t * (100 if kind == "hat" else 70))
            volume = .055 if kind == "hat" else .075
        offset = int(beat * 997) % len(NOISE)
        index = (np.cumsum(rate) / RATE).astype(np.int32) + offset
        signal = NOISE[index % len(NOISE)]
        env *= np.minimum(t / .0015, 1) * np.minimum((duration - t) / .004, 1)
        env = np.round(np.maximum(env, 0) * 15) / 15
        self.add(signal * env * volume * accent, beat)

    def arrange(self):
        key, beats = self.score["key"], self.score["beats"]
        section_ends = np.cumsum(self.score["sections"])
        for bar, melody in enumerate(self.score["bars"]):
            base = bar * beats
            section = int(np.searchsorted(section_ends, bar, side="right"))
            root, chord = CHORDS[self.score["harmony"][bar]]
            root_note = midi(root)
            chord_notes = [midi(x) for x in chord.split()]
            for start, length, note in phrase(melody):
                # Breathing between phrases and a lower-register melody avoid a
                # constant high-pitched wall. The score itself carries the theme.
                gate = .84 if key == "boss" else .86 if key == "tide" else .91
                duty = .5 if key in ("tide", "spire") else .25
                if section == 1 and key == "gate":
                    duty = .5
                self.tone(note, base + start / 2, length / 2 * gate,
                          "lead", .205 if key == "spire" else .23, duty)

            if key == "gate":
                bass_pattern = [(0, 0, .67), (1, 7, .35), (1.5, 12, .35),
                                (2, 0, .67), (3, 7, .35), (3.5, 12, .34)]
                arp_steps = 16
                arp_order = [0, 1, 2, 1, 0, 1, 3, 2]
                for step in range(8):
                    kind = "kick" if step in (0, 4) else "snare" if step in (2, 6) else "hat"
                    self.drum(kind, base + step * .5, 1 if step % 2 == 0 else .85)
            elif key == "tide":
                bass_pattern = [(0, 0, .62), (1.5, 7, .32), (2, 12, .3),
                                (2.75, 7, .3), (3.5, 0, .34)]
                arp_steps = 16
                arp_order = [0, 2, 1, 3, 2, 1, 0, 1]
                for step in range(16):
                    if step in (0, 7, 10):
                        self.drum("kick", base + step * .25)
                    elif step in (4, 12):
                        self.drum("snare", base + step * .25, .82)
                    elif step in (3, 6, 11, 14):
                        self.drum("tick", base + step * .25, .7)
            elif key == "spire":
                bass_pattern = [(0, 0, .86), (1, 7, .6), (2, 12, .6)]
                arp_steps = 12
                arp_order = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1]
                self.drum("kick", base, .65)
                self.drum("tick", base + 1, .58)
                self.drum("hat", base + 1.5, .65)
                self.drum("tick", base + 2, .48)
                self.drum("hat", base + 2.5, .55)
            else:
                bass_pattern = [(step * .5, 0 if step % 4 in (0, 1) else 7 if step % 4 == 2 else 12, .37)
                                for step in range(8)]
                arp_steps = 16
                arp_order = [0, 1, 2, 3, 2, 1, 2, 1]
                for step in range(16):
                    if step in (0, 6, 8, 14):
                        kind = "kick"
                    elif step in (4, 12):
                        kind = "snare"
                    elif bar % 4 == 3 and step in (13, 15):
                        kind = "snare"
                    elif step % 2 == 0:
                        kind = "hat"
                    else:
                        continue
                    self.drum(kind, base + step * .25, .75 if step in (13, 15) else 1)

            for offset, interval, length in bass_pattern:
                self.tone(root_note + interval, base + offset, length, "bass", .28)

            for step in range(arp_steps):
                # Pulse 2 remains one monophonic oscillator, including the
                # bubbling offbeats and the airy gaps in the waltz.
                if key == "tide" and step % 8 in (0, 4):
                    continue
                if key == "spire" and step in (0, 7):
                    continue
                if key == "gate" and section == 0 and step in (7, 15):
                    continue
                note = chord_notes[arp_order[step % len(arp_order)]]
                amp = .079 if key == "boss" else .066 if key == "spire" else .072
                if key == "tide":
                    amp *= 1.15 if step % 4 == 3 else .8
                self.tone(note, base + step * .25, .19 if key == "tide" else .21,
                          "arp", amp, .125 if key in ("gate", "boss") else .25)

        # A short circular FIR softens the ultrasonic pulse edges without adding
        # pads, reverb layers or extra musical voices. Circular handling avoids
        # creating a reverb tail that would make a loop boundary ambiguous.
        taps = [.04, .12, .22, .24, .22, .12, .04]
        filtered = np.zeros_like(self.mix)
        for offset, gain in enumerate(taps):
            filtered += np.roll(self.mix, offset - 3, axis=0) * gain
        self.mix = filtered
        peak = float(np.max(np.abs(self.mix)))
        self.mix *= .80 / max(peak, .01)
        # A signed 8-bit DAC grid carried by a standard PCM/MP3 container.
        self.mix = np.round(np.clip(self.mix, -1, 1) * 127) / 127

    def write_wav(self, path):
        with wave.open(str(path), "wb") as output:
            output.setnchannels(2)
            output.setsampwidth(2)
            output.setframerate(RATE)
            # Chunk conversion avoids a second complete int16 copy of the song.
            for start in range(0, self.samples, RATE * 2):
                pcm = np.round(self.mix[start:start + RATE * 2] * 32767).astype("<i2")
                output.writeframes(pcm.tobytes())


def notes_text():
    lines = [
        "HAT AND CAT - ORIGINAL 8-BIT SCORE (v1)",
        "", "All four compositions and their note sequences were created for this game.",
        "No existing recording, melody, MIDI, soundfont, sample pack, or old MP3",
        "was used as musical input. These are new chiptune scores, not bitcrushed",
        "versions of the former background music.", "",
        "TRACKS / exact arrangement grid", "",
    ]
    for score in SCORES:
        duration = len(score["bars"]) * score["beats"] * 60 / score["bpm"]
        lines += [
            f"{score['key']}-chip-v1.mp3 - {score['title']}",
            f"  {score['bpm']} quarter notes/minute; {score['beats']}/4; {score['tonality']}.",
            f"  {len(score['bars'])} bars; {duration:.6f} seconds on the composition grid.",
            f"  Form: {score['form']}.",
            "",
        ]
    lines += [
        "CHARACTER",
        "Gate: driving D-minor adventure, dotted rests, alternating root/fifth bass.",
        "Tide: round 50%-pulse melody, syncopated bass, offbeat bubbling arpeggios.",
        "Spire: lighter 3/4 rising waltz, Lydian color, spacious melody and percussion.",
        "Boss: urgent E-minor pursuit, repeated eighth-note bass, sixteenth arpeggios.",
        "", "SYNTHESIS",
        "Four musical channels maximum: one duty-cycle pulse lead, one rapid pulse",
        "arpeggio voice, one 32-step triangle bass, and one 15-bit LFSR noise drum.",
        "The drum channel alternates kick/snare/hat/tick events without overlap.",
        "Pulse envelopes use 16 volume levels. Final mix uses an 8-bit amplitude",
        "grid and a gentle 7-tap circular FIR to tame pulse edges. No lush synth pads,",
        "sampled instruments, extra chord layers, long reverb, or bitcrushed old music.",
        "32,000 Hz stereo; MP3 encoding at 128 kb/s. MP3 is lossy, so the transported",
        "waveform is an approximation of the quantized original synthesis.",
        "All songs begin at cue 0 and finish a whole musical phrase for looping.",
        "MP3 encoder delay/padding metadata is written; browser gap handling varies.",
        "", "RUNTIME",
        "audio.setLevel(0/1/2) selects gate/tide/spire with cached unchanged calls.",
        "Explore and normal combat share the stage theme; combat modestly raises gain.",
        "Boss uses its own dedicated track. Stage changes crossfade existing media.",
        "Existing sound effects, user mute switches and recorder capture bus remain.",
        "", "REPRODUCTION",
        "python tools/compose-chiptune-v6.py --output assets/audio --ffmpeg /path/to/ffmpeg",
        "Python requires numpy; FFmpeg requires libmp3lame. Songs render sequentially.",
        "The command synthesizes/encodes only; it does not play audio or open the game.",
        "", "VERIFICATION LIMIT",
        "Per the user's instruction, no audio audition, game/browser launch, automated",
        "test, or quality-test pass was performed for these tracks. Render/encoding",
        "completion is not a claim of audible verification.",
        "", "Legacy music/attribution files may remain in the working source directory.",
        "They are not inputs to these compositions and are not referenced by audio.js.",
    ]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("assets/audio"))
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    parser.add_argument("--track", choices=[s["key"] for s in SCORES], default=None)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for score in SCORES:
        if args.track and args.track != score["key"]:
            continue
        chip = Chip(score)
        chip.arrange()
        target = args.output / f"{score['key']}-chip-v1.mp3"
        with tempfile.TemporaryDirectory(prefix="hat-cat-chip-", dir=args.output.parent) as scratch:
            source = Path(scratch) / "synthesis.wav"
            chip.write_wav(source)
            subprocess.run([
                str(args.ffmpeg), "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(source), "-c:a", "libmp3lame", "-b:a", "128k",
                "-ar", str(RATE), "-write_xing", "1",
                "-metadata", f"title={score['title']}",
                "-metadata", "artist=Hat and Cat Original Chiptune",
                "-metadata", "album=Hat and Cat - Four Chip Journeys",
                "-metadata", "comment=Original pulse/triangle/LFSR synthesis; not audibly verified",
                str(target),
            ], check=True)
        print(f"Rendered {target}", flush=True)
        del chip
        gc.collect()
    (args.output / "CHIPTUNE-NOTES.txt").write_text(notes_text(), encoding="utf-8")


if __name__ == "__main__":
    main()
