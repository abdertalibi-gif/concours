async function test() {
  const res = await fetch('https://www.almaster-maroc.com/feeds/posts/default?alt=json&max-results=5');
  const data = await res.json();
  const html = data.feed.entry[4].content.$t;
  console.log('Title:', data.feed.entry[4].title.$t);
  console.log('HTML:', html.substring(0, 500));
}
test();
