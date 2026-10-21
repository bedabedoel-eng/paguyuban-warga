import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvPinAwal, hpLokal } from '../../src/lib/pinAwal.js';
import { parseCsv } from '../../src/lib/csv.js';

test('hpLokal: format 62 menjadi 0812-3456-7890', () => {
  assert.equal(hpLokal('6281234567890'), '0812-3456-7890');
  assert.equal(hpLokal('081234500001'), '0812-3450-0001');
  assert.equal(hpLokal(''), '');
});

test('csvPinAwal: kolom nama, hp, pin_awal dan bisa dibaca ulang', () => {
  const csv = csvPinAwal([
    { nama: 'Budi Santoso', hp: '6281234500001', pin: '122917' },
    { nama: 'Siti; "Aminah"', hp: '6281234500002', pin: '544813' },
  ]);
  const baris = parseCsv(csv);
  assert.deepEqual(baris[0], ['nama', 'hp', 'pin_awal']);
  assert.deepEqual(baris[1], ['Budi Santoso', '0812-3450-0001', '122917']);
  assert.deepEqual(baris[2], ['Siti; "Aminah"', '0812-3450-0002', '544813']);
  assert.equal(baris.length, 3);
});

test('csvPinAwal: PIN tidak diawali nol dan nama berawalan rumus dinetralkan', () => {
  const csv = csvPinAwal([{ nama: '=CMD()', hp: '6281234500003', pin: '100200' }]);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes("'=CMD()"));
  assert.ok(csv.includes('100200'));
});
