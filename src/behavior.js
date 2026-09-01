const word = /\S+/g;
const profanity = /\b(?:fuck\w*|shit\w*|damn|wtf|stfu|idiot|moron)\b/gi;
const negation = /^(?:nope|nah|nvm|wrong|incorrect|no[,!])\b|\b(?:that's not|not what i (?:meant|asked|said|wanted)|makes (?:no|zero) sense)\b/gi;
const repetition = /\b(?:i (?:meant|said|told you|already (?:said|told|did|asked|wrote)|asked you)|like i said|as i said|still (?:doesn't|isn't|not|broken|wrong|fails|the same))\b/gi;
const blame = /\b(?:you (?:didn't|did not|broke|missed|forgot|keep|always|never|still|ignored)|why (?:would|did) you)\b/gi;
const anguish = /[!?][!?1]{2,}|\b(?:ugh+|argh+|grr+|noo+|stoo+p+|whyy+|fuu+k*|wtf+|omg+|bruh+)\b|\b dude\b|[:;]-?\(+/gi;
function strip(text) {
  return text.replace(/```[\s\S]*?```/g, "\n").replace(/https?:\/\/\S+/gi, " ").replace(/^\s*>.*$/gm, "\n").replace(/`[^`\n]*`/g, " ").replace(/(^|\s)@[\w./-]+/g, "$1 ").replace(/<[^>]+>/g, " ");
}
function count(re, text) { re.lastIndex = 0; return [...text.matchAll(re)].length; }
export function computeBehavior(text) {
  const clean = String(text ?? "").trim();
  if (!clean) return { chars: 0, words: 0, yelling: 0, profanity: 0, anguish: 0, negation: 0, repetition: 0, blame: 0 };
  const prose = strip(clean).trim();
  const sentences = prose.split(/[.!?\n]+/).filter(Boolean);
  const yelling = sentences.filter(s => {
    const letters = s.match(/[A-Za-z]/g) ?? [], upper = s.match(/[A-Z]/g) ?? [], runs = s.match(/[A-Z]{2,}/g) ?? [];
    return letters.length >= 4 && upper.length / letters.length > .5 && (runs.length >= 2 || /([A-Z])\1\1/.test(s));
  }).length;
  return { chars: clean.length, words: [...clean.matchAll(word)].length, yelling, profanity: count(profanity, prose), anguish: count(anguish, prose), negation: count(negation, prose), repetition: count(repetition, prose), blame: count(blame, prose) };
}
