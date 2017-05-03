var arrayUnique = require('./utils').arrayUnique;


export function startsWith(haystack, needle) {
   return haystack.lastIndexOf(needle, 0) === 0;
} // end startsWith

export function allKeyboardLayoutInvariants(word) {
   return [word, swapLayout(word),
      translit(word), swapLayout(translit(word))];
} // end allKeyboardVariants

var enru = [
   'qй', 'wц', 'eу', 'rк', 'tе', 'yн', 'uг', 'iш', 'oщ', 'pз', '[х', '{Х',
   ']ъ', '}Ъ', '|/', '`ё', '~Ё', 'aф', 'sы', 'dв', 'fа', 'gп', 'hр', 'jо',
   'kл', 'lд', ';ж', ':Ж', "'э", '"Э', 'zя', 'xч', 'cс', 'vм', 'bи', 'nт',
   'mь', ',б', '<Б', '.ю', '>Ю', '/.', '?, ', '@"', '#№', '$;', '^:', '&?'
];
var layoutMap = {};
for (var i = 0; i < enru.length; i++) {
   layoutMap[enru[i][0]] = enru[i][1];
   layoutMap[enru[i][1]] = enru[i][0];
};

export function swapLayout(word) {
   var out = '';
   for (var i = 0; i < word.length; i++)
      out += (layoutMap[word[i]] || word[i]);
   return out;
}

var translitMap = [
   'щ ш ч ц ю я ё ж ъ ы э а б в г д е з и й к л м н о п р с т у ф х ь'.split(' '),
   "shh sh ch cz yu ya yo zh `` y' e` a b v g d e z i j k l m n o p r s t u f x `".split(' ')
];

export function translit(word) {
   // detect lang
   var ruMatches = 0;
   var enMatches = 0;

   for (var i = 0; i < translitMap[0].length; i++)
      ruMatches += (word.indexOf(translitMap[0][i]) >= 0 ? 1 : 0);
   for (var j = 0; j < translitMap[1].length; j++)
      enMatches += (word.indexOf(translitMap[1][j]) >= 0 ? 1 : 0);

   var engToRus = (enMatches > ruMatches);
   var rus = translitMap[0], eng = translitMap[1];

   for(var x = 0; x < rus.length; x++) {
      word = word.split(engToRus ? eng[x] : rus[x]).join(engToRus ? rus[x] : eng[x]);
      word = word.split(engToRus ? eng[x].toUpperCase() : rus[x].toUpperCase()).join(engToRus ? rus[x].toUpperCase() : eng[x].toUpperCase());
   }
   return word;
} // end translit

export function allPossibleTokens(sentence) {
   // aka all possible n-grams, each joined by space
   var out = [];
   var words = sentence.split(/\s+/);
   var words2 = sentence.split(/\W*\s+\W*/);

   for (var window = 2; window <= words.length; window++) {
      for (var offset = 0; offset <= words.length - window; offset++) {
         out = out.concat(words.slice(offset, offset+window).join(' '));
         out = out.concat(words2.slice(offset, offset+window).join(' '));
      }
   }

   out = words2.concat(words.concat(out));
   return arrayUnique(out);
} // allPossibleTokens
