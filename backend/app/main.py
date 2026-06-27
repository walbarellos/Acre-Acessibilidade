import os
import shutil
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any

from app.services.pdf_extractor import PdfExtractorService
from app.services.simplifier import SimplifierService
from app.services.tts import TtsService

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("acre-acessivel")

app = FastAPI(
    title="Acre Acessível - Gerador de Editais",
    description="API para extração, simplificação de linguagem e geração de áudios de editais públicos.",
    version="1.0.0"
)

# Configuração de CORS (Essencial para comunicação com o widget JS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite requisições de qualquer origem para o widget
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMP_DIR = os.path.join(BASE_DIR, "temp")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Mapeia arquivos estáticos para servir áudios
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "servico": "Acre Acessível - Gerador de Conteúdo",
        "documentacao": "/docs"
    }

@app.post("/api/process-pdf")
async def process_pdf(request: Request, file: UploadFile = File(...)):
    """
    Recebe um PDF de edital público, extrai o texto, simplifica para
    linguagem simples, gera os respectivos áudios MP3 e retorna o JSON estruturado.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Apenas PDF é suportado.")

    # Define o caminho do arquivo temporário
    temp_file_path = os.path.join(TEMP_DIR, f"upload_{uuid_str()}.pdf")
    
    try:
        # Salva o arquivo enviado localmente
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 1. Extração de texto
        logger.info(f"Extraindo texto do arquivo: {file.filename}")
        extracted_text = PdfExtractorService.extract_text(temp_file_path)
        if not extracted_text:
            raise HTTPException(status_code=422, detail="Não foi possível extrair texto do PDF. O arquivo pode estar vazio ou protegido.")

        # 2. Simplificação (Linguagem Simples, Cronograma, Checklist, FAQ)
        logger.info("Simplificando edital para linguagem acessível...")
        edital_simplificado = SimplifierService.simplify_edital(extracted_text)

        # 3. Geração de Áudio (MP3 por abas)
        logger.info("Gerando arquivos de áudio para cada seção...")
        # Descobre a URL base do servidor dinamicamente
        base_url = str(request.base_url).rstrip('/')
        audio_urls = TtsService.generate_edital_audio(edital_simplificado, base_url)

        # Junta os dados estruturados e as URLs de áudio
        edital_simplificado["audios"] = audio_urls

        return edital_simplificado
    
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erro no processamento do PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno no processamento: {str(e)}")
    
    finally:
        # Remove o arquivo temporário
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.error(f"Erro ao deletar arquivo temporário {temp_file_path}: {str(e)}")

@app.get("/api/tts")
def text_to_speech(text: str):
    """
    Sintetiza um texto arbitrário em áudio em tempo real e retorna o stream.
    Utilizado como fallback dinâmico para navegadores/SO sem suporte a vozes locais (como Linux).
    A gravação é feita usando escrita atômica temporária para evitar condições de corrida (status 416).
    """
    from fastapi.responses import FileResponse
    import hashlib
    import mimetypes
    
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Texto vazio ou não fornecido.")
    
    try:
        # Cria um hash MD5 do texto para evitar duplicar sínteses do mesmo texto
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        filename = f"tts_demand_{text_hash}.mp3"
        file_path = os.path.join(TEMP_DIR, filename)
        
        # Se o áudio ainda não foi gerado, cria de forma atômica usando o serviço central de TTS
        if not os.path.exists(file_path):
            temp_path = f"{file_path}.tmp"
            TtsService.synthesize(text, temp_path)
            # Substitui atomicamente (operação atômica no OS garante que o arquivo final só apareça completo)
            os.replace(temp_path, file_path)
            
        # Detecta o mime-type do arquivo gerado (WAV para Piper, MP3 para gTTS)
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "audio/mpeg"
            
        return FileResponse(file_path, media_type=mime_type, filename=filename)
    except Exception as e:
        logger.error(f"Erro ao gerar TTS dinâmico: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno de síntese: {str(e)}")

def uuid_str() -> str:
    import uuid
    return str(uuid.uuid4())
