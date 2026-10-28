import {
  createOccurrenceCounter,
  expenseKey,
  invoiceKey,
  monthRange,
  normalizeFolio,
  normalizeRut,
  opportunityKey,
} from "./sheet-import-keys";

describe("monthRange", () => {
  it("devuelve inicio y fin del mes en hora local", () => {
    const { start, end } = monthRange("2026-05");
    expect(start).toEqual(new Date(2026, 4, 1, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 4, 31, 23, 59, 59, 999));
  });

  it("rechaza meses mal formados", () => {
    expect(() => monthRange("2026-5")).toThrow("Mes inválido");
    expect(() => monthRange("2026-13")).toThrow("Mes inválido");
  });
});

describe("normalizeFolio", () => {
  it("convierte vacío en null y recorta espacios", () => {
    expect(normalizeFolio("")).toBeNull();
    expect(normalizeFolio("  ")).toBeNull();
    expect(normalizeFolio(" 1190 ")).toBe("1190");
  });
});

describe("normalizeRut", () => {
  it("quita puntos y espacios y pasa la K a mayúscula", () => {
    expect(normalizeRut("93.178.000-k")).toBe("93178000-K");
    expect(normalizeRut("76996894-6")).toBe("76996894-6");
    expect(normalizeRut("")).toBeNull();
  });
});

describe("invoiceKey", () => {
  const base = {
    type: "AFECTA",
    number: "1190",
    rut: "76.026.121-1",
    counterparty: "Distribuidora Jose Lira Silva EIRL",
    total: 1196747,
  };

  it("con folio usa tipo + folio + RUT y no depende del monto", () => {
    expect(invoiceKey(base)).toBe("factura|AFECTA|1190|76026121-1");
    expect(invoiceKey({ ...base, total: 1 })).toBe(invoiceKey(base));
  });

  it("el mismo folio con distinto tipo es otra factura", () => {
    expect(invoiceKey({ ...base, type: "EXENTA" })).not.toBe(invoiceKey(base));
  });

  it("sin folio usa el monto y, sin RUT, el nombre", () => {
    expect(
      invoiceKey({
        type: "EXENTA",
        number: "",
        rut: "",
        counterparty: " Univazo ",
        total: 550000,
      }),
    ).toBe("factura|EXENTA|S/N|nombre:univazo|550000");
  });
});

describe("expenseKey / opportunityKey", () => {
  it("arma claves estables", () => {
    expect(expenseKey(" Sueldo Juan ")).toBe("gasto|Sueldo Juan");
    expect(opportunityKey("AdOnTheGo", "AW")).toBe("oportunidad|AW|AdOnTheGo");
  });
});

describe("createOccurrenceCounter", () => {
  it("cuenta cuántas veces aparece cada clave", () => {
    const next = createOccurrenceCounter();
    expect(next("a")).toBe(1);
    expect(next("b")).toBe(1);
    expect(next("a")).toBe(2);
  });
});
