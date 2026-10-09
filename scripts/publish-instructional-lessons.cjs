// Publish only reviewed, independently arranged teaching. Private photo mappings stay private.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {mergeReviewedBlueprints,mergeReviewedRecords,applyReviewedFeedbackRevisions,applyReviewedContextRevisions}=require('./lib/reviewed-lesson-merge.cjs');
const path='data/research/yan-garcia-nhe-20261004/verification/instructional-v3/grammar-unit-scenes-proposal.private.json';
const raw=fs.readFileSync(path);
if(crypto.createHash('sha256').update(raw).digest('hex')!=='352e7a03bdb8b3af491dacbb52402a3af85a0817967b3e8ce9b61a439b29f7cb') throw Error('Teaching proposal changed; review it before publication.');
const proposal=JSON.parse(raw), course=require('../src/data/v3-original-course.json');
const mechanicsRaw=fs.readFileSync('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/mechanics-scenes-proposal.private.json');
if(crypto.createHash('sha256').update(mechanicsRaw).digest('hex')!=='b04f4e3a47b63e32c40edf49c62a15069fbf170373c08c74b9fa3724ecc04220') throw Error('Mechanics proposal changed; review it before publication.');
const mechanics=JSON.parse(mechanicsRaw);
const auditRaw=fs.readFileSync('data/research/yan-garcia-nhe-20261004/verification/grammar/grammar-audit-mechanics-proposal.private.json');
if(crypto.createHash('sha256').update(auditRaw).digest('hex')!=='35702df9d563be31953d73e448fa73d4dfae439226d49a85ed2f224ad9d45e7b') throw Error('Additional mechanics changed; review before publication.');
const audit=JSON.parse(auditRaw);
function reviewedPacket(file, expectedHash) {
  const bytes=fs.readFileSync(file);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==expectedHash) throw Error(`Reviewed teaching packet changed: ${file}`);
  return JSON.parse(bytes);
}
const weather=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/weather-scenes-proposal.private.json','7588597934d6e80d91286e3b61827fa83b93e890c5f7ef664c11e7ac897382a3');
const objects=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/object-cohort-scenes-proposal.private.json','4013f728b32060b6be737b2d6bb8cee8085845ac8db109309377420f597b30ee');
const causative=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/causative-applicative-scenes-proposal.private.json','71ab08ace0221a42e90b98a4ae0508d2f280971811534bbd7f3f2071227def23');
const second=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/grammar/grammar-audit-second-mechanics-proposal.private.json','42bb7559869eb07cf4c676408d7967459ba1238f39fe858d7d9c367f1cee0be0');
const clauses=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/remaining-clause-mechanics-proposal.private.json','6b961c563d13fc61a102d30dbddf3349e635bae0da59c81c02241dc56746c378');
const nouns=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/remaining-noun-mechanics-proposal.private.json','22589487c1cdcc97e7749c0a812dc1d20c4f94e737e5c8423657793ebd5c7694');
const tense=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/grammar/tense-person-mechanics-proposal.private.json','3ca5b01d86331e72302b37968d1afeeb73cc5b3f3ee478e3fc95a2343b1549bd');
const clauseLinks=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/remaining-clause-mechanics-second-proposal.private.json','3e9dace5a2fa23929c3e4bc086247f53a9ef6684441690aa201bc4d511f1cca8');
const nounContrasts=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/remaining-noun-mechanics-second-proposal.private.json','dbec265b4d0ff508b5896d953684f7d150e7247a779df9e7f3bad74ea3ef06ac');
const nounProperties=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/remaining-noun-mechanics-third-proposal.private.json','74ced4234f43dea18e4fdf9c69e711cc044cbfe3adfc350015bbde311f375ca5');
const partialContrasts=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/grammar/bounded-partial-contrasts-proposal.private.json','11d7e08d428d685de416b931d2699498e71ede3080ec16f1bcc8464636ee84b2');
const countedRoutines=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/remaining-noun-mechanics-fourth-proposal.private.json','53a699dc2bbf1d19ba81d8bf6b8fbbf50b1b4db67da4cdb71cefea698c6cb016');
const additional=[mechanics,audit,weather,causative,second,objects,clauses,nouns,tense,clauseLinks,nounContrasts,nounProperties,partialContrasts,countedRoutines];
// New packets are added here only after their individual sense, form and scene review.
function completedPacket(name,proposalHash,reviewName,reviewHash){
  const directory='data/research/yan-garcia-nhe-20261004/verification/instructional-v3/';
  const packet=reviewedPacket(directory+name,proposalHash);
  const review=reviewedPacket(directory+reviewName,reviewHash);
  if(review.proposalSha256!==proposalHash||!review.status.startsWith('independently-reviewed')) throw Error('Curriculum packet lacks its independent review.');
  const approved=new Map(review.rows.map(row=>[row.entryId,new Set(row.approvedContextPhraseIds)]));
  for(const spec of packet.blueprints) for(const id of spec.contextCoverage?.coveredEntryIds??[]){
    if(!approved.get(id)?.size) throw Error(`A claimed contextual word lacks its selected-sense review: ${id}`);
  }
  return packet;
}
const curriculumCompletionPackets=[
  completedPacket('current-final-stragglers-proposal.private.json','a972df87ddc7e0168f33a815fe58087f21cfa8172f42775777a5face2ca9c606','current-final-stragglers-parent-review.private.json','4487c5cdfc6450936a721e6fb5742c553ec9340336549e1e9c87b747d36f2526'),
  completedPacket('current-number-time-remaining-cohorts-proposal.private.json','46b97950b0bd3f60d6e17cb62ff1b770680960ec0b962e5cd00ee7c1996bd8e2','current-number-time-remaining-cohorts-parent-review.private.json','1391c4043f342bea3e4ff08cdd104c5d26df124e06a837d1f27b793cefa0d51f'),
  completedPacket('current-conversation-community-people-proposal.private.json','80b2140fb9d01450f3d98d2292d2a3c2dddd042066555eeb53529b54c1893d24','current-conversation-community-people-parent-review.private.json','eee90c3eee606e75027e165d6b3b6253960a96c81110638e96e7527cc4ee4912'),
  completedPacket('../grammar/current-bounded-request-indefinite-memory-proposal.private.json','ea666f970215812840ba86f60777dc77a0af9c763d93795b31f19e096fc49f60','current-bounded-request-indefinite-memory-parent-review.private.json','9d51dac321e52e36eb4d5717b241edc470f0a4762582ca3fab66ea71d7a446f5'),
  completedPacket('current-place-body-everyday-proposal.private.json','cff08a5627e30790cedba74d4b8e254ba750e2cf9dc9d25a2aa697fba85f4ed8','current-place-body-everyday-parent-review.private.json','eab739040a555e7136069ced8ee1ff0d0143f0aeb661de2cd0a6c441216dba9a'),
  completedPacket('current-action-cohorts-proposal.private.json','416778ca54840dd10f4a03e25597e6587970af97b0c59cdffb59f3737df3eeb6','current-action-cohorts-parent-review.private.json','0c65bcb5d29ae1a37809c26fc1e9f2c8fced7d2a1eec6b954b73a5f90d73fc65'),
  completedPacket('current-finite-cohorts-proposal.private.json','196c26ebe4df08a22766ec1f15f73b09ea4d7091a85266eabe3ff74a9d09467e','current-finite-cohorts-sense-review.private.json','b3d3dc27c29135c3046b2ea7998961f6f1d1b9423d3ec7a7f0421dab4e2ea8ac'),
  completedPacket('current-people-cohorts-proposal.private.json','be7a4febecc1b1b0a857ca94eb11088aa9d5d9de3c59e734167a503442bf9295','current-people-cohorts-sense-review.private.json','355c5549af37879b15ceb9023778702d2f25ff9247fa83b82c4ff01e5d1112f4'),
  completedPacket('current-number-time-cohorts-proposal.private.json','e3845846fe85b609f59f092626960d49924286541c83a76786f50436022d82e9','current-number-time-cohorts-parent-review.private.json','133e3bc694ba5b5a5ea91110e87224cebcd38e94184e8d984e91e77adf90e07b'),
  completedPacket('current-noun-cohorts-proposal.private.json','e4248dc6f8ef0b22fdfd854ced59ae5b6464b5616dd049ec9e7f283d0ae00511','current-noun-cohorts-parent-review.private.json','c629c22e4bece806dcc152b8a729468079d72d8da28344d9bc252d516920d9d0'),
  completedPacket('../grammar/current-expansion-grammar-proposal.private.json','d1ed47d50a78bba57868f1554a3071e5c25032f7cc4fba5143a60f6e6d94a6a5','current-expansion-grammar-parent-review.private.json','be209133284d7912618aa13169c28bfd73ea19f743e379968fecdcad65fc6c87'),
  completedPacket('current-description-cohorts-proposal.private.json','8fd1436ab90a9341c2060b6bd8fa720429685d7cefbd4a82a6b4c15a208b0aa0','current-description-cohorts-parent-review.private.json','9562a6ffb1646c146e37b728547f51c7f015f15aec6a2974b146fad897d8882f'),
  completedPacket('current-reference-cohorts-proposal.private.json','828817de6711573eec33153297bbc3c8e456f49eb744686be2db93413ab675db','current-reference-cohorts-parent-review.private.json','c90da4132ca86bf58e4c1f5772c96ffba3c70d19005ff1320fddc6f9cb49f551'),
  completedPacket('../grammar/current-negative-command-contrast-proposal.private.json','35e932ccd5b2b6b60c9b72139921f8e4d5e6c939c7c50c01040affeecb5bcedc','current-negative-command-contrast-parent-review.private.json','fda63b443159385a97a5195e0940d3e3d7b38c6e4beb3b3f2b43148f17ab4414'),
];
additional.push(...curriculumCompletionPackets);
const imported=fs.readFileSync('src/data/nahuatlahtolli-course.json');
if(crypto.createHash('sha256').update(imported).digest('hex')!==proposal.licensedSourceImportSha256) throw Error('Licensed source bytes changed.');
const source=JSON.parse(imported);
const supplementPhrases=mergeReviewedRecords(proposal.supplementPhrases,additional.flatMap(packet=>packet.newPhrases),'Phrase');
const reviewedCompletionPhrases=new Map(curriculumCompletionPackets.flatMap(packet=>packet.newPhrases).map(phrase=>[phrase.id,phrase]));
const lexicon=require('../src/data/v3-verified-lexicon.json').entries;
const approvedClauseModels=new Set([
  'remaining-thirsty','remaining-sleepy','remaining-direct-opinion','remaining-inner-opinion',
  'remaining-taste-opinion','remaining-bathe','remaining-play',
  'remaining2-nothing-here','remaining2-flowers-nowhere','remaining2-nobody-takes',
  'remaining2-what-here','remaining2-where-flowers','remaining2-who-takes',
  'remaining2-do-like-this','remaining2-do-like-that','remaining2-work-reason',
  'remaining2-work-contrast','remaining2-sick-but-work','remaining2-study-then-work',
  'remaining2-work-then-study','remaining2-dress-self','remaining2-hat-fits',
  'remaining2-each-works','remaining2-monthly-work','remaining2-talk-to-you',
  'remaining2-bring-it-down','remaining2-recent-arrival','remaining2-moment-arrival',
  'remaining2-see-all-at-once',
]);
const dictionaryBytes=fs.readFileSync('data/research/yan-garcia-nhe-20261004/verification/further-sources/chicontepec-pages-private.json');
if(crypto.createHash('sha256').update(dictionaryBytes).digest('hex')!=='643d120d14812127a0f6b3fa2921122f7f1d396fcc74b1aed8d3f89000e42be9') throw Error('Independently checked dictionary cache changed.');
const dictionaryPages=JSON.parse(dictionaryBytes).pages;
const {toInaliOrthography}=require('../public/nahuatl-orthography.js');
const reviewedDictionaryHeads=new Set([nounContrasts,nounProperties].flatMap(p=>p.newPhrases).filter(p=>p.sourceLocator.sourceType==='individual-dictionary-headword-fact').map(p=>p.id));
const reviewedDictionaryForms=new Set(nounProperties.newPhrases.filter(p=>p.sourceLocator.sourceType==='individual-dictionary-form-fact').map(p=>p.id));
function checkedDictionaryHead(phrase) {
  const locator=phrase.sourceLocator;
  const text=dictionaryPages.find(page=>page.pdf_page===locator.referencePdfPage)?.text;
  const head=locator.referenceHeadword;
  return reviewedDictionaryHeads.has(phrase.id)
    &&locator.referenceFileSha256==='bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc'
    &&text?.includes(`${head}. `)
    &&phrase.sourceText?.toUpperCase()===head
    &&toInaliOrthography(phrase.sourceText).toLowerCase()===phrase.nahuatl.toLowerCase();
}
function checkedDictionaryForm(phrase) {
  const locator=phrase.sourceLocator;
  const text=dictionaryPages.find(page=>page.pdf_page===locator.referencePdfPage)?.text;
  return reviewedDictionaryForms.has(phrase.id)
    &&locator.referenceFileSha256==='bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc'
    &&text?.includes(`${locator.referenceHeadword}. `)&&phrase.sourceText
    &&text.slice(locator.referenceTextStart,locator.referenceTextStart+phrase.sourceText.length)===phrase.sourceText
    &&toInaliOrthography(phrase.sourceText)===phrase.nahuatl;
}
function checkedPossessedContrast(phrase) {
  const locator=phrase.sourceLocator;
  const expected={ 'noun2-fact-my-pot':['CŌMITL',133,'-cōn','nokon'], 'noun2-fact-my-cloth':['YOYŌMITL',631,'-yoyōn','noyoyon'] }[phrase.id];
  if(!expected) return false;
  const [head,page,stem,display]=expected;
  const text=dictionaryPages.find(p=>p.pdf_page===page)?.text;
  return phrase.sourceText===null&&phrase.nahuatl===display
    &&locator.evidenceType==='individually-reviewed-original-possessed-form'
    &&locator.referenceHeadword===head&&locator.referencePdfPage===page&&locator.referencePossessedStem===stem
    &&locator.referenceFileSha256==='bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc'
    &&text?.includes(`${head}. tlat.`)&&text?.includes(stem)
    &&locator.componentSourceLocators?.some(c=>c.lessonNumber===8&&c.sectionIndex===1&&c.bodyIndex===1&&source.lessons.find(l=>l.number===8)?.sections[1]?.body[1]?.includes(c.component))
    &&toInaliOrthography(`no${stem.slice(1)}`)===display&&locator.directWholeFormAttestationClaimed===false;
}
function checkedPartialContrastFact(phrase) {
  const locator=phrase.sourceLocator;
  if(phrase.id==='partial-contrast-command-bathe') return phrase.sourceText==='Ximālti'&&phrase.nahuatl==='Ximalti'
    &&locator.evidenceType==='direct-public-minimal-form-omitted-from-frozen-import'
    &&locator.publicUrl==='https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-17-lesson-17-ximoquetza-sit-down/'
    &&locator.minimalQuotedForm===phrase.sourceText;
  const reviewed=new Set(['partial-contrast-not-yet','partial-contrast-no-longer','partial-contrast-speaker-here','partial-contrast-listener-there','partial-contrast-visible-over-there']);
  const text=dictionaryPages.find(page=>page.pdf_page===locator.pdfPage)?.text;
  return reviewed.has(phrase.id)&&locator.sourcePdfSha256==='bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc'
    &&text?.slice(locator.dictionaryPageCharacterOffset,locator.dictionaryPageCharacterOffset+locator.dictionaryRawHeadAndType?.length)===locator.dictionaryRawHeadAndType
    &&locator.rawMinimalHead===phrase.sourceText&&locator.dictionaryRawHeadAndType.startsWith(`${phrase.sourceText}. `)
    &&toInaliOrthography(phrase.sourceText).toLowerCase()===phrase.nahuatl.toLowerCase();
}
for(const phrase of supplementPhrases) {
  const locator=phrase.sourceLocator,lesson=source.lessons.find(l=>l.number===locator.lessonNumber);
  const body=lesson?.sections[locator.sectionIndex]?.body[locator.bodyIndex];
  const composition=locator.evidenceType==='individually-reviewed-original-composition'&&locator.componentSourceLocators?.length>=2;
  const normalizeFragment=value=>toInaliOrthography(value).toLowerCase().replace(/[¿¡?!.,:;“”"']/g,'').replace(/\s+/g,' ').trim();
  const retainedSourceFragment=body&&(` ${normalizeFragment(body)} `).includes(` ${normalizeFragment(phrase.nahuatl)} `);
  const separatelyReviewedCompletion=phrase.sourceText===null
    &&locator.evidenceType==='individually-reviewed-original-composition'
    &&reviewedCompletionPhrases.get(phrase.id)===phrase
    &&locator.componentSourceLocators?.length>=1
    &&(locator.lexicalSourceLocator||locator.componentSourceLocators.length>=2||retainedSourceFragment
      ||locator.componentSourceLocators.some(component=>{
        const licensedBody=source.lessons.find(item=>item.number===component.lessonNumber)
          ?.sections[component.sectionIndex]?.body[component.bodyIndex];
        return licensedBody&&(` ${normalizeFragment(licensedBody)} `)
          .includes(` ${normalizeFragment(phrase.nahuatl)} `);
      }));
  const briefNativeFact=phrase.sourceId==='native-berkeley-chicontepec-2022'&&[
    'Norma axcanah quimatiyaya tlan ya hueliyaya tlapa','Panotiyahqui xihuitl',
  ].includes(phrase.sourceText)&&locator.publicPrimaryUrl==='https://clacs.berkeley.edu/brlas2022/ce-tlapahquetl-chicontepecana-tlen-naman';
  const composedModel=phrase.sourceText===null&&Boolean(locator.operation);
  const reviewedClauseModel=approvedClauseModels.has(phrase.id)&&phrase.sourceText===null
    &&Boolean(locator.compositionOperation)&&locator.checkedPrimaryComponents?.length>=2
    &&locator.primaryEvidenceUrls?.length>=1;
  const weatherFact=phrase.sourceId==='chicontepec-weather-individual-facts'&&lexicon.some(entry=>entry.id===locator.individualLexicalEntryId&&entry.display.toLowerCase()===phrase.nahuatl.replace(/[.!?]/g,'').toLowerCase());
  const exactLexicalFact=lexicon.some(entry=>entry.id===(locator.individuallyReviewedLexicalId??locator.approvedLexiconEntryId)
    &&entry.display.toLowerCase()===phrase.nahuatl.replace(/[.!?]/g,'').toLowerCase()
    &&entry.sourceLocator.sourceFactReviewHash===locator.sourceFactReviewHash
    &&(locator.lexiconSha256??locator.approvedLexiconSha256)==='4cc134c2a2034afd750df324607ef9b80cd29deff2dbd47c7d6bb44aab1de4e4');
  const regionalFact=locator.sourcePdfSha256==='7d9f6da17cbfeadb7da4bd2af0ff38fa4a90d6e52141d1d7852b73a34ffbb1cb'&&locator.publicPrimaryUrl==='https://revistas-filologicas.unam.mx/tlalocan/index.php/tl/article/download/550/562/924';
  const directionalFact=['remaining2-visit-away','remaining2-visit-here'].includes(phrase.id)
    &&locator.sourcePdfSha256==='bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc'
    &&dictionaryPages.find(page=>page.pdf_page===locator.referencePdfPage)?.text.slice(locator.referenceTextStart,locator.referenceTextStart+phrase.sourceText.length)===phrase.sourceText;
  if(!body?.includes(phrase.sourceText)&&!composition&&!separatelyReviewedCompletion&&!briefNativeFact&&!composedModel&&!reviewedClauseModel&&!weatherFact&&!exactLexicalFact&&!regionalFact&&!directionalFact&&!checkedDictionaryHead(phrase)&&!checkedDictionaryForm(phrase)&&!checkedPossessedContrast(phrase)&&!checkedPartialContrastFact(phrase)) throw Error(`Selected source phrase lost its exact locator: ${phrase.id}`);
  if(phrase.audioUrl!==null||phrase.audioKind!=='none') throw Error('A new phrase cannot inherit guessed source audio.');
  if(reviewedClauseModel) phrase.sourceLocator={...locator,compositionStatus:'individually-reviewed-original-composition'};
}
// Existing grammar lessons gain context, rules, builders and conversations.
// Their established unit records and recall-task identities remain unchanged.
const supplementUnits=additional.filter(packet=>!curriculumCompletionPackets.includes(packet)).flatMap(packet=>packet.newUnits);
const establishedUnitIds=new Set([...course.units,...supplementUnits].map(unit=>unit.id));
for(const unit of curriculumCompletionPackets.flatMap(packet=>packet.newUnits)){
  if(!establishedUnitIds.has(unit.id)) throw Error(`Completion teaching must use an established lesson identity: ${unit.id}`);
}
// Routes 260–274 already belong to these identities. Later packets append;
// moving an existing item would silently attach a learner's route to new work.
const establishedSupplementIds=[
  'v3-mechanic-unspecified-objects','v3-mechanic-identity-time','v3-mechanic-posture-time',
  'v3-mechanic-imagined-past','v3-mechanic-motion-purpose','v3-mechanic-relational-space',
  'v3-mechanic-finite-preference','v3-mechanic-embedded-questions','v3-mechanic-demonstrative-phrases',
  'v3-mechanic-quantified-groups','v3-mechanic-ongoing-motion','v3-mechanic-weather-and-feeling',
  'v3-mechanic-knowledge-and-recipient','v3-mechanic-occupation-nouns','v3-mechanic-motion-commands',
];
if(establishedSupplementIds.some((id,index)=>supplementUnits[index]?.id!==id)) throw Error('An established supplementary route changed identity.');
if(new Set(supplementUnits.map(unit=>unit.id)).size!==supplementUnits.length) throw Error('Supplementary lesson identities must be unique.');
const assignments=require('../src/data/course-path-extension.json');
const mergedBlueprints=mergeReviewedBlueprints([...proposal.blueprints,...additional.flatMap(packet=>packet.blueprints)]);
const sceneCopy=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/context-copy-revisions.private.json','6c54ec3c88d22915ab6df803fe268f19aef9d3654a39e651f5faef2224d42f3a');
const sceneCopyReview=reviewedPacket('data/research/yan-garcia-nhe-20261004/verification/instructional-v3/context-copy-parent-review.private.json','9e19a89b7379045cec1f4b87d6d66fdc7f755dcba70972d92ac3da5ded2fc7a1');
if(sceneCopyReview.proposalSha256!=='6c54ec3c88d22915ab6df803fe268f19aef9d3654a39e651f5faef2224d42f3a'||!sceneCopyReview.status.startsWith('independently-reviewed')) throw Error('Scene copy lacks its independent review.');
const revisedBlueprints=applyReviewedContextRevisions(mergedBlueprints,sceneCopy.revisions);
const lessons=applyReviewedFeedbackRevisions(revisedBlueprints,curriculumCompletionPackets.flatMap(packet=>packet.feedbackRevisions??[])).map(blueprint=>{
  const unit=[...course.units,...supplementUnits].find(unit=>unit.id===blueprint.unitId);
  if(!unit&&!assignments.lessons.some(lesson=>lesson.progressId===blueprint.unitId)) throw Error('Every authored scene needs a stable course identity.');
  const {id,vocabularyIds,contextPhraseIds,grammarRuleIds,builders,dialogues,contextCoverage,reviewedEntryForms}=blueprint;
  return {unitId:blueprint.unitId,blueprint:{id,vocabularyIds,contextPhraseIds,grammarRuleIds,builders,dialogues,...(contextCoverage?{contextCoverage}:{}),...(reviewedEntryForms?.length?{reviewedEntryForms}:{})}};
});
fs.writeFileSync('src/data/instructional-lesson-blueprints.json',JSON.stringify({schemaVersion:1,license:proposal.license,
  supplementPhrases,supplementRules:additional.flatMap(packet=>packet.newRules),supplementUnits,
  supplementSources:[...new Map(additional.flatMap(packet=>packet.newSources).filter(s=>!course.sources.some(x=>x.id===s.id)).map(s=>[s.id,s])).values()],lessons},null,2)+'\n');
console.log(`Published ${lessons.length} lessons with context activities and ${supplementPhrases.length} supplementary reviewed forms; partial vocabulary coverage remains explicit.`);
