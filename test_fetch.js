const fetch = require('node-fetch');
async function test() {
  const res = await fetch('https://www.almaster-maroc.com/feeds/posts/default?alt=json&max-results=50');
  const data = await res.json();
  console.log('Total entries:', data.feed.entry.length);
  console.log('Sample title:', data.feed.entry[0].title.$t);
}
test();
