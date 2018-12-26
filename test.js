/* eslint-disable camelcase */

const sleep = async ms => new Promise(res => setTimeout(res, ms));

exports.sleep10 = async () => sleep(10);
exports.sleep100 = async () => sleep(100);
exports.sleep200 = async () => sleep(200);
exports.sleep400 = async () => sleep(400);
