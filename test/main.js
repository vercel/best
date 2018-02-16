/* eslint-disable camelcase */

const sleep = async ms => new Promise(res => setTimeout(res, ms));

export async function sleep10() {
	await sleep(10);
}

export async function sleep100() {
	await sleep(100);
}

export async function sleep200() {
	return sleep(200);
}

export async function sleep400() {
	return sleep(400);
}
