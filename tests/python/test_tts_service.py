"""
Testes de integração leve para TtsService.
Usa mocks para não depender de rede/edge-tts/piper em CI.
"""

import sys
import os
import tempfile
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

import pytest
from app.services.tts import TtsService


class TestTtsServiceCleanHtml:
    def test_remove_tag_simples(self):
        result = TtsService._clean_html('<p>Olá</p>')
        assert result == 'Olá'

    def test_remove_tag_com_atributos(self):
        result = TtsService._clean_html('<strong class="x">Texto</strong>')
        assert result == 'Texto'

    def test_texto_sem_tags_intacto(self):
        result = TtsService._clean_html('Texto puro')
        assert result == 'Texto puro'

    def test_texto_vazio(self):
        assert TtsService._clean_html('') == ''


class TestTtsSynthesize:
    """Garante que o fallback em cascata é acionado na ordem certa."""

    def test_usa_gtts_como_ultimo_fallback(self):
        """Quando edge-tts e piper falham, gTTS deve ser chamado."""
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
            path = f.name

        try:
            with (
                patch('edge_tts.Communicate', side_effect=Exception('sem rede')),
                patch('os.path.exists', return_value=False),  # piper ausente
                patch('gtts.gTTS') as mock_gtts,
            ):
                mock_instance = MagicMock()
                mock_gtts.return_value = mock_instance

                TtsService.synthesize('Texto de teste', path)

                mock_gtts.assert_called_once()
                mock_instance.save.assert_called_once_with(path)
        finally:
            if os.path.exists(path):
                os.unlink(path)

    def test_edge_tts_prioritario(self):
        """Quando edge-tts funciona, gTTS não deve ser chamado."""
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
            path = f.name

        try:
            mock_communicate = MagicMock()
            mock_communicate.save = MagicMock(return_value=None)

            with (
                patch('edge_tts.Communicate', return_value=mock_communicate),
                patch('asyncio.run') as mock_asyncio,
                patch('gtts.gTTS') as mock_gtts,
            ):
                TtsService.synthesize('Texto de teste', path)
                mock_gtts.assert_not_called()
        finally:
            if os.path.exists(path):
                os.unlink(path)
