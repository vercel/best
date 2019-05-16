/* eslint-disable camelcase */

const assert = require('assert').strict;

const testLib = require('../lib/test-lib.js');

const sleep = async ms => new Promise(res => setTimeout(res, ms));

exports.sleep10 = async () => sleep(10);
exports.sleep100 = async () => sleep(100);
exports.sleep200 = async () => sleep(200);
exports.sleep400 = async () => sleep(400);

exports.testLib1 = () => assert.equal(testLib(10, 15), 25);
exports.testLib2 = () => assert.equal(testLib(20, 4), 24);
