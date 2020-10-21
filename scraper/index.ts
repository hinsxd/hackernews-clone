import axios from 'axios';
import cheerio from 'cheerio';
import { parse } from 'chrono-node';
import { NewsItem } from 'common/types';
import fs from 'fs';

const URL = `https://news.ycombinator.com/news?p=`;

async function loadPage(page = 1): Promise<string> {
  return axios.get(`${URL}${page}`).then((result) => result.data);
}

async function getNewsItems(page = 1): Promise<NewsItem[]> {
  const html = await loadPage(page);
  const $ = cheerio.load(html);

  // Remove distracting spacer
  const spacer = $('body').find('table.itemlist tr.spacer');
  spacer.remove();

  const titleRows = $('table.itemlist tbody tr.athing');

  const items: NewsItem[] = titleRows.toArray().map((el) => {
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
    return { id, points, author, title, link, comments, time };
  });

  return items;
}
export default async function scrape() {
  // For convenience, get 4 pages in parallel, because HN does not support 5 parallel requests.
  const newsItems = await Promise.all([1, 2, 3, 4].map(getNewsItems)).then(
    // An array of 4 arrays of news items
    (newsArrArr) =>
      // Flatten to one big array
      newsArrArr.reduce((flattened, newsArr) => [...flattened, ...newsArr], [])
  );
  fs.writeFileSync('data.json', JSON.stringify(newsItems, null, 2));
}

scrape();
