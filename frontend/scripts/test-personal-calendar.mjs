import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentIcsEvent,
  assignmentsToIcs,
  calendarUtcStamp,
  googleCalendarUrl,
  upcomingConfirmedMissions,
} from '../src/lib/personalCalendar.ts';

const mission = {
  id: '11111111-1111-4111-8111-111111111111',
  mission_id: '22222222-2222-4222-8222-222222222222',
  title: 'Garde IDE — médecine',
  start_at: '2030-09-20T06:00:00.000Z',
  end_at: '2030-09-20T14:00:00.000Z',
  address: '12 rue Fictive, Paris',
  establishment_name: 'Clinique fictive',
  status: 'ACTIVE',
};

test('UTC stamps drop millis and keep Z', () => {
  assert.equal(calendarUtcStamp('2030-09-20T06:00:00.123Z'), '20300920T060000Z');
  assert.equal(calendarUtcStamp('not-a-date'), null);
});

test('upcoming filter keeps only active future-or-current missions', () => {
  const now = Date.parse('2030-09-19T12:00:00.000Z');
  const list = upcomingConfirmedMissions(
    [
      mission,
      { ...mission, id: 'past', end_at: '2030-09-18T14:00:00.000Z' },
      { ...mission, id: 'cancelled', status: 'CANCELLED' },
    ],
    now,
  );
  assert.deepEqual(list.map((m) => m.id), [mission.id]);
});

test('ICS event contains escaped fields and confirmed status', () => {
  const event = assignmentIcsEvent(mission, 'http://127.0.0.1:5173');
  assert.ok(event);
  assert.match(event, /BEGIN:VEVENT/);
  assert.match(event, /DTSTART:20300920T060000Z/);
  assert.match(event, /DTEND:20300920T140000Z/);
  assert.match(event, /SUMMARY:Garde IDE — médecine/);
  assert.match(event, /LOCATION:Clinique fictive — 12 rue Fictive\\, Paris/);
  assert.match(event, /STATUS:CONFIRMED/);
  assert.match(event.replace(/\r\n /g, ''), /missions\/m_22222222-2222-4222-8222-222222222222/);
});

test('ICS calendar wraps one or more events', () => {
  const ics = assignmentsToIcs([mission], 'http://127.0.0.1:5173');
  assert.ok(ics);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /END:VCALENDAR$/);
  assert.equal(assignmentsToIcs([{ ...mission, status: 'CANCELLED' }]), null);
});

test('Google Calendar URL encodes title and UTC dates without an API key', () => {
  const href = googleCalendarUrl(mission, 'http://127.0.0.1:5173');
  assert.ok(href);
  assert.match(href, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(href, /action=TEMPLATE/);
  assert.match(href, /dates=20300920T060000Z%2F20300920T140000Z/);
  assert.match(href, /text=Garde/);
  assert.doesNotMatch(href, /key=/i);
});


test('ICS folding preserves Unicode and limits every physical line to 75 UTF-8 bytes', () => {
  const title = '\u00e9\ud83d\udc69\u200d\u2695\ufe0f'.repeat(50);
  const event = assignmentIcsEvent({ ...mission, title });
  for (const line of event.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  assert.ok(event.replace(/\r\n /g, '').includes('SUMMARY:' + title));
});

test('ICS escapes every newline representation in text fields', () => {
  const title = 'A\r\nBEGIN:VEVENT\rB\nC';
  const event = assignmentIcsEvent({ ...mission, title });
  assert.equal(event.split('\r\n').filter(line => line === 'BEGIN:VEVENT').length, 1);
  assert.ok(event.includes('SUMMARY:A\\nBEGIN:VEVENT\\nB\\nC'));
});

test('zero-length and reversed periods cannot be exported to calendars', () => {
  for (const end_at of [mission.start_at, '2030-09-19T06:00:00.000Z', 'invalid']) {
    const invalid = { ...mission, end_at };
    assert.equal(assignmentIcsEvent(invalid), null);
    assert.equal(googleCalendarUrl(invalid), null);
    assert.deepEqual(upcomingConfirmedMissions([invalid], Date.parse('2029-01-01')), []);
  }
});
