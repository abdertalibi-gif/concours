async function test() {
  const res = await fetch('https://www.almaster-maroc.com/feeds/posts/default?alt=json&max-results=50');
  const data = await res.json();
  console.log('Total entries:', data.feed.entry.length);
  console.log('Sample title:', data.feed.entry[0].title.$t);
  
  // Let's get the 5th entry and look at its categories
  console.log('Categories:', data.feed.entry[5].category.map(c => c.term));
  
  // HTML content
  const html = data.feed.entry[5].content.$t;
  console.log('HTML preview:', html.substring(0, 150));
}
test();
