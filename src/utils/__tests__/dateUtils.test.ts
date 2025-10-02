import { splitIsoDate, buildIsoDate, formatDate } from "../dateUtils";

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
});