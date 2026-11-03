import assert from "node:assert/strict";
import { parseStartPayload } from "../src/services/startPayload.js";

assert.deepEqual(parseStartPayload(undefined).kind, "none");
assert.equal(parseStartPayload("agent_abc-123").kind, "agent");
assert.equal(parseStartPayload("agent_abc-123").agentId, "abc-123");
assert.equal(parseStartPayload("agent-xyz").agentId, "xyz");

assert.equal(parseStartPayload("aff_partner01").kind, "aff");
assert.equal(parseStartPayload("aff_partner01").affCode, "partner01");
assert.equal(parseStartPayload("ref_partner01").kind, "aff");
assert.equal(parseStartPayload("ref_partner01").affCode, "partner01");

const combo = parseStartPayload("agent_role1__aff_p9");
assert.equal(combo.kind, "agent");
assert.equal(combo.agentId, "role1");
assert.equal(combo.affCode, "p9");

assert.equal(parseStartPayload("src_channel").kind, "src");
assert.equal(parseStartPayload("src_channel").source, "channel");
assert.equal(parseStartPayload("src_channel").channelCode, "channel");

assert.equal(parseStartPayload("ch_official").kind, "ch");
assert.equal(parseStartPayload("ch_official").channelCode, "official");

const agentCh = parseStartPayload("agent_role1__ch_official__aff_p9");
assert.equal(agentCh.kind, "agent");
assert.equal(agentCh.agentId, "role1");
assert.equal(agentCh.channelCode, "official");
assert.equal(agentCh.affCode, "p9");

assert.equal(parseStartPayload("something_else").kind, "unknown");

console.log("startPayload tests ok");
