import "server-only";
import course from "./nahuatlahtolli-course.json";
import { getCourseSource, type ContentReview, type ContentSource, type LocalizedText } from "./lexical-registry";
import { getExistingPhraseRecording, type RecordingKind } from "./recording-reuse";

export type ScenarioOption = {
  id: string;
  nahuatl: string;
  english: string;
  spanish: string;
  correct: boolean;
  intent?: "reply" | "repeat";
  nextTurnId?: string;
  audioUrl: string | null;
  audioKind: RecordingKind;
  sources: ContentSource[];
  explanation: LocalizedText;
};
export type ScenarioTurn = {
  id: string;
  speaker: string;
  nahuatl: string;
  english: string;
  spanish: string;
  audioUrl: string | null;
  audioKind: RecordingKind;
  audioScope: "exact-utterance" | "none";
  prompt: LocalizedText;
  options: ScenarioOption[];
  acceptedResponses: string[];
  explanation: LocalizedText;
  sources: ContentSource[];
};
export type ConversationScenario = {
  id: string;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  unitNumbers: number[];
  startTurnId: string;
  turns: ScenarioTurn[];
  sources: ContentSource[];
  canDo: LocalizedText[];
  review: ContentReview;
  sourceAudio: { url: string; scope: "whole-passage"; label: LocalizedText }[];
};
export type SentencePatternChoice = {
  id: string;
  nahuatl: string;
  english: string;
  spanish: string;
  source: ContentSource;
  audioUrl: string | null;
  audioKind: RecordingKind;
};
export type SentencePattern = {
  id: string;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  unitNumbers: number[];
  // The workbench selects complete attested phrases. No productive affix rules.
  slots: { id: string; label: LocalizedText; choices: SentencePatternChoice[] }[];
  sources: ContentSource[];
  review: ContentReview;
  template?: {
    sourceNahuatl: string;
    nahuatl: string;
    english: string;
    spanish: string;
    freeSlots: { id: string; type: "proper-name" | "place-name"; label: LocalizedText; example: string; maxLength: number }[];
  };
};

