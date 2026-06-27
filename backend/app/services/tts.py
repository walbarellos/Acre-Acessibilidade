import os
import re
import uuid
import logging
from gtts import gTTS
from typing import Dict, List, Any

logger = logging.getLogger("acre-acessivel")

class TtsService:
    # Diretório onde os arquivos MP3 serão salvos
    AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio")

    @classmethod
    def initialize(cls):
        """Cria os diretórios necessários se não existirem."""
        os.makedirs(cls.AUDIO_DIR, exist_ok=True)

    @classmethod
    def generate_edital_audio(cls, edital_data: Dict[str, Any], base_url: str = "http://localhost:8000") -> Dict[str, str]:
        """
        Gera arquivos de áudio MP3 para cada uma das seções do edital simplificado.
        Retorna um dicionário com os caminhos/URLs dos áudios.
        """
        cls.initialize()
        
        # Identificador único para este edital (evita conflitos)
        edital_id = str(uuid.uuid4())[:8]
        audio_urls = {}

        # 1. Áudio do Resumo
        resumo_plain = cls._clean_html(edital_data["resumo"])
        audio_urls["resumo"] = cls._generate_mp3(
            f"Edital simplificado. {resumo_plain}", 
            f"resumo_{edital_id}.mp3", 
            base_url
        )

        # 2. Áudio do Cronograma
        crono_text = "Cronograma simplificado do edital. "
        for item in edital_data["cronograma"]:
            crono_text += f"De {item['data']}, evento: {item['evento']}. "
        audio_urls["cronograma"] = cls._generate_mp3(crono_text, f"crono_{edital_id}.mp3", base_url)

        # 3. Áudio dos Requisitos
        req_text = "Requisitos obrigatórios listados no edital. "
        for i, item in enumerate(edital_data["requisitos"]):
            req_text += f"Item {i + 1}: {item} "
        audio_urls["requisitos"] = cls._generate_mp3(req_text, f"requisitos_{edital_id}.mp3", base_url)

        # 4. Áudio do FAQ
        faq_text = "Perguntas frequentes e respostas sobre este edital. "
        for item in edital_data["faq"]:
            faq_text += f"Pergunta: {item['pergunta']} Resposta: {item['resposta']} "
        audio_urls["faq"] = cls._generate_mp3(faq_text, f"faq_{edital_id}.mp3", base_url)

        return audio_urls

    @classmethod
    def synthesize(cls, text: str, file_path: str):
        """
        Sintetiza texto em áudio de alta qualidade.
        Tenta usar o Piper TTS (neural offline) se configurado no diretório backend,
        caindo para o gTTS (Google Web TTS) como fallback.
        """
        # Caminhos do Piper localizados na pasta root do backend
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        piper_bin = os.path.join(backend_dir, "piper", "piper")
        
        # Procura por qualquer modelo .onnx na pasta root do backend
        model_path = os.path.join(backend_dir, "pt_BR-giselle-medium.onnx")
        
        # Se o executável do Piper e o modelo existirem, gera áudio neural de alta fidelidade
        if os.path.exists(piper_bin) and os.path.exists(model_path):
            import subprocess
            try:
                # Garante permissão de execução ao binário
                if not os.access(piper_bin, os.X_OK):
                    os.chmod(piper_bin, 0o755)
                
                logger.info(f"🗣️ Piper TTS: Sintetizando áudio neural premium no arquivo {file_path}")
                cmd = [
                    piper_bin,
                    "--model", model_path,
                    "--output_file", file_path
                ]
                
                # Executa o Piper enviando o texto via input buffer (stdin)
                subprocess.run(cmd, input=text.encode('utf-8'), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return
            except Exception as pe:
                logger.error(f"Falha ao executar Piper TTS: {str(pe)}. Caindo para gTTS...")

        # Fallback: gTTS (Google Web TTS)
        logger.info(f"🗣️ gTTS: Sintetizando áudio local no arquivo {file_path}")
        tts = gTTS(text=text, lang='pt', tld='com.br')
        tts.save(file_path)

    @classmethod
    def _generate_mp3(cls, text: str, filename: str, base_url: str) -> str:
        """
        Gera um arquivo de áudio para o texto fornecido e retorna a URL pública dele.
        """
        # O Piper gera WAV por padrão, então se o Piper for usado, podemos manter a extensão .mp3
        # pois o navegador decodifica o cabeçalho WAV perfeitamente se servido com o mime-type correto,
        # ou apenas mudar a extensão se necessário. Para manter a compatibilidade simples de URLs de abas,
        # geramos no mesmo caminho.
        file_path = os.path.join(cls.AUDIO_DIR, filename)
        try:
            cls.synthesize(text, file_path)
            # Retorna a URL para o cliente consumir
            return f"{base_url}/static/audio/{filename}"
        except Exception as e:
            logger.error(f"Erro ao gerar áudio TTS para {filename}: {str(e)}")
            # Fallback (vazio ou erro)
            return ""

    @staticmethod
    def _clean_html(raw_html: str) -> str:
        """Remove tags HTML simples para a leitura por voz."""
        clean_text = re.sub('<[^<]+?>', '', raw_html)
        return clean_text
