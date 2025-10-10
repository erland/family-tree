import {
  splitIsoDate,
  buildPartialIsoDate,
  formatDate,
  parseISO,
  monthsBetween,
  formatAge,
  splitDateYYYYMMDD,
  buildDateYYYYMMDD,
  formatGedcomDate,
  parseGedcomDate,
} from "../dateUtils";

describe("dateUtils", () => {
  describe("splitIsoDate", () => {
    it("splits a full ISO date into parts", () => {
      const res = splitIsoDate("1985-07-23");
      expect(res).toEqual({
        day: "23",         // string, not number
        monthName: "jul",  // abbreviated lowercase
        year: "1985",      // string, not number
      });
    });

    it("splits an ISO date without day into parts", () => {
      const res = splitIsoDate("1985-07");
      expect(res).toEqual({
        day: "",         
        monthName: "jul",  
        year: "1985",      
      });
    });

    it("splits an ISO date without day and month into parts", () => {
      const res = splitIsoDate("1985");
      expect(res).toEqual({
        day: "",         
        monthName: "",  
        year: "1985",      
      });
    });

    it("returns empty values if date is missing", () => {
      const res = splitIsoDate(undefined);
      expect(res).toEqual({
        day: "",
        monthName: "",
        year: "",
      });
    });
  });

  describe("formatDate", () => {
    it("formats ISO string to GEDCOM style", () => {
      expect(formatDate("1985-07-23")).toBe("23 JUL 1985");
    });

    it("handles only year or year+month", () => {
      expect(formatDate("1985")).toBe("1985");
      expect(formatDate("1985-07")).toBe("JUL 1985");
    });

    it("returns undefined for invalid input", () => {
      expect(formatDate("")).toBeUndefined();
      expect(formatDate(undefined as any)).toBeUndefined();
    });
  });
  describe("parseISO", () => {
    it("parses full YYYY-MM-DD correctly", () => {
      const dt = parseISO("2000-05-10")!;
      expect(dt.getUTCFullYear()).toBe(2000);
      expect(dt.getUTCMonth()).toBe(4); // May is 4 (zero-based)
      expect(dt.getUTCDate()).toBe(10);
    });

    it("parses year-only and year-month", () => {
      expect(parseISO("2000")?.getUTCFullYear()).toBe(2000);
      expect(parseISO("2000-05")?.getUTCMonth()).toBe(4);
    });

    it("returns null for invalid or missing input", () => {
      expect(parseISO("")).toBeNull();
      expect(parseISO(undefined)).toBeNull();
      expect(parseISO("abcd")).toBeNull();
    });
  });

  describe("monthsBetween", () => {
    it("calculates difference in months across years", () => {
      const a = new Date(Date.UTC(2000, 0, 1)); // Jan 2000
      const b = new Date(Date.UTC(2001, 6, 1)); // Jul 2001
      expect(monthsBetween(a, b)).toBe(18);
    });

    it("handles same month same year as 0", () => {
      const a = new Date(Date.UTC(2000, 5, 1));
      const b = new Date(Date.UTC(2000, 5, 30));
      expect(monthsBetween(a, b)).toBe(0);
    });
  });

  describe("formatAge", () => {
    it("returns undefined if birth or event missing/invalid", () => {
      expect(formatAge(undefined, "2000-01-01")).toBeUndefined();
      expect(formatAge("2000-01-01", undefined)).toBeUndefined();
      expect(formatAge("abcd", "2000-01-01")).toBeUndefined();
    });

    it("formats ages under 24 months in months", () => {
      expect(formatAge("2000-01-01", "2001-01-01")).toBe("12 mån");
    });

    it("formats ages 2 years or more in years", () => {
      expect(formatAge("2000-01-01", "2020-01-01")).toBe("20 år");
    });
  });

  describe("splitDateYYYYMMDD", () => {
    it("splits into numeric fields", () => {
      expect(splitDateYYYYMMDD("1985-07-23")).toEqual({ y: 1985, m: 7, d: 23 });
      expect(splitDateYYYYMMDD("1985-07")).toEqual({ y: 1985, m: 7, d: undefined });
      expect(splitDateYYYYMMDD("1985")).toEqual({ y: 1985, m: undefined, d: undefined });
    });

    it("returns empty object when no input", () => {
      expect(splitDateYYYYMMDD(undefined)).toEqual({});
    });
  });

  describe("buildDateYYYYMMDD", () => {
    it("builds full date string when all parts given", () => {
      expect(buildDateYYYYMMDD({ y: 2000, m: 5, d: 9 })).toBe("2000-05-09");
    });

    it("omits missing day or month", () => {
      expect(buildDateYYYYMMDD({ y: 2000, m: 5 })).toBe("2000-05");
      expect(buildDateYYYYMMDD({ y: 2000 })).toBe("2000");
    });

    it("returns undefined when year missing", () => {
      expect(buildDateYYYYMMDD({ m: 5, d: 9 })).toBeUndefined();
    });
  });

  describe("formatGedcomDate", () => {
    it("formats full date", () => {
      expect(formatGedcomDate("1985-07-23")).toBe("23 JUL 1985");
    });

    it("formats year+month", () => {
      expect(formatGedcomDate("1985-07")).toBe("JUL 1985");
    });

    it("formats year only", () => {
      expect(formatGedcomDate("1985")).toBe("1985");
    });

    it("returns undefined for missing or invalid", () => {
      expect(formatGedcomDate("")).toBeUndefined();
      expect(formatGedcomDate(undefined)).toBeUndefined();
      expect(formatGedcomDate("abcd")).toBeUndefined();
    });
  });

  describe("buildPartialIsoDate", () => {
    it("returns undefined when year is missing", () => {
      expect(buildPartialIsoDate(undefined, undefined, undefined)).toBeUndefined();
      expect(buildPartialIsoDate("15", "jan", "")).toBeUndefined();
    });
  
    it("returns only the year when only year is provided", () => {
      expect(buildPartialIsoDate(undefined, undefined, "1901")).toBe("1901");
      expect(buildPartialIsoDate("", "", "2020")).toBe("2020");
    });
  
    it("returns year-month when year and month are provided", () => {
      expect(buildPartialIsoDate(undefined, "jan", "1901")).toBe("1901-01");
      expect(buildPartialIsoDate(undefined, "Feb", "1999")).toBe("1999-02");
      expect(buildPartialIsoDate(undefined, "oktober", "2024")).toBe("2024-10");
    });
  
    it("returns full date when year, month, and day are provided", () => {
      expect(buildPartialIsoDate("5", "mar", "1901")).toBe("1901-03-05");
      expect(buildPartialIsoDate(5, "Mar", 1901)).toBe("1901-03-05");
      expect(buildPartialIsoDate("31", "dec", "2000")).toBe("2000-12-31");
    });
  
    it("handles numeric months", () => {
      // Even though your function expects Swedish month names,
      // it should gracefully handle numeric month strings
      expect(buildPartialIsoDate("15", "3", "1901")).toBe("1901-03-15");
      expect(buildPartialIsoDate(undefined, "10", "1901")).toBe("1901-10");
    });
  
    it("trims and lowercases month names", () => {
      expect(buildPartialIsoDate("1", " Maj ", "1901")).toBe("1901-05-01");
      expect(buildPartialIsoDate(undefined, " JULI ", "1901")).toBe("1901-07");
    });
  
    it("pads single-digit days and months", () => {
      expect(buildPartialIsoDate("1", "jan", "1901")).toBe("1901-01-01");
      expect(buildPartialIsoDate(undefined, "mar", "1901")).toBe("1901-03");
    });
    it("returns undefined if year is missing entirely", () => {
      expect(buildPartialIsoDate("15", "mar", undefined)).toBeUndefined();
      expect(buildPartialIsoDate(undefined, undefined, null)).toBeUndefined();
    });
  
    it("returns only the year if month is invalid or unrecognized", () => {
      expect(buildPartialIsoDate(undefined, "nonsense", "1901")).toBe("1901");
      expect(buildPartialIsoDate("10", "foobar", "2020")).toBe("2020");
    });
  
    it("ignores out-of-range numeric months (<1 or >12)", () => {
      expect(buildPartialIsoDate("10", "0", "1901")).toBe("1901");
      expect(buildPartialIsoDate(undefined, "13", "1901")).toBe("1901");
    });
  
    it("handles missing day correctly (month+year only)", () => {
      expect(buildPartialIsoDate(undefined, "maj", "2000")).toBe("2000-05");
      expect(buildPartialIsoDate("", "dec", "1988")).toBe("1988-12");
    });
  
    it("handles month provided but empty day and monthNum undefined", () => {
      expect(buildPartialIsoDate("", "", "1901")).toBe("1901");
    });

  });
  describe("parseGedcomDate", () => {
    it("parses full GEDCOM date '26 NOV 1901' → '1901-11-26'", () => {
      expect(parseGedcomDate("26 NOV 1901")).toBe("1901-11-26");
    });
  
    it("parses lowercase or mixed-case month names", () => {
      expect(parseGedcomDate("26 nov 1901")).toBe("1901-11-26");
      expect(parseGedcomDate("26 Nov 1901")).toBe("1901-11-26");
    });
  
    it("parses partial 'NOV 1901' → '1901-11'", () => {
      expect(parseGedcomDate("NOV 1901")).toBe("1901-11");
    });
  
    it("parses year-only '1901' → '1901'", () => {
      expect(parseGedcomDate("1901")).toBe("1901");
    });
  
    it("pads single-digit days properly", () => {
      expect(parseGedcomDate("2 JAN 1843")).toBe("1843-01-02");
    });
  
    it("ignores extra whitespace", () => {
      expect(parseGedcomDate("  26   NOV   1901  ")).toBe("1901-11-26");
    });
  
    it("returns undefined for empty or null input", () => {
      expect(parseGedcomDate("")).toBeUndefined();
      expect(parseGedcomDate(undefined)).toBeUndefined();
    });
  
    it("returns original string for unrecognized formats", () => {
      expect(parseGedcomDate("26 13 1901")).toBe("26 13 1901"); // invalid month
      expect(parseGedcomDate("MAYBE 1901")).toBe("MAYBE 1901");
    });
  });
});