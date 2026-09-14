async function test() {
  const res = await fetch('https://www.almaster-maroc.com/feeds/posts/default?alt=json&max-results=50');
  const data = await res.json();
  const allTags = new Set();
  data.feed.entry.forEach(e => {
    if (e.category) {
      e.category.forEach(c => allTags.add(c.term));
    }
  });
  console.log(Array.from(allTags).join(', '));
}
test();
