"""
Testes do TtsService (sem gTTS — removido).
Valida a cascata: edge-tts → Piper, e que falha explicitamente quando ambos ausentes.
"""

import sys
import os
import tempfile
from unittest.mock import patch, MagicMock, call

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

import pytest
from app.services.tts import TtsService


class TestCleanHtml:
    def test_remove_tag_simples(self):
        assert TtsService._clean_html('<p>Olá</p>') == 'Olá'

    def test_remove_tag_com_atributos(self):
        assert TtsService._clean_html('<strong class="x">Texto</strong>') == 'Texto'

    def test_texto_sem_tags(self):
        assert TtsService._clean_html('Texto puro') == 'Texto puro'

    def test_vazio(self):
        assert TtsService._clean_html('') == ''


class TestSplitText:
    def test_texto_curto_nao_divide(self):
        chunks = TtsService._split_text('Texto curto.')
        assert chunks == ['Texto curto.']

    def test_texto_longo_divide_em_sentencas(self):
        # Cada sentença tem ~100 chars; 6 delas = ~600 chars > _CHUNK_MAX_CHARS (500)
        sentence = 'Esta é uma sentença de teste com palavras suficientes para encher o limite do chunk. '
        text = (sentence * 6).strip()
        assert len(text) > 500, "Pré-condição: texto deve ser maior que _CHUNK_MAX_CHARS"
        chunks = TtsService._split_text(text)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 500

    def test_preserva_conteudo_total(self):
        """Nenhuma palavra deve ser perdida no chunking."""
        text = 'Primeira frase aqui. Segunda frase aqui. Terceira frase aqui.'
        chunks = TtsService._split_text(text)
        reconstructed = ' '.join(chunks)
        # Verifica que todas as palavras-chave estão presentes
        for keyword in ['Primeira', 'Segunda', 'Terceira']:
            assert keyword in reconstructed


class TestSynthesize:
    def test_edge_tts_priorizado_quando_disponivel(self):
        """edge-tts é tentado primeiro; se funcionar, Piper nem é consultado."""
        with (
            patch.object(TtsService, '_synthesize_edge') as mock_edge,
            patch.object(TtsService, '_piper_available') as mock_piper_avail,
            patch.object(TtsService, '_synthesize_piper') as mock_piper,
        ):
            TtsService.synthesize('Texto de teste.', '/tmp/test.wav')
            mock_edge.assert_called_once()
            mock_piper_avail.assert_not_called()
            mock_piper.assert_not_called()

    def test_piper_fallback_quando_edge_falha(self):
        """Se edge-tts falhar (sem rede, rate limit etc.), cai pro Piper local."""
        with (
            patch.object(TtsService, '_synthesize_edge', side_effect=Exception('sem rede')),
            patch.object(TtsService, '_piper_available', return_value=True),
            patch.object(TtsService, '_synthesize_piper') as mock_piper,
        ):
            TtsService.synthesize('Texto de teste.', '/tmp/test.wav')
            mock_piper.assert_called_once()

    def test_falha_explicita_sem_nenhum_motor(self):
        """edge-tts falha e Piper não está instalado: deve lançar RuntimeError (não engolir silenciosamente)."""
        with (
            patch.object(TtsService, '_synthesize_edge', side_effect=Exception('sem rede')),
            patch.object(TtsService, '_piper_available', return_value=False),
        ):
            with pytest.raises(RuntimeError, match='Nenhum motor TTS'):
                TtsService.synthesize('Texto de teste.', '/tmp/test.wav')

    def test_texto_vazio_levanta_value_error(self):
        with pytest.raises(ValueError, match='Texto vazio'):
            TtsService.synthesize('   ', '/tmp/test.wav')

    def test_gtts_nunca_chamado(self):
        """gTTS foi removido — garantir que nunca é instanciado."""
        import builtins
        original_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == 'gtts':
                raise AssertionError('gTTS não deve ser usado! Use edge-tts ou Piper.')
            return original_import(name, *args, **kwargs)

        with (
            patch.object(TtsService, '_synthesize_edge') as mock_edge,
            patch('builtins.__import__', side_effect=mock_import),
        ):
            TtsService.synthesize('Texto.', '/tmp/test.wav')
            mock_edge.assert_called_once()
