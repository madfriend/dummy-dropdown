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

var ruAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
var enAlphabet = 'abcdefghijklmnopqrstuvwxyz';

var ruenMap = {};
var enruMap = {};

var ruenMapKeys = [];
var enruMapKeys = [];

var ruen_TO = 'a b v g d e jo zh z i j k l n o p r s t u f h c ch sh shh " y \' je ju ja'.split(' ');
for (var i = 0; i < ruAlphabet.length; i++) {
   ruenMap[ruAlphabet[i]] = ruen_TO[i];
   ruenMapKeys.push(ruAlphabet[i]);
}

var enru_FROM = 'a|b|v|g|d|e|jo,yo,ö|zh|z|i|j|k|l|m|n|o|p|r|s|t|u|f|h,x|c|ch|sh|shh,w|#|y|\'|je,ä|ju,yu,ü|ja,ya,q';
enru_FROM = enru_FROM.split('|');

for (var i = 0; i < ruAlphabet.length; i++) {
   var en = enru_FROM[i].split(',');
   for (var j = 0; j < en.length; j++) {
      enruMap[en[j]] = ruAlphabet[i];
      enruMapKeys.push(en[j]);
   }
}

ruenMapKeys.sort(compareKeys);
enruMapKeys.sort(compareKeys);

function compareKeys(key1, key2) {
   if (key1.length !== key2.length) {
      return (key2.length - key1.length);
   }
   else return key1.localeCompare(key2);
}

export function translit(word, debug) {
   var map, keys;
   var new_word = word.toLowerCase();

   if (detectLang(word) === 'ru') {
      map = ruenMap;
      keys = ruenMapKeys;
   }
   else {
      map = enruMap;
      keys = enruMapKeys;
   }

   for (var i = 0; i < keys.length; i++) {
      var re = new RegExp(keys[i], 'g');
      new_word = new_word.replace(re, map[keys[i]]);
   }

   return new_word;
} // end translit

function detectLang(str) {
   var ru_letters = 0;
   var en_letters = 0;
   for (var i = 0; i < str.length; i++) {
      if (ruAlphabet.indexOf(str[i]) >= 0) ru_letters++;
      if (enAlphabet.indexOf(str[i]) >= 0) en_letters++;
   }

   if (ru_letters > en_letters) return 'ru';
   return 'en';
}

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
