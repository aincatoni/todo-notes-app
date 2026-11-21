import { describe, it, expect, test } from 'bun:test';
import {
  validateTitle,
  validateDescription,
  validateUsername,
  validatePassword,
  validateCoordinates,
  validateRemoteTodo,
} from '../domain/validators';

describe('Validadores de dominio (Domain §6 y R19)', () => {
  describe('validateTitle', () => {
    test.each([
      { name: '1 carácter', input: 'a', expected: 'a' },
      { name: 'recorta espacios', input: '  Comprar pan  ', expected: 'Comprar pan' },
      { name: '80 caracteres exactos', input: 'x'.repeat(80), expected: 'x'.repeat(80) },
      {
        name: '80 caracteres con espacios en bordes',
        input: `  ${'x'.repeat(80)}  `,
        expected: 'x'.repeat(80),
      },
    ])('acepta título válido: $name', ({ input, expected }) => {
      const result = validateTitle(input);
      expect(result).toEqual({ valid: true, value: expected });
    });

    test.each([
      { name: 'vacío (0 chars)', input: '' },
      { name: 'solo espacios', input: '   ' },
      { name: '81 caracteres', input: 'x'.repeat(81) },
    ])('rechaza título inválido: $name', ({ input }) => {
      const result = validateTitle(input);
      expect(result).toEqual({
        valid: false,
        error: 'Ingresa un título (máx. 80 caracteres)',
      });
    });
  });

  describe('validateDescription', () => {
    test.each([
      { name: 'vacía (0 chars)', input: '', expected: '' },
      { name: 'recorta espacios', input: '  detalle  ', expected: 'detalle' },
      { name: '500 caracteres exactos', input: 'd'.repeat(500), expected: 'd'.repeat(500) },
    ])('acepta descripción válida: $name', ({ input, expected }) => {
      const result = validateDescription(input);
      expect(result).toEqual({ valid: true, value: expected });
    });

    it('rechaza descripción de 501 caracteres', () => {
      const result = validateDescription('d'.repeat(501));
      expect(result).toEqual({
        valid: false,
        error: 'Máximo 500 caracteres',
      });
    });
  });

  describe('validateUsername', () => {
    test.each([
      { name: '3 caracteres', input: 'abc' },
      { name: '30 caracteres', input: 'a'.repeat(30) },
      { name: 'usuario alfanumérico con . _ -', input: 'user_1.test-2' },
      { name: 'usuario DummyJSON', input: 'emilys' },
      { name: 'formato correo con @', input: 'ain@ipss.cl' },
    ])('acepta usuario válido: $name', ({ input }) => {
      const result = validateUsername(input);
      expect(result).toEqual({ valid: true, value: input });
    });

    test.each([
      { name: 'vacío', input: '' },
      { name: '2 caracteres', input: 'ab' },
      { name: '31 caracteres', input: 'a'.repeat(31) },
      { name: 'con espacios', input: 'user name' },
      { name: 'con caracteres inválidos', input: 'user$name!' },
    ])('rechaza usuario inválido: $name', ({ input }) => {
      const result = validateUsername(input);
      expect(result).toEqual({
        valid: false,
        error: 'Usuario inválido',
      });
    });
  });

  describe('validatePassword', () => {
    test.each([
      { name: '6 caracteres exactos', input: '123456' },
      { name: 'contraseña larga', input: 'emilyspass' },
    ])('acepta contraseña válida: $name', ({ input }) => {
      const result = validatePassword(input);
      expect(result).toEqual({ valid: true, value: input });
    });

    test.each([
      { name: 'vacía', input: '' },
      { name: '5 caracteres', input: '12345' },
    ])('rechaza contraseña inválida: $name', ({ input }) => {
      const result = validatePassword(input);
      expect(result).toEqual({
        valid: false,
        error: 'Mínimo 6 caracteres',
      });
    });
  });

  describe('validateCoordinates', () => {
    test.each([
      { name: 'origen (0, 0)', lat: 0, lon: 0 },
      { name: 'borde mínimo (-90, -180)', lat: -90, lon: -180 },
      { name: 'borde máximo (90, 180)', lat: 90, lon: 180 },
      { name: 'Santiago de Chile', lat: -33.4489, lon: -70.6693 },
    ])('acepta coordenadas válidas: $name', ({ lat, lon }) => {
      expect(validateCoordinates(lat, lon)).toBe(true);
    });

    test.each([
      { name: 'latitud < -90', lat: -90.0001, lon: 0 },
      { name: 'latitud > 90', lat: 90.0001, lon: 0 },
      { name: 'longitud < -180', lat: 0, lon: -180.0001 },
      { name: 'longitud > 180', lat: 0, lon: 180.0001 },
      { name: 'latitud NaN', lat: Number.NaN, lon: 0 },
      { name: 'longitud NaN', lat: 0, lon: Number.NaN },
      { name: 'latitud Infinity', lat: Number.POSITIVE_INFINITY, lon: 0 },
      { name: 'longitud -Infinity', lat: 0, lon: Number.NEGATIVE_INFINITY },
    ])('rechaza coordenadas inválidas: $name', ({ lat, lon }) => {
      expect(validateCoordinates(lat, lon)).toBe(false);
    });
  });

  describe('validateRemoteTodo (R19)', () => {
    it('acepta un todo remoto válido y recorta espacios', () => {
      const result = validateRemoteTodo({
        id: 1,
        todo: '  Estudiar pruebas TDD  ',
        completed: false,
        userId: 5,
      });

      expect(result).toEqual({
        valid: true,
        value: {
          id: 1,
          todo: 'Estudiar pruebas TDD',
          completed: false,
          userId: 5,
        },
      });
    });

    it('normaliza y trunca a 80 caracteres el título importado (R19)', () => {
      const longTitle = `  ${'a'.repeat(95)}  `;
      const result = validateRemoteTodo({
        id: 10,
        todo: longTitle,
        completed: true,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.value.todo).toHaveLength(80);
        expect(result.value.todo).toBe('a'.repeat(80));
      }
    });

    test.each([
      { name: 'null', raw: null },
      { name: 'sin id', raw: { todo: 'Algo', completed: false } },
      { name: 'id no numérico', raw: { id: '1', todo: 'Algo', completed: false } },
      { name: 'id NaN', raw: { id: Number.NaN, todo: 'Algo', completed: false } },
      { name: 'todo vacío', raw: { id: 1, todo: '   ', completed: false } },
      { name: 'todo no string', raw: { id: 1, todo: 123, completed: false } },
      { name: 'completed no booleano', raw: { id: 1, todo: 'Algo', completed: 'true' } },
    ])('descarta registro remoto inválido: $name', ({ raw }) => {
      expect(validateRemoteTodo(raw)).toEqual({ valid: false });
    });
  });
});
