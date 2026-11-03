import assert from "node:assert/strict";
import {
  isValidSoulUsd,
  parseSoulUsdInput,
  soulMinUsd,
  soulToUsd,
  usdToSoul,
} from "../src/bot/commands/vip.js";

assert.equal(usdToSoul(5), 5000);
assert.equal(usdToSoul(15), 15000);
assert.equal(usdToSoul(20), 20000);
assert.equal(soulToUsd(5000), 5);
assert.equal(soulToUsd(15000), 15);

assert.equal(parseSoulUsdInput("5"), 5);
assert.equal(parseSoulUsdInput("15"), 15);
assert.equal(parseSoulUsdInput("$20"), 20);
assert.equal(parseSoulUsdInput("30 usd"), 30);
assert.equal(parseSoulUsdInput("USD 25"), 25);
assert.equal(parseSoulUsdInput("15.5"), 15.5);
assert.equal(parseSoulUsdInput("nope"), null);

assert.equal(isValidSoulUsd(5, 5), true);
assert.equal(isValidSoulUsd(15, 5), true);
assert.equal(isValidSoulUsd(4, 5), false);
assert.equal(isValidSoulUsd(15.5, 5), false);

assert.equal(soulMinUsd({ customMinPoints: 5000 } as never), 5);

console.log("ok soul-usd");
