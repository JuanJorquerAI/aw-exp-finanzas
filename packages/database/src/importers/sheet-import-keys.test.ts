import {
  canonicalRut,
  createOccurrenceCounter,
  expenseKey,
  invoiceKey,
  monthRange,
  normalizeFolio,
  normalizeRut,
  opportunityKey,
} from "./sheet-import-keys";

describe("monthRange", () => {
  it("devuelve inicio y fin del mes en America/Santiago", () => {
    const { start, end } = monthRange("2026-05");
    expect(start.toISOString()).toBe("2026-05-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-01T03:59:59.999Z");
  });

  it("un pago a las 23:59:59 hora de Chile cae dentro del mes", () => {
    const { start, end } = monthRange("2026-05");
    const endOfMonthChile = new Date("2026-06-01T03:59:59.999Z");
    expect(endOfMonthChile >= start && endOfMonthChile <= end).toBe(true);

    const startOfJune = monthRange("2026-06").start;
    expect(endOfMonthChile < startOfJune).toBe(true);
  });

  it("rechaza meses mal formados", () => {
    expect(() => monthRange("2026-5")).toThrow("Mes inválido");
    expect(() => monthRange("2026-13")).toThrow("Mes inválido");
  });
});

describe("normalizeFolio", () => {
  it("convierte vacío y variantes S/N en null y recorta espacios", () => {
    expect(normalizeFolio("")).toBeNull();
    expect(normalizeFolio("  ")).toBeNull();
    expect(normalizeFolio("S/N")).toBeNull();
    expect(normalizeFolio("s/n")).toBeNull();
    expect(normalizeFolio("sn")).toBeNull();
    expect(normalizeFolio("sin numero")).toBeNull();
    expect(normalizeFolio("sin número")).toBeNull();
    expect(normalizeFolio(" 1190 ")).toBe("1190");
  });
});

describe("normalizeRut / canonicalRut", () => {
  it("quita puntos y espacios y pasa la K a mayúscula", () => {
    expect(normalizeRut("93.178.000-k")).toBe("93178000-K");
    expect(normalizeRut("76996894-6")).toBe("76996894-6");
    expect(normalizeRut("")).toBeNull();
  });

  it("canonicalRut quita además el guion", () => {
    expect(canonicalRut("93.178.000-k")).toBe("93178000K");
    expect(canonicalRut("76.996.894-6")).toBe("769968946");
    expect(canonicalRut("769968946")).toBe("769968946");
    expect(canonicalRut("")).toBeNull();
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

  it("con folio usa tipo + folio + RUT canónico y no depende del monto", () => {
    expect(invoiceKey(base)).toBe("factura|AFECTA|1190|760261211");
    expect(invoiceKey({ ...base, total: 1 })).toBe(invoiceKey(base));
  });

  it("con folio genera la misma clave independiente del formato del RUT (con puntos o sin guion)", () => {
    expect(invoiceKey({ ...base, rut: "760261211" })).toBe(
      "factura|AFECTA|1190|760261211",
    );
    expect(invoiceKey({ ...base, rut: "76.026.121-1" })).toBe(
      "factura|AFECTA|1190|760261211",
    );
    expect(invoiceKey({ ...base, rut: "76026121-1" })).toBe(
      "factura|AFECTA|1190|760261211",
    );
  });

  it("sin folio usa RUT canónico y monto", () => {
    expect(
      invoiceKey({
        type: "AFECTA",
        number: "",
        rut: "76.026.121-1",
        counterparty: "Lira",
        total: 500000,
      }),
    ).toBe("factura|AFECTA|S/N|760261211|500000");
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
