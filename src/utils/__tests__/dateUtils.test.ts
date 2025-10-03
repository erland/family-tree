import {
  splitIsoDate,
  buildIsoDate,
  formatDate,
  parseISO,
  monthsBetween,
  formatAge,
  splitDateYYYYMMDD,
  buildDateYYYYMMDD,
  formatGedcomDate,
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

  describe("buildIsoDate", () => {
    it("builds a complete ISO string when all parts given", () => {
      expect(buildIsoDate(23, "jun", 1985)).toBe("1985-06-23");
      // NOTE: function treats month as zero-based
    });

    it("defaults missing day/month to '01'/'00'", () => {
      expect(buildIsoDate(null, "aug", 1985)).toBe("1985-08-01");
      expect(buildIsoDate(null, null, 1985)).toBe("1985-01-01");
    });

    it("returns undefined if year is missing", () => {
      expect(buildIsoDate(23, "jan", null as any)).toBeUndefined();
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

});