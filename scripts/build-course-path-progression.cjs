// Topic placement uses Itzli's existing path, never the photographed book order.
const fs = require('node:fs');
const extension = require('../src/data/course-path-extension.json');
const instructional = require('../src/data/instructional-lesson-blueprints.json');
const lexicon = require('../src/data/v3-verified-lexicon.json').entries;
const earlier = require('../src/data/lexical-expansion.json');
const wordById = new Map([...lexicon,...earlier.map(word=>({...word,meaningEn:word.english,formKind:'source-headword'}))].map(word=>[word.id,word]));
const anchors = [1,11,3,2,34,4,33,6,12,13,8,9,20,22,21,23,5,7,10,35,36,17,14,15,24,25,26,27,18,37,38,39,40,41,16,19,28,29,30,31,32,42,43];
const grammarAfter = {
  3:[44], 2:[45], 4:[52,286,287], 6:[81,46,56], 12:[50], 13:[53,293,294], 8:[68],
  9:[47,58,59,60,76,282], 20:[82], 22:[49], 23:[48,69,73],
  5:[57,273,79,70,87], 7:[84,65,296], 10:[83,271,276,277], 17:[54,86,71,75,88,275,280,299],
  14:[51,55], 15:[63,74,85,288], 24:[64,80,261,292], 25:[264,298], 26:[61,77],16:[289,290],
  18:[72,266,278,295,297], 37:[66], 38:[67,78,269,300], 39:[62], 28:[262], 30:[89], 31:[263], 32:[260],
  35:[268],41:[267],42:[270],19:[274,279],43:[302],
};
// Revisit topics at successive anchors instead of finishing a separate word path.
const topicAnchors = {
  conversation:[11,2,6,12,13,23,5,7,17,25,26,27,18,41,19,28,30,32,43],
  people:[3,9,20,5,41], food:[22,27,18,38], home:[23,17,39],
  body:[10,17,29], description:[4,10,35,36], time:[33,7,25,28],
  place:[23,24,25,40,41], nature:[21,40], animals:[21,37], plants:[21,40],
  work:[5,21,38,41], thought:[5,18,28,30,43], numbers:[34,26,27],
  actions:[6,12,13,7,17,14,15,24,25,38,16,19,28,32,42],
  community:[20,41], everyday:[23,7,17,26,39,41,29], reference:[43],
};
const prerequisites = {
  44:[3],45:[2],46:[81],47:[8,9],48:[6,23],49:[22],50:[12],51:[14,50],52:[34,4],
  53:[13,81],54:[53,17],55:[14],56:[81],57:[46,56],58:[47],59:[47],60:[59],
  61:[14,26],62:[14,39],63:[14,15],64:[51,24],65:[6,84],66:[53,56,37],
  67:[13,38],68:[44,6],69:[45,48],70:[46,57],71:[47,48,17],72:[49,18],
  73:[52,48],74:[50,51],75:[53,54],76:[59,60],77:[58,26],78:[56,14,38],
  79:[5],80:[55,24],81:[6],82:[20],83:[10,81],84:[7],85:[14,15],
  86:[53,54],87:[44,46,53],88:[54,56],89:[30],
  260:[53,86,32],261:[79,51,24],262:[55,50,28],263:[89,31],264:[50,51,64,25],265:[8,23],
  266:[49,50,18],267:[51,266,41],268:[35,52],269:[56,38],270:[264,42],
  271:[81,53,10],272:[86,260],273:[57,5],274:[24,19],
  275:[53,17],276:[81,53,47,10],277:[276,10],278:[53,49,266,18],
  279:[53,19],280:[275,17],281:[53,47,49,22],
  282:[47,50,9],283:[47,48,23],284:[273,47,32],285:[48,23],286:[52,4],287:[286,4],
  288:[51,56,53,15],289:[51,288,16],290:[51,289,16],291:[53,86,56,17],292:[81,56,48,24],
  293:[45,50,53,13],294:[53,13],295:[276,278,18],296:[57,81,7],297:[49,18],
  298:[53,86,264,25],299:[53,276,275,17],300:[56,34,33,38],301:[53,86,279,32],302:[64,43],
  303:[47,276,29],304:[47,283,23],305:[52,21],306:[57,273,32],
  307:[304,23],308:[286,277,10],309:[282,9],310:[48,285,40],
  311:[47,282,308,10],312:[305,271,10],313:[312,16],314:[50,33,13],315:[53,309,43],
  316:[84,280,17],317:[56,316,18],318:[50,53,15],319:[48,309,10],320:[271,277,10],
  321:[50,12],322:[61,264,26],323:[57,48,32],324:[323,64,32],
};
grammarAfter[32].push(272);
grammarAfter[23].push(265);
grammarAfter[22].push(281);
grammarAfter[23].push(283,285);
grammarAfter[32].push(284);
grammarAfter[17].push(291);
grammarAfter[32].push(301);
grammarAfter[29]=[...(grammarAfter[29]??[]),303];
grammarAfter[23].push(304,307);
grammarAfter[21]=[...(grammarAfter[21]??[]),305];
grammarAfter[32].push(306);
grammarAfter[10].push(308);
grammarAfter[9].push(309);
grammarAfter[40]=[...(grammarAfter[40]??[]),310];
grammarAfter[10].push(311,319,320,312);
grammarAfter[16].push(313);
grammarAfter[13].push(314);
grammarAfter[43].push(315);
grammarAfter[17].push(316);
grammarAfter[18].push(317);
grammarAfter[15].push(318);
grammarAfter[12].push(321);
grammarAfter[26].push(322);
grammarAfter[32].push(323,324);
const wordsAfter = new Map(anchors.map(id=>[id,[]]));
for (const topic of Object.keys(topicAnchors)) {
  const lessons = extension.lessons.filter(lesson=>lesson.topic===topic);
  const destinations = topicAnchors[topic];
  lessons.forEach((lesson,index)=>{
    let anchor=destinations[Math.min(destinations.length-1,Math.floor(index*destinations.length/lessons.length))];
    // A mixed cohort waits for its most advanced prerequisite. In particular,
    // dictionary verb heads never interrupt the first greeting/name exchanges.
    const prerequisiteAnchors=[anchor];
    for(const id of lesson.entryIds) {
      const word=wordById.get(id); if(!word) throw Error('Missing stable word assignment.');
      if(/verb|root|stem|prefix|relational base|reference/i.test(`${word.partOfSpeech} ${word.formKind}`)) prerequisiteAnchors.push(13);
      if(/possessed|kinship|sibling|cousin/i.test(`${word.partOfSpeech} ${word.meaningEn}`)) prerequisiteAnchors.push(9);
      if(/\bwould\b|hypothetical|counterfactual/i.test(word.meaningEn)) prerequisiteAnchors.push(30);
      else if(/\b(?:was|were|went|bought|drank|ate|saw|cried|ground|could)\b/i.test(word.meaningEn)) prerequisiteAnchors.push(15);
      if(/respectful|honorific|diminutive/i.test(`${word.partOfSpeech} ${word.formKind} ${word.meaningEn}`)) prerequisiteAnchors.push(20);
    }
    anchor=prerequisiteAnchors.sort((a,b)=>anchors.indexOf(b)-anchors.indexOf(a))[0];
    wordsAfter.get(anchor).push(lesson.lessonNumber);
  });
}
const lessons=[];
for(const anchor of anchors) {
  lessons.push({lessonNumber:anchor,anchorLesson:anchor,prerequisites:[]});
  for(const id of grammarAfter[anchor]??[]) lessons.push({lessonNumber:id,anchorLesson:anchor,prerequisites:prerequisites[id]});
  for(const id of wordsAfter.get(anchor)) lessons.push({lessonNumber:id,anchorLesson:anchor,prerequisites:[anchor]});
}
const expected=[...anchors,...extension.grammarLessons.map(x=>x.lessonNumber),...extension.lessons.map(x=>x.lessonNumber),...instructional.supplementUnits.map((_,index)=>260+index)];
if(lessons.length!==expected.length||new Set(lessons.map(x=>x.lessonNumber)).size!==expected.length||expected.some(id=>!lessons.some(x=>x.lessonNumber===id))) throw Error('Every stable lesson must appear exactly once.');
const positions=new Map(lessons.map((x,i)=>[x.lessonNumber,i]));
for(const lesson of lessons) for(const prerequisite of lesson.prerequisites) if(positions.get(prerequisite)>=positions.get(lesson.lessonNumber)) throw Error(`Prerequisite ${prerequisite} must precede ${lesson.lessonNumber}.`);
fs.writeFileSync('src/data/course-path-progression.json',JSON.stringify({schemaVersion:1,organization:'Itzli topic anchors with prerequisite-based grammar and recurring vocabulary',lessons},null,2)+'\n');
console.log(`Placed ${lessons.length} stable lessons on the existing topic path.`);
