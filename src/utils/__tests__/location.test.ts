import { formatLocation } from "../location";

describe("formatLocation", () => {
  it("joins all parts with commas", () => {
    expect(
      formatLocation({ city: "Luleå", congregation: "Nederluleå", region: "Norrbotten" })
    ).toBe("Luleå, Nederluleå, Norrbotten");
  });

  it("skips missing parts", () => {
    expect(formatLocation({ city: "Umeå", region: "Västerbotten" })).toBe("Umeå, Västerbotten");
    expect(formatLocation({ city: "Kiruna" })).toBe("Kiruna");
    expect(formatLocation({})).toBe("");
  });

  it("trims whitespace", () => {
    expect(formatLocation({ city: "  Boden  ", region: " Norrbotten " })).toBe("Boden, Norrbotten");
  });
});