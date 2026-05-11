import { validate } from 'class-validator';
import {
  isValidRut,
  formatRut,
  normalizeRut,
  computeRutDv,
  IsRUT,
} from '../validators/rut.validator';

describe('RUT validator', () => {
  describe('isValidRut', () => {
    it.each([
      '11.111.111-1',
      '11111111-1',
      '111111111',
      '12.345.678-5',
      '76.086.428-5',
      '12.345.670-K',
      '12345670K',
      '12345670k',
      '99999999-9',
    ])('acepta RUT válido %s', (rut) => {
      expect(isValidRut(rut)).toBe(true);
    });

    it.each([
      '',
      '11.111.111-2',
      '12.345.678-0',
      '12.345.670-1',
      'abc',
      '123',
      null,
      undefined,
      12345,
    ])('rechaza valor inválido %p', (rut) => {
      expect(isValidRut(rut as unknown as string)).toBe(false);
    });
  });

  describe('normalizeRut', () => {
    it('quita puntos, guiones y espacios', () => {
      expect(normalizeRut('11.111.111-1')).toBe('111111111');
      expect(normalizeRut(' 12.345.670-k ')).toBe('12345670K');
    });
  });

  describe('computeRutDv', () => {
    it('calcula DV correctamente', () => {
      expect(computeRutDv('11111111')).toBe('1');
      expect(computeRutDv('12345678')).toBe('5');
      expect(computeRutDv('12345670')).toBe('K');
    });
  });

  describe('formatRut', () => {
    it('formatea con puntos y guión', () => {
      expect(formatRut('111111111')).toBe('11.111.111-1');
      expect(formatRut('12345670K')).toBe('12.345.670-K');
    });

    it('devuelve input crudo si es inválido', () => {
      expect(formatRut('invalid')).toBe('invalid');
    });
  });

  describe('@IsRUT decorator', () => {
    class Dto {
      @IsRUT()
      rut!: string;
    }

    it('valida correctamente con class-validator', async () => {
      const dto = new Dto();
      dto.rut = '11.111.111-1';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('reporta error con RUT inválido', async () => {
      const dto = new Dto();
      dto.rut = '11.111.111-2';
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isRut).toContain('RUT chileno inválido');
    });
  });
});
