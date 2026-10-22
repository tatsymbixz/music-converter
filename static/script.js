document.addEventListener('DOMContentLoaded', () => {
    // Check if Tone.js is available
    if (typeof Tone === 'undefined') return alert("Error: Tone.js failed to load.");

    // Cache DOM elements
    const fInput = document.getElementById('fileInput');
    const btnConvert = document.getElementById('convertBtn');
    const btnDl = document.getElementById('downloadBtn');
    const msgBox = document.getElementById('statusMessage');
    const musicBox = document.getElementById('osmd-container');
    const chkQuant = document.getElementById('quantizeCheck');
    const selFmt = document.getElementById('formatSelect');

    const panelInfo = document.getElementById('analysisPanel');
    const txtKey = document.getElementById('keyDisplay');
    const chordBox = document.getElementById('chordTrack');
    const btnUp = document.getElementById('transposeUpBtn');
    const btnDown = document.getElementById('transposeDownBtn');
    const txtShift = document.getElementById('transposeDisplay');

    const panelPlay = document.getElementById('playerPanel');
    const panelExport = document.getElementById('exportPanel');
    const btnPlay = document.getElementById('playBtn');
    const btnStop = document.getElementById('stopBtn');
    const seek = document.getElementById('seekBar');
    const txtTime = document.getElementById('timeDisplay');
    const tList = document.getElementById('trackList');
    const btnPdf = document.getElementById('exportPdfBtn');
    const btnSvg = document.getElementById('exportSvgBtn');

    const sTempo = document.getElementById('tempoSlider');
    const txtTempo = document.getElementById('tempoDisplay');
    const btnLoopA = document.getElementById('setLoopABtn');
    const btnLoopB = document.getElementById('setLoopBBtn');
    const btnLoopReset = document.getElementById('clearLoopBtn');

    const chkCount = document.getElementById('countInCheck');
    const chkMetro = document.getElementById('metronomeCheck');

    let dlData = '';
    let currExt = '';
    let semiShift = 0;
    let fileObj = null;
    let syncOffset = 0;
    let cursorOn = false;

    // Initialize OpenSheetMusicDisplay
    const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(musicBox, {
        autoResize: true,
        drawTitle: true,
        drawingParameters: 'compacttight',
    });

    // Instrument samples configuration
    const SAMPLES = {
        piano: {
            baseUrl: "https://tonejs.github.io/audio/salamander/",
            urls: {
                A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
                A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
                A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
                A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
                A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
                A6: "A6.mp3", C7: "C7.mp3"
            }
        },
        strings: {
            baseUrl: "https://nbrosowsky.github.io/tonejs-instruments/samples/violin/",
            urls: {
                "G3": "G3.mp3", "A#3": "As3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3", "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3",
                "F#5": "Fs5.mp3", "A5": "A5.mp3", "C6": "C6.mp3"
            }
        },
        guitar: {
            baseUrl: "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/",
            urls: {
                "E2": "E2.mp3", "G2": "G2.mp3", "A#2": "As2.mp3", "C#3": "Cs3.mp3",
                "E3": "E3.mp3", "G3": "G3.mp3", "A#3": "As3.mp3", "C#4": "Cs4.mp3",
                "E4": "E4.mp3", "G4": "G4.mp3", "A#4": "As4.mp3", "C#5": "Cs5.mp3",
                "E5": "E5.mp3", "G5": "G5.mp3"
            }
        }
    };

    // Fallback synth generator
    function makeSynth(vNode, type) {
        if (type === 'piano') return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.4, sustain: 0.15, release: 1.2 } }).connect(vNode);
        if (type === 'bass') return new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2, modulationIndex: 8, oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.8 }, modulation: { type: 'square' }, modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 } }).connect(vNode);
        if (type === 'strings') return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.35, decay: 0.2, sustain: 0.75, release: 1.2 } }).connect(vNode);
        if (type === 'guitar') return new Tone.PolySynth(Tone.PluckSynth, { attackNoise: 1, dampening: 3500, resonance: 0.85 }).connect(vNode);
        if (type === 'drums') return new Tone.PolySynth(Tone.MembraneSynth, { pitchDecay: 0.05, octaves: 4 }).connect(vNode);
        return new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 } }).connect(vNode);
    }

    async function loadInst(vNode, type) {
        if (SAMPLES[type]) {
            try {
                const smp = new Tone.Sampler({
                    urls: SAMPLES[type].urls,
                    baseUrl: SAMPLES[type].baseUrl,
                    release: 1, volume: { value: -4 }
                }).connect(vNode);
                await Promise.race([smp.loaded, new Promise((_, r) => setTimeout(() => r('timeout'), 12000))]);
                return smp;
            } catch (err) {
                // Fallback if network/sampler fails
            }
        }
        return makeSynth(vNode, type);
    }

    function b64ToUint8(str) {
        const raw = atob(str);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        return arr;
    }

    function timeStr(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function updateMsg(txt, isErr) {
        msgBox.textContent = txt;
        msgBox.classList.toggle('error', isErr);
    }

    function fixName(raw, i, inst) {
        if (!raw) return (inst && inst.name) ? inst.name : `Track ${i + 1}`;
        const badChar = (raw.match(/[^\x00-\x7F]/g) || []).length;
        if (badChar > 3) return (inst && inst.name) ? inst.name : `Track ${i + 1}`;
        return raw;
    }

    let globalReverb = null;
    function getReverb() {
        if (!globalReverb) globalReverb = new Tone.Reverb({ decay: 1.8, wet: 0.12 }).toDestination();
        return globalReverb;
    }

    // Main player object implementation
    const player = {
        midi: null,
        samplers: [], volumes: [], parts: [],
        trackStates: [], trackInstruments: [],
        soloTracks: new Set(),
        duration: 0,
        timeSteps: [], cursorIdx: 0,
        rafId: null, baseBpm: 120,
        tLoopA: 0, tLoopB: 0,
        metroSynth: null, metroLoop: null,

        async load(midiB64) {
            if (Tone.context.state !== 'running') await Tone.start();
            this.dispose();

            const bytes = b64ToUint8(midiB64);
            const MidiClass = (window.Midi && window.Midi.Midi) ? window.Midi.Midi : window.Midi;
            this.midi = new MidiClass(bytes.buffer);
            this.duration = this.midi.duration || 0;

            this.baseBpm = this.midi.header.tempos[0]?.bpm || 120;
            Tone.Transport.bpm.value = this.baseBpm;
            sTempo.value = 1;
            txtTempo.textContent = '1.0x';

            const rev = getReverb();
            
            for (let i = 0; i < this.midi.tracks.length; i++) {
                const tr = this.midi.tracks[i];
                if (!tr.notes || !tr.notes.length) continue;
                
                const inst = tr.instrument || {};
                const isPerc = tr.channel === 9 || inst.percussion;
                let num = inst.number !== undefined ? inst.number : 0;
                const avgPitch = tr.notes.reduce((a, b) => a + b.midi, 0) / tr.notes.length;
                
                let t = 'piano';
                if (isPerc) t = 'drums';
                else if (num >= 32 && num <= 39) t = 'bass';
                else if (num >= 40 && num <= 47) t = 'strings';
                else if (num >= 24 && num <= 31) t = 'guitar';
                else if (avgPitch < 55) t = 'bass';
                
                const vol = new Tone.Volume(t === 'bass' ? 6 : 0);
                if (t !== 'bass' && t !== 'drums') vol.connect(rev);
                else vol.toDestination();
                
                this.volumes.push(vol);
                this.trackStates.push({ muted: false });
                this.trackInstruments.push(t);
                this.samplers.push(null);
            }

            const validTrks = this.midi.tracks.filter(t => t.notes && t.notes.length > 0).length;
            let loaded = 0;
            updateMsg(`Loading... (0/${validTrks})`, false);
            
            const tasks = [];
            for (let i = 0; i < this.midi.tracks.length; i++) {
                const tr = this.midi.tracks[i];
                if (!tr.notes || !tr.notes.length) continue;
                const idx = i;
                tasks.push(
                    loadInst(this.volumes[i], this.trackInstruments[i]).then(s => {
                        this.samplers[idx] = s;
                        loaded++;
                        updateMsg(`Loading... (${loaded}/${validTrks})`, false);
                    })
                );
            }
            await Promise.all(tasks);
            updateMsg('Ready!', false);

            Tone.Transport.cancel();
            Tone.Transport.stop();
            Tone.Transport.seconds = 0;
            Tone.Transport.loop = false;

            this.midi.tracks.forEach((tr, idx) => {
                if (!tr.notes || !tr.notes.length) return;
                
                const nList = tr.notes.filter(n => 
                    typeof n.time === 'number' && isFinite(n.time) && n.time >= 0 &&
                    typeof n.duration === 'number' && isFinite(n.duration) && n.duration > 0.02
                );
                if (!nList.length) return;
                
                nList.sort((a, b) => a.time - b.time);
                const evts = nList.map(n => [n.time, n]);
                
                const part = new Tone.Part((time, n) => {
                    if (!this.samplers[idx]) return;
                    try {
                        let name = n.name;
                        if (!name || name === "undefined") name = Tone.Frequency(n.midi, "midi").toNote();
                        this.samplers[idx].triggerAttackRelease(name, n.duration, time, n.velocity > 0.05 ? n.velocity : 0.8);
                    } catch (e) {}
                }, evts);
                
                part.start(0);
                this.parts.push(part);
            });

            if (!this.metroSynth) {
                this.metroSynth = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination();
                this.metroSynth.volume.value = -6;
            }
            if (this.metroLoop) this.metroLoop.dispose();
            const beats = (this.midi.header.timeSignatures[0]?.timeSignature || [4, 4])[0];
            
            this.metroLoop = new Tone.Loop((time) => {
                if (!chkMetro.checked) return;
                const beat = Math.floor(Tone.Transport.ticks / Tone.Transport.PPQ);
                this.metroSynth.triggerAttackRelease((beat % beats === 0) ? "C5" : "C4", "32n", time);
            }, "4n");
            this.metroLoop.start(0);

            this.setupCursorMap();
            this.clearLoop();
        },

        setupCursorMap() {
            this.timeSteps = [];
            this.cursorIdx = 0;
            
            const ppq = this.midi.header.ppq || 480;
            const posList = [];
            
            for (const tr of this.midi.tracks) {
                if (!tr.notes) continue;
                for (const n of tr.notes) {
                    if (typeof n.ticks !== 'number' || typeof n.time !== 'number') continue;
                    if (!isFinite(n.ticks) || !isFinite(n.time)) continue;
                    posList.push({ pos: n.ticks / ppq / 4, time: n.time });
                }
            }
            posList.sort((a, b) => a.pos - b.pos);
            if (!posList.length) return;
            
            const getTime = (v) => {
                if (v <= posList[0].pos) return posList[0].time;
                if (v >= posList[posList.length - 1].pos) return posList[posList.length - 1].time;
                let l = 0, h = posList.length - 1;
                while (l < h - 1) {
                    const m = (l + h) >> 1;
                    if (posList[m].pos <= v) l = m;
                    else h = m;
                }
                const a = posList[l], b = posList[h];
                if (b.pos === a.pos) return a.time;
                return a.time + ((v - a.pos) / (b.pos - a.pos)) * (b.time - a.time);
            };
            
            const vals = [];
            let lastV = 0;
            try {
                osmd.cursor.reset();
                const iter = osmd.cursor.Iterator || osmd.cursor.iterator;
                if (!iter) return;
                
                let limit = 0;
                while (!iter.EndReached && limit < 20000) {
                    let v = null;
                    const ts1 = iter.CurrentSourceTimestamp;
                    if (ts1 && typeof ts1.RealValue === 'number' && isFinite(ts1.RealValue)) v = ts1.RealValue;
                    else {
                        const ts2 = iter.CurrentEnrolledTimestamp;
                        if (ts2 && typeof ts2.RealValue === 'number' && isFinite(ts2.RealValue)) v = ts2.RealValue;
                    }
                    if (v === null || v < lastV) v = lastV;
                    lastV = v;
                    vals.push(v);
                    iter.moveToNext();
                    limit++;
                }
            } catch (e) {}
            
            osmd.cursor.reset();
            osmd.cursor.hide();
            
            this.timeSteps = vals.map(v => getTime(v));
            for (let i = 1; i < this.timeSteps.length; i++) {
                if (this.timeSteps[i] < this.timeSteps[i-1]) this.timeSteps[i] = this.timeSteps[i-1];
            }
        },

        async setTrackInstrument(idx, type) {
            this.trackInstruments[idx] = type;
            if (this.samplers[idx]) {
                try { this.samplers[idx].releaseAll(); } catch(e){}
                this.samplers[idx].dispose();
            }
            updateMsg(`Loading ${type}...`, false);
            this.samplers[idx] = await loadInst(this.volumes[idx], type);
            updateMsg('Done', false);
        },

        play() {
            if (Tone.Transport.state === 'started') {
                Tone.Transport.pause();
                btnPlay.textContent = '▶ Play';
            } else {
                if (chkCount.checked && Tone.Transport.seconds < 0.1) {
                    btnPlay.textContent = '⏳ Count-in...';
                    btnPlay.disabled = true;
                    const spb = 60 / Tone.Transport.bpm.value;
                    const bCount = (this.midi.header.timeSignatures[0]?.timeSignature || [4, 4])[0];
                    
                    for (let i = 0; i < bCount; i++) {
                        this.metroSynth.triggerAttackRelease(i === 0 ? "C5" : "C4", "32n", Tone.now() + i * spb);
                    }
                    
                    setTimeout(() => {
                        btnPlay.disabled = false;
                        btnPlay.textContent = '⏸ Pause';
                        Tone.Transport.start();
                        this.startLoop();
                    }, bCount * spb * 1000);
                } else {
                    Tone.Transport.start();
                    btnPlay.textContent = '⏸ Pause';
                    this.startLoop();
                }
            }
        },

        stop() {
            Tone.Transport.stop();
            Tone.Transport.seconds = this.tLoopA > 0 ? this.tLoopA : 0;
            this.samplers.forEach(s => { if(s) try { s.releaseAll(); } catch(e){} });
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.rafId = null;
            osmd.cursor.reset();
            this.cursorIdx = 0;
            btnPlay.textContent = '▶ Play';
            btnPlay.disabled = false;
            seek.value = Math.round((Tone.Transport.seconds / this.duration) * 1000);
            txtTime.textContent = `${timeStr(Tone.Transport.seconds)} / ${timeStr(this.duration)}`;
        },

        seek(sec) {
            const p = Tone.Transport.state === 'started';
            Tone.Transport.pause();
            this.samplers.forEach(s => { if(s) try { s.releaseAll(); } catch(e){} });
            Tone.Transport.seconds = sec;
            osmd.cursor.reset();
            this.cursorIdx = 0;
            this.moveCursor(sec + syncOffset);
            if (p) Tone.Transport.start();
        },

        startLoop() {
            if (this.rafId) cancelAnimationFrame(this.rafId);
            const frame = () => {
                const cur = Tone.Transport.seconds;
                this.moveCursor(cur + syncOffset);
                txtTime.textContent = `${timeStr(cur)} / ${timeStr(this.duration)}`;
                if (this.duration > 0) seek.value = Math.round((cur / this.duration) * 1000);
                
                if (Tone.Transport.loop && cur >= (this.tLoopB - 0.1)) {
                    osmd.cursor.reset();
                    this.cursorIdx = 0;
                    this.moveCursor(this.tLoopA + syncOffset);
                }
                
                if (Tone.Transport.state === 'started') {
                    this.rafId = requestAnimationFrame(frame);
                } else {
                    btnPlay.textContent = '▶ Play';
                }
            };
            this.rafId = requestAnimationFrame(frame);
        },

        moveCursor(sec) {
            if (!cursorOn) {
                if (osmd.cursor && typeof osmd.cursor.hide === 'function') {
                    try { osmd.cursor.hide(); } catch(e){}
                }
                return;
            }
            
            const arr = this.timeSteps;
            if (!arr.length) return;
            
            let l = 0, h = arr.length - 1, target = 0;
            while (l <= h) {
                const m = Math.floor((l + h) / 2);
                if (arr[m] <= sec) { target = m; l = m + 1; }
                else h = m - 1;
            }
            
            if (target < this.cursorIdx) {
                try { osmd.cursor.reset(); } catch(e){}
                this.cursorIdx = 0;
            }
            
            if (target > this.cursorIdx) {
                const iter = osmd.cursor.iterator || osmd.cursor.Iterator;
                let steps = 0;
                
                if (iter && typeof iter.moveToNext === 'function') {
                    while (this.cursorIdx < target) {
                        const end = (typeof iter.EndReached === 'function') ? iter.EndReached() : iter.EndReached;
                        if (end) break;
                        try {
                            iter.moveToNext();
                            this.cursorIdx++;
                            steps++;
                        } catch(e) { break; }
                        if (steps > 500) break;
                    }
                    if (steps > 0 && typeof osmd.cursor.update === 'function') {
                        try { osmd.cursor.update(); } catch(e){}
                    }
                } else {
                    while (this.cursorIdx < target) {
                        try { osmd.cursor.next(); } catch(e) { break; }
                        this.cursorIdx++;
                    }
                }
            }
            osmd.cursor.show();
        },

        setTempo(val) {
            Tone.Transport.bpm.value = this.baseBpm * val;
            txtTempo.textContent = val.toFixed(1) + 'x';
        },
        setLoopA() { this.tLoopA = Tone.Transport.seconds; Tone.Transport.loopStart = this.tLoopA; if (this.tLoopB > this.tLoopA) { Tone.Transport.loop = true; btnLoopReset.style.display = 'inline-block'; } btnLoopA.classList.add('active'); },
        setLoopB() { this.tLoopB = Tone.Transport.seconds; Tone.Transport.loopEnd = this.tLoopB; if (this.tLoopB > this.tLoopA) { Tone.Transport.loop = true; btnLoopReset.style.display = 'inline-block'; } btnLoopB.classList.add('active'); },
        clearLoop() { this.tLoopA = 0; this.tLoopB = 0; Tone.Transport.loop = false; btnLoopA.classList.remove('active'); btnLoopB.classList.remove('active'); btnLoopReset.style.display = 'none'; },
        toggleMute(i) { this.trackStates[i].muted = !this.trackStates[i].muted; this.updateMix(); },
        toggleSolo(i) { if (this.soloTracks.has(i)) this.soloTracks.delete(i); else this.soloTracks.add(i); this.updateMix(); },
        updateMix() { const hasSolo = this.soloTracks.size > 0; this.volumes.forEach((v, i) => { v.mute = !(hasSolo ? this.soloTracks.has(i) : !this.trackStates[i].muted); }); },
        dispose() {
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.parts.forEach(p => p.dispose());
            this.samplers.forEach(s => { if(s) try { s.dispose(); } catch(e){} });
            this.volumes.forEach(v => v.dispose());
            if (this.metroLoop) this.metroLoop.dispose();
            
            this.parts = []; this.samplers = []; this.volumes = []; this.trackStates = []; this.trackInstruments = [];
            this.soloTracks.clear(); this.timeSteps = []; this.cursorIdx = 0; this.clearLoop();
            try { Tone.Transport.stop(); Tone.Transport.cancel(); Tone.Transport.seconds = 0; } catch (e) {}
        },
    };

    function renderTracks() {
        tList.innerHTML = '';
        if (!player.midi) return;
        player.midi.tracks.forEach((tr, i) => {
            if (!tr.notes || !tr.notes.length) return;
            const r = document.createElement('div');
            r.className = 'track-row';

            const lbl = document.createElement('span');
            lbl.className = 'track-name';
            lbl.textContent = `${i + 1}. ${fixName(tr.name, i, tr.instrument)}`;

            const sel = document.createElement('select');
            ['piano', 'bass', 'strings', 'guitar', 'drums', 'synth'].forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst; opt.textContent = inst[0].toUpperCase() + inst.slice(1);
                if (player.trackInstruments[i] === inst) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.onchange = () => player.setTrackInstrument(i, sel.value);

            const vSlider = document.createElement('input');
            vSlider.type = 'range'; vSlider.min = '-30'; vSlider.max = '12'; vSlider.step = '1';
            vSlider.value = player.trackInstruments[i] === 'bass' ? '6' : '0';
            vSlider.oninput = () => { player.volumes[i].volume.value = parseFloat(vSlider.value); };

            const bMute = document.createElement('button');
            bMute.textContent = 'Mute';
            bMute.onclick = () => { player.toggleMute(i); bMute.classList.toggle('active-mute', player.trackStates[i].muted); };

            const bSolo = document.createElement('button');
            bSolo.textContent = 'Solo';
            bSolo.onclick = () => { player.toggleSolo(i); bSolo.classList.toggle('active-solo', player.soloTracks.has(i)); };

            r.append(lbl, sel, vSlider, bMute, bSolo);
            tList.appendChild(r);
        });
    }

    function renderChords(items) {
        chordBox.innerHTML = '';
        if (!items || !items.length) return;
        items.slice(0, 200).forEach(c => {
            const el = document.createElement('div');
            el.className = 'chord-card';
            el.innerHTML = `<span class="chord-name">${c.name}</span><span class="chord-roman">${c.roman || '-'}</span><span class="chord-measure">m.${c.measure}</span>`;
            chordBox.appendChild(el);
        });
    }

    async function sendFile(f, shift = 0) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('quantize', chkQuant.checked);
        fd.append('target_format', selFmt.value);
        fd.append('transpose', shift);

        updateMsg('Converting...', false);
        btnConvert.disabled = true;
        btnConvert.textContent = 'Working...';
        btnDl.style.display = 'none';
        panelPlay.style.display = 'none';
        panelExport.style.display = 'none';
        panelInfo.style.display = 'none';

        try {
            const res = await fetch('/api/convert', { method: 'POST', body: fd });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();

            musicBox.innerHTML = '';
            player.dispose();
            tList.innerHTML = '';

            await osmd.load(data.render_xml);
            osmd.render();

            txtKey.textContent = data.key_name;
            txtShift.textContent = shift > 0 ? `+${shift}` : shift;
            renderChords(data.chords);
            panelInfo.style.display = 'block';

            dlData = data.download_content;
            currExt = data.extension;
            if (dlData) {
                btnDl.style.display = 'inline-block';
                btnDl.textContent = `Download ${currExt.toUpperCase()}`;
            }

            await player.load(data.midi_base64);
            renderTracks();
            panelPlay.style.display = 'block';
            txtTime.textContent = `0:00 / ${timeStr(player.duration)}`;
            panelExport.style.display = 'flex';

        } catch (e) {
            updateMsg(`Error: ${e.message}`, true);
        } finally {
            btnConvert.disabled = false;
            btnConvert.textContent = 'Process & Display';
        }
    }

    btnConvert.addEventListener('click', () => {
        fileObj = fInput.files[0];
        if (!fileObj) return updateMsg('Please select a file first.', true);
        semiShift = 0;
        sendFile(fileObj, semiShift);
    });

    btnUp.onclick = () => { if (fileObj) { semiShift++; sendFile(fileObj, semiShift); } };
    btnDown.onclick = () => { if (fileObj) { semiShift--; sendFile(fileObj, semiShift); } };

    btnPlay.onclick = async () => {
        try {
            await Tone.start();
            const tSynth = new Tone.Synth().toDestination();
            tSynth.volume.value = -3;
            tSynth.triggerAttackRelease("C5", "8n");
            setTimeout(() => tSynth.dispose(), 1000);
            player.play();
        } catch (e) { updateMsg(`Audio fail: ${e.message}`, true); }
    };
    
    btnStop.onclick = () => player.stop();
    seek.addEventListener('input', () => {
        const t = (parseInt(seek.value, 10) / 1000) * player.duration;
        player.seek(t);
        txtTime.textContent = `${timeStr(t)} / ${timeStr(player.duration)}`;
    });

    sTempo.addEventListener('input', () => player.setTempo(parseFloat(sTempo.value)));
    btnLoopA.onclick = () => player.setLoopA();
    btnLoopB.onclick = () => player.setLoopB();
    btnLoopReset.onclick = () => player.clearLoop();

    btnDl.addEventListener('click', () => {
        if (!dlData) return;
        let blob;
        if (currExt === 'midi') blob = new Blob([b64ToUint8(dlData)], { type: 'audio/midi' });
        else blob = new Blob([dlData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `score.${currExt}`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    btnSvg.onclick = () => {
        const svg = musicBox.querySelector('svg');
        if (!svg) return updateMsg('No content to export', true);
        const xml = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'score.svg';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    btnPdf.onclick = async () => {
        const svg = musicBox.querySelector('svg');
        if (!svg) return updateMsg('No content to export', true);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
        const m = 10, cw = pw - m*2, ch = ph - m*2;
        let sw = 800, sh = 1000;
        try { const b = svg.getBBox(); sw = b.width || 800; sh = b.height || 1000; } catch(e){}
        const scale = cw / sw, dh = sh * scale;
        try {
            if (dh <= ch) {
                await pdf.svg(svg, { x: m, y: m, width: cw, height: dh });
            } else {
                const pCount = Math.ceil(dh / ch);
                const sHeight = ch / scale;
                for (let p = 0; p < pCount; p++) {
                    if (p > 0) pdf.addPage();
                    const cln = svg.cloneNode(true);
                    cln.setAttribute('viewBox', `0 ${p * sHeight} ${sw} ${sHeight}`);
                    cln.setAttribute('width', sw); cln.setAttribute('height', sHeight);
                    cln.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    await pdf.svg(cln, { x: m, y: m, width: cw, height: ch });
                }
            }
            pdf.save('score.pdf');
        } catch (e) { updateMsg(`PDF error: ${e.message}`, true); }
    };

    // Dynamically inject sync offset control
    if (!document.getElementById('syncOffsetSlider')) {
        const div = document.createElement('div');
        div.style.cssText = 'margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #475569;';
        div.innerHTML = `
            <span>Sync:</span>
            <input type="range" id="syncOffsetSlider" min="-1.5" max="1.5" step="0.05" value="0" style="width: 150px;">
            <span id="syncOffsetDisplay" style="font-family: monospace; width: 55px;">0.00s</span>
        `;
        const lastRow = panelPlay.querySelector('.player-row:last-child') || panelPlay;
        lastRow.parentNode.insertBefore(div, lastRow.nextSibling);
        
        const sl = document.getElementById('syncOffsetSlider');
        const txt = document.getElementById('syncOffsetDisplay');
        sl.addEventListener('input', () => {
            syncOffset = parseFloat(sl.value);
            txt.textContent = syncOffset.toFixed(2) + 's';
        });
    }

    // Dynamically inject score cursor toggle option
    if (!document.getElementById('showCursorCheck')) {
        const div = document.createElement('div');
        div.style.cssText = 'margin-top: 8px; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #475569;';
        div.innerHTML = `
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="showCursorCheck">
                <span>Score Cursor <span style="color: #94a3b8; font-size: 12px;">(Beta)</span></span>
            </label>
        `;
        const lastRow = panelPlay.querySelector('.player-row:last-child') || panelPlay;
        lastRow.parentNode.insertBefore(div, lastRow.nextSibling);
        
        document.getElementById('showCursorCheck').addEventListener('change', (e) => {
            cursorOn = e.target.checked;
            if (!cursorOn && osmd.cursor) {
                try { osmd.cursor.hide(); } catch(err) {}
                player.cursorIdx = 0;
                try { osmd.cursor.reset(); } catch(err) {}
            }
        });
    }

    musicBox.addEventListener('click', (e) => {
        if (!player.duration || !player.midi) return;
        const svg = musicBox.querySelector('svg');
        if (!svg) return;
        
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const left = musicBox.scrollLeft || 0;
        const total = svg.scrollWidth || rect.width;
        const realX = x + left;
        const pct = Math.max(0, Math.min(1, realX / total));
        
        const target = pct * player.duration;
        player.seek(target);
        updateMsg(`Seek: ${timeStr(target)} / ${timeStr(player.duration)}`, false);
    });
});