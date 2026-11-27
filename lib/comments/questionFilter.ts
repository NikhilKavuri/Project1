const spam = /\b(?:crypto|forex|bitcoin|airdrop)\b.*(?:https?:|t\.me|profit|guaranteed)|(?:t\.me\/|wa\.me\/|check (?:out )?my channel|sub\s*4\s*sub|(?:whatsapp|telegram)[^\d]{0,20}(?:\+?[\d -]){8,})/iu;
const praise = /^(?:first|nice(?: video)?|great(?: video)?|super(?: bro| anna)?|awesome(?: video)?|love this|thanks(?: bro| anna)?)[!.\s]*$/iu;
const questionWords = /\b(?:what|which|how|where|why|when|who|whose|can you|could you|any tips|konsa|kaun\s*sa|kaha[n]?|kitna|kaise|kya|kaunsi|bhejo|batao|dede|pettu|ela|entha|ekkada|edi|vadutunnav|cheppu|price|link|setup|recommendation)\b/iu;
const letters = /\p{L}/u;

export function isQuestion(rawText: string): boolean {
  const text = rawText.normalize('NFKC').trim();
  if (!letters.test(text) || spam.test(text) || praise.test(text)) return false;
  return /[?؟？]/u.test(text) || questionWords.test(text);
}
