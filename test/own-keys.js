const assert = require('assert').strict;

exports.foo = () => {};
exports.bar = () => {};
exports.checkKeys = () => {
	assert.deepEqual(Object.getOwnPropertyNames(exports), ['foo', 'bar', 'checkKeys']);
	assert.deepEqual(Object.keys(exports), ['foo', 'bar', 'checkKeys']);
};