function sourceKey(text: string) {
  return text.toLocaleLowerCase().replace(/[¿¡?!.,:;“”"/]/g, "").replace(/\s+/g, " ").trim();
}

type Phrase = { nahuatl: string; english: string; spanish: string; audioUrl: string | null; audioKind: RecordingKind; sources: ContentSource[] };
function phrase(lessonNumber: number, nahuatl: string, english: string, spanish: string): Phrase {
  const lesson = course.lessons.find((item) => item.number === lessonNumber)!;
  const text = [...lesson.sections.flatMap((section) => section.body), ...lesson.vocabulary.map((item) => item.headword)].join(" ");
  if (!sourceKey(text).includes(sourceKey(nahuatl))) throw new Error(`Unattested scenario phrase in Lesson ${lessonNumber}: ${nahuatl}`);
  const vocabularyIndex = lesson.vocabulary.findIndex((item) => sourceKey(item.headword) === sourceKey(nahuatl));
  const originalAudio = vocabularyIndex >= 0 ? lesson.vocabulary[vocabularyIndex].audioUrl : null;
  const synthetic = originalAudio ? null : getExistingPhraseRecording(nahuatl, english);
  return { nahuatl, english, spanish, audioUrl: originalAudio ?? synthetic?.url ?? null,
    audioKind: synthetic ? "synthetic" : "source",
    sources: [getCourseSource(lessonNumber, nahuatl, vocabularyIndex >= 0 ? vocabularyIndex + 1 : undefined)] };
}

const sourceArrangement: ContentReview = {
  status: "source-adaptation",
  scope: { en: "COERLL utterances and short source replies arranged by Itzli for guided conversation. English and Spanish are Itzli translations.", es: "Enunciados y respuestas breves de COERLL organizados por Itzli para practicar conversaciones. El inglés y el español son traducciones de Itzli." },
  limitations: { en: "This is an adapted practice conversation, not a recording of this whole exchange. New personal substitutions and conversational sequencing still need community-speaker review.", es: "Es una conversación adaptada para practicar, no una grabación de todo este intercambio. Las sustituciones personales y la secuencia conversacional aún requieren revisión con personas hablantes de la comunidad." },
};
const repeat = phrase(2, "Zampa xiquihto", "Say it again", "Dilo otra vez");
const andYou = phrase(3, "¿Huan ta?", "And you?", "¿Y tú?");
const yes = phrase(2, "quēna", "yes", "sí");
const later = phrase(3, "Quena, teipanoc.", "Yes, later.", "Sí, hasta luego.");
const here = phrase(2, "Nicān niitztoc", "I am here", "Estoy aquí");

function option(id: string, value: Phrase, correct: boolean, nextTurnId: string | undefined, en: string, es: string): ScenarioOption {
  return { id, ...value, correct, nextTurnId, intent: "reply", explanation: { en, es } };
}
function turn(id: string, speaker: string, value: Phrase, prompt: LocalizedText, options: ScenarioOption[], explanation: LocalizedText): ScenarioTurn {
  const replay: ScenarioOption = { ...repeat, id: `${id}-repeat`, correct: true, nextTurnId: id, intent: "repeat",
    explanation: { en: "Ask for repetition, then listen or read again before choosing a reply.", es: "Pide que lo repitan; vuelve a escuchar o leer antes de responder." } };
  return { id, speaker, ...value, audioScope: value.audioUrl ? "exact-utterance" : "none", prompt,
    options: options.length ? [...options, replay] : [], acceptedResponses: options.filter((item) => item.correct).map((item) => item.nahuatl), explanation };
}
function scenario(id: string, title: LocalizedText, description: LocalizedText, unitNumbers: number[], turns: ScenarioTurn[], canDo: LocalizedText[]): ConversationScenario {
  const sources = [...new Map(turns.flatMap((item) => [...item.sources, ...item.options.flatMap((choice) => choice.sources)]).map((source) => [`${source.id}:${source.excerpt}`, source])).values()];
  return { id, titleEn: title.en, titleEs: title.es, descriptionEn: description.en, descriptionEs: description.es,
    unitNumbers, startTurnId: turns[0].id, turns, sources, canDo, review: sourceArrangement, sourceAudio: [] };
}

const introductions = scenario("introductions", { en: "Meeting someone", es: "Conocer a alguien" },
  { en: "Introduce yourself, share where you are from, and ask for repetition when needed.", es: "Preséntate, di de dónde eres y pide que repitan cuando lo necesites." }, [2, 3], [
    turn("name", "Paty", phrase(3, "Piyalli, ¿quēniuhqui motōcah?", "Hello, what is your name?", "Hola, ¿cómo te llamas?"),
      { en: "You are playing Juana. Say your name.", es: "Representas a Juana. Di tu nombre." }, [
        option("name-juana", phrase(3, "Na notōcah Juana.", "My name is Juana.", "Me llamo Juana."), true, "origin", "Introduce yourself with the source name frame.", "Preséntate con la estructura de nombre de la fuente."),
        option("name-location", here, false, undefined, "This tells where you are, rather than your name.", "Esta respuesta dice dónde estás, en lugar de tu nombre."),
      ], { en: "The original source dialogue uses Paty and Juana; these roles are adapted for this activity.", es: "El diálogo original usa Paty y Juana; aquí se adaptaron sus papeles para la actividad." }),
    turn("origin", "Paty", phrase(3, "¿Cānin tiēhua?", "Where are you from?", "¿De dónde eres?"),
      { en: "In this role you are from Tecomate, Chicontepec.", es: "En este papel eres de Tecomate, Chicontepec." }, [
        option("origin-tecomate", phrase(3, "Na niēhua Tecomate, Chicōntepēc.", "I am from Tecomate, Chicontepec.", "Soy de Tecomate, Chicontepec."), true, "work", "This names your place of origin.", "Esta respuesta indica tu lugar de origen."),
        option("origin-name", phrase(3, "Na notōcah Juana.", "My name is Juana.", "Me llamo Juana."), false, undefined, "The question asks for a place of origin.", "La pregunta pide el lugar de origen."),
      ], { en: "The word ēhua has the source-supported sense ‘be from’ here.", es: "Aquí ēhua tiene el sentido documentado de «ser de»." }),
    turn("work", "Paty", phrase(3, "¿Tlen titlamachtia?", "What do you teach?", "¿Qué enseñas?"),
      { en: "Your role teaches Nahuatl.", es: "Tu personaje enseña náhuatl." }, [
        option("teach-nahuatl", phrase(3, "Na nitlamachtia Nahuatl.", "I teach Nahuatl.", "Enseño náhuatl."), true, "close", "The reply answers what you teach.", "La respuesta indica qué enseñas."),
        option("teach-name", phrase(3, "Na notōcah Juana.", "My name is Juana.", "Me llamo Juana."), false, undefined, "A name does not answer what you teach.", "Un nombre no responde qué enseñas."),
      ], { en: "These are the source's complete teaching question and answer.", es: "Son la pregunta y la respuesta completas de la fuente sobre enseñar." }),
    turn("close", "Paty", later, { en: "You have introduced yourself and can close the exchange.", es: "Ya te presentaste y puedes terminar el intercambio." }, [],
      { en: "Use the name workbench to practice your own name next.", es: "Después usa el taller de nombres para practicar con tu propio nombre." }),
  ], [{ en: "I can introduce myself and ask for repetition.", es: "Puedo presentarme y pedir que repitan." }]);

const family = scenario("family", { en: "Talking about family", es: "Hablar de la familia" },
  { en: "Identify family members with short replies, then answer a sibling-count question.", es: "Identifica familiares con respuestas breves y contesta una pregunta sobre cuántos hermanos tienes." }, [4, 9], [
    turn("mother", "Friend", phrase(2, "¿Ācquiya?", "Who?", "¿Quién?"), { en: "Your friend asks who your mother is. Identify her with the source family term.", es: "Tu amistad pregunta quién es tu mamá. Identifícala con la palabra de la fuente." }, [
      option("my-mother", phrase(9, "nonanān", "my mother", "mi mamá"), true, "sister", "A short noun reply identifies your mother.", "La respuesta breve identifica a tu mamá."),
      option("my-father", phrase(9, "notatah", "my father", "mi papá"), false, undefined, "This identifies your father.", "Esta respuesta identifica a tu papá."),
    ], { en: "This activity uses noun replies; it does not invent a new full family sentence.", es: "La actividad usa respuestas nominales; no inventa una oración completa sobre la familia." }),
    turn("sister", "Friend", phrase(2, "¿Ācquiya?", "Who?", "¿Quién?"), { en: "Now identify your older sister.", es: "Ahora identifica a tu hermana mayor." }, [
      option("my-older-sister", phrase(9, "nopipi", "my older sister", "mi hermana mayor"), true, "count", "The source distinguishes an older sister from a younger sibling.", "La fuente distingue a una hermana mayor de un hermano menor."),
      option("my-older-brother", phrase(9, "nomimi", "my older brother", "mi hermano mayor"), false, undefined, "This identifies your older brother.", "Esta respuesta identifica a tu hermano mayor."),
    ], { en: "Preserve the source kinship distinctions and possessed endings.", es: "Conserva las distinciones de parentesco y las terminaciones posesivas de la fuente." }),
    turn("count", "Friend", phrase(9, "Quezqui mochochohuan ticpiya?", "How many younger siblings do you have?", "¿Cuántos hermanos menores tienes?"),
      { en: "Choose a short number reply for this practice role.", es: "Elige una respuesta numérica breve para este papel de práctica." }, [
        option("siblings-one", phrase(4, "cē", "one", "uno"), true, "one", "This role has one younger sibling.", "Este personaje tiene un hermano menor."),
        option("siblings-two", phrase(4, "ōme", "two", "dos"), true, "two", "This role has two younger siblings.", "Este personaje tiene dos hermanos menores."),
      ], { en: "Both answers are valid; your choice creates a different practice role.", es: "Ambas respuestas son válidas; tu elección crea un papel de práctica distinto." }),
    turn("one", "Friend", yes, { en: "You answered that you have one younger sibling.", es: "Respondiste que tienes un hermano menor." }, [], { en: "The answer is a source number used as a conversational fragment.", es: "La respuesta es un número de la fuente usado como fragmento conversacional." }),
    turn("two", "Friend", yes, { en: "You answered that you have two younger siblings.", es: "Respondiste que tienes dos hermanos menores." }, [], { en: "The plural kinship form remains in the source question.", es: "La forma plural de parentesco se conserva en la pregunta de la fuente." }),
  ], [{ en: "I can identify family members and answer a count question with a short reply.", es: "Puedo identificar familiares y responder una pregunta de cantidad con una respuesta breve." }]);

const foodMarket = scenario("food-market", { en: "Food and the market", es: "Comida y mercado" },
  { en: "Choose food you like, then follow the source market purchase through price, order, and payment.", es: "Elige una comida que te guste y sigue la compra de la fuente: precio, pedido y pago." }, [18, 19, 27], [
    turn("food", "Friend", phrase(18, "Tlen ticāmati ticuāz?", "What do you like to eat?", "¿Qué te gusta comer?"),
      { en: "Choose one of the source food words as a short reply.", es: "Elige una palabra de comida de la fuente como respuesta breve." }, [
        option("food-chicken", phrase(18, "piyonacatl", "chicken meat", "carne de pollo"), true, "price", "You chose chicken; next, buy pantry staples at the market.", "Elegiste pollo; ahora compra productos de despensa en el mercado."),
        option("food-pork", phrase(18, "pitzonacatl", "pork meat", "carne de cerdo"), true, "price", "You chose pork; next, buy pantry staples at the market.", "Elegiste cerdo; ahora compra productos de despensa en el mercado."),
      ], { en: "The food choices are noun replies, not new conjugated sentences.", es: "Las opciones de comida son respuestas nominales, no oraciones conjugadas nuevas." }),
    turn("price", "Seller", phrase(27, "Quēna, ¿tlen maz tichuīcaz?", "Yes, what else will you take?", "Sí, ¿qué más vas a llevar?"),
      { en: "Ask the price of rice, oil, and salt.", es: "Pregunta el precio del arroz, aceite y sal." }, [
        option("ask-price", phrase(27, "¿Quezqui īpatiuh arroz huan moaceyiteh, aa huan iztātl?", "How much are the rice and your oil, and the salt?", "¿Cuánto cuestan el arroz, tu aceite y la sal?"), true, "order", "This is the source buyer's price question.", "Es la pregunta del comprador en la fuente."),
        option("ask-location", here, false, undefined, "This says where you are; it does not ask a price.", "Esta respuesta dice dónde estás; no pregunta un precio."),
      ], { en: "The source dialogue mixes Nahuatl with common borrowed market words.", es: "El diálogo de la fuente combina náhuatl con préstamos comunes del mercado." }),
    turn("order", "Seller", phrase(27, "Aa arroz īcā 15 cē kiloh huan aceyiteh 30, huan iztātl 10.", "Rice is 15 per kilo, oil is 30, and salt is 10.", "El arroz está a 15 el kilo, el aceite a 30 y la sal a 10."),
      { en: "Continue the source order: two kilos of rice, one kilo of salt, and three liters of oil. Prices are historical practice values.", es: "Sigue el pedido de la fuente: dos kilos de arroz, un kilo de sal y tres litros de aceite. Los precios son valores de práctica de la fuente." }, [
        option("place-order", phrase(27, "Buenoh, xinēchmāca ōme kiloh arroz, cē kiloh iztātl huan ēyi litroh aceyiteh.", "Well, give me two kilos of rice, one kilo of salt, and three liters of oil.", "Bueno, dame dos kilos de arroz, un kilo de sal y tres litros de aceite."), true, "payment", "This repeats the source quantities; no new price or grammar has been generated.", "Repite las cantidades de la fuente; no se generó un precio ni una estructura nueva."),
        option("order-food", phrase(18, "piyonacatl", "chicken meat", "carne de pollo"), false, undefined, "This names a food but does not give this order.", "Esta respuesta nombra una comida, pero no expresa este pedido."),
      ], { en: "The source later states a total of 120 for the full original exchange, which includes an earlier sugar purchase. That total is not used here.", es: "La fuente después indica un total de 120 por el intercambio completo, que incluye una compra anterior de piloncillo. Aquí no se usa ese total." }),
    turn("payment", "Seller", phrase(27, "Quēna. Aha nicān eltoc.", "Yes. Here it is.", "Sí. Aquí está."),
      { en: "Ask what you owe, without inventing a new price.", es: "Pregunta cuánto debes, sin inventar un precio nuevo." }, [
        option("ask-total", phrase(27, "Naman quena, ¿quezqui nimītzhuīquilia?", "Now, how much do I owe you?", "Ahora, ¿cuánto te debo?"), true, "close", "Use the source payment question; check the actual total with the seller.", "Usa la pregunta de pago de la fuente; confirma el total real con quien vende."),
        option("payment-name", phrase(3, "Na notōcah Juana.", "My name is Juana.", "Me llamo Juana."), false, undefined, "A name does not ask what you owe.", "Un nombre no pregunta cuánto debes."),
      ], { en: "This practice ends before an actual total is given; the shortened purchase differs from the source's full basket.", es: "La práctica termina antes de dar un total real; esta compra abreviada es distinta de la compra completa de la fuente." }),
    turn("close", "Buyer", phrase(27, "Cualtitoc ahui, tlazcāmati.", "All right, auntie, thank you.", "Está bien, tía, gracias."), { en: "After confirming and paying the real total, thank the seller.", es: "Después de confirmar y pagar el total real, agradece a quien vende." }, [],
      { en: "Ahui is the source's aunt term used in this market address; it is not a required way to address every seller.", es: "Ahui es la palabra para tía que usa la fuente en este mercado; no es obligatorio dirigirse así a todas las personas que venden." }),
  ], [{ en: "I can ask a market price, recognize a source order, and ask what I owe.", es: "Puedo preguntar un precio, reconocer un pedido de la fuente y preguntar cuánto debo." }]);

const directions = scenario("directions-visiting", { en: "Finding a place and visiting", es: "Llegar a un lugar y visitar" },
  { en: "Follow the source narrator's route, repeat key steps, then ask to come in.", es: "Sigue el recorrido de la fuente, repite pasos clave y pide permiso para entrar." }, [2, 23, 28], [
    turn("straight", "Guide", phrase(23, "ninehnemi xitlāhuac", "I walk straight", "Camino derecho"), { en: "Repeat the route's straight-ahead step.", es: "Repite el paso del recorrido que va derecho." }, [
      option("repeat-straight", phrase(23, "ninehnemi xitlāhuac", "I walk straight", "Camino derecho"), true, "right", "This repeats a first-person route description, not a command.", "Repite una descripción del recorrido en primera persona, no una orden."),
      option("repeat-right-early", phrase(23, "nimomalacachoa īca nemahtli", "I turn right", "Giro a la derecha"), false, undefined, "The turn comes at the next route step.", "El giro corresponde al siguiente paso del recorrido."),
    ], { en: "Route fragments preserve the source's first-person verbs.", es: "Los fragmentos del recorrido conservan los verbos en primera persona de la fuente." }),
    turn("right", "Guide", phrase(23, "nimomalacachoa īca nemahtli", "I turn right", "Giro a la derecha"), { en: "Repeat the next step, turning right.", es: "Repite el siguiente paso: girar a la derecha." }, [
      option("repeat-right", phrase(23, "nimomalacachoa īca nemahtli", "I turn right", "Giro a la derecha"), true, "arrival", "This preserves the source expression for the right turn.", "Conserva la expresión de la fuente para girar a la derecha."),
      option("repeat-straight-late", phrase(23, "ninehnemi xitlāhuac", "I walk straight", "Camino derecho"), false, undefined, "That was the previous step.", "Ese fue el paso anterior."),
    ], { en: "This is a route comprehension rehearsal; it is not a new imperative paradigm.", es: "Es una práctica de comprensión de un recorrido, no un paradigma imperativo nuevo." }),
    turn("arrival", "Guide", phrase(23, "Niahci āmoxcalli", "I arrive at the library", "Llego a la biblioteca"), { en: "You have reached the place. Practice asking to come in.", es: "Llegaste al lugar. Practica cómo pedir permiso para entrar." }, [
      option("ask-entry", phrase(2, "¿Hueliz nipano?", "Can I come in?", "¿Puedo pasar?"), true, "welcome", "The source classroom exchange supplies the entry request.", "El intercambio de aula de la fuente proporciona la petición para entrar."),
      option("entry-location", here, false, undefined, "This gives your location but does not ask permission to enter.", "Esta respuesta indica dónde estás, pero no pide permiso para entrar."),
    ], { en: "Itzli connects two source settings for practice: the library route and an entry request.", es: "Itzli conecta dos situaciones de la fuente para practicar: el recorrido a la biblioteca y la petición para entrar." }),
    turn("welcome", "Host", phrase(2, "Quēna, xipano, ximocehui.", "Yes, come in and sit down.", "Sí, pasa y siéntate."), { en: "You were invited to come in and sit down.", es: "Te invitaron a pasar y sentarte." }, [],
      { en: "The complete welcome appears in the source classroom example.", es: "La bienvenida completa aparece en el ejemplo de aula de la fuente." }),
  ], [{ en: "I can follow two source route steps and ask permission to enter.", es: "Puedo seguir dos pasos de un recorrido de la fuente y pedir permiso para entrar." }]);
directions.sourceAudio = [{ url: "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/Audio-2-tlamanextilli.mp3", scope: "whole-passage",
  label: { en: "Original classroom entry exchange", es: "Intercambio original para entrar al aula" } }];

const plans = scenario("daily-plans", { en: "Sharing plans", es: "Compartir planes" },
  { en: "Choose an attested singular future and share a study destination.", es: "Elige un futuro singular documentado y comparte un destino para estudiar." }, [12, 26], [
    turn("plan", "Friend", andYou, { en: "Your friend asks about your plan. Choose work or study for this role.", es: "Tu amistad pregunta tu plan. Elige trabajar o estudiar para este papel." }, [
      option("plan-work", phrase(12, "Nitequitiz", "I will work", "Voy a trabajar"), true, "work", "This is the source's first-person singular future for work.", "Es el futuro de primera persona singular de trabajar en la fuente."),
      option("plan-study", phrase(12, "Nimomachtiz", "I will study", "Voy a estudiar"), true, "study", "This is the source's first-person singular future for study.", "Es el futuro de primera persona singular de estudiar en la fuente."),
    ], { en: "The selected future forms are singular; disputed plural spellings are excluded.", es: "Los futuros seleccionados son singulares; se excluyen las escrituras plurales pendientes de revisión." }),
    turn("work", "Friend", yes, { en: "You plan to work. For a later study visit, choose the source library plan.", es: "Planeas trabajar. Para una visita posterior de estudio, elige el plan de la biblioteca de la fuente." }, [
      option("work-library", phrase(26, "Niyaz nimomachtiti amoxcalli.", "I will go to study at the library.", "Voy a ir a estudiar a la biblioteca."), true, "close", "The whole library sentence is attested; it is not assembled from new suffixes.", "La oración completa de la biblioteca está documentada; no se armó con sufijos nuevos."),
    ], { en: "The second plan is a separate source sentence.", es: "El segundo plan es una oración distinta de la fuente." }),
    turn("study", "Friend", yes, { en: "Say where you will go to study using the source sentence.", es: "Di a dónde irás a estudiar usando la oración de la fuente." }, [
      option("study-library", phrase(26, "Niyaz nimomachtiti amoxcalli.", "I will go to study at the library.", "Voy a ir a estudiar a la biblioteca."), true, "close", "The source models going somewhere to carry out an action.", "La fuente muestra cómo ir a un lugar para realizar una acción."),
    ], { en: "The action-purpose form is retained exactly as it appears in Lesson 26.", es: "La forma de propósito se conserva como aparece en la lección 26." }),
    turn("close", "Friend", later, { en: "You shared a plan and can close the conversation.", es: "Compartiste un plan y puedes terminar la conversación." }, [],
      { en: "Choose complete attested plans in the sentence workbench.", es: "Elige planes completos documentados en el taller de oraciones." }),
  ], [{ en: "I can share a singular future plan from the source.", es: "Puedo compartir un plan en futuro singular de la fuente." }]);

const experiences = scenario("experiences", { en: "Sharing an experience", es: "Compartir una experiencia" },
  { en: "Share an attested past action, then expand the water-fetching example with its original details.", es: "Comparte una acción pasada documentada y amplía el ejemplo de ir por agua con sus detalles originales." }, [14, 24, 26], [
    turn("past", "Friend", andYou, { en: "Your friend has shared an outing. Choose your past-action reply for this role.", es: "Tu amistad contó una salida. Elige tu respuesta sobre una acción pasada para este papel." }, [
      option("past-went", phrase(24, "Niyāhqui", "I went", "Fui"), true, "went", "The irregular past of ‘go’ is learned as an attested form.", "El pasado irregular de «ir» se aprende como forma documentada."),
      option("past-water", phrase(26, "Niātlacuito", "I went to get water", "Fui por agua"), true, "water", "This source form says you went to carry out the water-fetching action.", "Esta forma de la fuente indica que fuiste a realizar la acción de ir por agua."),
    ], { en: "These replies do not use a blanket Classical past augment.", es: "Estas respuestas no aplican una regla general de aumento del pasado clásico." }),
    turn("went", "Friend", yes, { en: "Now specify the source outing: yesterday you went for water with your mother.", es: "Ahora precisa la salida de la fuente: ayer fuiste por agua con tu mamá." }, [
      option("went-details", phrase(26, "Yālhuaya niātlacuito huanya nonanān.", "Yesterday I went to get water with my mother.", "Ayer fui por agua con mi mamá."), true, "close", "The time, action, and companion come from the complete source sentence.", "El tiempo, la acción y la compañía provienen de la oración completa de la fuente."),
    ], { en: "No new companion or tense is generated in this example.", es: "Este ejemplo no genera una compañía ni un tiempo verbal nuevos." }),
    turn("water", "Friend", yes, { en: "Add when and with whom, using the complete source example.", es: "Añade cuándo y con quién, usando el ejemplo completo de la fuente." }, [
      option("water-details", phrase(26, "Yālhuaya niātlacuito huanya nonanān.", "Yesterday I went to get water with my mother.", "Ayer fui por agua con mi mamá."), true, "close", "Use the source's complete past outing sentence.", "Usa la oración completa de la fuente sobre la salida pasada."),
    ], { en: "The directional -to form is retained from the source.", es: "La forma direccional con -to se conserva de la fuente." }),
    turn("close", "Friend", later, { en: "You shared an experience and can close the exchange.", es: "Compartiste una experiencia y puedes terminar el intercambio." }, [],
      { en: "The original source details describe this role, rather than your personal history.", es: "Los detalles originales describen este papel, no tu historia personal." }),
  ], [{ en: "I can recognize and use a learned past outing sentence.", es: "Puedo reconocer y usar una oración aprendida sobre una salida pasada." }]);

export const CONVERSATION_SCENARIOS: ConversationScenario[] = [introductions, family, foodMarket, directions, plans, experiences];

function pattern(id: string, title: LocalizedText, description: LocalizedText, unitNumbers: number[], choices: { id: string; value: Phrase }[]): SentencePattern {
  const values = choices.map(({ id: choiceId, value }) => ({ id: choiceId, nahuatl: value.nahuatl, english: value.english, spanish: value.spanish,
    source: value.sources[0], audioUrl: value.audioUrl, audioKind: value.audioKind }));
  return { id, titleEn: title.en, titleEs: title.es, descriptionEn: description.en, descriptionEs: description.es,
    unitNumbers, slots: [{ id: "utterance", label: { en: "Choose a reviewed source phrase", es: "Elige una frase cotejada con la fuente" }, choices: values }],
    sources: values.map((item) => item.source), review: sourceArrangement };
}

const namePattern = pattern("my-name", { en: "Say your name", es: "Di tu nombre" }, { en: "Use the source name frame with a proper name.", es: "Usa la estructura de nombre de la fuente con un nombre propio." }, [3], [
  { id: "juana", value: phrase(3, "Na notōcah Juana.", "My name is Juana.", "Me llamo Juana.") },
  { id: "paty", value: phrase(3, "na notōcah Paty.", "My name is Paty.", "Me llamo Paty.") },
]);
namePattern.template = { sourceNahuatl: "Na notōcah Juana.", nahuatl: "Na notōcah {name}.", english: "My name is {name}.", spanish: "Me llamo {name}.",
  freeSlots: [{ id: "name", type: "proper-name", label: { en: "Your name", es: "Tu nombre" }, example: "Juana", maxLength: 60 }] };
const originPattern = pattern("my-origin", { en: "Say where you are from", es: "Di de dónde eres" }, { en: "Replace only the proper place name in the attested origin frame.", es: "Sustituye únicamente el nombre propio del lugar en la estructura documentada de origen." }, [3], [
  { id: "tecomate", value: phrase(3, "Na niēhua Tecomate, Chicōntepēc.", "I am from Tecomate, Chicontepec.", "Soy de Tecomate, Chicontepec.") },
]);
originPattern.template = { sourceNahuatl: "Na niēhua Tecomate, Chicōntepēc.", nahuatl: "Na niēhua {place}.", english: "I am from {place}.", spanish: "Soy de {place}.",
  freeSlots: [{ id: "place", type: "place-name", label: { en: "Your place of origin", es: "Tu lugar de origen" }, example: "Tecomate", maxLength: 60 }] };

export const SENTENCE_PATTERNS: SentencePattern[] = [namePattern, originPattern,
  pattern("ask-repeat", { en: "Ask for clarification", es: "Pide una aclaración" }, { en: "Choose a source classroom repair phrase.", es: "Elige una frase de aclaración de la fuente." }, [2], [
    { id: "repeat", value: repeat }, { id: "not-understand", value: phrase(2, "Ax niccuamachilia", "I do not understand", "No entiendo") },
    { id: "question", value: phrase(2, "Nicpiya cē tlahtlaniliztli", "I have a question", "Tengo una pregunta") },
  ]),
  pattern("family-replies", { en: "Identify your family", es: "Identifica a tu familia" }, { en: "Select complete possessed kinship forms; endings are learned with each word.", es: "Elige formas posesivas completas de parentesco; aprende la terminación con cada palabra." }, [9], [
    { id: "mother", value: phrase(9, "nonanān", "my mother", "mi mamá") }, { id: "father", value: phrase(9, "notatah", "my father", "mi papá") },
    { id: "older-sister", value: phrase(9, "nopipi", "my older sister", "mi hermana mayor") },
  ]),
  pattern("singular-plans", { en: "Share a plan", es: "Comparte un plan" }, { en: "Select an attested singular future or complete action-purpose sentence.", es: "Elige un futuro singular documentado o una oración completa de propósito." }, [12, 26], [
    { id: "work", value: phrase(12, "Nitequitiz", "I will work", "Voy a trabajar") },
    { id: "study", value: phrase(12, "Nimomachtiz", "I will study", "Voy a estudiar") },
    { id: "library", value: phrase(26, "Niyaz nimomachtiti amoxcalli.", "I will go to study at the library.", "Voy a ir a estudiar a la biblioteca.") },
  ]),
  pattern("past-experiences", { en: "Share a past experience", es: "Comparte una experiencia pasada" }, { en: "Use complete past forms from the source.", es: "Usa formas pasadas completas de la fuente." }, [14, 24, 26], [
    { id: "went", value: phrase(24, "Niyāhqui", "I went", "Fui") },
    { id: "water", value: phrase(26, "Yālhuaya niātlacuito huanya nonanān.", "Yesterday I went to get water with my mother.", "Ayer fui por agua con mi mamá.") },
    { id: "cried", value: phrase(14, "Nichōcac", "I cried", "Lloré") },
  ]),
  pattern("market-price", { en: "Ask a price", es: "Pregunta un precio" }, { en: "Practice the complete source market question.", es: "Practica la pregunta completa del mercado de la fuente." }, [27], [
    { id: "rice-oil-salt", value: phrase(27, "¿Quezqui īpatiuh arroz huan moaceyiteh, aa huan iztātl?", "How much are the rice and your oil, and the salt?", "¿Cuánto cuestan el arroz, tu aceite y la sal?") },
    { id: "owe", value: phrase(27, "Naman quena, ¿quezqui nimītzhuīquilia?", "Now, how much do I owe you?", "Ahora, ¿cuánto te debo?") },
  ]),
];
export function getConversationScenarios() { return CONVERSATION_SCENARIOS; }
export function getConversationScenario(id: string) { return CONVERSATION_SCENARIOS.find((item) => item.id === id); }
export function getSentencePatterns() { return SENTENCE_PATTERNS; }
export function getSentencePattern(id: string) { return SENTENCE_PATTERNS.find((item) => item.id === id); }

export function renderSentenceTemplate(patternId: string, values: Record<string, string>): LocalizedText & { nahuatl: string } | null {
  const template = getSentencePattern(patternId)?.template;
  if (!template || Object.keys(values).some((id) => !template.freeSlots.some((slot) => slot.id === id))) return null;
  let nahuatl = template.nahuatl;
  let en = template.english;
  let es = template.spanish;
  for (const slot of template.freeSlots) {
    const value = values[slot.id]?.normalize("NFC").trim().replace(/\s+/g, " ");
    if (!value || value.length > slot.maxLength || !/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u.test(value)) return null;
    nahuatl = nahuatl.replace(`{${slot.id}}`, value);
    en = en.replace(`{${slot.id}}`, value);
    es = es.replace(`{${slot.id}}`, value);
  }
  return { nahuatl, en, es };
}
