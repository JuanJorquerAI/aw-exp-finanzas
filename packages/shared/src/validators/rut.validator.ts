import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Normaliza un RUT chileno: quita puntos, guiones y espacios; uppercase DV.
 */
export function normalizeRut(rut: string): string {
  return rut.replace(/[\.\-\s]/g, '').toUpperCase();
}

/**
 * Calcula el dígito verificador (DV) según módulo 11.
 * Retorna '0'-'9' o 'K'.
 */
export function computeRutDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * Valida un RUT chileno (con o sin formato). Acepta:
 *  - 11.111.111-1
 *  - 11111111-1
 *  - 111111111  (sin separador, último char = DV)
 */
export function isValidRut(rut: unknown): boolean {
  if (typeof rut !== 'string') return false;
  const normalized = normalizeRut(rut);
  if (!/^[0-9]+[0-9K]$/.test(normalized)) return false;
  if (normalized.length < 2 || normalized.length > 9) return false;
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  return computeRutDv(body) === dv;
}

/**
 * Compara dos RUTs chilenos ignorando formato (puntos, guiones, mayúsculas).
 */
export function areRutsEqual(a: string, b: string): boolean {
  return normalizeRut(a) === normalizeRut(b);
}

/**
 * Formatea un RUT al estilo chileno: 11.111.111-1
 */
export function formatRut(rut: string): string {
  const normalized = normalizeRut(rut);
  if (!isValidRut(normalized)) return rut;
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  const formattedBody = body
    .split('')
    .reverse()
    .reduce((acc, char, i) => {
      return char + (i > 0 && i % 3 === 0 ? '.' : '') + acc;
    }, '');
  return `${formattedBody}-${dv}`;
}

@ValidatorConstraint({ name: 'isRut', async: false })
class IsRutConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidRut(value);
  }
  defaultMessage(): string {
    return 'RUT chileno inválido (formato: 11.111.111-1 o 111111111)';
  }
}

/**
 * Decorador class-validator para RUT chileno.
 *
 * @example
 *   @IsRUT()
 *   rut!: string;
 */
export function IsRUT(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRutConstraint,
    });
  };
}
