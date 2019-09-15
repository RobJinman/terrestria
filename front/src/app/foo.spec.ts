import "jasmine";
import { add } from "./foo";

describe("foo", () => {
  it("Should add two numbers correctly", () => {
    const x = add(4, 7);
    expect(x).toEqual(11);
  })
});
