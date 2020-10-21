import axios from 'axios';
import cheerio from 'cheerio';
import { parse } from 'chrono-node';
import { NewsItem } from 'common/types';
import fs from 'fs';

const URL = `https://news.ycombinator.com/news?p=`;

async function loadPage(page = 1): Promise<string> {
  return axios.get(`${URL}${page}`).then((result) => result.data);
}

async function getNewsItems(): Promise<NewsItem[]> {
  const newsItems: NewsItem[] = [];
  // HN support only 4 parallel requests, and number of posts are not infinite.
  // Only about 14 pages currently.

  // Using traditional way to see if having next page.
  // If still has next page, load and parse next page.
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    console.log('processing page', page);
    const html = await loadPage(page);
    const $ = cheerio.load(html);

    // Remove distracting spacer
    const spacer = $('body').find('table.itemlist tr.spacer');
    spacer.remove();

    const titleRows = $('table.itemlist tbody tr.athing');

    titleRows.toArray().forEach((el) => {
      const id = +el.attribs.id;
      // Title and link
      const titleEl = $(`tr#${id}.athing > td.title`);
      const storylinkEl = titleEl.find('a.storylink');
      const title = storylinkEl.text();
      const link = storylinkEl.attr().href;

      // Point
      const pointEl = $(`#score_${id}`);
      const pointStr = pointEl.text(); // Sometimes there will be no points
      const points = pointStr === '' ? 0 : +pointStr.split(' ')[0]; // 'n points' -> n
      // author name
      const author = pointEl.siblings('a.hnuser').text() || null;

      // comments count
      const commentEl = pointEl.siblings(`a[href^="item?"]`);
      const commentStr = commentEl.text();
      // For some unknown reason, commentStr.split(' ') is not working.
      // Using regex instead
      const countMatch = /^(\d+).*comment/.exec(commentStr);
      const comments = countMatch ? parseInt(countMatch[0]) : 0;

      // Parse post date string with 'chrono-node'
      const timeStr = pointEl.siblings('.age').find('a').text();
      const time = parse(timeStr)[0]?.date().toISOString() || null;

      newsItems.push({ id, points, author, title, link, comments, time });
    });

    // Look for 'More' button
    if ($('.morelink').get().length > 0) {
      page++;
    } else {
      hasNext = false;
    }
  }
  return newsItems;
}
export default async function scrape() {
  const items = await getNewsItems();
  fs.writeFileSync('data.json', JSON.stringify(items, null, 2));
}

scrape();
