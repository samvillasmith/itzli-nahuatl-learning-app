const assert = require('node:assert/strict');
const BEFORE = {
  en: 'Nikamati expresses that you like it. Ax nikamati makes the negative statement. The complete coffee question offers hot or cold with so. Reply with the temperature that actually matches your preference.',
  es: 'Nikamati expresa que te gusta. Ax nikamati lo niega. La pregunta completa sobre el café ofrece caliente o frío mediante so. Responde con la temperatura que corresponda a tu preferencia.'
};
const AFTER = {
  en: 'Nikamati means I like it. Ax nikamati means I do not like it. The complete coffee question offers hot or cold with so. Reply with the temperature that actually matches your preference.',
  es: 'Nikamati significa me gusta. Ax nikamati significa no me gusta. La pregunta completa sobre el café ofrece caliente o frío mediante so. Responde con la temperatura que corresponda a tu preferencia.'
};

function clarifyReviewedCourseExplanations(course, source) {
  const l = source.lessons.find(lesson => lesson.number === 18);
  assert.equal(l.sections[0].body[1], 'Nicāmati “I like it”');
  assert.equal(l.sections[0].body[2], 'Ax nicāmati “I do not like it”');
  const positive = course.phrases.find(phrase => phrase.id === 'i-like');
  const negative = course.phrases.find(phrase => phrase.id === 'not-like');
  assert.equal(positive.sourceText, 'Nicāmati'); assert.equal(positive.english, 'I like it.'); assert.equal(positive.spanish, 'Me gusta.');
  assert.equal(negative.sourceText, 'Ax nicāmati'); assert.equal(negative.english, 'I do not like it.'); assert.equal(negative.spanish, 'No me gusta.');
  const result = structuredClone(course), rule = result.rules.find(rule => rule.id === 'negative-and-preference');
  assert.ok(rule); assert.deepEqual(rule.explanation, BEFORE, 'A changed explanation requires a fresh review');
  rule.explanation = { ...AFTER };
  return result;
}
module.exports = { clarifyReviewedCourseExplanations };
