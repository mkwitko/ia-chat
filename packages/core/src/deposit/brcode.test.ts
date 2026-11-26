import { describe, expect, it } from 'vitest';
import { crc16, pixCopyPaste, pixKeyKind, PixKeyKind } from './brcode.ts';

// Vectors: CRC-16/CCITT-FALSE check value ("123456789" -> 29B1) and the static QR example of the
// Banco Central's "Manual de Padrões para Iniciação do Pix" (key 123e4567-..., Fulano de Tal,
// BRASILIA, txid ***), whose published CRC is 1D3D. Fictitious data only.

const BCB_EXAMPLE =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

describe('crc16 (CCITT-FALSE, poly 0x1021, init 0xFFFF)', () => {
  it('matches the standard check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('matches the Banco Central example', () => {
    expect(crc16(BCB_EXAMPLE.slice(0, -4))).toBe('1D3D');
  });
});

describe('pixCopyPaste (EMV BR Code)', () => {
  it('reproduces the Banco Central example byte for byte', () => {
    const code = pixCopyPaste({
      key: '123e4567-e12b-12d1-a456-426655440000',
      receiverName: 'Fulano de Tal',
      city: 'BRASILIA',
    });
    expect(code).toBe(BCB_EXAMPLE);
  });

  it('adds the amount in reais with two decimals and the txid', () => {
    const code = pixCopyPaste({
      key: 'pix@exemplo.com',
      receiverName: 'Clínica Exemplo',
      city: 'São Paulo',
      amountCents: 5000,
      txid: 'abc123',
    });
    expect(code).toContain('540550.00');
    expect(code).toContain('62100506abc123');
    expect(code).toContain('5915Clinica Exemplo6009Sao Paulo');
    expect(crc16(code.slice(0, -4))).toBe(code.slice(-4));
  });

  it('cuts name, city and txid to the field limits and keeps only safe characters', () => {
    const code = pixCopyPaste({
      key: '+5511999990000',
      receiverName: 'Consultório de Quiropraxia Muito Longo Ltda',
      city: 'Santa Bárbara d’Oeste',
      txid: 'a-b_c'.repeat(10),
    });
    expect(code).toContain('5925Consultorio de Quiropraxi');
    expect(code).toContain('6015Santa Barbara d');
    expect(code).toContain('0525abcabcabcabcabcabcabcabca');
  });
});

describe('pixKeyKind', () => {
  it('recognizes each kind of key', () => {
    expect(pixKeyKind('529.982.247-25')).toBe(PixKeyKind.cpf);
    expect(pixKeyKind('11.222.333/0001-81')).toBe(PixKeyKind.cnpj);
    expect(pixKeyKind('+55 11 99999-0000')).toBe(PixKeyKind.phone);
    expect(pixKeyKind('pix@exemplo.com')).toBe(PixKeyKind.email);
    expect(pixKeyKind('123e4567-e12b-12d1-a456-426655440000')).toBe(PixKeyKind.random);
    expect(pixKeyKind('não é chave')).toBeNull();
    expect(pixKeyKind('111.111.111-11')).toBeNull();
  });
});
