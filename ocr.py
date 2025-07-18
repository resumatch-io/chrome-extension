from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import pytesseract
import io

app = FastAPI()

@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
    try:
        # Read image bytes
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        # OCR
        text = pytesseract.image_to_string(image)
        return {"success": True, "text": text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
