import { describe, it, expect } from 'vitest';
import { TextNormalizer } from '../../src/widget/text-normalizer';

describe('TextNormalizer.normalize', () => {
  // ── Moeda ──────────────────────────────────────────────────────────────────
  describe('moeda', () => {
    it('expande R$ com centavos', () => {
      expect(TextNormalizer.normalize('R$ 1.200,50')).toBe('1.200 reais e 50 centavos');
    });

    it('expande R$ sem centavos', () => {
      expect(TextNormalizer.normalize('R$ 1.200')).toBe('1.200 reais');
    });

    it('expande R$ com centavos 00 (omite centavos)', () => {
      expect(TextNormalizer.normalize('R$ 500,00')).toBe('500 reais');
    });

    it('expande R$ valor pequeno', () => {
      expect(TextNormalizer.normalize('R$ 50,30')).toBe('50 reais e 30 centavos');
    });
  });

  // ── Percentual ─────────────────────────────────────────────────────────────
  describe('percentual', () => {
    it('expande 12%', () => {
      expect(TextNormalizer.normalize('12%')).toBe('12 por cento');
    });

    it('expande 5,5%', () => {
      expect(TextNormalizer.normalize('5,5%')).toBe('5,5 por cento');
    });

    it('expande 100%', () => {
      expect(TextNormalizer.normalize('100%')).toBe('100 por cento');
    });
  });

  // ── Datas ──────────────────────────────────────────────────────────────────
  describe('datas', () => {
    it('expande data completa DD/MM/AAAA', () => {
      expect(TextNormalizer.normalize('05/06/2026')).toBe('5 de junho de 2026');
    });

    it('expande data com ano de dois dígitos', () => {
      expect(TextNormalizer.normalize('01/01/25')).toBe('1 de janeiro de 2025');
    });

    it('expande todos os meses corretamente', () => {
      const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
      ];
      meses.forEach((mes, idx) => {
        const mm = String(idx + 1).padStart(2, '0');
        expect(TextNormalizer.normalize(`01/${mm}/2024`)).toContain(mes);
      });
    });
  });

  // ── Ordinais — BUG DE GÊNERO ───────────────────────────────────────────────
  describe('ordinais — concordância de gênero', () => {
    it('1º → primeiro (masculino)', () => {
      expect(TextNormalizer.normalize('1º')).toBe('primeiro');
    });

    it('1ª → primeira (feminino)', () => {
      expect(TextNormalizer.normalize('1ª')).toBe('primeira');
    });

    it('1ª turma → "primeira turma" (não "primeiro turma")', () => {
      const result = TextNormalizer.normalize('1ª turma');
      expect(result).toContain('primeira');
      expect(result).not.toContain('primeiro');
    });

    it('2ª via → "segunda via"', () => {
      expect(TextNormalizer.normalize('2ª via')).toContain('segunda');
    });

    it('3ª edição → "terceira edição"', () => {
      expect(TextNormalizer.normalize('3ª edição')).toContain('terceira');
    });

    it('5º andar → "quinto andar"', () => {
      expect(TextNormalizer.normalize('5º andar')).toContain('quinto');
    });

    it('Art. 5º → "Artigo quinto"', () => {
      expect(TextNormalizer.normalize('Art. 5º')).toBe('Artigo quinto');
    });

    it('Art. 1º → "Artigo primeiro"', () => {
      expect(TextNormalizer.normalize('Art. 1º')).toBe('Artigo primeiro');
    });

    it('Artigo 3º → "Artigo terceiro"', () => {
      expect(TextNormalizer.normalize('Artigo 3º')).toBe('Artigo terceiro');
    });

    it('ordinal acima de 10 não é expandido (mantém numeral)', () => {
      const result = TextNormalizer.normalize('11º');
      // Não deve explodir nem gerar string vazia
      expect(result).toBeTruthy();
      expect(result).toContain('11');
    });
  });

  // ── Siglas ─────────────────────────────────────────────────────────────────
  describe('siglas', () => {
    it('IFAC → I F A C', () => {
      expect(TextNormalizer.normalize('IFAC')).toBe('I F A C');
    });

    it('CPF → C P F', () => {
      expect(TextNormalizer.normalize('CPF')).toBe('C P F');
    });

    it('não expande palavra que não está na lista', () => {
      expect(TextNormalizer.normalize('ACRE')).toBe('ACRE');
    });
  });

  // ── Abreviações ────────────────────────────────────────────────────────────
  describe('abreviações', () => {
    it('Sr. → Senhor', () => {
      expect(TextNormalizer.normalize('Sr. João')).toContain('Senhor');
    });

    it('Dra. → Doutora', () => {
      expect(TextNormalizer.normalize('Dra. Maria')).toContain('Doutora');
    });

    it('nº → número', () => {
      expect(TextNormalizer.normalize('nº 42')).toContain('número');
    });
  });

  // ── Números decimais ───────────────────────────────────────────────────────
  describe('números decimais', () => {
    it('1.234,56 → 1234 vírgula 56', () => {
      expect(TextNormalizer.normalize('1.234,56')).toBe('1234 vírgula 56');
    });
  });
});

// ── normalizeToChunks ──────────────────────────────────────────────────────
describe('TextNormalizer.normalizeToChunks', () => {
  it('texto vazio retorna array vazio', () => {
    expect(TextNormalizer.normalizeToChunks('')).toHaveLength(0);
  });

  it('frase única retorna um chunk', () => {
    const chunks = TextNormalizer.normalizeToChunks('Olá mundo.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Olá mundo.');
  });

  it('duas frases retornam dois chunks', () => {
    const chunks = TextNormalizer.normalizeToChunks('Primeira frase. Segunda frase.');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('pausa depois de frase encerrada com ponto é > 0', () => {
    const chunks = TextNormalizer.normalizeToChunks('Frase um. Frase dois.');
    // Primeiro chunk deve ter pausa depois
    expect(chunks[0].pauseAfterMs).toBeGreaterThan(0);
  });

  it('último chunk tem pauseAfterMs = 0', () => {
    const chunks = TextNormalizer.normalizeToChunks('Frase um. Frase dois.');
    expect(chunks[chunks.length - 1].pauseAfterMs).toBe(0);
  });

  it('texto sem pontuação retorna chunk único', () => {
    const chunks = TextNormalizer.normalizeToChunks('texto sem ponto final nenhum');
    expect(chunks).toHaveLength(1);
  });
});

// ── profileForTag ──────────────────────────────────────────────────────────
describe('TextNormalizer.profileForTag', () => {
  it('h1 tem rate menor que padrão', () => {
    const h1 = TextNormalizer.profileForTag('h1');
    const def = TextNormalizer.profileForTag('p');
    expect(h1.rateMultiplier).toBeLessThan(def.rateMultiplier);
  });

  it('h1 tem pitch maior que padrão', () => {
    const h1 = TextNormalizer.profileForTag('h1');
    const def = TextNormalizer.profileForTag('p');
    expect(h1.pitch).toBeGreaterThan(def.pitch);
  });

  it('tag desconhecida retorna perfil neutro', () => {
    const profile = TextNormalizer.profileForTag('div');
    expect(profile.rateMultiplier).toBe(1.0);
    expect(profile.pitch).toBe(1.0);
  });
});
