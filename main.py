from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool
from music21 import converter, stream, roman
import converter21
import base64
import os
import tempfile
import logging

# Setup application logger
log = logging.getLogger("app")
logging.basicConfig(level=logging.INFO)

app = FastAPI()

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_PATH = os.path.join(ROOT_DIR, "static")

os.makedirs(STATIC_PATH, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")


@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_PATH, "index.html"))


def get_chords(s):
    k_name = "Unknown"
    ch_list = []
    
    try:
        k = s.analyze('key')
        if k:
            k_name = f"{k.tonic.name} {k.mode}"
            
            ch_data = s.chordify()
            for c in ch_data.recurse().getElementsByClass('Chord'):
                if not c.notes: 
                    continue
                
                rn_val = ""
                try:
                    rn_val = roman.romanNumeralFromChord(c, k).figure
                except Exception:
                    # Ignore failures in roman numeral calculation
                    pass
                
                name = c.pitchedCommonName.replace(" triad", "").replace(" chord", "").strip()
                m_num = c.measureNumber if c.measureNumber is not None else 0
                
                ch_list.append({
                    "measure": m_num,
                    "beat": float(c.beat),
                    "name": name,
                    "roman": rn_val
                })
    except Exception as e:
        log.warning(f"Chord analysis error: {e}")
        
    return k_name, ch_list


@app.post("/api/convert")
async def handle_convert(
    file: UploadFile = File(...),
    quantize: bool = Form(False),
    target_format: str = Form("musicxml"),
    transpose: int = Form(0),
):
    # Enforce file size limit (10 MB max)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(413, "File is too large (max 10 MB)")

    in_file = None
    xml_tmp = None
    mid_tmp = None
    out_tmp = None
    sxml_path = None

    try:
        data = await file.read()
        _, ext = os.path.splitext(file.filename)
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
            f.write(data)
            in_file = f.name

        # Parse score in threadpool to prevent blocking FastAPI event loop
        score = await run_in_threadpool(converter.parse, in_file)

        if transpose != 0:
            await run_in_threadpool(score.transpose, transpose, inPlace=True)

        if quantize and isinstance(score, stream.Stream):
            await run_in_threadpool(score.quantize, inPlace=True, quarterLengthDivisors=(4, 3))

        key_str, chords = await run_in_threadpool(get_chords, score)

        with tempfile.NamedTemporaryFile(delete=False, suffix='.xml') as f_xml:
            xml_tmp = f_xml.name
        await run_in_threadpool(score.write, 'musicxml', fp=xml_tmp)
        
        with open(xml_tmp, 'r', encoding='utf-8') as f:
            xml_data = f.read()

        with tempfile.NamedTemporaryFile(delete=False, suffix='.mid') as f_mid:
            mid_tmp = f_mid.name
        await run_in_threadpool(score.write, 'midi', fp=mid_tmp)
        
        with open(mid_tmp, 'rb') as f:
            midi_b64 = base64.b64encode(f.read()).decode('ascii')

        out_data = ""
        if target_format == 'musicxml':
            out_data = xml_data
        elif target_format == 'midi':
            out_data = midi_b64
        elif target_format == 'abc':
            try:
                p0 = score.parts[0] if hasattr(score, 'parts') and len(score.parts) > 0 else score
                flat_s = p0.flatten()
                flat_s.makeMeasures(inPlace=True)
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.musicxml') as f_sxml:
                    sxml_path = f_sxml.name
                flat_s.write('musicxml', fp=sxml_path)
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.abc') as f_abc:
                    out_tmp = f_abc.name
                
                c21 = converter21.converter.parseFile(sxml_path)
                c21.write('abc', fp=out_tmp)
                
                with open(out_tmp, 'r', encoding='utf-8') as f:
                    out_data = f.read()
            except Exception as ex:
                raise HTTPException(500, f"ABC conversion failed: {ex}")

        return {
            "render_xml": xml_data,
            "download_content": out_data,
            "extension": target_format,
            "midi_base64": midi_b64,
            "key_name": key_str,
            "chords": chords,
            "transpose": transpose,
        }

    except HTTPException:
        raise
    except Exception as ex:
        log.error(f"Conversion error: {ex}")
        raise HTTPException(400, f"Failed to process file: {ex}")
    finally:
        # Clean up temporary files to free disk space
        for p in [in_file, xml_tmp, mid_tmp, out_tmp, sxml_path]:
            if p and os.path.exists(p):
                try: 
                    os.remove(p)
                except OSError: 
                    pass