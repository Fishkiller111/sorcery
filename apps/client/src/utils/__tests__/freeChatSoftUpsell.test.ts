/// <reference types="node" />
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { countPlayerMessages, shouldShowFreeChatSoftUpsell } from '../freeChatSoftUpsell.ts';

describe('freeChatSoftUpsell', () => {
  it('counts player messages only', () => {
    assert.equal(countPlayerMessages([{role:'agent'}, {role:'player'}, {role:'player'}, {role:'system'}]), 2);
  });
  it('shows only for free users past threshold once', () => {
    assert.equal(shouldShowFreeChatSoftUpsell({unlimited:false, playerMessageCount:11, alreadyShown:false}), true);
    assert.equal(shouldShowFreeChatSoftUpsell({unlimited:false, playerMessageCount:10, alreadyShown:false}), false);
    assert.equal(shouldShowFreeChatSoftUpsell({unlimited:true, playerMessageCount:20, alreadyShown:false}), false);
    assert.equal(shouldShowFreeChatSoftUpsell({unlimited:false, playerMessageCount:20, alreadyShown:true}), false);
  });
});
