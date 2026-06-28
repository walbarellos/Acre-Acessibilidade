"""
Testes unitários para backend/app/services/text_normalizer.py

Cobre as mesmas regras dos testes TS (tests/ts/text-normalizer.test.ts)
para garantir paridade entre as duas implementações.

Execução:
    cd backend && pytest ../tests/python/test_text_normalizer.py -v
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

import pytest
from app.services.text_normalizer import TextNormalizer


# ── Moeda ──────────────────────────────────────────────────────────────────────
class TestMoeda:
    def test_com_centavos(self):
        assert TextNormalizer.normalize('R$ 1.200,50') == '1.200 reais e 50 centavos'

    def test_sem_centavos(self):
        assert TextNormalizer.normalize('R$ 1.200') == '1.200 reais'

    def test_centavos_00_omitidos(self):
        assert TextNormalizer.normalize('R$ 500,00') == '500 reais'

    def test_valor_pequeno(self):
        assert TextNormalizer.normalize('R$ 50,30') == '50 reais e 30 centavos'


# ── Percentual ─────────────────────────────────────────────────────────────────
class TestPercentual:
    def test_inteiro(self):
        assert TextNormalizer.normalize('12%') == '12 por cento'

    def test_decimal(self):
        assert TextNormalizer.normalize('5,5%') == '5,5 por cento'

    def test_cem(self):
        assert TextNormalizer.normalize('100%') == '100 por cento'


# ── Datas ──────────────────────────────────────────────────────────────────────
class TestDatas:
    def test_data_completa(self):
        assert TextNormalizer.normalize('05/06/2026') == '5 de junho de 2026'

    def test_ano_dois_digitos(self):
        assert TextNormalizer.normalize('01/01/25') == '1 de janeiro de 2025'

    def test_todos_os_meses(self):
        meses = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
        ]
        for idx, mes in enumerate(meses):
            mm = str(idx + 1).zfill(2)
            result = TextNormalizer.normalize(f'01/{mm}/2024')
            assert mes in result, f'Mês {mes} não encontrado em: {result}'


# ── Ordinais — BUG DE GÊNERO ───────────────────────────────────────────────────
class TestOrdinais:
    def test_masculino_1o(self):
        assert TextNormalizer.normalize('1º') == 'primeiro'

    def test_feminino_1a(self):
        assert TextNormalizer.normalize('1ª') == 'primeira'

    def test_1a_turma_nao_usa_primeiro(self):
        result = TextNormalizer.normalize('1ª turma')
        assert 'primeira' in result
        assert 'primeiro' not in result

    def test_2a_via(self):
        assert 'segunda' in TextNormalizer.normalize('2ª via')

    def test_3a_edicao(self):
        assert 'terceira' in TextNormalizer.normalize('3ª edição')

    def test_5o_andar(self):
        assert 'quinto' in TextNormalizer.normalize('5º andar')

    def test_art_5o(self):
        assert TextNormalizer.normalize('Art. 5º') == 'Artigo quinto'

    def test_art_1o(self):
        assert TextNormalizer.normalize('Art. 1º') == 'Artigo primeiro'

    def test_artigo_3o(self):
        assert TextNormalizer.normalize('Artigo 3º') == 'Artigo terceiro'

    def test_acima_de_10_mantém_numeral(self):
        result = TextNormalizer.normalize('11º')
        assert result  # não explode
        assert '11' in result


# ── Siglas ─────────────────────────────────────────────────────────────────────
class TestSiglas:
    def test_ifac(self):
        assert TextNormalizer.normalize('IFAC') == 'I F A C'

    def test_cpf(self):
        assert TextNormalizer.normalize('CPF') == 'C P F'

    def test_palavra_desconhecida_intacta(self):
        assert TextNormalizer.normalize('ACRE') == 'ACRE'


# ── Abreviações ────────────────────────────────────────────────────────────────
class TestAbreviacoes:
    def test_sr(self):
        assert 'Senhor' in TextNormalizer.normalize('Sr. João')

    def test_dra(self):
        assert 'Doutora' in TextNormalizer.normalize('Dra. Maria')

    def test_no(self):
        assert 'número' in TextNormalizer.normalize('nº 42')


# ── Números decimais ───────────────────────────────────────────────────────────
class TestNumerosDecimais:
    def test_milhar_com_decimal(self):
        assert TextNormalizer.normalize('1.234,56') == '1234 vírgula 56'


# ── normalize_to_chunks ────────────────────────────────────────────────────────
class TestNormalizeToChunks:
    def test_vazio(self):
        assert TextNormalizer.normalize_to_chunks('') == []

    def test_frase_unica(self):
        chunks = TextNormalizer.normalize_to_chunks('Olá mundo.')
        assert len(chunks) == 1
        assert chunks[0].text == 'Olá mundo.'

    def test_duas_frases(self):
        chunks = TextNormalizer.normalize_to_chunks('Primeira frase. Segunda frase.')
        assert len(chunks) >= 2

    def test_pausa_depois_de_ponto(self):
        chunks = TextNormalizer.normalize_to_chunks('Frase um. Frase dois.')
        assert chunks[0].pause_after_ms > 0

    def test_ultimo_chunk_sem_pausa(self):
        chunks = TextNormalizer.normalize_to_chunks('Frase um. Frase dois.')
        assert chunks[-1].pause_after_ms == 0

    def test_sem_pontuacao_retorna_chunk_unico(self):
        chunks = TextNormalizer.normalize_to_chunks('texto sem ponto final nenhum')
        assert len(chunks) == 1


# ── Paridade TS ↔ Python ───────────────────────────────────────────────────────
class TestParidadeComTS:
    """
    Casos críticos onde divergência silenciosa entre TS e Python causaria
    comportamento diferente no fallback de servidor vs. leitura local.
    """

    CASES = [
        ('R$ 1.200,50', '1.200 reais e 50 centavos'),
        ('12%', '12 por cento'),
        ('05/06/2026', '5 de junho de 2026'),
        ('1ª turma', 'primeira turma'),
        ('1º', 'primeiro'),
        ('Art. 5º', 'Artigo quinto'),
        ('IFAC', 'I F A C'),
    ]

    @pytest.mark.parametrize('input_text,expected', CASES)
    def test_normaliza_igual_ao_ts(self, input_text: str, expected: str):
        result = TextNormalizer.normalize(input_text)
        assert result == expected, (
            f'normalize("{input_text}") → "{result}", esperava "{expected}"\n'
            f'Verifique paridade com text-normalizer.ts!'
        )
