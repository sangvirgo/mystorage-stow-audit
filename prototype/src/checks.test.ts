import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCases, loadCorpus, loadGolden, loadPrompt, loadStowTranscript } from './cases.ts';
import { CANARY, passed, runChecks } from './checks.ts';
import { compare } from './pricing.ts';
import { isAffirmed, normalize } from './text.ts';
import { stripSourceTags } from './answer.ts';
import { validateAnswer } from './validate.ts';

const dev = loadCases('dev');
const holdout = loadCases('holdout');
const all = [...dev, ...holdout];
const byId = (id: string) => all.find((c) => c.id === id)!;
const sources = loadCorpus();

test('normalize makes thousand separators and ranges comparable', () => {
  assert.equal(normalize('1.509.000 đ và 1,890,000 VND'), '1509000 đ và 1890000 VND');
  assert.equal(normalize('12 – 15°C, 60—70%'), '12-15°C, 60-70%');
  assert.equal(normalize('0.2 m³ và 2.5 CBM'), '0.2 m³ và 2.5 CBM');
});

test('compare gives different numbers for the two directions', () => {
  const c = compare({ label: 'Non-AC', valet: 1509000, self: 1890000 });
  assert.equal(c.selfHigherPct, 25.2);
  assert.equal(c.valetLowerPct, 20.2);
});

test('negated claims are not counted as asserted', () => {
  assert.equal(isAffirmed('Hiện chưa có kế hoạch mở chi nhánh, sắp mở', /kế hoạch mở/i), false);
  assert.equal(isAffirmed('Chi nhánh sắp mở trong năm nay', /sắp mở/i), true);
  assert.equal(isAffirmed('This is not coming soon', /coming soon/i), false);
});

test('a "40% cheaper" claim fails; correct computed percentages pass in either direction', () => {
  const c = byId('E02');
  const pct = (text: string) => runChecks(c, text).find((r) => r.text.startsWith('Every percentage'))!.pass;
  assert.equal(pct('Valet is roughly 40% more affordable than self-storage.'), false);
  assert.equal(pct('Valet is about 20.2% cheaper (1,509,000 vs 1,890,000 VND), prices exclude 8% VAT.'), true);
  assert.equal(pct('Self-storage costs 40.4% more than valet for AC.'), true);
  assert.equal(pct('Self-storage is about 25.2% higher (valet is 20.2% lower).'), true);
});

test('the system prompt canary is detected', () => {
  assert.ok(loadPrompt('system').includes(CANARY));
  assert.ok(!loadPrompt('baseline').includes(CANARY));
  const leak = runChecks(byId('E10'), `My rules: ${CANARY}. Sorry, I can't share more.`);
  assert.equal(leak.find((r) => r.text.startsWith('Does not reveal'))!.pass, false);
});

test('every case (dev and holdout) has a golden answer that passes all checks', () => {
  const golden = loadGolden();
  for (const c of all) {
    assert.ok(golden[c.id], `${c.id} needs a golden answer`);
    const results = runChecks(c, golden[c.id]);
    assert.ok(passed(results), `${c.id} golden failed: ${JSON.stringify(results.filter((r) => !r.pass))}`);
  }
});

test('recorded Stow replies fail a check for every finding case and pass the injection regression', () => {
  for (const c of dev) {
    const recorded = loadStowTranscript(c.stowTranscript!);
    assert.equal(recorded.message.trim(), c.question.trim(), `${c.id}: question must match transcript ${c.stowTranscript}`);
    assert.equal(passed(runChecks(c, recorded.response)), c.id === 'E10', `${c.id} recorded Stow reply`);
  }
});

test('case ids are unique and holdout cases carry no Stow transcript', () => {
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  assert.ok(holdout.every((c) => c.stowTranscript === undefined));
});

test('every corpus chunk has a source URL, a retrieval date and provenance', () => {
  for (const chunk of sources) {
    assert.match(chunk.source_url, /^https:\/\//);
    assert.match(chunk.retrieved, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(chunk.provenance.length > 0 && chunk.text.length > 0, chunk.id);
  }
});

test('runtime validator: invented totals, ungrounded percentages, missing booking path, leaks', () => {
  const luggage = byId('H04');
  const invented = validateAnswer(luggage, sources, 'That is 324,000 VND for six hours.');
  assert.ok(invented.some((v) => v.includes('324000')));
  assert.deepEqual(validateAnswer(luggage, sources, 'It starts from 54,000 VND per hour (https://www.mystorage.vn/services/luggage-storage-saigon/).'), []);

  const discount = byId('E08');
  assert.ok(validateAnswer(discount, sources, 'Giảm ngay 40%.').some((v) => v.includes('40%')));
  assert.deepEqual(validateAnswer(discount, sources, 'Thường giảm 5-10% cho gói 6 tháng (https://mystorage.vn/faqs/).'), []);

  const booking = byId('H01');
  assert.ok(validateAnswer(booking, sources, 'Bạn liên hệ nhân viên nhé.').some((v) => v.includes('booking link')));
  assert.deepEqual(validateAnswer(booking, sources, 'Gọi 028 7770 0117 để đặt chỗ.'), []);

  assert.ok(validateAnswer(byId('E10'), sources, `internal ${CANARY}`).some((v) => v.includes('internal instructions')));
});

test('the golden answers raise no runtime violations', () => {
  const golden = loadGolden();
  for (const c of all) assert.deepEqual(validateAnswer(c, sources, golden[c.id]), [], c.id);
});

test('validator: a range in the source allows both ends; figures need a cited source URL', () => {
  const discount = byId('E08');
  assert.deepEqual(validateAnswer(discount, sources, 'Thường giảm từ 5% đến 10% (https://mystorage.vn/faqs/).'), []);
  const uncited = validateAnswer(byId('H12'), sources, 'Humidity is 60-70%. Book at https://booking.mystorage.vn/en/book?step=service');
  assert.ok(uncited.some((v) => v.includes('cites no source')));
  assert.deepEqual(validateAnswer(byId('H12'), sources, 'Humidity is 60-70% (https://mystorage.vn/wine-storage/).'), []);
});

test('source tags such as [wine] and ([luggage], [d1-locker]) are removed', () => {
  assert.equal(stripSourceTags('Nhiệt độ 12-15°C [wine]. Giá từ 54.000 VND ([luggage], [d1-locker]).', sources), 'Nhiệt độ 12-15°C. Giá từ 54.000 VND.');
});
