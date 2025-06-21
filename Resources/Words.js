// words.js

const wordBank = {
  1: [
    'apple', 'car', 'dog', 'house', 'pen', 'sun', 'tree', 'phone', 'book', 'ball',
    'chair', 'bike', 'cup', 'hat', 'cat', 'clock', 'shirt', 'mouse', 'lamp', 'truck',
    'spoon', 'bottle', 'fan', 'train', 'cloud', 'plane', 'road', 'beach', 'grass', 'river',
    'plate', 'brush', 'shirt', 'pencil', 'paper', 'shoes', 'watch', 'drum', 'kite', 'ring',
    'star', 'fruit', 'cable', 'stone', 'flag', 'ruler', 'plant', 'glove', 'grape', 'key'
  ],
  2: [
    'ice cream', 'red apple', 'blue sky', 'green tree', 'black cat', 'flying bird',
    'yellow bus', 'laptop bag', 'paper plane', 'water bottle', 'wooden chair',
    'soccer ball', 'tennis racket', 'pencil box', 'mobile phone',
    'coffee cup', 'school bag', 'video game', 'table lamp', 'drum set',
    'comic book', 'power bank', 'white board', 'jungle gym', 'gold ring',
    'smart watch', 'flower vase', 'bread loaf', 'rubber duck', 'trash bin'
  ],
  3: [
    'man riding bicycle', 'girl eating cake', 'dog chasing cat',
    'child blowing bubbles', 'boy playing soccer', 'woman cooking food',
    'car on highway', 'cat under table', 'people taking selfie',
    'sun setting slowly', 'kid flying kite', 'fish jumping water',
    'student reading book', 'driver fixing tire', 'baby holding toy'
  ],
  4: [
    'man with red umbrella', 'girl riding white horse', 'dog running in the park',
    'boy jumping on trampoline', 'woman reading a newspaper', 'child drawing with crayons',
    'cat sleeping on the couch', 'old man walking with stick', 'chef baking chocolate cake',
    'teacher writing on board', 'bird flying over trees', 'kid eating ice cream',
    'driver washing his car', 'baby playing with blocks', 'family walking in park'
  ]
};

function getWordsUpToCount(x) {
  if (x < 1 || x > 4) return [];

  let result = [];
  for (let i = 1; i <= x; i++) {
    result.push(...(wordBank[i] || []));
  }

  return shuffleArray(result); // Always returns a shuffled array
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Export for Node.js or attach to browser window
if (typeof module !== 'undefined') {
  module.exports = { getWordsUpToCount };
} else {
  window.getWordsUpToCount = getWordsUpToCount;
}
