# 🎵 Music Converter & Visualizer

[![Live Demo](https://img.shields.io/badge/Live_Demo-🚀-brightgreen)](https://music-converter-eip3.onrender.com/)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Music21](https://img.shields.io/badge/Music21-10.5.0-blue)

A powerful web application that converts, visualizes, analyzes, and plays sheet music. Upload MIDI, MusicXML, ABC, or JSON files and get an interactive experience right in your browser.

<img width="328" height="470" alt="image" src="https://github.com/user-attachments/assets/dd34051d-c310-4799-b699-90fc70ae9b2e" />


## ✨ Features

- **File Conversion:** Convert between MusicXML, ABC, and MIDI formats.
- **Sheet Music Rendering:** Beautiful, high-quality rendering using OpenSheetMusicDisplay (OSMD).
- **Advanced Audio Player:** Built with Tone.js, featuring multi-track instruments (Piano, Strings, Guitar, Bass, Drums).
- **Smart Analysis:** Automatically detects the musical key and extracts chords (with Roman numerals).
- **Transposition:** Transpose the entire score up or down by semitones with a single click.
- **Practice Tools:** Tempo control (0.5x - 2.0x), A-B loop sectioning, metronome, and count-in.
- **Export Options:** Download rendered scores as PDF or SVG.
- **Interactive UI:** Click anywhere on the sheet music to seek to that position in the audio.
- *(Beta)* Playback cursor with manual sync offset adjustment.

## 🛠 Tech Stack

**Backend:**
- Python 3.12+ / FastAPI
- `music21` & `converter21` (Music parsing and analysis)
- Uvicorn (ASGI server)
- Docker

**Frontend:**
- Vanilla JavaScript (ES6)
- `opensheetmusicdisplay` (Sheet music rendering)
- `Tone.js` & `@tonejs/midi` (Audio synthesis and playback)
- `jsPDF` & `svg2pdf.js` (Exporting)

## 🚀 Getting Started

### Prerequisites
- Python 3.12 or higher
- Docker (optional, for containerized deployment)

### Installation (Local)

1. Clone the repository:
   ```bash
   git clone https://github.com/tatsymbixz/music-converter.git
   cd music-converter
